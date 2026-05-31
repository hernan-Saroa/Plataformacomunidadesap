const fs = require('fs');
const path = require('path');

const files = [
  '../apps/shell/src/assets/9366aaa7d27856d9aef10bd134f20dbe9d256906.png',
  '../apps/shell/src/assets/photo-1623156167557-281309073eef.png'
];

files.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    const buffer = fs.readFileSync(fullPath);
    console.log(`File: ${path.basename(relPath)}`);
    console.log(`  Size: ${buffer.length} bytes`);
    console.log(`  First 50 chars: ${buffer.toString('utf8', 0, 100).replace(/\r?\n|\r/g, ' ')}`);
    console.log(`  Hex: ${buffer.slice(0, 8).toString('hex')}`);
  } else {
    console.log(`File not found: ${relPath}`);
  }
});
