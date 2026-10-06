// Builds the logo and every app icon from one square source image (white background).
// Usage: node scripts/make-icons.mjs <source-image>
import fs from "node:fs";
import sharp from "sharp";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/make-icons.mjs <source-image>");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
// Tight crop around the artwork, then square it.
const trimmed = await sharp(src).flatten({ background: WHITE }).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
const side = Math.max(trimmed.info.width, trimmed.info.height);
const square = await sharp(trimmed.data)
  .extend({
    top: Math.floor((side - trimmed.info.height) / 2),
    bottom: Math.ceil((side - trimmed.info.height) / 2),
    left: Math.floor((side - trimmed.info.width) / 2),
    right: Math.ceil((side - trimmed.info.width) / 2),
    background: WHITE,
  })
  .png()
  .toBuffer();

// Artwork at `scale` of the canvas, centred on white.
async function icon(size, scale) {
  const inner = Math.round(size * scale);
  const art = await sharp(square).resize(inner, inner).toBuffer();
  const pad = Math.floor((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: art, left: pad, top: pad }])
    .png()
    .toBuffer();
}

fs.writeFileSync("public/logo.png", await icon(256, 1));
fs.writeFileSync("public/icons/icon-192.png", await icon(192, 0.86));
fs.writeFileSync("public/icons/icon-512.png", await icon(512, 0.86));
// Maskable icons keep the artwork inside the 80% safe zone.
fs.writeFileSync("public/icons/icon-maskable-512.png", await icon(512, 0.7));
fs.writeFileSync("public/icons/apple-touch-icon.png", await icon(180, 0.82));

// favicon.ico holding PNG images (supported by every current browser).
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => icon(s, 0.96)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
fs.writeFileSync("app/favicon.ico", Buffer.concat([header, ...pngs]));
console.log("icons written; artwork", trimmed.info.width, "x", trimmed.info.height);
