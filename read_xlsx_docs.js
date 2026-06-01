const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:\\\\Users\\\\Hernan_Buitrago\\\\Documents\\\\Platafomacomunidadesap\\\\Plataformacomunidadesap\\\\plantillas\\\\CARGA_2_PROGRAMAS_ASIGNATURAS_MATRIZ_2025_2.xlsx');

const readme = xlsx.utils.sheet_to_json(workbook.Sheets['README'], { header: 1 });
console.log('--- README ---');
readme.forEach(row => {
  if (row.length > 0) console.log(row.join(' | '));
});

const diccionario = xlsx.utils.sheet_to_json(workbook.Sheets['DICCIONARIO'], { header: 1 });
console.log('\\n--- DICCIONARIO ---');
diccionario.forEach(row => {
  if (row.length > 0) console.log(row.join(' | '));
});
