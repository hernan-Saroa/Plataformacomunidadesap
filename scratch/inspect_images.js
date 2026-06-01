const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    // PNG signature check
    if (buffer.readUInt32BE(0) !== 0x89504E47) {
      return { error: 'Not a valid PNG file' };
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, sizeBytes: buffer.length };
  } catch (err) {
    return { error: err.message };
  }
}

const assetsDir = path.join(__dirname, '../apps/shell/src/assets');
console.log('Inspecting PNG files in:', assetsDir);

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  files.forEach(file => {
    if (file.endsWith('.png')) {
      const fullPath = path.join(assetsDir, file);
      const info = getPngDimensions(fullPath);
      console.log(`File: ${file}`);
      console.log(`  Info:`, info);
    }
  });
} else {
  console.log('Directory does not exist');
}

const otherPath1 = path.join(__dirname, '../apps/mfe-control-interno/src/assets/esap-logo-institucional.png');
if (fs.existsSync(otherPath1)) {
  console.log(`File: esap-logo-institucional.png`);
  console.log(`  Info:`, getPngDimensions(otherPath1));
}

const otherPath2 = path.join(__dirname, '../backend/certification-service/uploads/logos/logo-esap-default.png');
if (fs.existsSync(otherPath2)) {
  console.log(`File: logo-esap-default.png`);
  console.log(`  Info:`, getPngDimensions(otherPath2));
}
