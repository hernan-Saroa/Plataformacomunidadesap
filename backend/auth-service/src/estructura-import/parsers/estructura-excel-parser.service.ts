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
    const rawCetaps = xlsx.utils.sheet_to_json<any>(sheetCetaps, { defval: null });

    const territoriales: DireccionTerritorialRow[] = rawDt.map((r, i) => ({
      codigo_dt: String(r.codigo_dt || '').trim(),
      nombre_dt: String(r.nombre_dt || '').trim(),
      nombre_normalizado: String(r.nombre_normalizado || '').trim(),
      orden_visualizacion: parseInt(r.orden_visualizacion, 10) || 999,
      activo: this.parseBoolean(r.activo),
      _row: i + 2,
    }));

    const cetaps: CetapRow[] = rawCetaps.map((r, i) => ({
      codigo_cetap: String(r.codigo_cetap || '').trim(),
      nombre_cetap: String(r.nombre_cetap || '').trim(),
      nombre_normalizado: String(r.nombre_normalizado || '').trim(),
      codigo_dt: String(r.codigo_dt || '').trim(),
      nombre_dt: String(r.nombre_dt || '').trim(),
      tipo: String(r.tipo || '').trim().toLowerCase(),
      latitud: this.parseCoordinate(r.latitud),
      longitud: this.parseCoordinate(r.longitud),
      activo: this.parseBoolean(r.activo),
      _row: i + 2,
    }));

    return { territoriales, cetaps };
  }

  private parseBoolean(val: any): boolean {
    if (val === true || val === 'TRUE' || val === 'true' || val === '1' || val === 1 || val === 'VERDADERO') return true;
    if (val === false || val === 'FALSE' || val === 'false' || val === '0' || val === 0 || val === 'FALSO') return false;
    return true; // por defecto activo si es nulo o irreconocible
  }

  private parseCoordinate(val: any): number | null {
    if (val == null || val === '') return null;
    if (typeof val === 'number') return val;
    const str = String(val).replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }
}
