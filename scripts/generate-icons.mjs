import sharp from "sharp";
import { mkdirSync } from "fs";

const LOGO = "logo.jpeg";
const NAVY = { r: 26, g: 58, b: 92 };
const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

mkdirSync("public/icons", { recursive: true });

// First, trim whitespace from logo
const trimmedLogo = await sharp(LOGO).trim().png().toBuffer();

for (const size of SIZES) {
  const cornerR = Math.round(size * 0.1875);
  const padding = Math.round(size * 0.08);
  const logoSize = size - padding * 2;

  const resizedLogo = await sharp(trimmedLogo)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 26, g: 58, b: 92, alpha: 1 } })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerR}" ry="${cornerR}" fill="white"/>
    </svg>`
  );

  const icon = await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: resizedLogo, top: padding, left: padding }])
    .png()
    .toBuffer();

  const final = await sharp(icon)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const filename = size === 180
    ? "public/apple-touch-icon.png"
    : `public/icons/icon-${size}x${size}.png`;

  await sharp(final).toFile(filename);
  console.log(`${size}x${size} ✓`);
}

console.log("Done!");
