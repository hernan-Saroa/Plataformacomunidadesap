const fs = require('fs');
const path = require('path');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        findFiles(filePath, filter, fileList);
      }
    } else if (file === filter) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const appsDir = 'c:\\Users\\Hernan_Buitrago\\Documents\\Platafomacomunidadesap\\Plataformacomunidadesap\\apps';
const files = findFiles(appsDir, 'rolesPermisosSync.ts');

let modifiedCount = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('perm-jefe-personas')) {
    // Regex that handles the exact block with its surrounding commas and braces
    const targetBlock = /\s*\/\/\s*Acceso consulta a Gestión Personas[\s\S]*?descripcion:\s*'Consulta de roles y permisos'\s*\n\s*}/g;
    
    let newContent = content.replace(targetBlock, '');
    
    // Also we need to fix the trailing comma left behind, like `},\n      \n    ],`
    newContent = newContent.replace(/},\s*\]/g, '}\n    ]');
    
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${file}`);
  }
}

console.log(`Total modified: ${modifiedCount}`);
