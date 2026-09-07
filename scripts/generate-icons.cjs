/* CommonJS icon generator for projects with "type": "module" */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const input = path.join(__dirname, '..', 'public', 'jobpoyttitle.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

async function ensureDir() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

async function generate() {
  if (!fs.existsSync(input)) {
    console.error('Source logo not found at', input);
    process.exit(1);
  }

  await ensureDir();

  for (const s of sizes) {
    const out = path.join(outDir, s.name);
    await sharp(input)
      .resize(s.size, s.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(out);
    console.log('Wrote', out);
  }

  // Create maskable 512
  const maskOut = path.join(outDir, 'icon-512x512-maskable.png');
  await sharp(input)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 90 })
    .toFile(maskOut);
  console.log('Wrote', maskOut);

  console.log('Icon generation complete.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
