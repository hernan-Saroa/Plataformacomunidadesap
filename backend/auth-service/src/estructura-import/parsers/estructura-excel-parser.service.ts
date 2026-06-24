import { Injectable, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

export interface DireccionTerritorialRow {
  codigo_dt: string;
  nombre_dt: string;
  nombre_normalizado: string;
  orden_visualizacion: number;
  activo: boolean;
  _row?: number;
}

export interface CetapRow {
  codigo_cetap: string;
  nombre_cetap: string;
  nombre_normalizado: string;
  codigo_dt: string;
  nombre_dt: string;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  _row?: number;
}

@Injectable()
export class EstructuraExcelParserService {
  private readonly dtHeaders = [
    'codigo_dt',
    'nombre_dt',
    'nombre_normalizado',
    'orden_visualizacion',
    'activo',
  ];

  private readonly cetapHeaders = [
    'codigo_cetap',
    'nombre_cetap',
    'nombre_normalizado',
    'codigo_dt',
    'nombre_dt',
    'tipo',
    'latitud',
    'longitud',
    'activo',
  ];

  parseExcel(buffer: Buffer): { territoriales: DireccionTerritorialRow[]; cetaps: CetapRow[] } {
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer' });
    } catch (e) {
      throw new BadRequestException('El archivo no es un libro de Excel válido (.xlsx o .xls).');
    }

    const sheetDt = workbook.Sheets['DIRECCIONES_TERRITORIALES'];
    if (!sheetDt) {
      throw new BadRequestException('No se encontró la hoja DIRECCIONES_TERRITORIALES');
    }
    const rawDt = xlsx.utils.sheet_to_json<any>(sheetDt, { defval: null });

    const sheetCetaps = workbook.Sheets['CETAPS'];
    if (!sheetCetaps) {
      throw new BadRequestException('No se encontró la hoja CETAPS');
    }
    this.validateHeaders(sheetDt, 'DIRECCIONES_TERRITORIALES', this.dtHeaders);
    this.validateHeaders(sheetCetaps, 'CETAPS', this.cetapHeaders);

    const rawCetaps = xlsx.utils.sheet_to_json<any>(sheetCetaps, { defval: null });

    const territoriales: DireccionTerritorialRow[] = rawDt.map((r, i) => ({
      codigo_dt: String(r.codigo_dt || '').trim(),
      nombre_dt: String(r.nombre_dt || '').trim(),
      nombre_normalizado: String(r.nombre_normalizado || '').trim(),
      orden_visualizacion: this.parseInteger(
        r.orden_visualizacion,
        'DIRECCIONES_TERRITORIALES',
        i + 2,
        'orden_visualizacion',
      ),
      activo: this.parseBoolean(
        r.activo,
        'DIRECCIONES_TERRITORIALES',
        i + 2,
        'activo',
      ),
      _row: i + 2,
    }));

    const cetaps: CetapRow[] = rawCetaps.map((r, i) => ({
      codigo_cetap: String(r.codigo_cetap || '').trim(),
      nombre_cetap: String(r.nombre_cetap || '').trim(),
      nombre_normalizado: String(r.nombre_normalizado || '').trim(),
      codigo_dt: String(r.codigo_dt || '').trim(),
      nombre_dt: String(r.nombre_dt || '').trim(),
      tipo: String(r.tipo || '').trim().toLowerCase(),
      latitud: this.parseCoordinate(r.latitud, 'CETAPS', i + 2, 'latitud'),
      longitud: this.parseCoordinate(r.longitud, 'CETAPS', i + 2, 'longitud'),
      activo: this.parseBoolean(r.activo, 'CETAPS', i + 2, 'activo'),
      _row: i + 2,
    }));

    return { territoriales, cetaps };
  }

  private validateHeaders(
    sheet: xlsx.WorkSheet,
    sheetName: string,
    expected: string[],
  ): void {
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: null,
    });
    const headers = (rows[0] || []).map((value) =>
      String(value ?? '').trim().toLowerCase(),
    );
    const missing = expected.filter((header) => !headers.includes(header));
    if (missing.length > 0) {
      throw new BadRequestException(
        `La hoja ${sheetName} no tiene todas las columnas requeridas. Faltan: ${missing.join(', ')}.`,
      );
    }
  }

  private parseBoolean(
    val: any,
    sheet: string,
    row: number,
    column: string,
  ): boolean {
    const normalized = String(val ?? '').trim().toLowerCase();
    if (
      val === true ||
      val === 1 ||
      ['true', '1', 'verdadero', 'si', 'sí', 'activo'].includes(normalized)
    ) {
      return true;
    }
    if (
      val === false ||
      val === 0 ||
      ['false', '0', 'falso', 'no', 'inactivo'].includes(normalized)
    ) {
      return false;
    }
    throw new BadRequestException(
      `${sheet} fila ${row}: ${column} debe ser TRUE/FALSE, SI/NO o 1/0.`,
    );
  }

  private parseInteger(
    val: any,
    sheet: string,
    row: number,
    column: string,
  ): number {
    const parsed = Number(val);
    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(
        `${sheet} fila ${row}: ${column} debe ser un número entero.`,
      );
    }
    return parsed;
  }

  private parseCoordinate(
    val: any,
    sheet: string,
    row: number,
    column: string,
  ): number | null {
    if (val == null || val === '') return null;
    if (typeof val === 'number') return val;
    const str = String(val).replace(',', '.').trim();
    const num = parseFloat(str);
    if (isNaN(num)) {
      throw new BadRequestException(
        `${sheet} fila ${row}: ${column} debe ser una coordenada numérica válida.`,
      );
    }
    return num;
  }
}
