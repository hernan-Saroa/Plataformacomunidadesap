import { BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

export interface OfertaMatrizResult {
  codigo_cetap: string;
  nombre_cetap: string;
  codigo_dt: string;
  nombre_dt: string;
  programas_ofertados: string[];
}

export interface MatrizOfertaParseResult {
  ofertas: OfertaMatrizResult[];
  programCodes: string[];
}

export class MatrizOfertaParser {
  static parse(workbook: xlsx.WorkBook): MatrizOfertaParseResult {
    const sheetName = workbook.SheetNames.find(
      (name) => name.toUpperCase() === 'MATRIZ_OFERTA',
    );

    if (!sheetName) {
      throw new BadRequestException('No se encontró la hoja "MATRIZ_OFERTA".');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: null,
    });

    if (rows.length < 2) {
      throw new BadRequestException(
        'La hoja MATRIZ_OFERTA debe contener encabezados y al menos una fila de datos.',
      );
    }

    const headerRow = rows[0].map((value) => String(value ?? '').trim());
    const requiredBaseHeaders = [
      'codigo_cetap',
      'nombre_cetap',
      'codigo_dt',
      'nombre_dt',
    ];
    const actualBaseHeaders = headerRow
      .slice(0, 4)
      .map((value) => value.toLowerCase());

    if (
      requiredBaseHeaders.some(
        (header, index) => actualBaseHeaders[index] !== header,
      )
    ) {
      throw new BadRequestException(
        `La hoja MATRIZ_OFERTA debe iniciar con estas columnas y en este orden: ${requiredBaseHeaders.join(', ')}.`,
      );
    }

    const programColumns: {
      colIndex: number;
      codigo_programa: string;
    }[] = [];
    const programCodes = new Set<string>();

    for (let col = 4; col < headerRow.length; col++) {
      const code = headerRow[col];
      if (!code) continue;
      if (!code.toUpperCase().startsWith('PRO-')) {
        throw new BadRequestException(
          `MATRIZ_OFERTA: la columna ${col + 1} debe contener un código de programa que inicie por "PRO-"; se recibió "${code}".`,
        );
      }

      const normalizedCode = code.toUpperCase();
      if (programCodes.has(normalizedCode)) {
        throw new BadRequestException(
          `MATRIZ_OFERTA: el programa "${code}" aparece en más de una columna.`,
        );
      }

      programCodes.add(normalizedCode);
      programColumns.push({ colIndex: col, codigo_programa: code });
    }

    if (programColumns.length === 0) {
      throw new BadRequestException(
        'MATRIZ_OFERTA debe incluir al menos una columna de programa después de nombre_dt.',
      );
    }

    const ofertas: OfertaMatrizResult[] = [];
    const seenCetaps = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const isCompletelyBlank = row.every(
        (value) => value === null || String(value).trim() === '',
      );
      if (isCompletelyBlank) continue;

      const codigo_cetap = row[0] ? String(row[0]).trim() : '';
      const nombre_cetap = row[1] ? String(row[1]).trim() : '';
      const codigo_dt = row[2] ? String(row[2]).trim() : '';
      const nombre_dt = row[3] ? String(row[3]).trim() : '';

      if (!codigo_cetap) {
        throw new BadRequestException(
          `MATRIZ_OFERTA: falta codigo_cetap en la fila ${i + 1}.`,
        );
      }
      if (!/^CET-[A-Z0-9-]+$/i.test(codigo_cetap)) {
        throw new BadRequestException(
          `MATRIZ_OFERTA: el código "${codigo_cetap}" de la fila ${i + 1} no tiene un formato CET- válido.`,
        );
      }

      const normalizedCetap = codigo_cetap.toUpperCase();
      if (seenCetaps.has(normalizedCetap)) {
        throw new BadRequestException(
          `MATRIZ_OFERTA: el CETAP "${codigo_cetap}" está duplicado.`,
        );
      }
      seenCetaps.add(normalizedCetap);

      if (!nombre_cetap || !codigo_dt || !nombre_dt) {
        throw new BadRequestException(
          `MATRIZ_OFERTA: la fila ${i + 1} debe incluir nombre_cetap, codigo_dt y nombre_dt.`,
        );
      }

      const programas_ofertados: string[] = [];
      for (const programColumn of programColumns) {
        const cellValue = row[programColumn.colIndex];
        const marker = String(cellValue ?? '').trim().toUpperCase();
        if (marker === 'X') {
          programas_ofertados.push(programColumn.codigo_programa);
        } else if (marker !== '') {
          throw new BadRequestException(
            `MATRIZ_OFERTA: la celda de la fila ${i + 1} para ${programColumn.codigo_programa} debe estar vacía o contener "X"; se recibió "${cellValue}".`,
          );
        }
      }

      ofertas.push({
        codigo_cetap,
        nombre_cetap,
        codigo_dt,
        nombre_dt,
        programas_ofertados,
      });
    }

    if (ofertas.length === 0) {
      throw new BadRequestException(
        'MATRIZ_OFERTA no contiene filas de CETAP válidas.',
      );
    }

    return {
      ofertas,
      programCodes: programColumns.map(
        (column) => column.codigo_programa,
      ),
    };
  }
}
