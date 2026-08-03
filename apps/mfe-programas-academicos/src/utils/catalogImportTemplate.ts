export const PROGRAM_HEADERS = [
  'codigo_programa',
  'nombre_programa',
  'nombre_corto',
  'nombre_excel_origen',
  'tipo_programa',
  'codigo_facultad',
  'nombre_facultad',
  'modalidad_principal',
  'horas_base_por_credito',
  'horas_pregrado_central',
  'activo',
  'categoria_horas_circular003',
  'descripcion_categoria_circular003',
  'horas_pta_referencia_circular003',
  'formula_calculo_horas',
];

export const SUBJECT_HEADERS = [
  'codigo_asignatura',
  'Pensum',
  'nombre_asignatura',
  'nombre_base',
  'creditos',
  'horas_clase',
  'horas_pta',
  'semestre',
  'modalidad',
  'nucleo_tematico',
  'codigo_programa',
  'nombre_programa',
  'codigo_facultad',
  'tipo_excepcion',
  'requiere_revision_modalidad',
  'activa',
];

const PROGRAM_ROWS = [
  [
    'PRO-EJEMPLO-001',
    'Programa académico territorial de ejemplo',
    'Programa territorial',
    'Programa territorial',
    'pregrado',
    'PREGRADO',
    'Pregrado',
    'distancia',
    16,
    null,
    true,
    'pregrado_territorial',
    'Pregrado territorial — 16h por crédito',
    '48 / 96 / 144 / 192 (según 1-4 créditos)',
    'créditos × 16 × 3 (Criterio 1+2)',
  ],
  [
    'PRO-EJEMPLO-002',
    'Pregrado Sede Central de ejemplo',
    'AP_Diurno',
    'AP_Diurno',
    'pregrado',
    'PREGRADO',
    'Pregrado',
    'presencial',
    null,
    64,
    true,
    'pregrado_sede_central',
    'Pregrado Sede Central (AP/EP) — Bloque fijo',
    '192 (asignatura) / 384 (seminario)',
    '64 horas fijas × 3 (Criterio 1+2)',
  ],
  [
    'PRO-EJEMPLO-003',
    'Maestría de ejemplo',
    'Maestría ejemplo',
    'Maestría ejemplo',
    'maestria',
    'POSGRADO-MAES',
    'Posgrado - Maestrías',
    'presencial',
    12,
    null,
    true,
    'maestria',
    'Maestría — 12h por crédito',
    '36 / 72 / 108 / 144 (según 1-4 créditos)',
    'créditos × 12 × 3 (Criterio 1+2)',
  ],
];

const SUBJECT_ROWS = [
  [
    'ASIG-EJEMPLO-001',
    'APT_53',
    'Asignatura territorial de ejemplo',
    'Asignatura territorial de ejemplo',
    3,
    48,
    144,
    'Primer semestre',
    'Presencial Diurno',
    'Núcleo temático de ejemplo',
    'PRO-EJEMPLO-001',
    'Programa académico territorial de ejemplo',
    'PREGRADO',
    null,
    false,
    true,
  ],
  [
    'ASIG-EJEMPLO-002',
    'AP_35',
    'Asignatura presencial de ejemplo',
    'Asignatura presencial de ejemplo',
    3,
    64,
    192,
    'Primer semestre',
    'Presencial Diurno',
    'Núcleo temático de ejemplo',
    'PRO-EJEMPLO-002',
    'Pregrado Sede Central de ejemplo',
    'PREGRADO',
    null,
    false,
    true,
  ],
  [
    'ASIG-EJEMPLO-003',
    'MAES_01',
    'Asignatura de maestría de ejemplo',
    'Asignatura de maestría de ejemplo',
    3,
    36,
    108,
    'Primer semestre',
    'Presencial',
    'Núcleo temático de ejemplo',
    'PRO-EJEMPLO-003',
    'Maestría de ejemplo',
    'POSGRADO-MAES',
    null,
    false,
    true,
  ],
];

const MATRIX_BASE_HEADERS = [
  'codigo_cetap',
  'nombre_cetap',
  'codigo_dt',
  'nombre_dt',
];

function configureSheet(sheet: any, widths: number[]) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:A1' };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
}

/**
 * Construye exactamente el mismo libro que descarga la interfaz. Se exporta
 * para poder verificar que la plantilla y el importador nunca se desalineen.
 */
export function buildCatalogImportWorkbook(XLSX: typeof import('xlsx')) {
  const programCodes = PROGRAM_ROWS.map((row) => String(row[0]));
  const offerHeaders = [...MATRIX_BASE_HEADERS, ...programCodes];

  const programSheet = XLSX.utils.aoa_to_sheet([
    PROGRAM_HEADERS,
    ...PROGRAM_ROWS,
  ]);
  const subjectSheet = XLSX.utils.aoa_to_sheet([
    SUBJECT_HEADERS,
    ...SUBJECT_ROWS,
  ]);
  const offerSheet = XLSX.utils.aoa_to_sheet([
    offerHeaders,
    ['CET-0288', 'Sede Central', 'SC', 'SEDE_CENTRAL', ...programCodes.map(() => 'X')],
  ]);

  configureSheet(programSheet, [20, 42, 26, 38, 20, 22, 28, 24, 24, 26, 12, 30, 46, 44, 46]);
  configureSheet(subjectSheet, [22, 18, 42, 38, 12, 15, 15, 22, 24, 36, 22, 42, 22, 28, 32, 12]);
  configureSheet(offerSheet, [18, 30, 16, 28, ...programCodes.map(() => 22)]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, programSheet, 'PROGRAMAS');
  XLSX.utils.book_append_sheet(workbook, subjectSheet, 'ASIGNATURAS');
  XLSX.utils.book_append_sheet(workbook, offerSheet, 'MATRIZ_OFERTA');
  return workbook;
}

export async function downloadCatalogImportTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = buildCatalogImportWorkbook(XLSX);

  XLSX.writeFile(workbook, 'Plantilla_Programas_Asignaturas_Matriz_ESAP.xlsx', {
    bookType: 'xlsx',
    compression: true,
  });
}
