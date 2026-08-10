const fs = require('fs');
const path = require('path');

const configPath = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'capacitor.config.json'
);

if (!fs.existsSync(configPath)) {
  console.log('No android capacitor.config.json yet (run cap sync first).');
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.server) {
  console.warn(
    'Removing live-reload server config from android capacitor.config.json:',
    config.server
  );
  delete config.server;
  fs.writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n');
} else {
  console.log('Offline Capacitor config OK (no server.url).');
}
