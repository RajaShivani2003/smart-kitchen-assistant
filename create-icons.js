const fs = require('fs');

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
  <rect width="192" height="192" rx="32" fill="#f97316"/>
  <text x="96" y="120" font-size="80" text-anchor="middle" fill="white" font-family="Arial">🍳</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#f97316"/>
  <text x="256" y="320" font-size="200" text-anchor="middle" fill="white" font-family="Arial">🍳</text>
</svg>`;

fs.writeFileSync('public/icons/icon-192.svg', svg192);
fs.writeFileSync('public/icons/icon-512.svg', svg512);
console.log('SVG icons created');
