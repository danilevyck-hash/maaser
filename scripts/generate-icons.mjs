// Generate PWA icon — Star of David with wheels
import { writeFileSync, mkdirSync } from "fs";

function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);
  const navy = [0x1A, 0x3A, 0x5C];
  const gold = [0xC9, 0xA8, 0x4C];
  const cornerR = size * 0.1875;

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = a;
  }

  function isInRoundedRect(x, y) {
    const cr = cornerR;
    if (x >= cr && x <= size - cr) return y >= 0 && y <= size;
    if (y >= cr && y <= size - cr) return x >= 0 && x <= size;
    const corners = [[cr, cr], [size - cr, cr], [cr, size - cr], [size - cr, size - cr]];
    for (const [cx, cy] of corners) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= cr * cr) return true;
    }
    if (x < cr && y < cr) return false;
    if (x > size - cr && y < cr) return false;
    if (x < cr && y > size - cr) return false;
    if (x > size - cr && y > size - cr) return false;
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

  // ---- Star of David centered, slightly higher to make room for wheels ----
  const cx = size / 2;
  const cy = size * 0.43; // shifted up a bit
  const r = size * 0.28;
  const sw = size * 0.028; // stroke width

  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  // Triangle up
  const t1 = [
    [cx, cy - r],
    [cx + r * cos30, cy + r * sin30],
    [cx - r * cos30, cy + r * sin30],
  ];
  // Triangle down
  const t2 = [
    [cx, cy + r],
    [cx + r * cos30, cy - r * sin30],
    [cx - r * cos30, cy - r * sin30],
  ];

  function isOnTriEdge(px, py, tri) {
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (distToSegment(px, py, tri[i][0], tri[i][1], tri[j][0], tri[j][1]) <= sw) return true;
    }
    return false;
  }

  // ---- Two wheels below the star ----
  const wheelY = cy + r + size * 0.1; // below star bottom
  const wheelSpacing = size * 0.18;
  const wheelR = size * 0.055;
  const wheelStroke = size * 0.018;
  const w1 = [cx - wheelSpacing, wheelY];
  const w2 = [cx + wheelSpacing, wheelY];

  // ---- Small axle lines connecting star bottom to wheels ----
  const starBottom = cy + r; // bottom point of star
  const axleTop = starBottom + size * 0.02;
  const axleBot = wheelY - wheelR;

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

      // Wheel circles (ring style)
      const w1d = Math.hypot(x - w1[0], y - w1[1]);
      const w2d = Math.hypot(x - w2[0], y - w2[1]);
      if (Math.abs(w1d - wheelR) <= wheelStroke || Math.abs(w2d - wheelR) <= wheelStroke) {
        setPixel(x, y, ...gold);
        continue;
      }
      // Wheel fill (subtle)
      if (w1d < wheelR - wheelStroke || w2d < wheelR - wheelStroke) {
        const mix = 0.2;
        setPixel(x, y,
          Math.round(navy[0] + (gold[0] - navy[0]) * mix),
          Math.round(navy[1] + (gold[1] - navy[1]) * mix),
          Math.round(navy[2] + (gold[2] - navy[2]) * mix),
        );
        continue;
      }

      // Axle lines (two thin lines from star to wheels)
      const axleSw = size * 0.012;
      if (y >= axleTop && y <= axleBot) {
        const dl = Math.abs(x - w1[0]);
        const dr = Math.abs(x - w2[0]);
        if (dl <= axleSw || dr <= axleSw) {
          setPixel(x, y, ...gold);
          continue;
        }
      }

      // Background
      setPixel(x, y, ...navy);
    }
  }

  return encodePNG(size, size, pixels);
}

function encodePNG(width, height, rgba) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
  function crc32(buf, s, l) { let c = 0xFFFFFFFF; for (let i = s; i < s + l; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function adler32(buf, s, l) { let a = 1, b = 0; for (let i = s; i < s + l; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; } return ((b << 16) | a) >>> 0; }
  const rawLen = height * (1 + width * 4);
  const raw = new Uint8Array(rawLen);
  for (let y = 0; y < height; y++) { raw[y * (1 + width * 4)] = 0; for (let x = 0; x < width * 4; x++) raw[y * (1 + width * 4) + 1 + x] = rgba[y * width * 4 + x]; }
  const maxBlock = 65535, numBlocks = Math.ceil(rawLen / maxBlock);
  const deflate = new Uint8Array(2 + numBlocks * 5 + rawLen + 4);
  deflate[0] = 0x78; deflate[1] = 0x01; let dOff = 2;
  for (let i = 0; i < numBlocks; i++) { const st = i * maxBlock, bl = Math.min(maxBlock, rawLen - st); deflate[dOff++] = i === numBlocks - 1 ? 1 : 0; deflate[dOff++] = bl & 0xFF; deflate[dOff++] = (bl >> 8) & 0xFF; deflate[dOff++] = (~bl) & 0xFF; deflate[dOff++] = ((~bl) >> 8) & 0xFF; deflate.set(raw.subarray(st, st + bl), dOff); dOff += bl; }
  const adl = adler32(raw, 0, rawLen); deflate[dOff++] = (adl >> 24) & 0xFF; deflate[dOff++] = (adl >> 16) & 0xFF; deflate[dOff++] = (adl >> 8) & 0xFF; deflate[dOff++] = adl & 0xFF;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  function makeChunk(type, data) { const ch = new Uint8Array(4 + 4 + data.length + 4); const dv = new DataView(ch.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) ch[4 + i] = type.charCodeAt(i); ch.set(data, 8); dv.setUint32(8 + data.length, crc32(ch, 4, 4 + data.length)); return ch; }
  const ihdr = new Uint8Array(13); const hd = new DataView(ihdr.buffer); hd.setUint32(0, width); hd.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 6;
  const c1 = makeChunk("IHDR", ihdr), c2 = makeChunk("IDAT", deflate.subarray(0, dOff)), c3 = makeChunk("IEND", new Uint8Array(0));
  const png = new Uint8Array(sig.length + c1.length + c2.length + c3.length); let o = 0;
  png.set(sig, o); o += sig.length; png.set(c1, o); o += c1.length; png.set(c2, o); o += c2.length; png.set(c3, o);
  return Buffer.from(png);
}

mkdirSync("public/icons", { recursive: true });
for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) { console.log(`${s}x${s}...`); writeFileSync(`public/icons/icon-${s}x${s}.png`, createPNG(s)); }
console.log("180x180..."); writeFileSync("public/apple-touch-icon.png", createPNG(180));
console.log("Done!");
