import * as xlsx from 'xlsx';
import { ExcelParserService } from '../parsers/excel-parser.service';
import { ImportValidator } from '../validators/import.validator';

function buildWorkbook(marker = 'X', includeCircularColumns = true): Buffer {
  const workbook = xlsx.utils.book_new();

  const programHeaders = [
    'codigo_programa',
    'nombre_programa',
    'nombre_corto',
    'nombre_excel_origen',
    'tipo_programa',
    ...(includeCircularColumns
      ? [
          'categoria_horas_circular003',
          'descripcion_categoria_circular003',
          'horas_pta_referencia_circular003',
          'formula_calculo_horas',
        ]
      : []),
    'codigo_facultad',
    'nombre_facultad',
    'modalidad_principal',
    'horas_base_por_credito',
    'horas_pregrado_central',
    'activo',
  ];
  const programRow = [
    'PRO-EJEMPLO-001',
    'Programa de ejemplo',
    'Programa ejemplo',
    'Programa de ejemplo',
    'pregrado',
    ...(includeCircularColumns
      ? [
          'pregrado_territorial',
          'APT / Territorial - 16h por credito',
          '48 / 96 / 144 / 192',
          'creditos x 16 x 3',
        ]
      : []),
    'PREGRADO',
    'Pregrado',
    'presencial',
    16,
    null,
    'TRUE',
  ];

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.aoa_to_sheet([
      programHeaders,
      programRow,
    ]),
    'PROGRAMAS',
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.aoa_to_sheet([
      [
        'codigo_asignatura',
        ...(includeCircularColumns ? ['Pensum'] : []),
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
      ],
      [
        'ASIG-EJEMPLO-001',
        ...(includeCircularColumns ? ['APT_53'] : []),
        'Asignatura de ejemplo',
        'Asignatura de ejemplo',
        3,
        48,
        144,
        'Primer semestre',
        'Presencial',
        'General',
        'PRO-EJEMPLO-001',
        'Programa de ejemplo',
        'PREGRADO',
        null,
        'FALSE',
        'TRUE',
      ],
    ]),
    'ASIGNATURAS',
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.aoa_to_sheet([
      [
        'codigo_cetap',
        'nombre_cetap',
        'codigo_dt',
        'nombre_dt',
        'PRO-EJEMPLO-001',
      ],
      ['CET-0288', 'Sede Central', 'SC', 'SEDE_CENTRAL', marker],
    ]),
    'MATRIZ_OFERTA',
  );

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('ExcelParserService', () => {
  const parser = new ExcelParserService();

  it('conserva la asociación Programa-Pensum de la segunda hoja sin mezclar jornadas', () => {
    const workbook = xlsx.read(buildWorkbook(), { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets.ASIGNATURAS, { defval: null });
    workbook.Sheets.ASIGNATURAS = xlsx.utils.json_to_sheet([
      ['AP_33', 'PRO-001'], ['AP_35', 'PRO-001'], ['AP_34', 'PRO-002'], ['AP_36', 'PRO-002'],
    ].map(([pensum, codigoPrograma], index) => ({ ...rows[0], codigo_asignatura: `ASIG-${index + 1}`,
      Pensum: pensum, codigo_programa: codigoPrograma })));
    const parsed = parser.parseExcel(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    expect(parsed.asignaturas.filter(row => row.codigo_programa === 'PRO-001').map(row => row.pensum)).toEqual(['AP_33', 'AP_35']);
    expect(parsed.asignaturas.filter(row => row.codigo_programa === 'PRO-002').map(row => row.pensum)).toEqual(['AP_34', 'AP_36']);
  });

  it('acepta la estructura descargable y normaliza booleanos de Excel', () => {
    const parsed = parser.parseExcel(buildWorkbook());
    const validation = ImportValidator.validarPreInsert(
      parsed.asignaturas,
      parsed.programas,
      parsed.matrizProgramCodes,
    );

    expect(validation.errors).toEqual([]);
    expect(parsed.programas[0].activo).toBe(true);
    expect(parsed.programas[0].categoria_horas_circular003).toBe(
      'pregrado_territorial',
    );
    expect(parsed.asignaturas[0].requiere_revision_modalidad).toBe(false);
    expect(parsed.asignaturas[0].activa).toBe(true);
    expect(parsed.matrizOferta[0].programas_ofertados).toEqual([
      'PRO-EJEMPLO-001',
    ]);
  });

  it.each([1, 427, 492])('valida %i asignaturas por su contenido sin comparar con un catálogo de tamaño fijo', count => {
    const parsed = parser.parseExcel(buildWorkbook());
    const asignaturas = Array.from({ length: count }, (_, index) => ({
      ...parsed.asignaturas[0], codigo_asignatura: `ASIG-${index + 1}`,
    }));
    const validation = ImportValidator.validarPreInsert(asignaturas, parsed.programas, parsed.matrizProgramCodes);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings.some(warning => warning.includes('La hoja ASIGNATURAS contiene'))).toBe(false);
  });

  it.each([0, 2001])('mantiene la validación de límites con %i asignaturas', count => {
    const parsed = parser.parseExcel(buildWorkbook());
    const asignaturas = Array.from({ length: count }, (_, index) => ({
      ...parsed.asignaturas[0], codigo_asignatura: `ASIG-${index + 1}`,
    }));
    const validation = ImportValidator.validarPreInsert(asignaturas, parsed.programas, parsed.matrizProgramCodes);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(error => error.startsWith('R1:'))).toBe(true);
  });

  it('acepta columnas informativas de Circular 003 cuando vienen en la plantilla nueva', () => {
    const parsed = parser.parseExcel(buildWorkbook('X', true));

    expect(parsed.programas[0].categoria_horas_circular003).toBe(
      'pregrado_territorial',
    );
    expect(parsed.programas[0].descripcion_categoria_circular003).toBe(
      'APT / Territorial - 16h por credito',
    );
    expect(parsed.programas[0].horas_pta_referencia_circular003).toBe(
      '48 / 96 / 144 / 192',
    );
    expect(parsed.programas[0].formula_calculo_horas).toBe(
      'creditos x 16 x 3',
    );
    expect(parsed.asignaturas[0].pensum).toBe('APT_53');
    expect(parsed.asignaturas[0].horas_clase).toBe(48);
    expect(parsed.asignaturas[0].horas_pta).toBe(144);
  });

  it('rechaza la plantilla masiva antigua que no incluye Pensum', () => {
    expect(() => parser.parseExcel(buildWorkbook('X', false))).toThrow(
      'Faltan: pensum',
    );
  });

  it('rechaza marcadores diferentes de X en MATRIZ_OFERTA', () => {
    expect(() => parser.parseExcel(buildWorkbook('SI'))).toThrow(
      'debe estar vacía o contener "X"',
    );
  });
});
