// Rasterises public/icons/icon.svg into the PWA icon set. Run: node scripts/generate-icons.mjs
import sharp from "sharp";

const src = "public/icons/icon.svg";
const out = [
  ["public/icons/icon-192.png", 192, 0],
  ["public/icons/icon-512.png", 512, 0],
  ["public/icons/apple-touch-icon.png", 180, 0],
  // Maskable: artwork inside the 80% safe zone on a full-bleed background.
  ["public/icons/icon-maskable-512.png", 512, 52],
];

for (const [file, size, pad] of out) {
  const inner = size - pad * 2;
  await sharp(src, { density: 384 })
    .resize(inner, inner)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#0b5d6b" })
    .flatten({ background: "#0b5d6b" })
    .png()
    .toFile(file);
  console.log(file);
}
