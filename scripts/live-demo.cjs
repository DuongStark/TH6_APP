/* Explicit live smoke test, restricted to the dedicated TH5+ Firebase project. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase/app');
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const { getDatabase, ref, get, set } = require('firebase/database');
const config = require('../src/services/firebase.config.json');
if (config.projectId !== 'may-th5-plus-duongstark' || config.useEmulators) {
  throw new Error(
    'This script only operates on the dedicated TH5+ live project.',
  );
}
require.extensions['.ts'] = (module, filename) => {
  const result = require('@babel/core').transformFileSync(filename, {
    configFile: false,
    babelrc: false,
    presets: ['module:@react-native/babel-preset'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  module._compile(result.code, filename);
};
const filename = path.join(
  require('node:os').homedir(),
  '.local/share/th5-chat-plus/live-demo-accounts.json',
);
fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
const saved = fs.existsSync(filename)
  ? JSON.parse(fs.readFileSync(filename, 'utf8'))
  : { accounts: {} };
const apps = [];
async function person(key, name) {
  const credentials = saved.accounts[key] || {
    email: `${key}.th5plus@example.com`,
    password: crypto.randomBytes(15).toString('base64url'),
  };
  saved.accounts[key] = credentials;
  fs.writeFileSync(filename, JSON.stringify(saved, null, 2), { mode: 0o600 });
  const app = initializeApp(config, `live-demo-${key}`);
  apps.push(app);
  const auth = getAuth(app),
    database = getDatabase(app);
  try {
    await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password,
    );
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') {
      throw error;
    }
    await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password,
    );
  }
  await set(ref(database, `users/${auth.currentUser.uid}`), { name });
  return { key, uid: auth.currentUser.uid, auth, database };
}
function service(client) {
  const fake = path.resolve('src/services/firebase.ts');
  require.cache[fake] = {
    id: fake,
    filename: fake,
    loaded: true,
    exports: { auth: client.auth, database: client.database },
  };
  for (const key of ['chatService', 'groupService', 'notificationService']) {
    delete require.cache[path.resolve(`src/services/${key}.ts`)];
  }
  return {
    ...require('../src/services/chatService.ts'),
    ...require('../src/services/groupService.ts'),
  };
}
async function main() {
  const people = await Promise.all([
    person('an', 'Nguyễn An'),
    person('binh', 'Trần Bình'),
    person('chi', 'Lê Chi'),
  ]);
  for (const client of people) {
    client.service = service(client);
  }
  const [an, binh, chi] = people;
  const direct = await an.service.ensureDirectConversation(an.uid, binh.uid);
  let group = saved.group;
  if (
    !group ||
    !(await get(ref(an.database, `conversations/${group}`))).exists()
  ) {
    group = await an.service.createGroup(an.uid, 'Nhóm thực hành TH5', [
      binh.uid,
      chi.uid,
    ]);
  }
  const first = await an.service.sendMessage(an.uid, direct, {
    type: 'text',
    text: 'Mình đã hoàn thành phần chat nhóm rồi nhé!',
  });
  const reply = await binh.service.sendMessage(binh.uid, direct, {
    type: 'text',
    text: 'Tin nhắn đang chạy trên Firebase thật.',
  });
  await an.service.reactToMessage(an.uid, direct, reply, '❤️');
  const recall = await an.service.sendMessage(an.uid, direct, {
    type: 'text',
    text: 'Tin mẫu để kiểm tra thu hồi',
  });
  await an.service.recallMessage(an.uid, direct, recall);
  const last = await an.service.sendMessage(an.uid, direct, {
    type: 'text',
    text: 'Hẹn cả nhóm lúc 8 giờ nhé.',
  });
  const latest = (
    await get(ref(binh.database, `messages/${direct}/${last}`))
  ).val();
  await binh.service.markRead(binh.uid, direct, { id: last, ...latest });
  const groupMessage = await binh.service.sendMessage(binh.uid, group, {
    type: 'text',
    text: 'Bình đã vào nhóm. Tin nhắn realtime từ Firebase thật!',
  });
  await chi.service.reactToMessage(chi.uid, group, groupMessage, '👍');
  await an.service.reactToMessage(an.uid, group, groupMessage, '👍');
  await chi.service.sendMessage(chi.uid, group, {
    type: 'location',
    text: '📍 Vị trí',
    lat: 21.0285,
    lng: 105.8542,
  });
  saved.direct = direct;
  saved.group = group;
  saved.users = Object.fromEntries(people.map(p => [p.key, p.uid]));
  fs.writeFileSync(filename, JSON.stringify(saved, null, 2), { mode: 0o600 });
  const outsider = await person('eve', 'Người ngoài (kiểm thử)');
  try {
    await get(ref(outsider.database, `messages/${group}`));
    throw new Error('Security failure: outsider read unexpectedly succeeded');
  } catch (error) {
    if (!/permission.?denied/i.test(error.code || error.message)) {
      throw error;
    }
    console.log(
      'LIVE PERMISSION_DENIED confirmed: outsider cannot read group messages.',
    );
  }
  console.log(
    'LIVE SMOKE PASS: registered 3 users; direct/group send, recall, reactions, read receipt and location succeeded.',
  );
  console.log(
    'Project:',
    config.projectId,
    'Group:',
    group,
    'First message:',
    first,
  );
  console.log(
    'Private demo login credentials saved to ~/.local/share/th5-chat-plus/live-demo-accounts.json (outside repository).',
  );
}
main()
  .then(async () => {
    await Promise.all(apps.map(deleteApp));
    process.exit(0);
  })
  .catch(async error => {
    console.error(error.code || 'error', error.message);
    await Promise.all(apps.map(deleteApp));
    process.exit(1);
  });
