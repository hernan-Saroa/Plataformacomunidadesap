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
    content = content.replace(
      /'x-client-version',(\s*)\]/g,
      `'x-client-version',\n      'x-client-platform',\n      'X-Client-Platform',$1]`
    );
    // Also try simple append if the regex doesn't match
    if (!content.includes('x-client-platform')) {
      content = content.replace(
        /'X-Requested-With',(\s*)\]/g,
        `'X-Requested-With',\n      'x-client-platform',\n      'X-Client-Platform',$1]`
      );
    }
    fs.writeFileSync(file, content);
  }
}
console.log('Done matching and replacing headers.');
