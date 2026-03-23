// Generate PWA icon PNGs — Star of David (top) + Car silhouette (bottom)
import { writeFileSync, mkdirSync } from "fs";

function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);
  const navy = [0x1A, 0x3A, 0x5C];
  const gold = [0xC9, 0xA8, 0x4C];
  const cornerR = size * 0.1875;

  function setPixel(x, y, r, g, b, a = 255) {
    const idx = (y * size + x) * 4;
    pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = a;
  }

  function blend(bg, fg, alpha) {
    return [
      Math.round(bg[0] + (fg[0] - bg[0]) * alpha),
      Math.round(bg[1] + (fg[1] - bg[1]) * alpha),
      Math.round(bg[2] + (fg[2] - bg[2]) * alpha),
    ];
  }

  function isInRoundedRect(x, y) {
    const l = 0, r = size, t = 0, b = size, cr = cornerR;
    if (x >= l + cr && x <= r - cr) return y >= t && y <= b;
    if (y >= t + cr && y <= b - cr) return x >= l && x <= r;
    const corners = [[l + cr, t + cr], [r - cr, t + cr], [l + cr, b - cr], [r - cr, b - cr]];
    for (const [cx, cy] of corners) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= cr * cr) return true;
    }
    if (x < l + cr && y < t + cr) return false;
    if (x > r - cr && y < t + cr) return false;
    if (x < l + cr && y > b - cr) return false;
    if (x > r - cr && y > b - cr) return false;
    return true;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function distToPolyline(px, py, pts) {
    let min = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      min = Math.min(min, distToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
    }
    return min;
  }

  // ---- Star of David (upper portion) ----
  const cx = size / 2;
  const starCy = size * 0.37;
  const starR = size * 0.22;
  const sw = size * 0.025;

  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const t1 = [[cx, starCy - starR], [cx + starR * cos30, starCy + starR * sin30], [cx - starR * cos30, starCy + starR * sin30]];
  const t2 = [[cx, starCy + starR], [cx + starR * cos30, starCy - starR * sin30], [cx - starR * cos30, starCy - starR * sin30]];

  function isOnTriEdge(px, py, tri) {
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (distToSegment(px, py, tri[i][0], tri[i][1], tri[j][0], tri[j][1]) <= sw) return true;
    }
    return false;
  }

  // ---- Car silhouette (lower portion) ----
  const carCy = size * 0.72;
  const carScale = size / 512;
  // Car body outline points (relative to center)
  const carBody = [
    [-60, 0], [-60, -20], [-35, -20], [-20, -45], [30, -45], [50, -20], [60, -20], [60, 0]
  ].map(([x, y]) => [cx + x * carScale, carCy + y * carScale]);

  const carSw = size * 0.02;
  // Wheels
  const wheel1 = [cx - 30 * carScale, carCy + 5 * carScale];
  const wheel2 = [cx + 35 * carScale, carCy + 5 * carScale];
  const wheelR = 14 * carScale;

  // Road line
  const roadY = carCy + 25 * carScale;
  const roadL = cx - 80 * carScale;
  const roadR = cx + 80 * carScale;

  // ---- Render ----
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isInRoundedRect(x, y)) {
        setPixel(x, y, 0, 0, 0, 0);
        continue;
      }

      // Star edges
      if (isOnTriEdge(x, y, t1) || isOnTriEdge(x, y, t2)) {
        setPixel(x, y, ...gold);
        continue;
      }

      // Car body stroke
      const carDist = distToPolyline(x, y, carBody);
      if (carDist <= carSw) {
        setPixel(x, y, ...gold);
        continue;
      }

      // Wheels
      const w1Dist = Math.hypot(x - wheel1[0], y - wheel1[1]);
      const w2Dist = Math.hypot(x - wheel2[0], y - wheel2[1]);
      if (w1Dist <= wheelR || w2Dist <= wheelR) {
        const c = blend(navy, gold, 0.6);
        setPixel(x, y, ...c);
        continue;
      }

      // Road line
      if (Math.abs(y - roadY) <= carSw * 0.4 && x >= roadL && x <= roadR) {
        const c = blend(navy, gold, 0.35);
        setPixel(x, y, ...c);
        continue;
      }

      // Background
      setPixel(x, y, ...navy);
    }
  }

  return encodePNG(size, size, pixels);
}

function encodePNG(width, height, rgba) {
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
  function adler32(buf, start, len) {
    let a = 1, b = 0;
    for (let i = start; i < start + len; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }
  const rawLen = height * (1 + width * 4);
  const raw = new Uint8Array(rawLen);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width * 4; x++) raw[y * (1 + width * 4) + 1 + x] = rgba[y * width * 4 + x];
  }
  const maxBlock = 65535;
  const numBlocks = Math.ceil(rawLen / maxBlock);
  const deflateLen = 2 + numBlocks * 5 + rawLen + 4;
  const deflate = new Uint8Array(deflateLen);
  deflate[0] = 0x78; deflate[1] = 0x01;
  let dOff = 2;
  for (let i = 0; i < numBlocks; i++) {
    const start = i * maxBlock, remaining = rawLen - start;
    const blockLen = Math.min(maxBlock, remaining);
    deflate[dOff++] = i === numBlocks - 1 ? 1 : 0;
    deflate[dOff++] = blockLen & 0xFF; deflate[dOff++] = (blockLen >> 8) & 0xFF;
    deflate[dOff++] = (~blockLen) & 0xFF; deflate[dOff++] = ((~blockLen) >> 8) & 0xFF;
    deflate.set(raw.subarray(start, start + blockLen), dOff); dOff += blockLen;
  }
  const adl = adler32(raw, 0, rawLen);
  deflate[dOff++] = (adl >> 24) & 0xFF; deflate[dOff++] = (adl >> 16) & 0xFF;
  deflate[dOff++] = (adl >> 8) & 0xFF; deflate[dOff++] = adl & 0xFF;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  function makeChunk(type, data) {
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    dv.setUint32(8 + data.length, crc32(chunk, 4, 4 + data.length));
    return chunk;
  }
  const ihdr = new Uint8Array(13);
  const ihdrDv = new DataView(ihdr.buffer);
  ihdrDv.setUint32(0, width); ihdrDv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6;
  const ihdrC = makeChunk("IHDR", ihdr);
  const idatC = makeChunk("IDAT", deflate.subarray(0, dOff));
  const iendC = makeChunk("IEND", new Uint8Array(0));
  const png = new Uint8Array(sig.length + ihdrC.length + idatC.length + iendC.length);
  let off = 0;
  png.set(sig, off); off += sig.length;
  png.set(ihdrC, off); off += ihdrC.length;
  png.set(idatC, off); off += idatC.length;
  png.set(iendC, off);
  return Buffer.from(png);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
mkdirSync("public/icons", { recursive: true });

for (const s of sizes) {
  console.log(`${s}x${s}...`);
  writeFileSync(`public/icons/icon-${s}x${s}.png`, createPNG(s));
}
console.log("180x180 (apple-touch-icon)...");
writeFileSync("public/apple-touch-icon.png", createPNG(180));
console.log("Done!");
