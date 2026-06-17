import { Injectable, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { sanitizeDeepStrings } from '../../utils/text-sanitizer';
import { MatrizOfertaParser, OfertaMatrizResult } from './matriz-oferta.parser';

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
  codigo_facultad: string;
  modalidad_principal: string;
  horas_base_por_credito: number;
  horas_pregrado_central: number | null;
  activo: boolean | string | number | null;
}

@Injectable()
export class ExcelParserService {
  /**
   * Lee un archivo Excel desde su buffer de memoria y parsea las hojas de Asignaturas y Programas.
   *
   * @param buffer - El búfer del archivo subido
   * @returns Las filas parseadas y tipadas de ambas hojas y la matriz
   */
  parseExcel(buffer: Buffer): { asignaturas: AsignaturaRow[]; programas: ProgramaRow[]; matrizOferta: OfertaMatrizResult[] } {
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    } catch (e) {
      throw new BadRequestException('El archivo no es un libro de Excel válido (.xlsx o .xls).');
    }

    // Buscar la hoja de asignaturas (búsqueda flexible case-insensitive)
    const asignaturasSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('asignatura')
    );
    if (!asignaturasSheetName) {
      throw new BadRequestException('No se encontró la hoja "ASIGNATURAS" en el archivo Excel.');
    }

    // Buscar la hoja de programas (búsqueda flexible case-insensitive)
    const programasSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('programa')
    );
    if (!programasSheetName) {
      throw new BadRequestException('No se encontró la hoja "PROGRAMAS" en el archivo Excel.');
    }

    const asignaturasSheet = workbook.Sheets[asignaturasSheetName];
    const programasSheet = workbook.Sheets[programasSheetName];

    let asignaturasRows = xlsx.utils.sheet_to_json<any>(asignaturasSheet, { defval: null });
    let programasRows = xlsx.utils.sheet_to_json<any>(programasSheet, { defval: null });

    // Limpiar caracteres invisibles, espacios extras y trim de strings
    asignaturasRows = sanitizeDeepStrings(asignaturasRows) as any[];
    programasRows = sanitizeDeepStrings(programasRows) as any[];

    const matrizOferta = MatrizOfertaParser.parse(workbook);

    return {
      asignaturas: asignaturasRows.map(row => this.mapToAsignaturaRow(row)),
      programas: programasRows.map(row => this.mapToProgramaRow(row)),
      matrizOferta,
    };
  }

  private mapToAsignaturaRow(row: any): AsignaturaRow {
    return {
      codigo_asignatura: String(row.codigo_asignatura || '').trim(),
      nombre_asignatura: String(row.nombre_asignatura || row.nombre || '').trim(),
      nombre_base: row.nombre_base ? String(row.nombre_base).trim() : null,
      creditos: Number(row.creditos || 0),
      horas_clase: Number(row.horas_clase || 0),
      horas_pta: Number(row.horas_pta || 0),
      semestre: String(row.semestre || '').trim(),
      modalidad: String(row.modalidad || '').trim(),
      nucleo_tematico: String(row.nucleo_tematico || '').trim(),
      codigo_programa: String(row.codigo_programa || '').trim(),
      nombre_programa: String(row.nombre_programa || row.programa || '').trim(),
      codigo_facultad: String(row.codigo_facultad || '').trim(),
      tipo_excepcion: row.tipo_excepcion && String(row.tipo_excepcion).trim() !== '' ? String(row.tipo_excepcion).trim() : null,
      requiere_revision_modalidad: row.requiere_revision_modalidad,
      activa: row.activa !== undefined && row.activa !== null ? row.activa : true,
    };
  }

  private mapToProgramaRow(row: any): ProgramaRow {
    return {
      codigo_programa: String(row.codigo_programa || '').trim(),
      nombre_programa: String(row.nombre_programa || row.nombre || '').trim(),
      nombre_corto: String(row.nombre_corto || '').trim(),
      nombre_excel_origen: row.nombre_excel_origen ? String(row.nombre_excel_origen).trim() : null,
      tipo_programa: String(row.tipo_programa || '').trim(),
      codigo_facultad: String(row.codigo_facultad || '').trim(),
      modalidad_principal: String(row.modalidad_principal || row.modalidad || '').trim(),
      horas_base_por_credito: Number(row.horas_base_por_credito || 16),
      horas_pregrado_central: row.horas_pregrado_central !== undefined && row.horas_pregrado_central !== null && String(row.horas_pregrado_central).trim() !== '' ? Number(row.horas_pregrado_central) : null,
      activo: row.activo !== undefined && row.activo !== null ? row.activo : true,
    };
  }
}
