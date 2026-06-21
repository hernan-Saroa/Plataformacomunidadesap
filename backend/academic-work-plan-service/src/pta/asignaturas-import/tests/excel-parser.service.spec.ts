import * as xlsx from 'xlsx';
import { ExcelParserService } from '../parsers/excel-parser.service';
import { ImportValidator } from '../validators/import.validator';

function buildWorkbook(marker = 'X'): Buffer {
  const workbook = xlsx.utils.book_new();

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.aoa_to_sheet([
      [
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
      ],
      [
        'PRO-EJEMPLO-001',
        'Programa de ejemplo',
        'Programa ejemplo',
        'Programa de ejemplo',
        'pregrado',
        'PREGRADO',
        'Pregrado',
        'presencial',
        16,
        null,
        'TRUE',
      ],
    ]),
    'PROGRAMAS',
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.aoa_to_sheet([
      [
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
      ],
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

  it('acepta la estructura descargable y normaliza booleanos de Excel', () => {
    const parsed = parser.parseExcel(buildWorkbook());
    const validation = ImportValidator.validarPreInsert(
      parsed.asignaturas,
      parsed.programas,
      parsed.matrizProgramCodes,
    );

    expect(validation.errors).toEqual([]);
    expect(parsed.programas[0].activo).toBe(true);
    expect(parsed.asignaturas[0].requiere_revision_modalidad).toBe(false);
    expect(parsed.asignaturas[0].activa).toBe(true);
    expect(parsed.matrizOferta[0].programas_ofertados).toEqual([
      'PRO-EJEMPLO-001',
    ]);
  });

  it('rechaza marcadores diferentes de X en MATRIZ_OFERTA', () => {
    expect(() => parser.parseExcel(buildWorkbook('SI'))).toThrow(
      'debe estar vacía o contener "X"',
    );
  });
});
