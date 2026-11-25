const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Brand Colors
const BRAND_PRIMARY = '#1d3e9f';
const BRAND_PRIMARY_DARK = '#152f7a';
const BRAND_GOLD = '#f59e0b';
const BRAND_WHITE = '#ffffff';

/**
 * LemonWood Leaf & Wood Crest SVG Symbol
 * @param {number} size 
 * @param {boolean} includeBadge whether to include the rounded blue squircle badge
 */
function createEmblemSvg(size, includeBadge = false, isRound = false) {
  const badgeRadius = isRound ? size / 2 : Math.round(size * 0.22);
  
  // Safe zone scaling
  const scale = size / 100;
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#244bcc"/>
      <stop offset="100%" stop-color="#152f7a"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${Math.max(1, 1.5 * scale)}" stdDeviation="${Math.max(1, 2 * scale)}" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  ${includeBadge ? `
  <rect x="0" y="0" width="${size}" height="${size}" rx="${badgeRadius}" fill="url(#primaryGrad)"/>
  ` : ''}

  <!-- Emblem Group centered in 100x100 space scaled to ${size} -->
  <g transform="scale(${scale})" filter="url(#subtleShadow)">
    <!-- Elegant Lemon / Wood Leaf Motif -->
    <!-- Left Leaf / Wing -->
    <path d="M 50 18 C 34 26, 22 44, 25 64 C 28 80, 42 84, 50 84 C 47 72, 47 52, 50 36 Z" 
          fill="${BRAND_WHITE}" />

    <!-- Right Leaf with Lemon Yellow Accent -->
    <path d="M 50 18 C 66 26, 78 44, 75 64 C 72 80, 58 84, 50 84 C 53 72, 53 52, 50 36 Z" 
          fill="url(#goldGrad)" opacity="0.95" />

    <!-- Central Stem / Wood Grain Spine -->
    <path d="M 50 20 L 50 84" 
          stroke="${BRAND_PRIMARY_DARK}" stroke-width="2.5" stroke-linecap="round" />

    <!-- Stylized Modern 'LW' Monogram subtle ribbon at base -->
    <g transform="translate(0, 4)">
      <!-- Central decorative ring / knot -->
      <circle cx="50" cy="50" r="7" fill="${BRAND_WHITE}" />
      <circle cx="50" cy="50" r="4.5" fill="url(#primaryGrad)" />
      
      <!-- Crown leaf accent at top -->
      <path d="M 50 12 C 48 15, 48 18, 50 21 C 52 18, 52 15, 50 12 Z" fill="url(#goldGrad)" />
    </g>
  </g>
</svg>
`;
}

/**
 * Adaptive Icon Foreground:
 * 108x108 dp canvas. The center 66% (diameter 72dp) is the safe mask zone.
 */
function createAdaptiveForegroundSvg(size) {
  const emblemSize = Math.round(size * 0.62);
  const offset = Math.round((size - emblemSize) / 2);
  const scale = emblemSize / 100;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.max(1, 2 * scale)}" stdDeviation="${Math.max(1, 3 * scale)}" flood-color="#071238" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g transform="translate(${offset}, ${offset}) scale(${scale})" filter="url(#iconShadow)">
    <!-- Left Leaf (Pure White) -->
    <path d="M 50 16 C 33 24, 20 44, 24 65 C 27 81, 42 85, 50 85 C 47 72, 47 52, 50 34 Z" 
          fill="#FFFFFF" />

    <!-- Right Leaf (Warm Lemon Gold) -->
    <path d="M 50 16 C 67 24, 80 44, 76 65 C 73 81, 58 85, 50 85 C 53 72, 53 52, 50 34 Z" 
          fill="url(#goldGrad)" />

    <!-- Central Spine -->
    <path d="M 50 18 L 50 85" 
          stroke="${BRAND_PRIMARY_DARK}" stroke-width="2.5" stroke-linecap="round" />

    <!-- Center Monogram Core -->
    <circle cx="50" cy="52" r="7.5" fill="#FFFFFF" />
    <circle cx="50" cy="52" r="4.5" fill="${BRAND_PRIMARY}" />

    <!-- Top golden sprout -->
    <path d="M 50 10 C 47.5 13, 47.5 17, 50 19 C 52.5 17, 52.5 13, 50 10 Z" fill="url(#goldGrad)" />
  </g>
</svg>
`;
}

/**
 * Splash Screen SVG
 */
function createSplashSvg(width, height) {
  const isLandscape = width > height;
  const badgeSize = isLandscape ? Math.min(140, Math.round(height * 0.38)) : Math.min(160, Math.round(width * 0.38));
  const badgeRadius = Math.round(badgeSize * 0.22);
  const badgeX = Math.round((width - badgeSize) / 2);
  const badgeY = Math.round(height * 0.36 - badgeSize / 2);

  const emblemScale = (badgeSize * 0.72) / 100;
  const emblemX = badgeX + (badgeSize - 100 * emblemScale) / 2;
  const emblemY = badgeY + (badgeSize - 100 * emblemScale) / 2;

  const textY = badgeY + badgeSize + Math.round(badgeSize * 0.32);
  const subTextY = textY + Math.round(badgeSize * 0.20);

  const titleFontSize = Math.max(22, Math.round(badgeSize * 0.24));
  const subFontSize = Math.max(9, Math.round(titleFontSize * 0.38));

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#244bcc"/>
      <stop offset="100%" stop-color="#152f7a"/>
    </linearGradient>
    <linearGradient id="splashGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#1d3e9f" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Clean Crisp White Background -->
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>

  <!-- Brand Badge Container -->
  <rect x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}" rx="${badgeRadius}" 
        fill="url(#splashBadgeGrad)" filter="url(#badgeShadow)"/>

  <!-- Emblem inside badge -->
  <g transform="translate(${emblemX}, ${emblemY}) scale(${emblemScale})">
    <!-- Left Leaf (White) -->
    <path d="M 50 16 C 33 24, 20 44, 24 65 C 27 81, 42 85, 50 85 C 47 72, 47 52, 50 34 Z" fill="#FFFFFF" />

    <!-- Right Leaf (Gold) -->
    <path d="M 50 16 C 67 24, 80 44, 76 65 C 73 81, 58 85, 50 85 C 53 72, 53 52, 50 34 Z" fill="url(#splashGoldGrad)" />

    <!-- Spine -->
    <path d="M 50 18 L 50 85" stroke="${BRAND_PRIMARY_DARK}" stroke-width="2.5" stroke-linecap="round" />

    <!-- Center Monogram Dot -->
    <circle cx="50" cy="52" r="7.5" fill="#FFFFFF" />
    <circle cx="50" cy="52" r="4.5" fill="${BRAND_PRIMARY}" />

    <!-- Top sprout -->
    <path d="M 50 10 C 47.5 13, 47.5 17, 50 19 C 52.5 17, 52.5 13, 50 10 Z" fill="url(#splashGoldGrad)" />
  </g>

  <!-- Brand Title -->
  <text x="${width / 2}" y="${textY}" 
        font-family="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="${titleFontSize}" 
        font-weight="700" 
        fill="${BRAND_PRIMARY}" 
        text-anchor="middle" 
        letter-spacing="-0.5px">LemonWood</text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="${subTextY}" 
        font-family="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="${subFontSize}" 
        font-weight="600" 
        fill="#6b7280" 
        text-anchor="middle" 
        letter-spacing="3.5px">LODGE MANAGEMENT</text>
</svg>
`;
}

async function run() {
  console.log('Generating LemonWood assets...');

  // 1. Android Adaptive Foregrounds
  const adaptiveDensities = [
    { folder: 'mipmap-mdpi', size: 108 },
    { folder: 'mipmap-hdpi', size: 162 },
    { folder: 'mipmap-xhdpi', size: 216 },
    { folder: 'mipmap-xxhdpi', size: 324 },
    { folder: 'mipmap-xxxhdpi', size: 432 },
  ];

  for (const { folder, size } of adaptiveDensities) {
    const outDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', folder);
    const svg = createAdaptiveForegroundSvg(size);
    const outFile = path.join(outDir, 'ic_launcher_foreground.png');
    await sharp(Buffer.from(svg)).png().toFile(outFile);
    console.log(`Generated ${outFile} (${size}x${size})`);
  }

  // 2. Android Legacy Launcher Icons (Square & Round)
  const legacyDensities = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { folder, size } of legacyDensities) {
    const outDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', folder);
    
    // Square launcher
    const squareSvg = createEmblemSvg(size, true, false);
    const squareFile = path.join(outDir, 'ic_launcher.png');
    await sharp(Buffer.from(squareSvg)).png().toFile(squareFile);

    // Round launcher
    const roundSvg = createEmblemSvg(size, true, true);
    const roundFile = path.join(outDir, 'ic_launcher_round.png');
    await sharp(Buffer.from(roundSvg)).png().toFile(roundFile);

    console.log(`Generated legacy icons in ${folder} (${size}x${size})`);
  }

  // 3. Android Splash Screens
  const splashScreens = [
    { dir: 'drawable', w: 480, h: 320 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  ];

  for (const { dir, w, h } of splashScreens) {
    const outDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', dir);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const svg = createSplashSvg(w, h);
    const outFile = path.join(outDir, 'splash.png');
    await sharp(Buffer.from(svg)).png().toFile(outFile);
    console.log(`Generated splash in ${dir} (${w}x${h})`);
  }

  // 4. Web Favicon and Brand Icons
  const faviconSvg = createEmblemSvg(64, true, false);
  const faviconPath = path.join(__dirname, '..', 'src', 'assets', 'icon', 'favicon.png');
  await sharp(Buffer.from(faviconSvg)).png().toFile(faviconPath);
  console.log(`Generated favicon at ${faviconPath}`);

  // Also full resolution logo PNG in assets
  const logoSvg = createEmblemSvg(512, true, false);
  const logoPath = path.join(__dirname, '..', 'src', 'assets', 'icon', 'lemonwood-logo.png');
  await sharp(Buffer.from(logoSvg)).png().toFile(logoPath);
  console.log(`Generated full logo at ${logoPath}`);

  console.log('All LemonWood assets generated successfully!');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
