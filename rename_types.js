const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all types.ts files in services/api
const files = execSync('find . -name "types.ts" | grep "services/api"').toString().split('\n').filter(Boolean);

const exportContent = "export * from '@esap-mfe/shared-types';\n";

for (const file of files) {
  // read current content
  const content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('export * from \'@esap-mfe/shared-types\'')) {
    fs.writeFileSync(file, exportContent);
    console.log(`Updated ${file}`);
  }
}
