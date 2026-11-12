import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RUND_REQUIRED_BLOCKS } from './rund-evidence-workflow';

/**
 * Carpetas que se pueden configurar por tipo de vinculación, en el orden del archivo de codificación.
 * Las obligatorias para activar el perfil no se pueden desactivar: esa regla es de otro alcance.
 */
export const RUND_CARPETAS_CONFIGURABLES = [
  'IDENTIDAD', 'FORMACION', 'EXPERIENCIA_DOCENTE', 'EXPERIENCIA_LABORAL', 'ACADEMICO', 'PRODUCTIVIDAD_ACADEMICA',
  'SEGUNDA_LENGUA', 'FORMACION_NO_FORMAL', 'ESTUDIO_HOJA_VIDA', 'DOCUMENTOS_NO_VALIDOS', 'VINCULACION', 'TRANSVERSAL',
] as const;

export const RUND_TIPOS_VINCULACION_BASE = [
  'CARRERA1', 'CARRERA2', 'PERIODO_DE_PRUEBA', 'OCASIONAL', 'ESPECIAL', 'VISITANTE', 'CATEDRA',
] as const;

const NOMBRES_TIPO: Record<string, string> = {
  CARRERA1: 'Carrera 1', CARRERA2: 'Carrera 2', PERIODO_DE_PRUEBA: 'Periodo de prueba', OCASIONAL: 'Ocasional',
  ESPECIAL: 'Especial', VISITANTE: 'Visitante', CATEDRA: 'Hora cátedra',
};

export const esCarpetaObligatoria = (bloque: string) => (RUND_REQUIRED_BLOCKS as string[]).includes(bloque);

/** Misma normalización que usa el Banco de Docentes para el tipo de vinculación (mayúsculas, sin tildes, con guion bajo). */
export function claveTipoVinculacion(value: unknown): string {
  const text = String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!text) return 'OCASIONAL';
  if (text === 'carrera1') return 'CARRERA1';
  if (text === 'carrera2' || text === 'carrera') return 'CARRERA2';
  if (text.includes('prueba')) return 'PERIODO_DE_PRUEBA';
  if (text.includes('ocasional')) return 'OCASIONAL';
  if (text.includes('especial')) return 'ESPECIAL';
  if (text.includes('visitante')) return 'VISITANTE';
  if (text.includes('catedra')) return 'CATEDRA';
  return String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export const nombreTipoVinculacion = (clave: string) =>
  NOMBRES_TIPO[clave] || clave.toLowerCase().replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase());

@Injectable()
export class RundCarpetasConfigService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Carpetas que NO aplican al tipo de vinculación. Sin configuración, todas aplican. */
  async carpetasInactivas(tipoVinculacion: unknown): Promise<Set<string>> {
    const rows = await this.dataSource.query(
      `SELECT bloque FROM academic_work_plan."RundCarpetaConfiguracion" WHERE tipo_vinculacion = $1 AND activo = FALSE`,
      [claveTipoVinculacion(tipoVinculacion)],
    );
    return new Set((Array.isArray(rows) ? rows : []).map((row: any) => String(row.bloque)));
  }

  async matriz() {
    const [configuradas, usados] = await Promise.all([
      this.dataSource.query(`SELECT tipo_vinculacion, bloque FROM academic_work_plan."RundCarpetaConfiguracion" WHERE activo = FALSE`),
      this.dataSource.query(`SELECT DISTINCT "tipoVinculacion" AS tipo FROM academic_work_plan."Docente" WHERE "tipoVinculacion" IS NOT NULL`),
    ]);
    const claves = new Set<string>(RUND_TIPOS_VINCULACION_BASE);
    for (const row of usados || []) if (String(row.tipo || '').trim()) claves.add(claveTipoVinculacion(row.tipo));
    for (const row of configuradas || []) claves.add(String(row.tipo_vinculacion));
    const inactivas: Record<string, string[]> = {};
    for (const row of configuradas || []) (inactivas[row.tipo_vinculacion] ||= []).push(row.bloque);
    return {
      tipos: [...claves].map(codigo => ({ codigo, nombre: nombreTipoVinculacion(codigo) })),
      carpetas: RUND_CARPETAS_CONFIGURABLES.map(bloque => ({ bloque, obligatoria: esCarpetaObligatoria(bloque) })),
      inactivas,
    };
  }

  async definir(tipoVinculacion: string, bloque: string, activo: boolean, actorId?: string) {
    const tipo = claveTipoVinculacion(tipoVinculacion);
    if (!String(tipoVinculacion || '').trim()) throw new BadRequestException('Indique el tipo de vinculación.');
    if (!(RUND_CARPETAS_CONFIGURABLES as readonly string[]).includes(bloque)) throw new BadRequestException('La carpeta indicada no existe.');
    if (typeof activo !== 'boolean') throw new BadRequestException('Indique si la carpeta queda activa o inactiva.');
    if (!activo && esCarpetaObligatoria(bloque)) {
      throw new BadRequestException('Esta carpeta es obligatoria para activar el perfil y no se puede desactivar.');
    }
    await this.dataSource.query(
      `INSERT INTO academic_work_plan."RundCarpetaConfiguracion" (tipo_vinculacion, bloque, activo, actualizado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tipo_vinculacion, bloque)
       DO UPDATE SET activo = EXCLUDED.activo, actualizado_por = EXCLUDED.actualizado_por, "updatedAt" = NOW()`,
      [tipo, bloque, activo, actorId || null],
    );
    return { tipoVinculacion: tipo, bloque, activo };
  }
}
