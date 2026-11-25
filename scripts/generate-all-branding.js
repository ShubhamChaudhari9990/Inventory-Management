const fs = require('fs');
const path = require('path');
const sharp = require(require.resolve('sharp', { paths: [process.cwd(), process.cwd() + '/node_modules/@capacitor/assets'] }));

const rootDir = path.resolve(__dirname, '..');
const uploadedImgPath = 'C:/Users/shubh/.gemini/antigravity/brain/b0c8bba6-cb33-4c6a-9ac5-9f7a61a0e6f8/.user_uploaded/media_1795437318188_d7a7b58d.png';

// ICO generator helper (multi-resolution ICO file from PNG buffers)
function createIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  let offset = 6 + (16 * pngBuffers.length);
  const directoryEntries = [];

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data
    directoryEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([
    header,
    ...directoryEntries,
    ...pngBuffers.map(p => p.buffer)
  ]);
}

async function generateAll() {
  console.log('--- Generating Official Lemonwood Lodge Brand Assets ---');
  if (!fs.existsSync(uploadedImgPath)) {
    throw new Error(`Uploaded logo image not found at ${uploadedImgPath}`);
  }

  // 1. Crop tight top logo from user upload
  // Top logo bounds: left: 161, top: 100, width: 363, height: 398
  const cropLeft = 159;
  const cropTop = 98;
  const cropWidth = 366;
  const cropHeight = 402;

  const croppedLogoBuffer = await sharp(uploadedImgPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();

  const logoAspect = cropWidth / cropHeight; // ~ 0.91

  // 2. Master Logo on White Background (1024x1024)
  const masterSize = 1024;
  const logoTargetH = 880;
  const logoTargetW = Math.round(logoTargetH * logoAspect);

  const resizedLogoMaster = await sharp(croppedLogoBuffer)
    .resize(logoTargetW, logoTargetH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  const masterLogoWhiteBg = await sharp({
    create: {
      width: masterSize,
      height: masterSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedLogoMaster,
      left: Math.round((masterSize - logoTargetW) / 2),
      top: Math.round((masterSize - logoTargetH) / 2)
    }
  ])
  .png()
  .toBuffer();

  // 3. Master App Icon (1024x1024) with Safe Padding for Circular / Squircle Clipping
  // For standard Android launcher icons and PWA icons, safe zone is ~70-75%
  const appIconH = 740;
  const appIconW = Math.round(appIconH * logoAspect);
  const resizedAppIconLogo = await sharp(croppedLogoBuffer)
    .resize(appIconW, appIconH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  const masterAppIcon = await sharp({
    create: {
      width: masterSize,
      height: masterSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedAppIconLogo,
      left: Math.round((masterSize - appIconW) / 2),
      top: Math.round((masterSize - appIconH) / 2)
    }
  ])
  .png()
  .toBuffer();

  // 4. Master App Icon Squircle (for UI mockup & previews)
  const squircleSvg = Buffer.from(`
    <svg width="${masterSize}" height="${masterSize}">
      <rect x="0" y="0" width="${masterSize}" height="${masterSize}" rx="224" ry="224" fill="#FFFFFF"/>
    </svg>
  `);
  const masterAppIconSquircle = await sharp(masterAppIcon)
    .composite([{ input: squircleSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 5. Adaptive Foreground (1024x1024 transparent, logo fits within 64% safe zone)
  const adaptiveH = 650;
  const adaptiveW = Math.round(adaptiveH * logoAspect);
  const resizedAdaptiveLogo = await sharp(croppedLogoBuffer)
    .resize(adaptiveW, adaptiveH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  const masterAdaptiveForeground = await sharp({
    create: {
      width: masterSize,
      height: masterSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
  .composite([
    {
      input: resizedAdaptiveLogo,
      left: Math.round((masterSize - adaptiveW) / 2),
      top: Math.round((masterSize - adaptiveH) / 2)
    }
  ])
  .png()
  .toBuffer();

  // 6. Master Adaptive Background (1024x1024 pure white)
  const masterAdaptiveBackground = await sharp({
    create: {
      width: masterSize,
      height: masterSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  // 7. Write assets to src/assets/branding/
  const brandingDir = path.resolve(rootDir, 'src/assets/branding');
  if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

  fs.writeFileSync(path.join(brandingDir, 'lemonwood-lodge-logo.png'), masterLogoWhiteBg);
  fs.writeFileSync(path.join(brandingDir, 'lemonwood-lodge-icon.png'), masterAppIcon);
  fs.writeFileSync(path.join(brandingDir, 'lemonwood-lodge-app-icon.png'), masterAppIconSquircle);
  console.log('Saved src/assets/branding/ core assets');

  // 8. Generate Favicons
  const faviconSizes = [16, 32, 48, 64, 128, 192, 512];
  const icoBuffers = [];

  for (const s of faviconSizes) {
    const buf = await sharp(masterAppIcon).resize(s, s).png().toBuffer();
    if (s <= 48) {
      fs.writeFileSync(path.join(brandingDir, `favicon-${s}x${s}.png`), buf);
      icoBuffers.push({ buffer: buf, size: s });
    }
    if (s === 512) {
      fs.writeFileSync(path.join(brandingDir, 'favicon.png'), buf);
    }
  }

  // Create .ico
  const icoData = createIco(icoBuffers);
  fs.writeFileSync(path.join(brandingDir, 'favicon.ico'), icoData);
  fs.writeFileSync(path.resolve(rootDir, 'src/favicon.ico'), icoData);
  fs.writeFileSync(path.resolve(rootDir, 'src/assets/icon/favicon.png'), await sharp(masterAppIcon).resize(512, 512).png().toBuffer());
  fs.writeFileSync(path.resolve(rootDir, 'src/assets/icon/lemonwood-logo.png'), masterAppIcon);
  console.log('Saved favicons and src/assets/icon/ assets');

  // 9. Root assets/ directory (for Capacitor assets tool)
  const rootAssetsDir = path.resolve(rootDir, 'assets');
  if (!fs.existsSync(rootAssetsDir)) fs.mkdirSync(rootAssetsDir, { recursive: true });

  fs.writeFileSync(path.join(rootAssetsDir, 'logo.png'), masterLogoWhiteBg);
  fs.writeFileSync(path.join(rootAssetsDir, 'logo-dark.png'), masterLogoWhiteBg);
  fs.writeFileSync(path.join(rootAssetsDir, 'icon.png'), masterAppIcon);
  fs.writeFileSync(path.join(rootAssetsDir, 'icon-only.png'), masterAppIcon);
  fs.writeFileSync(path.join(rootAssetsDir, 'icon-foreground.png'), masterAdaptiveForeground);
  fs.writeFileSync(path.join(rootAssetsDir, 'icon-background.png'), masterAdaptiveBackground);

  // Splash in assets/ (2732x2732)
  const splashMasterSize = 2732;
  const splashLogoH = 1100;
  const splashLogoW = Math.round(splashLogoH * logoAspect);
  const splashLogoBuf = await sharp(croppedLogoBuffer)
    .resize(splashLogoW, splashLogoH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  const masterSplash = await sharp({
    create: {
      width: splashMasterSize,
      height: splashMasterSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: splashLogoBuf,
      left: Math.round((splashMasterSize - splashLogoW) / 2),
      top: Math.round((splashMasterSize - splashLogoH) / 2)
    }
  ])
  .png()
  .toBuffer();

  fs.writeFileSync(path.join(rootAssetsDir, 'splash.png'), masterSplash);
  fs.writeFileSync(path.join(rootAssetsDir, 'splash-dark.png'), masterSplash);
  console.log('Saved assets/ directory masters');

  // 10. Android Mipmap Generation
  const mipmapDensities = [
    { name: 'mipmap-mdpi', iconSize: 48, adaptiveSize: 108 },
    { name: 'mipmap-hdpi', iconSize: 72, adaptiveSize: 162 },
    { name: 'mipmap-xhdpi', iconSize: 96, adaptiveSize: 216 },
    { name: 'mipmap-xxhdpi', iconSize: 144, adaptiveSize: 324 },
    { name: 'mipmap-xxxhdpi', iconSize: 192, adaptiveSize: 432 },
  ];

  for (const d of mipmapDensities) {
    const targetDir = path.resolve(rootDir, `android/app/src/main/res/${d.name}`);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png (standard icon)
    const iconBuf = await sharp(masterAppIcon).resize(d.iconSize, d.iconSize).png().toBuffer();
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconBuf);

    // ic_launcher_round.png (circular icon)
    const roundSvg = Buffer.from(`
      <svg width="${d.iconSize}" height="${d.iconSize}">
        <circle cx="${d.iconSize / 2}" cy="${d.iconSize / 2}" r="${d.iconSize / 2}" fill="#FFFFFF"/>
      </svg>
    `);
    const roundBuf = await sharp(iconBuf)
      .composite([{ input: roundSvg, blend: 'dest-in' }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), roundBuf);

    // ic_launcher_foreground.png (adaptive foreground)
    const fgBuf = await sharp(masterAdaptiveForeground).resize(d.adaptiveSize, d.adaptiveSize).png().toBuffer();
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgBuf);

    // ic_launcher_background.png (pure white background)
    const bgBuf = await sharp({
      create: {
        width: d.adaptiveSize,
        height: d.adaptiveSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_background.png'), bgBuf);

    console.log(`Generated Android ${d.name} (${d.iconSize}px / ${d.adaptiveSize}px)`);
  }

  // 11. Android Splash Screens Generation
  const splashTargets = [
    // Standard drawable
    { dir: 'drawable', w: 480, h: 320, logoH: 150 },
    { dir: 'drawable-night', w: 480, h: 320, logoH: 150 },

    // Portrait
    { dir: 'drawable-port-mdpi', w: 320, h: 480, logoH: 150 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800, logoH: 220 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280, logoH: 330 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, logoH: 440 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, logoH: 580 },

    // Portrait Night (White background for clean official brand consistency)
    { dir: 'drawable-port-night-mdpi', w: 320, h: 480, logoH: 150 },
    { dir: 'drawable-port-night-hdpi', w: 480, h: 800, logoH: 220 },
    { dir: 'drawable-port-night-xhdpi', w: 720, h: 1280, logoH: 330 },
    { dir: 'drawable-port-night-xxhdpi', w: 960, h: 1600, logoH: 440 },
    { dir: 'drawable-port-night-xxxhdpi', w: 1280, h: 1920, logoH: 580 },

    // Landscape
    { dir: 'drawable-land-mdpi', w: 480, h: 320, logoH: 150 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480, logoH: 200 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720, logoH: 300 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960, logoH: 400 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280, logoH: 500 },

    // Landscape Night
    { dir: 'drawable-land-night-mdpi', w: 480, h: 320, logoH: 150 },
    { dir: 'drawable-land-night-hdpi', w: 800, h: 480, logoH: 200 },
    { dir: 'drawable-land-night-xhdpi', w: 1280, h: 720, logoH: 300 },
    { dir: 'drawable-land-night-xxhdpi', w: 1600, h: 960, logoH: 400 },
    { dir: 'drawable-land-night-xxxhdpi', w: 1920, h: 1280, logoH: 500 },
  ];

  for (const st of splashTargets) {
    const targetDir = path.resolve(rootDir, `android/app/src/main/res/${st.dir}`);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const lH = st.logoH;
    const lW = Math.round(lH * logoAspect);
    const splashLogoResized = await sharp(croppedLogoBuffer)
      .resize(lW, lH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    const splashImg = await sharp({
      create: {
        width: st.w,
        height: st.h,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: splashLogoResized,
        left: Math.round((st.w - lW) / 2),
        top: Math.round((st.h - lH) / 2)
      }
    ])
    .png()
    .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'splash.png'), splashImg);
    console.log(`Generated Android splash ${st.dir}/splash.png (${st.w}x${st.h})`);
  }

  // 12. Fix Android ic_launcher_background.xml
  const bgXmlPath = path.resolve(rootDir, 'android/app/src/main/res/drawable/ic_launcher_background.xml');
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;
  fs.writeFileSync(bgXmlPath, bgXmlContent);
  console.log('Updated drawable/ic_launcher_background.xml with fillColor="#FFFFFF"');

  console.log('--- All Lemonwood Lodge Branding Assets Generated Successfully! ---');
}

generateAll().catch(err => {
  console.error('Fatal error during asset generation:', err);
  process.exit(1);
});
