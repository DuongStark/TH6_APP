/** Local emulator only. Never accepts a production host or Firebase project. */
const fs = require('node:fs'),
  path = require('node:path');
const { initializeApp, deleteApp } = require('firebase/app');
const {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  get,
  set,
  onDisconnect,
  serverTimestamp,
} = require('firebase/database');
require.extensions['.ts'] = (module, filename) => {
  const result = require('@babel/core').transformFileSync(filename, {
    configFile: false,
    babelrc: false,
    presets: ['module:@react-native/babel-preset'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  module._compile(result.code, filename);
};
const apps = [];
async function client(key, name) {
  const app = initializeApp(
    {
      apiKey: 'demo-api-key',
      projectId: 'demo-th5-chat-plus',
      databaseURL: 'https://demo-th5-chat-plus-default-rtdb.firebaseio.com',
    },
    `demo-${key}`,
  );
  apps.push(app);
  const auth = getAuth(app),
    database = getDatabase(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(database, '127.0.0.1', 9000);
  try {
    await createUserWithEmailAndPassword(
      auth,
      `${key}@th5.local`,
      'Th5demo123!',
    );
  } catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e;
    await signInWithEmailAndPassword(auth, `${key}@th5.local`, 'Th5demo123!');
  }
  const uid = auth.currentUser.uid;
  await set(ref(database, `users/${uid}`), { name });
  const filename = path.resolve('src/services/firebase.ts');
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports: { auth, database },
  };
  for (const serviceName of [
    'chatService',
    'groupService',
    'notificationService',
  ])
    delete require.cache[path.resolve(`src/services/${serviceName}.ts`)];
  return {
    key,
    uid,
    database,
    service: {
      ...require('../src/services/chatService.ts'),
      ...require('../src/services/groupService.ts'),
    },
  };
}
async function main() {
  const an = await client('an', 'Nguyễn An'),
    binh = await client('binh', 'Trần Bình'),
    chi = await client('chi', 'Lê Chi');
  const direct = await an.service.ensureDirectConversation(an.uid, binh.uid);
  const index =
    (await get(ref(an.database, `userChats/${an.uid}`))).val() || {};
  let group;
  for (const id of Object.keys(index)) {
    const info = (await get(ref(an.database, `conversations/${id}`))).val();
    if (info?.type === 'group' && info.name === 'Nhóm thực hành TH5') {
      group = id;
      break;
    }
  }
  if (!group)
    group = await an.service.createGroup(an.uid, 'Nhóm thực hành TH5', [
      binh.uid,
      chi.uid,
    ]);
  const data = {
    direct,
    group,
    users: { an: an.uid, binh: binh.uid, chi: chi.uid },
  };
  fs.mkdirSync('.local', { recursive: true });
  fs.writeFileSync('.local/demo.json', JSON.stringify(data, null, 2));
  if (process.argv[2] === 'scene') {
    await an.service.sendMessage(an.uid, direct, {
      type: 'text',
      text: 'Mình đã hoàn thành phần chat nhóm rồi nhé!',
    });
    const m2 = await binh.service.sendMessage(binh.uid, direct, {
      type: 'text',
      text: 'Tuyệt, mình đang kiểm tra trạng thái đã xem.',
    });
    await an.service.reactToMessage(an.uid, direct, m2, '❤️');
    const recalled = await an.service.sendMessage(an.uid, direct, {
      type: 'text',
      text: 'Tin này sẽ thu hồi',
    });
    await an.service.recallMessage(an.uid, direct, recalled);
    const last = await an.service.sendMessage(an.uid, direct, {
      type: 'text',
      text: 'Hẹn cả nhóm lúc 8 giờ nhé.',
    });
    const message = (
      await get(ref(binh.database, `messages/${direct}/${last}`))
    ).val();
    await binh.service.markRead(binh.uid, direct, { id: last, ...message });
    const gm = await binh.service.sendMessage(binh.uid, group, {
      type: 'text',
      text: 'Bình đã vào nhóm. Tin nhắn cập nhật ngay lập tức!',
    });
    await chi.service.reactToMessage(chi.uid, group, gm, '👍');
    await an.service.reactToMessage(an.uid, group, gm, '👍');
    await chi.service.sendMessage(chi.uid, group, {
      type: 'location',
      text: '📍 Vị trí',
      lat: 21.0285,
      lng: 105.8542,
    });
    console.log(
      'Đã tạo cảnh kiểm tra văn bản, thu hồi, cảm xúc, đã xem, nhóm và vị trí. Không tạo ảnh upload giả.',
    );
  }
  console.log(JSON.stringify(data, null, 2));
  console.log(
    'Tài khoản Emulator: an@th5.local / binh@th5.local / chi@th5.local; mật khẩu Th5demo123!',
  );
  if (process.argv[2] === 'typing') {
    const handles = [];
    for (const person of [binh, chi]) {
      const presence = ref(
        person.database,
        `presence/${person.uid}/connections/demo`,
      );
      await onDisconnect(presence).remove();
      await onDisconnect(
        ref(person.database, `presence/${person.uid}/lastSeen`),
      ).set(serverTimestamp());
      await set(presence, true);
    }
    handles.push(binh.service.startTyping(binh.uid, direct, console.error));
    handles.push(chi.service.startTyping(chi.uid, group, console.error));
    handles.forEach(h => h.changed(true));
    const timer = setInterval(
      () => handles.forEach(h => h.changed(true)),
      1200,
    );
    console.log(
      'Demo users typing for 60 seconds (SDK clients, not extra Android devices).',
    );
    await new Promise(resolve => setTimeout(resolve, 60000));
    clearInterval(timer);
    handles.forEach(h => h.stop());
  }
  await Promise.all(apps.map(deleteApp));
}
main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
