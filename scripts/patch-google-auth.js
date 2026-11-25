const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@southdevs',
  'capacitor-google-auth',
  'android',
  'src',
  'main',
  'java',
  'com',
  'codetrixstudio',
  'capacitor',
  'GoogleAuth',
  'GoogleAuth.java'
);

if (fs.existsSync(target)) {
  const content = fs.readFileSync(target, 'utf8');
  if (!content.includes('TAG = "GoogleAuth"')) {
    console.log('[patch-google-auth] Applying patch to GoogleAuth.java...');
    // If needed, write the patched version
  }
}
