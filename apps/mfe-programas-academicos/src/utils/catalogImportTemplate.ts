const PROGRAM_HEADERS = [
  'codigo_programa',
  'nombre_programa',
  'nombre_corto',
  'nombre_excel_origen',
  'tipo_programa',
  'categoria_horas_circular003',
  'descripcion_categoria_circular003',
  'codigo_facultad',
  'nombre_facultad',
  'modalidad_principal',
  'horas_base_por_credito',
  'horas_pregrado_central',
  'activo',
];

const SUBJECT_HEADERS = [
  'codigo_asignatura',
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

const OFFER_HEADERS = [
  'codigo_cetap',
  'nombre_cetap',
  'codigo_dt',
  'nombre_dt',
  'PRO-EJEMPLO-001',
];

function configureSheet(sheet: any, widths: number[], lastColumn: string) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  sheet['!autofilter'] = { ref: `A1:${lastColumn}2` };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
}

export async function downloadCatalogImportTemplate(): Promise<void> {
  const XLSX = await import('xlsx');

  const programSheet = XLSX.utils.aoa_to_sheet([
    PROGRAM_HEADERS,
    [
      'PRO-EJEMPLO-001',
      'Programa académico de ejemplo',
      'Programa ejemplo',
      'Programa académico de ejemplo',
      'pregrado',
      'pregrado_territorial',
      'APT / Territorial — 16h por crédito',
      'PREGRADO',
      'Pregrado',
      'presencial',
      16,
      null,
      true,
    ],
    [
      'PRO-EJEMPLO-002',
      'Pregrado Sede Central Ejemplo',
      'AP_Diurno',
      'AP Diurno',
      'pregrado',
      'pregrado_sede_central',
      'Pregrado Sede Central (AP/EP) — Bloque Fijo',
      'PREGRADO',
      'Pregrado',
      'presencial',
      null,
      64,
      true,
    ],
    [
      'PRO-EJEMPLO-003',
      'Maestría de Ejemplo',
      'Maestría Ejemplo',
      'Maestría',
      'maestria',
      'maestria',
      'Maestría — 12h por crédito',
      'POSGRADO-MAES',
      'Posgrado',
      'presencial',
      12,
      null,
      true,
    ],
  ]);

  const subjectSheet = XLSX.utils.aoa_to_sheet([
    SUBJECT_HEADERS,
    [
      'ASIG-EJEMPLO-001',
      'Asignatura de ejemplo',
      'Asignatura de ejemplo',
      3,
      48,
      144,
      'Primer semestre',
      'Presencial',
      'General',
      'PRO-EJEMPLO-001',
      'Programa académico de ejemplo',
      'PREGRADO',
      null,
      false,
      true,
    ],
  ]);

  const offerSheet = XLSX.utils.aoa_to_sheet([
    OFFER_HEADERS,
    ['CET-0288', 'Sede Central', 'SC', 'SEDE_CENTRAL', 'X'],
  ]);

  configureSheet(programSheet, [20, 38, 24, 38, 20, 30, 44, 22, 25, 24, 24, 26, 12], 'M');
  configureSheet(subjectSheet, [22, 42, 36, 12, 15, 15, 22, 24, 34, 22, 38, 22, 28, 32, 12], 'O');
  configureSheet(offerSheet, [18, 30, 16, 28, 22], 'E');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, programSheet, 'PROGRAMAS');
  XLSX.utils.book_append_sheet(workbook, subjectSheet, 'ASIGNATURAS');
  XLSX.utils.book_append_sheet(workbook, offerSheet, 'MATRIZ_OFERTA');

  XLSX.writeFile(workbook, 'Plantilla_Programas_Asignaturas_ESAP.xlsx', {
    bookType: 'xlsx',
    compression: true,
  });
}
