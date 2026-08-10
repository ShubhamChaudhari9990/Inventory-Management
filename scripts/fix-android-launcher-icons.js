const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sizes = {
  ldpi: 36,
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};
const fg = path.join(root, 'assets/icon-foreground.png');
const SURFACE = { r: 255, g: 255, b: 255 };
const PNG = { compressionLevel: 9, adaptiveFiltering: true, palette: false };

(async () => {
  for (const [dens, size] of Object.entries(sizes)) {
    const dir = path.join(root, 'android/app/src/main/res', `mipmap-${dens}`);
    const logo = await sharp(fg)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png(PNG)
      .toBuffer();

    const onSurface = await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: SURFACE,
      },
    })
      .composite([{ input: logo, gravity: 'centre' }])
      .png(PNG)
      .toBuffer();

    const roundMask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
    );
    const round = await sharp(onSurface)
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png(PNG)
      .toBuffer();

    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), onSurface);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), round);

    await sharp(fg)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png(PNG)
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: SURFACE,
      },
    })
      .png(PNG)
      .toFile(path.join(dir, 'ic_launcher_background.png'));

    console.log(dens, size, 'ok');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
