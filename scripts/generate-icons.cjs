/* CommonJS icon generator for projects with "type": "module" */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const input = path.join(__dirname, '..', 'public', 'jobpoyttitle.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [
  { name: 'jobpoyt-icon-192-v4.png', size: 192 },
  { name: 'jobpoyt-icon-512-v4.png', size: 512 },
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
  const maskOut = path.join(outDir, 'jobpoyt-icon-512-maskable-v4.png');
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
