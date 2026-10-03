// Run: node scripts/verify-labor-functions-template.cjs
// Executes the component's actual Excel and validation functions without a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../backend/certification-service/node_modules/typescript');
const XLSX = require('xlsx');

const source = ts.createSourceFile('LaborFunctionsManager.tsx', fs.readFileSync(
  path.join(__dirname, '../apps/mfe-certificados-laborales/src/components/LaborFunctionsManager.tsx'), 'utf8',
), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set([
  'normalizeHeader', 'OFFICIAL_SHEET_NAME', 'OFFICIAL_TEMPLATE_MARKER',
  'OFFICIAL_TEMPLATE_HEADERS', 'NORMALIZED_OFFICIAL_TEMPLATE_HEADERS',
  'normalizeMatchText', 'findHeader', 'normalizeDocument', 'extractFunctionItems', 'splitFunctions',
  'validateEditor', 'validateBulkRows', 'downloadTemplate', 'parseExcel', 'payloadFromEditor',
]);
const declarations = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) {
    declarations.push(`const ${node.getText(source)};`);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(declarations.length, names.size, 'All production helpers must be found');
let downloadedBlob;
const context = vm.createContext({
  XLSX, Blob,
  toast: { success() {}, error(message) { throw new Error(message); } },
  URL: { createObjectURL(blob) { downloadedBlob = blob; return 'blob:test'; }, revokeObjectURL() {} },
  document: { createElement() { return { click() {}, remove() {} }; }, body: { appendChild() {} } },
  window: { setTimeout(callback) { callback(); } },
});
vm.runInContext(ts.transpileModule(
  `${declarations.join('\n')}\nglobalThis.helpers = { ${[...names].join(', ')} };`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText, context);
const helpers = context.helpers;

const fileFor = (workbook) => {
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { name: 'matriz.xlsx', size: bytes.length, arrayBuffer: async () => bytes };
};

(async () => {
  await helpers.downloadTemplate();
  const workbook = XLSX.read(await downloadedBlob.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[helpers.OFFICIAL_SHEET_NAME];
  const header = XLSX.utils.sheet_to_json(sheet, { header: 1 })[2];
  assert.deepEqual(header, ['Número de identificación', 'FUNCIONES']);
  assert(sheet['!merges'].every(merge => merge.e.c === 1));
  const examples = XLSX.utils.sheet_to_json(workbook.Sheets['Ejemplos - No importar'], { header: 1 }).slice(1);
  assert(examples.every(row => row.length === 2));
  XLSX.utils.sheet_add_aoa(sheet, examples, { origin: 'A4' });
  const rows = await helpers.parseExcel(fileFor(workbook));
  assert.equal(rows.length, 2);
  assert.equal(rows[1].idNumber, '0012345678');
  assert.equal(helpers.validateBulkRows(rows).length, 0);
  assert.equal(helpers.splitFunctions(rows[0].functions).length, 2);
  assert.equal(helpers.validateBulkRows([rows[0], { ...rows[0], rowNumber: 9 }]).length, 1);
  assert.equal(helpers.validateBulkRows([{ ...rows[0], idNumber: 'abc123' }])[0].field, 'idNumber');
  const longDocument = '12345678901234567890';
  XLSX.utils.sheet_add_aoa(sheet, [[longDocument, 'Revisar los expedientes institucionales.']], { origin: 'A4' });
  assert.equal((await helpers.parseExcel(fileFor(workbook)))[0].idNumber, longDocument);
  const text = 'Aplicar el numeral 2. Revisar los expedientes institucionales.';
  assert.equal(helpers.extractFunctionItems(text).length, 1);
  assert.equal(helpers.extractFunctionItems(text)[0], text);
  assert.equal(helpers.splitFunctions('1. '+text+'\n2. Presentar informes institucionales.').length, 2);
  const payload = helpers.payloadFromEditor({idNumber:'00.123.456-78',functions:text});
  assert.equal(payload.idNumber, '0012345678');
  assert.deepEqual(Object.keys(payload).sort(), ['functions','idNumber','sourceSheet']);
  // Reject the old eight-column template rather than interpreting a job code as a document.
  XLSX.utils.sheet_add_aoa(sheet, [['Código','Grado','cod_cargo','Nivel Jerárquico','Denominación del empleo','Dependencia/Área','Grupo Interno','FUNCIONES']], {origin:'A3'});
  await assert.rejects(() => helpers.parseExcel(fileFor(workbook)), /2 columnas/);
  // A numeric Excel cell can already have lost digits; force the operator to correct it.
  const numericWorkbook = XLSX.utils.book_new();
  const numericSheet = XLSX.utils.aoa_to_sheet([
    ['PLANTILLA OFICIAL DE CARGA - No cambie el nombre de esta hoja'], ['Instrucciones'], header,
    [1234567890123456, 'Presentar informes institucionales.'],
  ]);
  XLSX.utils.book_append_sheet(numericWorkbook, numericSheet, helpers.OFFICIAL_SHEET_NAME);
  await assert.rejects(() => helpers.parseExcel(fileFor(numericWorkbook)), /como texto/);
  console.log('PASS: plantilla de dos columnas, ejemplos, importación, identificación como texto, duplicados, rechazo de plantilla antigua y conservación de funciones.');
})().catch(error => { console.error(error); process.exitCode = 1; });
