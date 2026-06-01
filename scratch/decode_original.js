const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../scratch/logo_original_figma.png');
const destPath = path.join(__dirname, '../scratch/original_decoded.png');

if (fs.existsSync(srcPath)) {
  const b64Text = fs.readFileSync(srcPath, 'utf8').trim();
  const buffer = Buffer.from(b64Text, 'base64');
  fs.writeFileSync(destPath, buffer);
  
  if (buffer.readUInt32BE(0) === 0x89504E47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log('Decoded PNG from early commit:');
    console.log(`  Dimensions: ${width}x${height}`);
    console.log(`  Size: ${buffer.length} bytes`);
    console.log(`  Saved to ${destPath}`);
  } else {
    console.log('Decoded data is not a valid PNG.');
    console.log('Hex signature:', buffer.slice(0, 8).toString('hex'));
  }
} else {
  console.log('Source file not found');
}
