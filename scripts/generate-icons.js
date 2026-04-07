const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#007AFF"/>
      <stop offset="100%" stop-color="#0055CC"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <!-- Divider lines -->
  <line x1="256" y1="140" x2="256" y2="372" stroke="white" stroke-width="2" opacity="0.3"/>
  <line x1="140" y1="256" x2="372" y2="256" stroke="white" stroke-width="2" opacity="0.3"/>

  <!-- Top-left: Star of David -->
  <g transform="translate(176, 196)" fill="none" stroke="white" stroke-width="8">
    <polygon points="0,-40 34.6,20 -34.6,20"/>
    <polygon points="0,40 34.6,-20 -34.6,-20"/>
  </g>

  <!-- Top-right: Car -->
  <g transform="translate(336, 196)">
    <rect x="-30" y="-15" width="60" height="30" rx="10" fill="none" stroke="white" stroke-width="8"/>
    <circle cx="-15" cy="20" r="8" fill="white"/>
    <circle cx="15" cy="20" r="8" fill="white"/>
    <path d="M-20,-15 L-12,-30 L12,-30 L20,-15" fill="none" stroke="white" stroke-width="6"/>
  </g>

  <!-- Bottom-left: House -->
  <g transform="translate(176, 316)">
    <path d="M0,-35 L35,5 L25,5 L25,30 L-25,30 L-25,5 L-35,5 Z" fill="none" stroke="white" stroke-width="8" stroke-linejoin="round"/>
    <rect x="-8" y="10" width="16" height="20" rx="2" fill="white" opacity="0.8"/>
  </g>

  <!-- Bottom-right: Wallet/Money -->
  <g transform="translate(336, 316)">
    <rect x="-30" y="-20" width="60" height="40" rx="8" fill="none" stroke="white" stroke-width="8"/>
    <line x1="-30" y1="-5" x2="30" y2="-5" stroke="white" stroke-width="6"/>
    <circle cx="18" cy="10" r="7" fill="white"/>
  </g>
</svg>`;

const sizes = [
  { name: 'icon-512x512.png', size: 512, dir: 'icons' },
  { name: 'icon-384x384.png', size: 384, dir: 'icons' },
  { name: 'icon-192x192.png', size: 192, dir: 'icons' },
  { name: 'icon-152x152.png', size: 152, dir: 'icons' },
  { name: 'icon-144x144.png', size: 144, dir: 'icons' },
  { name: 'icon-128x128.png', size: 128, dir: 'icons' },
  { name: 'icon-96x96.png', size: 96, dir: 'icons' },
  { name: 'icon-72x72.png', size: 72, dir: 'icons' },
  { name: 'apple-touch-icon.png', size: 180, dir: '' },
  { name: 'favicon-32x32.png', size: 32, dir: '' },
  { name: 'favicon-16x16.png', size: 16, dir: '' },
];

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

async function generate() {
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svg);

  for (const { name, size, dir } of sizes) {
    const outputDir = dir ? path.join(publicDir, dir) : publicDir;
    const outputPath = path.join(outputDir, name);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${dir ? dir + '/' : ''}${name} (${size}x${size})`);
  }

  // Also save the SVG itself
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
  console.log('Generated: icon.svg');

  console.log('\nAll icons generated successfully!');
}

generate().catch(console.error);
