const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const logoPath = path.resolve(rootDir, 'src/assets/icon/lemonwood-logo.png');

const targets = [
  { file: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 320, logoSize: 140 },
  { file: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480, logoSize: 130 },
  { file: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800, logoSize: 190 },
  { file: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280, logoSize: 280 },
  { file: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600, logoSize: 380 },
  { file: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920, logoSize: 500 },
  { file: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320, logoSize: 140 },
  { file: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480, logoSize: 190 },
  { file: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720, logoSize: 280 },
  { file: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960, logoSize: 380 },
  { file: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280, logoSize: 500 },
];

async function generate() {
  console.log('Generating LemonWood splash screens with sharp...');
  for (const t of targets) {
    const fullPath = path.resolve(rootDir, t.file);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const resizedLogo = await sharp(logoPath)
      .resize(t.logoSize, t.logoSize, { fit: 'contain' })
      .toBuffer();

    const left = Math.round((t.w - t.logoSize) / 2);
    const top = Math.round((t.h - t.logoSize) / 2);

    await sharp({
      create: {
        width: t.w,
        height: t.h,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: resizedLogo,
        top: top,
        left: left,
      }
    ])
    .png()
    .toFile(fullPath);

    console.log(`Generated: ${t.file} (${t.w}x${t.h}) with logo ${t.logoSize}px`);
  }
  console.log('All splash screens successfully generated!');
}

generate().catch(err => {
  console.error('Splash generation failed:', err);
  process.exit(1);
});
