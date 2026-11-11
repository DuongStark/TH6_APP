const fs = require('node:fs');
const mode = process.argv[2];
if (!['live', 'emulator'].includes(mode)) {
  throw new Error('Usage: node scripts/select-firebase.cjs live|emulator');
}
const source = `src/services/firebase.${mode}.config.json`;
fs.copyFileSync(source, 'src/services/firebase.config.json');
console.log(`Firebase mode: ${mode}. Reload the app to apply.`);
