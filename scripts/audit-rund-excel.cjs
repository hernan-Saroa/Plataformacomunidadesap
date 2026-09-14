// Compara el archivo con los registros persistidos. Solo lectura; no imprime datos personales.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const XLSX = require('xlsx');
const { Client } = require('pg');
const serviceRoot = path.resolve(__dirname, '../backend/academic-work-plan-service');
const env = require(path.join(serviceRoot, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(serviceRoot, '.env')));
const config = { host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER, password: env.DB_PASS, database: env.DB_NAME };

function readExcel(file) {
  const buffer = fs.readFileSync(file);
  const book = XLSX.read(buffer, { type: 'buffer' });
  const sheet = book.Sheets.CARGA_DOCENTES || book.Sheets[book.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headerIndex = matrix.findIndex(row => row.includes('DOCUMENTO_IDENTIDAD') && row.includes('TERRITORIAL'));
  if (headerIndex < 0) throw new Error('No se reconoce el encabezado de carga docente.');
  return { sha256: crypto.createHash('sha256').update(buffer).digest('hex'), headers: matrix[headerIndex],
    rows: XLSX.utils.sheet_to_json(sheet, { range: headerIndex, defval: null }).filter(row => row.DOCUMENTO_IDENTIDAD) };
}

const columns = {
  DOCUMENTO_IDENTIDAD: 'num_identificacion', TIPO_DOCUMENTO: 'tip_identificacion', NOMBRE_COMPLETO: 'nom_largo',
  GENERO: 'gen_tercero', SEXO_BIOLOGICO: 'sexoBiologico', FECHA_NACIMIENTO: 'nacimiento', EDAD: 'edadReferencia',
  RANGO_EDAD: 'rangoEdad', CORREO_INSTITUCIONAL: 'correoInstitucional', CORREO_PERSONAL: 'correoAlternativo', TELEFONO: 'tel_celular',
  VINCULACION: 'vinculacionDisplay', REGIMEN_NORMATIVO: 'regimenNormativo', HORAS_PTA: 'horasAsignables', TERRITORIAL: 'territorial',
  DEDICACION: 'dedicacionDisplay', DEDICACION_HORAS_SEMANA: 'dedicacionHorasSemana', CATEGORIA_ESCALAFON: 'escalafon',
  INICIO_VINCULACION: 'inicio', FIN_VINCULACION: 'fin', ESTADO_DOCENTE: 'estado', ACTO_ADMINISTRATIVO: 'actoAdministrativoVinculacion',
  ORIGEN_VINCULACION: 'origenVinculacion', PUNTAJE_SALARIAL: 'puntajeSalarial', SITUACION_ADMINISTRATIVA: 'situacionAdministrativa',
  SITUACION_CATEGORIA: 'situacionCategoria', NIVEL_FORMACION: 'nivelFormacion', TITULO_PREGRADO: 'pregrado',
  TITULO_ESPECIALIZACION: 'especializacion', TITULO_MAESTRIA: 'maestria', TITULO_DOCTORADO: 'doctorado', TITULO_POSDOCTORADO: 'posDoctorado',
  NUCLEO_TEMATICO: 'nucleoTematico', PERFIL_ACADEMICO: 'perfilAcademico', INVESTIGACION_ACTIVA: 'investigacion',
  ULTIMA_EVALUACION: 'ultimaEvaluacion', OBSERVACIONES: 'observaciones', ID_RUND: 'idRund',
};
const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
function calendar(value) {
  if (!value || clean(value) === 'INDEFINIDO') return null;
  if (typeof value === 'number') { const d = XLSX.SSF.parse_date_code(value); return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; }
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}` : String(value).slice(0,10);
}
async function readProfiles(client, period) {
  return (await client.query(`SELECT d.*, p.num_identificacion, p.tip_identificacion, p.nom_largo, p.gen_tercero, p.tel_celular,
      p.fec_nacimiento::text AS nacimiento, d."fechaInicioVinculacion"::date::text AS inicio,
      d."fechaFinVinculacion"::date::text AS fin, s.nom_seccional AS territorial
    FROM academic_work_plan."Docente" d JOIN auth.personas p ON p.id_person::text=d."personaId"::text
    LEFT JOIN auth.seccionales s ON s.id_seccional::text=d."territorialId"
    WHERE ($1::text IS NULL OR d."periodoCarga"=$1)`, [period || null])).rows;
}
async function main() {
  const file = process.argv[2]; if (!file) throw new Error('Uso: node scripts/audit-rund-excel.cjs archivo.xlsx [periodo]');
  const source = readExcel(file), client = new Client(config);
  try {
    await client.connect(); await client.query('BEGIN READ ONLY');
    const profiles = await readProfiles(client, process.argv[3]);
    const summary = {};
    for (const profile of profiles) {
      const row = source.rows.find(r => clean(r.DOCUMENTO_IDENTIDAD) === clean(profile.num_identificacion));
      if (!row) continue;
      const period = profile.periodoCarga || 'SIN_PERIODO';
      summary[period] ||= { coincidentes: 0, columnas: {}, territoriales: {} };
      const group = summary[period]; group.coincidentes++;
      const key = `${profile.territorialId}: ${row.TERRITORIAL}`;
      group.territoriales[key] = (group.territoriales[key] || 0) + 1;
      for (const header of source.headers) {
        const column = columns[header]; let original = row[header], saved = profile[column];
        if (['FECHA_NACIMIENTO','INICIO_VINCULACION','FIN_VINCULACION'].includes(header)) original=calendar(original);
        if (header === 'GENERO') original = clean(original).startsWith('MASC') ? 'M' : clean(original).startsWith('FEM') ? 'F' : original;
        if (header === 'TERRITORIAL') saved = profile.territorialReportada || saved;
        const entry = group.columnas[header] ||= { enExcel: 0, enBD: 0, iguales: 0, diferentes: 0 };
        if (clean(original)) entry.enExcel++;
        if (clean(saved)) entry.enBD++;
        if (clean(original) === clean(saved)) entry.iguales++; else entry.diferentes++;
      }
    }
    const imports = (await client.query('SELECT nombre_archivo, sha256, estado, resumen FROM academic_work_plan."RundCargaMasiva"')).rows;
    const report = { archivo: path.basename(file), sha256: source.sha256, filas: source.rows.length,
      columnasReales: source.headers.length, sinMapeo: source.headers.filter(h => !columns[h]),
      soportesCoincidentes: imports.filter(i=>i.sha256 === source.sha256).map(i=>({ archivo:i.nombre_archivo, estado:i.estado })), periodos: summary };
    console.log(JSON.stringify(report, null, 2)); await client.query('ROLLBACK');
  } finally { await client.end(); }
}
module.exports = { readExcel, readProfiles, clean, calendar, config, columns };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode=1; });
