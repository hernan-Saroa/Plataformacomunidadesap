import { BadRequestException, Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { sanitizeDeepStrings } from '../../utils/text-sanitizer';
import {
  MatrizOfertaParser,
  OfertaMatrizResult,
} from './matriz-oferta.parser';

export interface AsignaturaRow {
  codigo_asignatura: string;
  nombre_asignatura: string;
  nombre_base: string | null;
  creditos: number;
  horas_clase: number;
  horas_pta: number;
  semestre: string;
  modalidad: string;
  nucleo_tematico: string;
  codigo_programa: string;
  nombre_programa: string;
  codigo_facultad: string;
  tipo_excepcion: string | null;
  requiere_revision_modalidad: boolean | string | number | null;
  activa: boolean | string | number | null;
}

export interface ProgramaRow {
  codigo_programa: string;
  nombre_programa: string;
  nombre_corto: string;
  nombre_excel_origen: string | null;
  tipo_programa: string;
  categoria_horas_circular003: string | null;
  descripcion_categoria_circular003: string | null;
  codigo_facultad: string;
  modalidad_principal: string;
  horas_base_por_credito: number;
  horas_pregrado_central: number | null;
  activo: boolean | string | number | null;
}

@Injectable()
export class ExcelParserService {
  private readonly asignaturaHeaders = [
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

  private readonly programaHeaders = [
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
  ];

  parseExcel(buffer: Buffer): {
    asignaturas: AsignaturaRow[];
    programas: ProgramaRow[];
    matrizOferta: OfertaMatrizResult[];
    matrizProgramCodes: string[];
  } {
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException(
        'El archivo no es un libro de Excel válido (.xlsx o .xls).',
      );
    }

    const asignaturasSheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes('asignatura'),
    );
    if (!asignaturasSheetName) {
      throw new BadRequestException(
        'No se encontró la hoja "ASIGNATURAS" en el archivo Excel.',
      );
    }

    const programasSheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes('programa'),
    );
    if (!programasSheetName) {
      throw new BadRequestException(
        'No se encontró la hoja "PROGRAMAS" en el archivo Excel.',
      );
    }

    const asignaturasSheet = workbook.Sheets[asignaturasSheetName];
    const programasSheet = workbook.Sheets[programasSheetName];
    this.validateHeaders(
      asignaturasSheet,
      'ASIGNATURAS',
      this.asignaturaHeaders,
    );
    this.validateHeaders(programasSheet, 'PROGRAMAS', this.programaHeaders);

    let asignaturasRows = xlsx.utils.sheet_to_json<any>(asignaturasSheet, {
      defval: null,
    });
    let programasRows = xlsx.utils.sheet_to_json<any>(programasSheet, {
      defval: null,
    });

    asignaturasRows = sanitizeDeepStrings(asignaturasRows) as any[];
    programasRows = sanitizeDeepStrings(programasRows) as any[];

    const matrizResult = MatrizOfertaParser.parse(workbook);

    return {
      asignaturas: asignaturasRows.map((row) =>
        this.mapToAsignaturaRow(row),
      ),
      programas: programasRows.map((row) => this.mapToProgramaRow(row)),
      matrizOferta: matrizResult.ofertas,
      matrizProgramCodes: matrizResult.programCodes,
    };
  }

  private validateHeaders(
    sheet: xlsx.WorkSheet,
    sheetName: string,
    requiredHeaders: string[],
  ): void {
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: null,
    });
    const headers = (rows[0] || []).map((value) =>
      String(value ?? '').trim().toLowerCase(),
    );
    const missing = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `La hoja ${sheetName} no tiene todas las columnas requeridas. Faltan: ${missing.join(', ')}.`,
      );
    }
  }

  private mapToAsignaturaRow(row: any): AsignaturaRow {
    return {
      codigo_asignatura: String(row.codigo_asignatura || '').trim(),
      nombre_asignatura: String(
        row.nombre_asignatura || row.nombre || '',
      ).trim(),
      nombre_base: row.nombre_base
        ? String(row.nombre_base).trim()
        : null,
      creditos: Number(row.creditos ?? Number.NaN),
      horas_clase: Number(row.horas_clase ?? Number.NaN),
      horas_pta: Number(row.horas_pta ?? Number.NaN),
      semestre: String(row.semestre || '').trim(),
      modalidad: String(row.modalidad || '').trim(),
      nucleo_tematico: String(row.nucleo_tematico || '').trim(),
      codigo_programa: String(row.codigo_programa || '').trim(),
      nombre_programa: String(
        row.nombre_programa || row.programa || '',
      ).trim(),
      codigo_facultad: String(row.codigo_facultad || '').trim(),
      tipo_excepcion:
        row.tipo_excepcion &&
        String(row.tipo_excepcion).trim() !== ''
          ? String(row.tipo_excepcion).trim()
          : null,
      requiere_revision_modalidad: this.parseBooleanValue(
        row.requiere_revision_modalidad,
      ),
      activa: this.parseBooleanValue(row.activa),
    };
  }

  private mapToProgramaRow(row: any): ProgramaRow {
    const tipoPrograma = String(row.tipo_programa || '').trim();
    const horasPregradoCentral =
      row.horas_pregrado_central !== undefined &&
      row.horas_pregrado_central !== null &&
      String(row.horas_pregrado_central).trim() !== ''
        ? Number(row.horas_pregrado_central)
        : null;
    const categoriaExpl = this.parseOptionalString(
      row.categoria_horas_circular003,
    )?.toLowerCase();
    const descripcionExpl = this.parseOptionalString(
      row.descripcion_categoria_circular003,
    );
    const categoriaInferida = this.inferCategoriaCircular003(
      tipoPrograma,
      horasPregradoCentral,
    );
    const descripcionInferida = this.inferDescripcionCircular003(
      tipoPrograma,
      horasPregradoCentral,
    );

    return {
      codigo_programa: String(row.codigo_programa || '').trim(),
      nombre_programa: String(
        row.nombre_programa || row.nombre || '',
      ).trim(),
      nombre_corto: String(row.nombre_corto || '').trim(),
      nombre_excel_origen: row.nombre_excel_origen
        ? String(row.nombre_excel_origen).trim()
        : null,
      tipo_programa: tipoPrograma,
      categoria_horas_circular003:
        categoriaExpl || categoriaInferida,
      descripcion_categoria_circular003:
        descripcionExpl || descripcionInferida,
      codigo_facultad: String(row.codigo_facultad || '').trim(),
      modalidad_principal: String(
        row.modalidad_principal || row.modalidad || '',
      ).trim(),
      horas_base_por_credito: Number(
        row.horas_base_por_credito ?? Number.NaN,
      ),
      horas_pregrado_central: horasPregradoCentral,
      activo: this.parseBooleanValue(row.activo),
    };
  }

  private parseOptionalString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const parsed = String(value).trim();
    return parsed === '' ? null : parsed;
  }

  private inferCategoriaCircular003(
    tipoPrograma: string,
    horasPregradoCentral: number | null,
  ): string | null {
    if (horasPregradoCentral && horasPregradoCentral > 0) {
      return 'pregrado_sede_central';
    }
    const tipo = this.normalizeToken(tipoPrograma);
    if (tipo.includes('maestria')) {
      return 'maestria';
    }
    if (tipo.includes('especializacion')) {
      return 'especializacion';
    }
    if (tipo.includes('pregrado')) {
      return 'pregrado_territorial';
    }
    return null;
  }

  private inferDescripcionCircular003(
    tipoPrograma: string,
    horasPregradoCentral: number | null,
  ): string | null {
    if (horasPregradoCentral && horasPregradoCentral > 0) {
      return 'Pregrado Sede Central (AP/EP) - Bloque Fijo';
    }
    const tipo = this.normalizeToken(tipoPrograma);
    if (tipo.includes('maestria')) {
      return 'Maestria - 12h por credito';
    }
    if (tipo.includes('especializacion')) {
      return 'Especializacion - 16h por credito';
    }
    if (tipo.includes('pregrado')) {
      return 'APT / Territorial - 16h por credito';
    }
    return null;
  }

  private normalizeToken(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private parseBooleanValue(
    value: unknown,
  ): boolean | string | number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === 0) return value === 1;

    const normalized = String(value).trim().toLowerCase();
    if (['true', 'si', 'sí', '1', 'activo'].includes(normalized)) {
      return true;
    }
    if (['false', 'no', '0', 'inactivo'].includes(normalized)) {
      return false;
    }
    return String(value).trim();
  }
}
