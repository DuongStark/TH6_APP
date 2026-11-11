/* SDK Firebase réel : trois membres et un compte hors groupe, aucune base prod. */
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {assertFails} = require('@firebase/rules-unit-testing');
const {initializeApp, deleteApp} = require('firebase/app');
const {getAuth, connectAuthEmulator, createUserWithEmailAndPassword} = require('firebase/auth');
const {getDatabase, connectDatabaseEmulator, ref, set, get, update, goOffline, onValue, onDisconnect, serverTimestamp} = require('firebase/database');
require.extensions['.ts'] = (module, filename) => {
  const result = require('@babel/core').transformFileSync(filename, {
    configFile:false, babelrc:false, presets:['module:@react-native/babel-preset'],
    plugins:['@babel/plugin-transform-modules-commonjs'],
  });
  module._compile(result.code, filename);
};
function services(auth, database) {
  const filename = path.resolve('src/services/firebase.ts');
  require.cache[filename] = {id:filename, filename, loaded:true, exports:{auth,database}};
  for (const name of ['chatService','groupService','notificationService']) {
    delete require.cache[path.resolve(`src/services/${name}.ts`)];
  }
  return {...require('../src/services/chatService.ts'), ...require('../src/services/groupService.ts'), ...require('../src/services/notificationService.ts')};
}
const apps=[];
after(async()=>{
  apps.forEach(app=>goOffline(getDatabase(app)));
  await Promise.all(apps.map(deleteApp));
  console.log('All Firebase test apps disposed.');
});
async function client(name) {
  const app=initializeApp({apiKey:'demo-api-key',projectId:'demo-th5-chat-plus',databaseURL:'https://demo-th5-chat-plus-default-rtdb.firebaseio.com'},name);
  apps.push(app);
  const auth=getAuth(app), db=getDatabase(app);
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  connectDatabaseEmulator(db,'127.0.0.1',9000);
  await createUserWithEmailAndPassword(auth,`${name}${Date.now()}@example.com`,'123456');
  const uid=auth.currentUser.uid;
  await set(ref(db,`users/${uid}`),{name});
  return {uid,db,service:services(auth,db)};
}
const value=async(c,p)=>(await get(ref(c.db,p))).val();
async function waitUntil(fn) {
  const deadline=Date.now()+6000;
  while(Date.now()<deadline) { if(await fn()) return; await new Promise(r=>setTimeout(r,40)); }
  throw new Error('Realtime event did not arrive in 6s');
}
test('TH5 A/B: atomic fanout, paginated realtime, authorization and disconnect', {timeout:120000}, async t=>{
  const reset=await fetch('http://127.0.0.1:9000/.json?ns=demo-th5-chat-plus-default-rtdb', {method:'DELETE',headers:{Authorization:'Bearer owner'}});
  assert.equal(reset.status,200,'emulator database reset');
  const [a,b,c,e]=await Promise.all(['An','Binh','Chi','Eve'].map(client));
  let conv,id;
  await t.test('group validates name and at least two other members',async()=>{
    await assert.rejects(a.service.createGroup(a.uid,'Sai',[b.uid]));
    conv=await a.service.createGroup(a.uid,'Nhóm thực hành',[b.uid,c.uid]);
    assert.equal(Object.keys((await value(b,`conversations/${conv}`)).members).length,3);
    assert.equal(Object.values(await value(b,`notifications/${b.uid}`))[0].type,'group');
  });
  await t.test('one send fans out message, preview, increment unread and real notifications',async()=>{
    let bLive=[], cLive=[];
    const stopB=b.service.watchLatestMessages(conv,ms=>{bLive=ms;},err=>{throw err;});
    const stopC=c.service.watchLatestMessages(conv,ms=>{cLive=ms;},err=>{throw err;});
    id=await a.service.sendMessage(a.uid,conv,{type:'text',text:'Xin chào nhóm'});
    await waitUntil(async()=>bLive.some(m=>m.id===id)&&cLive.some(m=>m.id===id));
    stopB(); stopC();
    for(const person of [b,c]) {
      const row=await value(person,`userChats/${person.uid}/${conv}`);
      assert.equal(row.unread,1); assert.equal(row.lastMessageId,id);
      assert.equal(row.lastMessage,'Xin chào nhóm');
      assert(Object.values(await value(person,`notifications/${person.uid}`)).some(n=>n.type==='message'&&n.convId===conv));
    }
    assert.equal((await value(a,`userChats/${a.uid}/${conv}`)).unread,0);
  });
  await t.test('read watermark and unread reset belong to each user',async()=>{
    const m={...await value(b,`messages/${conv}/${id}`),id};
    await b.service.markRead(b.uid,conv,{...m,createdAt:m.createdAt+5000});
    assert.equal((await value(b,`userChats/${b.uid}/${conv}`)).unread,0);
    assert.equal((await value(c,`userChats/${c.uid}/${conv}`)).unread,1);
    assert.equal((await value(a,`readStatus/${conv}/${b.uid}`)).messageId,id);
    const newer=await a.service.sendMessage(a.uid,conv,{type:'text',text:'Đến sau snapshot'});
    await b.service.markRead(b.uid,conv,m);
    assert.equal((await value(b,`userChats/${b.uid}/${conv}`)).unread,1);
    assert.equal((await value(b,`userChats/${b.uid}/${conv}`)).lastMessageId,newer);
    id=newer;
  });
  await t.test('nonmember and forged sender/recall/reaction/typing writes denied',async()=>{
    await assertFails(get(ref(e.db,`messages/${conv}`)));
    await assertFails(set(ref(e.db,`messages/${conv}/bad`),{senderId:e.uid,type:'text',text:'x',createdAt:Date.now(),recalled:false}));
    await assertFails(update(ref(b.db,`messages/${conv}/${id}`),{recalled:true}));
    await assertFails(set(ref(b.db,`typing/${conv}/${a.uid}/fake`),Date.now()));
    await assertFails(set(ref(b.db,`messages/${conv}/${id}/reactions/${a.uid}`),'❤️'));
    await assertFails(set(ref(b.db,`messages/${conv}/${id}/text`),'Sửa tin người khác'));
    await assertFails(set(ref(b.db,`messages/${conv}/${id}`),null));
    await assertFails(set(ref(b.db,`userChats/${a.uid}/${conv}/unread`),0));
    console.log('EVIDENCE: outsider read, forged recall/reaction/typing, edit/delete message and reset other unread => PERMISSION_DENIED');
  });
  await t.test('reaction owned by user; notification recipient owns read flag',async()=>{
    await b.service.reactToMessage(b.uid,conv,id,'❤️');
    assert.equal(await value(a,`messages/${conv}/${id}/reactions/${b.uid}`),'❤️');
    const notices=await value(a,`notifications/${a.uid}`);
    const [noticeId]=Object.entries(notices).find(([,n])=>n.type==='reaction');
    await a.service.markNotificationRead(a.uid,noticeId);
    assert.equal((await value(a,`notifications/${a.uid}/${noticeId}`)).read,true);
    await assertFails(set(ref(b.db,`notifications/${a.uid}/${noticeId}/read`),false));
    await a.service.markAllNotificationsRead(a.uid);
    assert(Object.values(await value(a,`notifications/${a.uid}`)).every(n=>n.read));
  });
  await t.test('recall keeps node, syncs preview and rejects other sender',async()=>{
    await a.service.recallMessage(a.uid,conv,id);
    assert.equal((await value(b,`messages/${conv}/${id}`)).recalled,true);
    assert.equal((await value(c,`userChats/${c.uid}/${conv}`)).lastMessage,'Tin nhắn đã được thu hồi');
  });
  await t.test('active conversation suppresses message notification, still counts unread until viewed',async()=>{
    const before=Object.keys(await value(b,`notifications/${b.uid}`)).length;
    const stop=b.service.enterConversation(b.uid,conv,()=>{});
    await waitUntil(async()=>Object.keys(await value(a,`activeChats/${conv}/${b.uid}`)||{}).length>0);
    await a.service.sendMessage(a.uid,conv,{type:'location',text:'📍 Vị trí',lat:21,lng:105});
    assert.equal(Object.keys(await value(b,`notifications/${b.uid}`)).length,before);
    assert.equal((await value(c,`userChats/${c.uid}/${conv}`)).lastMessage,'📍 Vị trí');
    await stop();
  });
  await t.test('image URL only, all message types and 20+20 key pagination at same timestamp',async()=>{
    await a.service.sendMessage(a.uid,conv,{type:'image',text:'📷 Hình ảnh',imageUrl:'https://res.cloudinary.com/demo/image/upload/sample.jpg'});
    assert.equal((await value(b,`userChats/${b.uid}/${conv}`)).lastMessage,'📷 Hình ảnh');
    for(let i=0;i<42;i++) await a.service.sendMessage(a.uid,conv,{type:'text',text:`Trang ${i}`});
    const first=await a.service.loadMessagePage(conv);
    const second=await a.service.loadMessagePage(conv,first.at(-1).id);
    assert.equal(first.length,20); assert.equal(second.length,20);
    assert.equal(new Set([...first,...second].map(m=>m.id)).size,40);
    assert(first.at(-1).id>second[0].id);
    let seen=0, deliveries=0;
    const off=b.service.watchLatestMessages(conv,ms=>{seen=ms.length; deliveries++;},err=>{throw err;});
    await waitUntil(async()=>seen===20); off();
    const baseline=deliveries;
    await a.service.sendMessage(a.uid,conv,{type:'text',text:'Sau cleanup'});
    await new Promise(r=>setTimeout(r,100)); assert.equal(deliveries,baseline);
  });
  await t.test('a rejected fanout leaves neither message nor partial preview',async()=>{
    const before=await value(b,`userChats/${b.uid}/${conv}`);
    await assertFails(update(ref(a.db),{
      [`messages/${conv}/atomic_failure`]:{senderId:a.uid,type:'text',text:'Must roll back',createdAt:Date.now(),recalled:false},
      [`notifications/${b.uid}/atomic_failure`]:{fromUid:c.uid,type:'message',text:'Forged',convId:conv,createdAt:Date.now(),read:false},
    }));
    assert.equal(await value(b,`messages/${conv}/atomic_failure`),null);
    assert.deepEqual(await value(b,`userChats/${b.uid}/${conv}`),before);
  });
  await t.test('direct membership poisoning and forged small group are rejected',async()=>{
    const directId='d_'+[a.uid,e.uid].sort().join('_');
    await assertFails(set(ref(a.db,`conversations/${directId}`),{type:'direct',name:'',members:{[a.uid]:true,[e.uid]:true,[c.uid]:true},initialPeers:{first:e.uid},createdBy:a.uid,createdAt:Date.now()}));
    await assertFails(set(ref(a.db,'conversations/forged-direct-id'),{type:'direct',name:'',members:{[a.uid]:true,[e.uid]:true},initialPeers:{first:e.uid},createdBy:a.uid,createdAt:Date.now()}));
    const victimId='d_'+[a.uid,b.uid].sort().join('_');
    await assertFails(set(ref(e.db,`conversations/${victimId}`),{type:'group',name:'Chiếm ID',members:{[e.uid]:true,[a.uid]:true,[b.uid]:true},initialPeers:{first:a.uid,second:b.uid},createdBy:e.uid,createdAt:Date.now()}));
    await assertFails(set(ref(a.db,'conversations/g_two-person-group'),{type:'group',name:'Sai',members:{[a.uid]:true,[e.uid]:true},initialPeers:{first:e.uid,second:e.uid},createdBy:a.uid,createdAt:Date.now()}));
  });
  await t.test('Firebase binary key order is preserved across upper/lower case',async()=>{
    const direct=await a.service.ensureDirectConversation(a.uid,c.uid);
    for (const id of ['AAAAAAAAAAAAAAAAAAAZ','AAAAAAAAAAAAAAAAAAAa']) {
      await set(ref(a.db,`messages/${direct}/${id}`),{senderId:a.uid,type:'text',text:'Khóa '+id,createdAt:Date.now(),recalled:false});
    }
    const page=await a.service.loadMessagePage(direct);
    assert.equal(page[0].id,'AAAAAAAAAAAAAAAAAAAa');
    assert.equal(page[1].id,'AAAAAAAAAAAAAAAAAAAZ');
  });
  await t.test('direct chat deterministic; typing disconnect clears server state',async()=>{
    const direct=await a.service.ensureDirectConversation(a.uid,b.uid);
    assert.equal(await b.service.ensureDirectConversation(b.uid,a.uid),direct);
    const typing=b.service.startTyping(b.uid,direct,()=>{});
    typing.changed(true);
    await waitUntil(async()=>Object.keys(await value(a,`typing/${direct}/${b.uid}`)||{}).length>0);
    await waitUntil(async()=>!await value(a,`typing/${direct}/${b.uid}`));
    typing.changed(true);
    await waitUntil(async()=>Object.keys(await value(a,`typing/${direct}/${b.uid}`)||{}).length>0);
    const connection=ref(b.db,`presence/${b.uid}/connections/test`);
    await onDisconnect(connection).remove();
    await onDisconnect(ref(b.db,`presence/${b.uid}/lastSeen`)).set(serverTimestamp());
    await set(connection,true);
    goOffline(b.db);
    await waitUntil(async()=>!await value(a,`typing/${direct}/${b.uid}`));
    await waitUntil(async()=>!await value(a,`presence/${b.uid}/connections`));
    assert.equal(typeof await value(a,`presence/${b.uid}/lastSeen`),'number');
    typing.stop();
  });
});
