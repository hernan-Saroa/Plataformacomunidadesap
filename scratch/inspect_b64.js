const fs = require('fs');
const path = require('path');

const b64File = path.join(__dirname, '../apps/mfe-control-interno/src/components/services/logoInstitucionalESAP.ts');
const content = fs.readFileSync(b64File, 'utf8');

// Find LOGO_INSTITUCIONAL_ESAP_B64
const match = content.match(/LOGO_INSTITUCIONAL_ESAP_B64\s*=\s*'data:image\/png;base64,([^']+)'/);
if (match) {
  const b64Data = match[1];
  const buffer = Buffer.from(b64Data, 'base64');
  
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  
  console.log('Decoded Base64 PNG:');
  console.log(`  Dimensions: ${width}x${height}`);
  console.log(`  Size: ${buffer.length} bytes`);
  
  // Write to a temporary file
  const destPath = path.join(__dirname, '../scratch/decoded_logo.png');
  fs.writeFileSync(destPath, buffer);
  console.log(`  Saved to ${destPath}`);
} else {
  console.log('Base64 string not found in file');
}
