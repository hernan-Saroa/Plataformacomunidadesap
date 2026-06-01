import { BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

export interface OfertaMatrizResult {
  codigo_cetap: string;
  nombre_dt: string;
  programas_ofertados: string[]; // Códigos de programa (PRO-001, PRO-002, etc.)
}

export class MatrizOfertaParser {
  /**
   * Extrae la grilla de CETAPs vs Programas de la hoja MATRIZ_OFERTA
   * @param workbook Libro de Excel
   * @returns Array de objetos indicando en qué programas se ofertan por cada CETAP
   */
  static parse(workbook: xlsx.WorkBook): OfertaMatrizResult[] {
    const sheetName = workbook.SheetNames.find((name) =>
      name.toUpperCase() === 'MATRIZ_OFERTA'
    );

    if (!sheetName) {
      throw new BadRequestException('No se encontró la hoja "MATRIZ_OFERTA".');
    }

    const sheet = workbook.Sheets[sheetName];
    // sheet_to_json con header: 1 devuelve un array de arrays (filas y columnas crudas)
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });

    if (rows.length < 3) {
      throw new BadRequestException('La hoja MATRIZ_OFERTA no tiene la estructura correcta (mínimo 3 filas esperadas).');
    }

    // Fila 0: Contiene los códigos de programas desde la columna 4 (índice 4) en adelante.
    // Ejemplo: [ 'codigo_cetap', 'nombre_cetap', 'codigo_dt', 'nombre_dt', 'PRO-001', 'PRO-002', ... ]
    const headerRow = rows[0];
    
    // Identificar las columnas de programas
    const programColumns: { colIndex: number; codigo_programa: string }[] = [];
    for (let col = 4; col < headerRow.length; col++) {
      const val = headerRow[col];
      if (val && String(val).trim().startsWith('PRO-')) {
        programColumns.push({
          colIndex: col,
          codigo_programa: String(val).trim(),
        });
      }
    }

    const result: OfertaMatrizResult[] = [];

    // Fila 2 en adelante: CETAPs (las filas separadoras tienen menos columnas o están vacías en la primera col)
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const codigo_cetap = row[0] ? String(row[0]).trim() : '';
      const nombre_dt = row[3] ? String(row[3]).trim() : '';
      
      // Si no hay código de cetap o es un separador (ej: ━━ SEDE_CENTRAL ━━), lo omitimos
      if (!codigo_cetap || !codigo_cetap.startsWith('CET-')) continue;

      const programas_ofertados: string[] = [];

      for (const progCol of programColumns) {
        const cellValue = row[progCol.colIndex];
        if (cellValue && String(cellValue).trim().toUpperCase() === 'X') {
          programas_ofertados.push(progCol.codigo_programa);
        }
      }

      result.push({
        codigo_cetap,
        nombre_dt,
        programas_ofertados,
      });
    }

    return result;
  }
}
