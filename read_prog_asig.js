const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:\\\\Users\\\\Hernan_Buitrago\\\\Documents\\\\Platafomacomunidadesap\\\\Plataformacomunidadesap\\\\plantillas\\\\CARGA_2_PROGRAMAS_ASIGNATURAS_MATRIZ_2025_2.xlsx');
const sheet = workbook.Sheets['PROGRAMAS'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<3; i++) {
  console.log(`PROG ROW ${i}:`, rows[i]);
}

const asigSheet = workbook.Sheets['ASIGNATURAS'];
const asigRows = xlsx.utils.sheet_to_json(asigSheet, { header: 1 });
for(let i=0; i<3; i++) {
  console.log(`ASIG ROW ${i}:`, asigRows[i]);
}
