const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const branding = path.join(root, 'src/assets/branding');
const assets = path.join(root, 'assets');
const sheetPath = path.join(branding, 'lemonwood-lodge-logo-source-sheet.png');

// White surface behind adaptive icon / splash (logo is charcoal + gold).
const SURFACE = { r: 255, g: 255, b: 255 };
const MASTER_SIZE = 2048; // high-res working canvas for crisp mipmaps/splash
const PNG = { compressionLevel: 9, adaptiveFiltering: true, palette: false };

async function loadMaster(sourcePath) {
  // Decode whatever format (jpeg-in-.png), convert to lossless PNG, then upscale.
  const base = await sharp(sourcePath)
    .ensureAlpha()
    .png(PNG)
    .toBuffer();

  const meta = await sharp(base).metadata();
  const scale = Math.max(MASTER_SIZE / meta.width, MASTER_SIZE / meta.height);
  if (scale <= 1.01) {
    return base;
  }

  return sharp(base)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    })
    .png(PNG)
    .toBuffer();
}

/**
 * Remove near-white background via corner flood-fill so JPEG artifacts
 * don't leave a fuzzy halo, and logo gold/charcoal pixels stay intact.
 */
async function makeWhiteTransparent(inputBuf, threshold = 236) {
  const { data, info } = await sharp(inputBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const visited = new Uint8Array(w * h);
  const isBg = (i) => {
    const o = i * 4;
    return data[o] >= threshold && data[o + 1] >= threshold && data[o + 2] >= threshold;
  };

  const queue = [];
  const seeds = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)];
  for (const s of seeds) {
    if (isBg(s)) {
      visited[s] = 1;
      queue.push(s);
    }
  }

  while (queue.length) {
    const i = queue.pop();
    data[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i / w) | 0;
    const neighbors = [];
    if (x > 0) neighbors.push(i - 1);
    if (x + 1 < w) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - w);
    if (y + 1 < h) neighbors.push(i + w);
    for (const n of neighbors) {
      if (!visited[n] && isBg(n)) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  // Soften remaining near-white fringe inside the content box.
  for (let i = 0; i < w * h; i++) {
    if (visited[i]) continue;
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    if (r >= 250 && g >= 250 && b >= 250) {
      data[o + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png(PNG)
    .toBuffer();
}

async function contentBBox(pngBuf, alphaCut = 8) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3];
      if (a > alphaCut) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    throw new Error('No opaque content found');
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function placeCentered(contentBuf, canvasSize, maxContentRatio = 0.72) {
  const meta = await sharp(contentBuf).metadata();
  const maxSide = Math.floor(canvasSize * maxContentRatio);
  const scale = Math.min(maxSide / meta.width, maxSide / meta.height, 1);
  // Prefer not upscaling again if content is already large enough.
  const w = Math.max(1, Math.round(meta.width * Math.min(scale, maxSide / meta.width)));
  const h = Math.max(1, Math.round(meta.height * (w / meta.width)));
  const fitW = Math.min(w, maxSide);
  const fitH = Math.min(h, maxSide);
  const finalScale = Math.min(maxSide / meta.width, maxSide / meta.height);
  const rw = Math.max(1, Math.round(meta.width * finalScale));
  const rh = Math.max(1, Math.round(meta.height * finalScale));
  const left = Math.floor((canvasSize - rw) / 2);
  const top = Math.floor((canvasSize - rh) / 2);

  const resized = await sharp(contentBuf)
    .resize(rw, rh, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    })
    .png(PNG)
    .toBuffer();

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png(PNG)
    .toBuffer();
}

async function onSurface(contentBuf, canvasSize) {
  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 3,
      background: SURFACE,
    },
  })
    .composite([{ input: contentBuf, gravity: 'centre' }])
    .png(PNG)
    .toBuffer();
}

(async () => {
  fs.mkdirSync(branding, { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync(path.join(root, 'src/assets/icon'), { recursive: true });

  if (!fs.existsSync(sheetPath)) {
    throw new Error(`Missing source: ${sheetPath}`);
  }

  const srcMeta = await sharp(sheetPath).metadata();
  console.log('source', srcMeta.width, 'x', srcMeta.height, srcMeta.format);

  const master = await loadMaster(sheetPath);
  const masterMeta = await sharp(master).metadata();
  console.log('master', masterMeta.width, 'x', masterMeta.height);

  let logoBuf = await makeWhiteTransparent(master, 236);
  const bbox = await contentBBox(logoBuf);
  // Keep generous transparent padding but don't shrink the artwork.
  const pad = Math.round(Math.max(bbox.width, bbox.height) * 0.04);
  logoBuf = await sharp(logoBuf)
    .extract(bbox)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG)
    .toBuffer();

  // Save a 2x web display asset (crisp on high-DPI screens).
  const logoMeta = await sharp(logoBuf).metadata();
  await sharp(logoBuf).png(PNG).toFile(path.join(branding, 'lemonwood-lodge-logo.png'));
  await sharp(logoBuf)
    .resize(Math.min(1024, logoMeta.width), Math.min(1024, logoMeta.height), {
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
    })
    .png(PNG)
    .toFile(path.join(root, 'src/assets/logo.png'));

  // Icon mark = building only (top ~58%).
  const markHeight = Math.floor(logoMeta.height * 0.58);
  let markBuf = await sharp(logoBuf)
    .extract({ left: 0, top: 0, width: logoMeta.width, height: markHeight })
    .png(PNG)
    .toBuffer();
  const markBBox = await contentBBox(markBuf);
  markBuf = await sharp(markBuf)
    .extract(markBBox)
    .extend({
      top: 24,
      bottom: 24,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG)
    .toBuffer();

  const iconMark2048 = await placeCentered(markBuf, 2048, 0.82);
  await sharp(iconMark2048).png(PNG).toFile(path.join(branding, 'lemonwood-lodge-icon.png'));

  for (const size of [16, 32, 48, 64, 128, 180, 192, 512]) {
    const out =
      size <= 48
        ? path.join(branding, `favicon-${size}x${size}.png`)
        : path.join(branding, `icon-${size}.png`);
    await sharp(iconMark2048)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png(PNG)
      .toFile(out);
  }

  await sharp(iconMark2048)
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png(PNG)
    .toFile(path.join(branding, 'favicon.png'));

  await sharp(iconMark2048)
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png(PNG)
    .toFile(path.join(root, 'src/assets/icon/favicon.png'));

  await sharp({
    create: { width: 180, height: 180, channels: 3, background: SURFACE },
  })
    .composite([
      {
        input: await sharp(iconMark2048)
          .resize(150, 150, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
          .png(PNG)
          .toBuffer(),
        gravity: 'centre',
      },
    ])
    .png(PNG)
    .toFile(path.join(root, 'src/assets/icon/apple-touch-icon.png'));

  // Capacitor sources at high resolution (>=1024; we use 2048 for sharpness).
  const foreground = await placeCentered(logoBuf, 2048, 0.68);
  const iconOnlyTransparent = await placeCentered(logoBuf, 2048, 0.74);
  const iconOnly = await onSurface(iconOnlyTransparent, 2048);
  const background = await sharp({
    create: { width: 2048, height: 2048, channels: 3, background: SURFACE },
  })
    .png(PNG)
    .toBuffer();

  const splashLogo = await placeCentered(logoBuf, 2732, 0.46);
  const splash = await onSurface(splashLogo, 2732);

  await sharp(iconOnly).toFile(path.join(assets, 'icon-only.png'));
  await sharp(foreground).toFile(path.join(assets, 'icon-foreground.png'));
  await sharp(background).toFile(path.join(assets, 'icon-background.png'));
  await sharp(splash).toFile(path.join(assets, 'splash.png'));
  await sharp(splash).toFile(path.join(assets, 'splash-dark.png'));
  await sharp(await placeCentered(logoBuf, 2048, 0.82)).toFile(path.join(assets, 'logo.png'));

  // favicon.ico from crisp 16/32/48
  const sizes = [16, 32, 48];
  const images = [];
  for (const s of sizes) {
    images.push(
      await sharp(iconMark2048)
        .resize(s, s, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: sharp.kernel.lanczos3,
        })
        .png(PNG)
        .toBuffer()
    );
  }
  const count = images.length;
  let offset = 6 + 16 * count;
  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    dirEntries.push({ s: sizes[i], size: images[i].length, offset });
    offset += images[i].length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  for (let i = 0; i < count; i++) {
    const o = i * 16;
    const d = dirEntries[i];
    entries[o] = d.s === 256 ? 0 : d.s;
    entries[o + 1] = d.s === 256 ? 0 : d.s;
    entries.writeUInt16LE(1, o + 4);
    entries.writeUInt16LE(32, o + 6);
    entries.writeUInt32LE(d.size, o + 8);
    entries.writeUInt32LE(d.offset, o + 12);
  }
  fs.writeFileSync(
    path.join(branding, 'favicon.ico'),
    Buffer.concat([header, entries, ...images])
  );

  const finalMeta = await sharp(logoBuf).metadata();
  console.log('logo out', finalMeta.width + 'x' + finalMeta.height, 'bytes', finalMeta.size);
  console.log('DONE');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
