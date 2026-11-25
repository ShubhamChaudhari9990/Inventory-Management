const fs = require('fs');
const path = require('path');
const sharp = require(require.resolve('sharp', { paths: [process.cwd(), process.cwd() + '/node_modules/@capacitor/assets'] }));

const uploadedImgPath = 'C:/Users/shubh/.gemini/antigravity/brain/b0c8bba6-cb33-4c6a-9ac5-9f7a61a0e6f8/.user_uploaded/media_1795437318188_d7a7b58d.png';

async function main() {
  console.log('Reading source image from:', uploadedImgPath);
  const img = sharp(uploadedImgPath);
  const meta = await img.metadata();
  console.log('Original dimensions:', meta.width, 'x', meta.height);

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  // Let's inspect corners and edges
  function getPixel(x, y) {
    const idx = (y * w + x) * ch;
    return [data[idx], data[idx + 1], data[idx + 2], ch === 4 ? data[idx + 3] : 255];
  }

  console.log('Pixel (0,0):', getPixel(0, 0));
  console.log('Pixel (10,10):', getPixel(10, 10));
  console.log('Pixel (341, 10):', getPixel(341, 10));
  console.log('Pixel (341, 510):', getPixel(341, 510));

  // Find exact tight bounding box of top logo
  // Bounding box of non-white pixels in upper half (y < 520)
  let minX = w, maxX = 0, minY = 520, maxY = 0;
  for (let y = 0; y < 520; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * ch;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = ch === 4 ? data[idx + 3] : 255;
      // non-white threshold
      if (a > 30 && (r < 250 || g < 250 || b < 250)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Top Logo exact tight bounds: left=${minX}, top=${minY}, width=${maxX - minX + 1}, height=${maxY - minY + 1}`);

  // Find bottom squircle icon bounds (y >= 520)
  let bMinX = w, bMaxX = 0, bMinY = h, bMaxY = 520;
  for (let y = 520; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * ch;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = ch === 4 ? data[idx + 3] : 255;
      if (a > 30 && (r < 250 || g < 250 || b < 250)) {
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
        if (y < bMinY) bMinY = y;
        if (y > bMaxY) bMaxY = y;
      }
    }
  }

  console.log(`Bottom Icon bounds: left=${bMinX}, top=${bMinY}, width=${bMaxX - bMinX + 1}, height=${bMaxY - bMinY + 1}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
