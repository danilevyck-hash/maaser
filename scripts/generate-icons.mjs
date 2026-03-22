// Generate PWA icon PNGs using pure Node.js (no native deps)
// Creates a simple but recognizable Star of David icon as PNG
import { writeFileSync } from "fs";

// Minimal PNG encoder - creates uncompressed PNGs
function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);
  const navy = [0x1A, 0x3A, 0x5C, 0xFF];
  const gold = [0xC9, 0xA8, 0x4C, 0xFF];
  const goldFaint = [0x39, 0x53, 0x5C, 0xFF]; // blended navy+gold at 25% opacity
  const cx = size / 2, cy = size / 2;
  const r = size * 0.29; // star radius
  const strokeW = size * 0.027;
  const cornerR = size * 0.1875; // rounded corner radius

  function isInRoundedRect(x, y) {
    const margin = 0;
    const left = margin, right = size - margin, top = margin, bottom = size - margin;
    const cr = cornerR;
    if (x >= left + cr && x <= right - cr) return y >= top && y <= bottom;
    if (y >= top + cr && y <= bottom - cr) return x >= left && x <= right;
    // Check corners
    const corners = [
      [left + cr, top + cr],
      [right - cr, top + cr],
      [left + cr, bottom - cr],
      [right - cr, bottom - cr],
    ];
    for (const [ccx, ccy] of corners) {
      const dx = x - ccx, dy = y - ccy;
      if (dx * dx + dy * dy <= cr * cr) return true;
    }
    // Inside the rect but outside corners
    if (x < left + cr && y < top + cr) return false;
    if (x > right - cr && y < top + cr) return false;
    if (x < left + cr && y > bottom - cr) return false;
    if (x > right - cr && y > bottom - cr) return false;
    return true;
  }

  // Point-in-triangle test
  function sign(p1x, p1y, p2x, p2y, p3x, p3y) {
    return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
  }
  function inTriangle(px, py, v1x, v1y, v2x, v2y, v3x, v3y) {
    const d1 = sign(px, py, v1x, v1y, v2x, v2y);
    const d2 = sign(px, py, v2x, v2y, v3x, v3y);
    const d3 = sign(px, py, v3x, v3y, v1x, v1y);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  // Distance from point to line segment
  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // Triangle 1: pointing up
  const t1 = [
    [cx, cy - r],
    [cx + r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6)],
    [cx - r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6)],
  ];
  // Triangle 2: pointing down
  const t2 = [
    [cx, cy + r],
    [cx + r * Math.cos(Math.PI / 6), cy - r * Math.sin(Math.PI / 6)],
    [cx - r * Math.cos(Math.PI / 6), cy - r * Math.sin(Math.PI / 6)],
  ];

  // Hexagon center vertices
  const hex = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (i * Math.PI) / 3;
    hex.push([cx + r * 0.5 * Math.cos(angle), cy + r * 0.5 * Math.sin(angle)]);
  }

  function isOnTriangleEdge(px, py, tri) {
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (distToSegment(px, py, tri[i][0], tri[i][1], tri[j][0], tri[j][1]) <= strokeW) {
        return true;
      }
    }
    return false;
  }

  function isInHexagon(px, py) {
    // Check using 4 triangles from center
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      if (inTriangle(px, py, cx, cy, hex[i][0], hex[i][1], hex[j][0], hex[j][1])) return true;
    }
    return false;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (!isInRoundedRect(x, y)) {
        pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0; pixels[idx + 3] = 0;
        continue;
      }
      // Check star edges
      if (isOnTriangleEdge(x, y, t1) || isOnTriangleEdge(x, y, t2)) {
        pixels[idx] = gold[0]; pixels[idx + 1] = gold[1]; pixels[idx + 2] = gold[2]; pixels[idx + 3] = 255;
      } else if (isInHexagon(x, y)) {
        pixels[idx] = goldFaint[0]; pixels[idx + 1] = goldFaint[1]; pixels[idx + 2] = goldFaint[2]; pixels[idx + 3] = 255;
      } else {
        pixels[idx] = navy[0]; pixels[idx + 1] = navy[1]; pixels[idx + 2] = navy[2]; pixels[idx + 3] = 255;
      }
    }
  }

  return encodePNG(size, size, pixels);
}

function encodePNG(width, height, rgba) {
  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  function crc32(buf, start, len) {
    let c = 0xFFFFFFFF;
    for (let i = start; i < start + len; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // Adler32
  function adler32(buf, start, len) {
    let a = 1, b = 0;
    for (let i = start; i < start + len; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  // Raw image data with filter byte (0 = None) per row
  const rawLen = height * (1 + width * 4);
  const raw = new Uint8Array(rawLen);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter none
    for (let x = 0; x < width * 4; x++) {
      raw[y * (1 + width * 4) + 1 + x] = rgba[y * width * 4 + x];
    }
  }

  // Deflate: store blocks (no compression, max 65535 bytes per block)
  const maxBlock = 65535;
  const numBlocks = Math.ceil(rawLen / maxBlock);
  const deflateLen = 2 + numBlocks * 5 + rawLen + 4; // zlib header + blocks + adler
  const deflate = new Uint8Array(deflateLen);
  deflate[0] = 0x78; deflate[1] = 0x01; // zlib header
  let dOff = 2;
  for (let i = 0; i < numBlocks; i++) {
    const start = i * maxBlock;
    const remaining = rawLen - start;
    const blockLen = Math.min(maxBlock, remaining);
    const isLast = i === numBlocks - 1;
    deflate[dOff++] = isLast ? 1 : 0;
    deflate[dOff++] = blockLen & 0xFF;
    deflate[dOff++] = (blockLen >> 8) & 0xFF;
    deflate[dOff++] = (~blockLen) & 0xFF;
    deflate[dOff++] = ((~blockLen) >> 8) & 0xFF;
    deflate.set(raw.subarray(start, start + blockLen), dOff);
    dOff += blockLen;
  }
  const adl = adler32(raw, 0, rawLen);
  deflate[dOff++] = (adl >> 24) & 0xFF;
  deflate[dOff++] = (adl >> 16) & 0xFF;
  deflate[dOff++] = (adl >> 8) & 0xFF;
  deflate[dOff++] = adl & 0xFF;

  // Build PNG
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  function makeChunk(type, data) {
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    const c = crc32(chunk, 4, 4 + data.length);
    dv.setUint32(8 + data.length, c);
    return chunk;
  }

  // IHDR
  const ihdr = new Uint8Array(13);
  const ihdrDv = new DataView(ihdr.buffer);
  ihdrDv.setUint32(0, width);
  ihdrDv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", deflate.subarray(0, dOff));
  const iendChunk = makeChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let off = 0;
  png.set(sig, off); off += sig.length;
  png.set(ihdrChunk, off); off += ihdrChunk.length;
  png.set(idatChunk, off); off += idatChunk.length;
  png.set(iendChunk, off);

  return Buffer.from(png);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const dir = "public/icons";
import { mkdirSync } from "fs";
mkdirSync(dir, { recursive: true });

for (const size of sizes) {
  console.log(`Generating ${size}x${size}...`);
  const png = createPNG(size);
  writeFileSync(`${dir}/icon-${size}x${size}.png`, png);
}

// Also generate apple-touch-icon (180x180)
console.log("Generating 180x180 (apple-touch-icon)...");
const applePng = createPNG(180);
writeFileSync("public/apple-touch-icon.png", applePng);

console.log("Done!");
