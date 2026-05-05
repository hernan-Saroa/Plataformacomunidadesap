const fs = require('fs');
const path = require('path');

function findMainFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        findMainFiles(filePath, fileList);
      }
    } else if (file === 'main.ts') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const mainFiles = findMainFiles(path.join(__dirname, 'backend'));
for (const file of mainFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('allowedHeaders') && !content.includes('x-client-platform')) {
    console.log('Fixing:', file);
    // Find the allowedHeaders array closing bracket relative to the allowedHeaders key
    content = content.replace(
      /(allowedHeaders:\s*\[[\s\S]*?)(?=])/g,
      `$1,\n      'x-client-platform',\n      'X-Client-Platform'`
    );
    // Clean up trailing commas before closing bracket
    content = content.replace(/,(\s*),\n(\s*)'x-client-platform'/g, `,\n$2'x-client-platform'`);
    fs.writeFileSync(file, content);
  }
}
console.log('Done matching and replacing headers.');
