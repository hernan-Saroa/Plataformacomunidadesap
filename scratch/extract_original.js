const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Extract 1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png from commit 8a6fc42e
try {
  const commitHash = '8a6fc42e';
  const filePath = 'src/assets/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
  const outputPath = path.join(__dirname, '../scratch/logo_original_figma.png');
  
  // Use git show to output the binary file content
  const buffer = execSync(`git show ${commitHash}:${filePath}`, { maxBuffer: 50 * 1024 * 1024 });
  fs.writeFileSync(outputPath, buffer);
  
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  
  console.log(`Successfully extracted ${filePath} from commit ${commitHash}`);
  console.log(`  Dimensions: ${width}x${height}`);
  console.log(`  Size: ${buffer.length} bytes`);
  console.log(`  Saved to ${outputPath}`);
} catch (err) {
  console.error('Error extracting file:', err.message);
}
