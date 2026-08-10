const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const logoPath = path.join(root, 'src/assets/branding/lemonwood-lodge-logo.png');
const resRoot = path.join(root, 'android/app/src/main/res');
const PNG = { compressionLevel: 9, adaptiveFiltering: true, palette: false };
const WHITE = { r: 255, g: 255, b: 255 };

/**
 * Portrait / landscape splash sizes used by Capacitor assets.
 * Logo fills ~58% of the shorter side so FIT_CENTER stays sharp (no crop zoom).
 */
const PORTRAIT = {
  'drawable-port-ldpi': [240, 320],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1440, 2560], // sharper than default 1280x1920
  drawable: [1440, 2560], // high-res fallback used by many devices
};

const LANDSCAPE = {
  'drawable-land-ldpi': [320, 240],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [2560, 1440],
};

const NIGHT_MAP = {
  drawable: 'drawable-night',
  'drawable-port-ldpi': 'drawable-port-night-ldpi',
  'drawable-port-mdpi': 'drawable-port-night-mdpi',
  'drawable-port-hdpi': 'drawable-port-night-hdpi',
  'drawable-port-xhdpi': 'drawable-port-night-xhdpi',
  'drawable-port-xxhdpi': 'drawable-port-night-xxhdpi',
  'drawable-port-xxxhdpi': 'drawable-port-night-xxxhdpi',
  'drawable-land-ldpi': 'drawable-land-night-ldpi',
  'drawable-land-mdpi': 'drawable-land-night-mdpi',
  'drawable-land-hdpi': 'drawable-land-night-hdpi',
  'drawable-land-xhdpi': 'drawable-land-night-xhdpi',
  'drawable-land-xxhdpi': 'drawable-land-night-xxhdpi',
  'drawable-land-xxxhdpi': 'drawable-land-night-xxxhdpi',
};

async function makeSplash(logoBuf, width, height, fillRatio = 0.58) {
  const shortSide = Math.min(width, height);
  const maxLogo = Math.round(shortSide * fillRatio);
  const logoMeta = await sharp(logoBuf).metadata();
  const scale = Math.min(maxLogo / logoMeta.width, maxLogo / logoMeta.height);
  const lw = Math.max(1, Math.round(logoMeta.width * scale));
  const lh = Math.max(1, Math.round(logoMeta.height * scale));

  const resized = await sharp(logoBuf)
    .resize(lw, lh, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    })
    .png(PNG)
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png(PNG)
    .toBuffer();
}

async function writeSplash(dirName, width, height, logoBuf) {
  const dir = path.join(resRoot, dirName);
  fs.mkdirSync(dir, { recursive: true });
  const buf = await makeSplash(logoBuf, width, height, 0.58);
  const out = path.join(dir, 'splash.png');
  fs.writeFileSync(out, buf);
  console.log(dirName, width + 'x' + height, buf.length);
  return out;
}

(async () => {
  if (!fs.existsSync(logoPath)) {
    throw new Error('Missing branding logo: ' + logoPath);
  }

  // Start from the high-res transparent logo (already ~1680px).
  const logoBuf = await sharp(logoPath).ensureAlpha().png(PNG).toBuffer();

  // Android 12+ splash icon (shown in center circle). Use a large crisp square.
  const iconSize = 1152;
  const splashIconLogo = await sharp(logoBuf)
    .resize(Math.round(iconSize * 0.78), Math.round(iconSize * 0.78), {
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG)
    .toBuffer();

  const splashIcon = await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: splashIconLogo, gravity: 'centre' }])
    .png(PNG)
    .toBuffer();

  fs.mkdirSync(path.join(resRoot, 'drawable'), { recursive: true });
  fs.writeFileSync(path.join(resRoot, 'drawable', 'splash_icon.png'), splashIcon);
  console.log('splash_icon', iconSize + 'x' + iconSize, splashIcon.length);

  // Also keep a plain centered logo drawable for layer-list backgrounds.
  const splashLogo = await sharp(logoBuf)
    .resize(1024, 1024, {
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG)
    .toBuffer();
  fs.writeFileSync(path.join(resRoot, 'drawable', 'splash_logo.png'), splashLogo);

  for (const [dir, [w, h]] of Object.entries(PORTRAIT)) {
    await writeSplash(dir, w, h, logoBuf);
    const night = NIGHT_MAP[dir];
    if (night) await writeSplash(night, w, h, logoBuf);
  }

  for (const [dir, [w, h]] of Object.entries(LANDSCAPE)) {
    await writeSplash(dir, w, h, logoBuf);
    const night = NIGHT_MAP[dir];
    if (night) await writeSplash(night, w, h, logoBuf);
  }

  // Capacitor source splash (for future regenerate)
  const assetsSplash = await makeSplash(logoBuf, 2732, 2732, 0.5);
  fs.writeFileSync(path.join(root, 'assets', 'splash.png'), assetsSplash);
  fs.writeFileSync(path.join(root, 'assets', 'splash-dark.png'), assetsSplash);

  console.log('DONE');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
