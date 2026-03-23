import sharp from "sharp";
import { mkdirSync } from "fs";

const NAVY = "#1A3A5C";
const GOLD = "#C9A84C";
const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

mkdirSync("public/icons", { recursive: true });

function starOfDavidSVG(size) {
  const cr = Math.round(size * 0.1875);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;

  // Two overlapping equilateral triangles
  const h = r * Math.sqrt(3) / 2;

  // Triangle pointing up (vertices)
  const t1x1 = cx;
  const t1y1 = cy - r;
  const t1x2 = cx - h;
  const t1y2 = cy + r / 2;
  const t1x3 = cx + h;
  const t1y3 = cy + r / 2;

  // Triangle pointing down (vertices)
  const t2x1 = cx;
  const t2y1 = cy + r;
  const t2x2 = cx - h;
  const t2y2 = cy - r / 2;
  const t2x3 = cx + h;
  const t2y3 = cy - r / 2;

  const sw = Math.max(size * 0.02, 1.5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <clipPath id="rounded">
        <rect width="${size}" height="${size}" rx="${cr}" ry="${cr}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#rounded)">
      <rect width="${size}" height="${size}" fill="${NAVY}"/>
      <!-- Triangle up -->
      <polygon points="${t1x1},${t1y1} ${t1x2},${t1y2} ${t1x3},${t1y3}"
        fill="none" stroke="${GOLD}" stroke-width="${sw}" stroke-linejoin="round"/>
      <!-- Triangle down -->
      <polygon points="${t2x1},${t2y1} ${t2x2},${t2y2} ${t2x3},${t2y3}"
        fill="none" stroke="${GOLD}" stroke-width="${sw}" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

for (const size of SIZES) {
  const svg = starOfDavidSVG(size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const filename = size === 180
    ? "public/apple-touch-icon.png"
    : `public/icons/icon-${size}x${size}.png`;

  await sharp(pngBuffer).toFile(filename);
  console.log(`${size}x${size} ✓`);
}

// Also save icon.svg.png at 512
const svgFull = starOfDavidSVG(512);
await sharp(Buffer.from(svgFull)).png().toFile("public/icon.svg.png");

console.log("Done!");
