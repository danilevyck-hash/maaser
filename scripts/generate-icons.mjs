import sharp from "sharp";
import { mkdirSync } from "fs";

const NAVY = "#1A3A5C";
const GOLD = "#C9A84C";
const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

mkdirSync("public/icons", { recursive: true });

for (const size of SIZES) {
  const cr = Math.round(size * 0.1875);
  const cx = size / 2;
  const cy = size * 0.46;
  const coinR = size * 0.32;
  const sw = size * 0.025;

  // Location pin inside the coin
  // Pin body: a teardrop pointing down
  const pinCx = cx;
  const pinTopCy = cy - coinR * 0.45;
  const pinR = coinR * 0.3;
  const pinBottomY = cy + coinR * 0.55;
  // Pin inner circle (hole)
  const pinHoleR = pinR * 0.4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <clipPath id="rounded">
        <rect width="${size}" height="${size}" rx="${cr}" ry="${cr}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#rounded)">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${NAVY}"/>

      <!-- Coin circle (ring) -->
      <circle cx="${cx}" cy="${cy}" r="${coinR}" fill="none" stroke="${GOLD}" stroke-width="${sw}"/>
      <circle cx="${cx}" cy="${cy}" r="${coinR - sw * 1.8}" fill="none" stroke="${GOLD}" stroke-width="${sw * 0.4}" opacity="0.4"/>

      <!-- Location pin inside coin -->
      <path d="
        M ${pinCx} ${pinBottomY}
        C ${pinCx - pinR * 0.15} ${pinBottomY - pinR * 1.2}
          ${pinCx - pinR} ${pinTopCy + pinR * 0.6}
          ${pinCx - pinR} ${pinTopCy}
        A ${pinR} ${pinR} 0 1 1 ${pinCx + pinR} ${pinTopCy}
        C ${pinCx + pinR} ${pinTopCy + pinR * 0.6}
          ${pinCx + pinR * 0.15} ${pinBottomY - pinR * 1.2}
          ${pinCx} ${pinBottomY}
        Z
      " fill="${GOLD}"/>

      <!-- Pin hole -->
      <circle cx="${pinCx}" cy="${pinTopCy}" r="${pinHoleR}" fill="${NAVY}"/>
    </g>
  </svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const filename = size === 180
    ? "public/apple-touch-icon.png"
    : `public/icons/icon-${size}x${size}.png`;

  await sharp(pngBuffer).toFile(filename);
  console.log(`${size}x${size} ✓`);
}

// Also save SVG
const svgFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${NAVY}"/>
  <circle cx="256" cy="236" r="164" fill="none" stroke="${GOLD}" stroke-width="13"/>
  <circle cx="256" cy="236" r="140" fill="none" stroke="${GOLD}" stroke-width="5" opacity="0.4"/>
  <path d="M 256 330 C 248.6 271.1 206.8 260 206.8 212.8 A 49.2 49.2 0 1 1 305.2 212.8 C 305.2 260 263.4 271.1 256 330 Z" fill="${GOLD}"/>
  <circle cx="256" cy="212.8" r="19.7" fill="${NAVY}"/>
</svg>`;
await sharp(Buffer.from(svgFull)).png().toFile("public/icon.svg.png");

console.log("Done!");
