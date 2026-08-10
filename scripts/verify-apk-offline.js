const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const apk = path.resolve(
  __dirname,
  '..',
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk'
);
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-check-'));
const zipCopy = path.join(out, 'app.zip');
fs.copyFileSync(apk, zipCopy);

execFileSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-Command',
    `Expand-Archive -LiteralPath '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${out.replace(/'/g, "''")}' -Force`,
  ],
  { stdio: 'inherit' }
);

const cfg = path.join(out, 'assets', 'capacitor.config.json');
if (!fs.existsSync(cfg)) {
  console.error('capacitor.config.json missing in APK');
  process.exit(1);
}
const text = fs.readFileSync(cfg, 'utf8');
console.log(text);
const bad =
  text.includes('10.37.68.79') ||
  text.includes(':8101') ||
  /"server"\s*:/.test(text);
console.log(
  bad
    ? 'FAIL: still has live-reload server'
    : 'PASS: offline config (no server.url)'
);
process.exit(bad ? 1 : 0);
