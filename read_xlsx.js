const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:\\\\Users\\\\Hernan_Buitrago\\\\Documents\\\\Platafomacomunidadesap\\\\Plataformacomunidadesap\\\\plantillas\\\\CARGA_2_PROGRAMAS_ASIGNATURAS_MATRIZ_2025_2.xlsx');
console.log('Sheets:', workbook.SheetNames);
