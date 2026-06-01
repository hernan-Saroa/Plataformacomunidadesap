const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:\\\\Users\\\\Hernan_Buitrago\\\\Documents\\\\Platafomacomunidadesap\\\\Plataformacomunidadesap\\\\plantillas\\\\CARGA_2_PROGRAMAS_ASIGNATURAS_MATRIZ_2025_2.xlsx');
const sheet = workbook.Sheets['MATRIZ_OFERTA'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<10; i++) {
  console.log(`ROW ${i}:`, rows[i]);
}
