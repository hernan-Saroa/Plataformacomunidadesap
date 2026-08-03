import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildCatalogImportWorkbook,
  PROGRAM_HEADERS,
  SUBJECT_HEADERS,
} from './catalogImportTemplate';

describe('plantilla descargable de Programas Académicos', () => {
  it('genera tres hojas coherentes entre programas, asignaturas y oferta', () => {
    const workbook = buildCatalogImportWorkbook(XLSX);
    const programas = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.PROGRAMAS,
      { defval: null },
    );
    const asignaturas = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.ASIGNATURAS,
      { defval: null },
    );
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets.MATRIZ_OFERTA,
      { header: 1, defval: null },
    );
    const programCodes = programas.map((programa) => programa.codigo_programa);

    expect(workbook.SheetNames).toEqual([
      'PROGRAMAS',
      'ASIGNATURAS',
      'MATRIZ_OFERTA',
    ]);
    expect(matriz[0].slice(4)).toEqual(programCodes);
    expect(asignaturas.every((asignatura) => Boolean(asignatura.Pensum))).toBe(true);
    expect(asignaturas.every((asignatura) => programCodes.includes(asignatura.codigo_programa))).toBe(true);
    expect(asignaturas.every((asignatura) => Number(asignatura.horas_clase) >= 0)).toBe(true);
    expect(asignaturas.every((asignatura) => Number(asignatura.horas_pta) >= 0)).toBe(true);
  });

  it('mantiene exactamente las columnas definidas por la plantilla nueva', () => {
    const workbook = buildCatalogImportWorkbook(XLSX);
    const programRows = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets.PROGRAMAS,
      { header: 1 },
    );
    const subjectRows = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets.ASIGNATURAS,
      { header: 1 },
    );

    expect(programRows[0]).toEqual(PROGRAM_HEADERS);
    expect(subjectRows[0]).toEqual(SUBJECT_HEADERS);
  });
});
