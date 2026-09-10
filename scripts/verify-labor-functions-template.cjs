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
  'normalizeMatchText', 'findHeader', 'normalizeGrade', 'normalizePositionCode',
  'expectedCombinedCode', 'extractFunctionItems', 'splitFunctions',
  'findDuplicateFunctions', 'duplicateFunctionsMessage', 'validateCodes',
  'validateEditor', 'validateBulkRows', 'downloadTemplate', 'parseExcel',
  'inputFields', 'payloadFromEditor',
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
  XLSX, Blob, combinedPreview: '0015',
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
  assert.equal(header.length, 8);
  assert.equal(header[6], 'Grupo Interno');
  assert.equal(header[7], 'FUNCIONES');
  assert(sheet['!merges'].every((merge) => merge.e.c === 7));
  const examples = XLSX.utils.sheet_to_json(workbook.Sheets['Ejemplos - No importar'], { header: 1 }).slice(1);
  assert(examples.every((row) => row.length === 8));
  XLSX.utils.sheet_add_aoa(sheet, examples, { origin: 'A4' });
  const rows = await helpers.parseExcel(fileFor(workbook));
  assert.equal(rows.length, 3);
  assert.equal(rows[2].positionCode, '0015');
  assert.equal(rows[1].gradeCode, '09');
  assert.equal(rows[2].internalGroup, 'GRUPO DE EJEMPLO');
  assert(rows[2].functions.startsWith('1. Dirigir'));
  assert(rows.every((row) => !('costCenter' in row)));
  assert.equal(helpers.validateBulkRows(rows).length, 0);
  assert.equal(helpers.inputFields.filter((field) => field.field === 'internalGroup').length, 1);
  assert(!helpers.inputFields.some((field) => field.field === 'costCenter'));

  const duplicated = helpers.validateBulkRows([rows[0], { ...rows[0], rowNumber: 10, internalGroup: '' }]);
  assert.equal(duplicated.length, 1, 'N/A and blank groups are the same profile');
  assert.equal(duplicated[0].rowNumber, 10);
  assert.equal(helpers.validateBulkRows([{ ...rows[0], internalGroup: 'a'.repeat(501) }])[0].field, 'internalGroup');
  assert.equal(helpers.validateBulkRows([rows[2], { ...rows[2], rowNumber: 10, internalGroup: 'Otro grupo' }]).length, 0);

  const editValue = { ...rows[2], functions: rows[2].functions };
  const payload = helpers.payloadFromEditor(editValue);
  assert.equal(payload.internalGroup, 'GRUPO DE EJEMPLO');
  assert(!('costCenter' in payload));

  // Reject old/altered layouts explicitly; never shift functions into the group.
  XLSX.utils.sheet_add_aoa(sheet, [[...header.slice(0, 7), 'CentroCosto', 'FUNCIONES']], { origin: 'A3' });
  await assert.rejects(() => helpers.parseExcel(fileFor(workbook)), /8 columnas/);
  XLSX.utils.sheet_add_aoa(sheet, [header], { origin: 'A3' });
  delete sheet.I3;
  XLSX.utils.sheet_add_aoa(sheet, [['dato fuera de plantilla']], { origin: 'I4' });
  await assert.rejects(() => helpers.parseExcel(fileFor(workbook)), /encabezados/);
  console.log('PASS: template, examples, 8-column import, leading zeros, individual form, payload, group validation and duplicates.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
