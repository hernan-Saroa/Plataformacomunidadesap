const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../scratch/logo_original_figma.png');
if (fs.existsSync(filePath)) {
  const buffer = fs.readFileSync(filePath);
  console.log(`Size: ${buffer.length} bytes`);
  console.log(`Hex: ${buffer.slice(0, 16).toString('hex')}`);
  console.log(`ASCII: ${buffer.toString('utf8', 0, 100).replace(/\r?\n|\r/g, ' ')}`);
} else {
  console.log('File not found');
}
