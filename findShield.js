const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('c:/Users/Hernan_Buitrago/Documents/Platafomacomunidadesap/Plataformacomunidadesap/apps/mfe-gestion-legal/src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.match(/(?<!['"\])\bShield\b(?!['"\])/)) {
    const lucideMatches = content.match(/import\s+{([^}]*)}\s+from\s+['"]lucide-react['"]/g);
    let imported = false;
    if (lucideMatches) {
      for (const m of lucideMatches) {
        if (m.includes('Shield')) imported = true;
      }
    }
    if (!imported) {
      console.log('Missing import in: ' + file);
    }
  }
});
