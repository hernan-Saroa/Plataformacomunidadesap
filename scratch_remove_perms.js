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
  
  // Find the block to remove
  // We'll use a regex that matches the comment to the end of the perm-jefe-roles block
  const regex = /\s*\/\/ Acceso consulta a Gestión Personas[\s\S]*?descripcion:\s*'Consulta de roles y permisos'\s*\n\s*}\n/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, '\n');
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${file}`);
  }
}

console.log(`Total modified: ${modifiedCount}`);
