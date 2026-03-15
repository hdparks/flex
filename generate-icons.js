const sharp = require('sharp');
const path = require('path');

const size192 = 192;
const size512 = 512;
const orange = '#ff6b35';
const dark = '#0f0f1a';

async function createIcon(size, filename) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${dark}"/>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-weight="bold" 
            font-size="${size * 0.5}" fill="${orange}" text-anchor="middle" dominant-baseline="middle">
        F
      </text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(__dirname, 'public', filename));
  
  console.log(`Created ${filename}`);
}

async function main() {
  await createIcon(size192, 'icon-192.png');
  await createIcon(size512, 'icon-512.png');
  console.log('Icons created successfully!');
}

main().catch(console.error);
