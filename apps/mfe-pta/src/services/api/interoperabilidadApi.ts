import { apiClient } from '../../../../shell/src/services/api';

/** Interoperabilidad PTA ↔ Programación Académica (EFDS-2435). El servidor decide; aquí solo se muestra y se pide el cambio. */
export interface ImpactoInteroperabilidad {
  concertacionesEnCurso: number;
  ptasConDocenciaAplicada: number;
  decisionesPendientes: number;
}

export interface EstadoInteroperabilidad {
  habilitada: boolean;
  desdePeriodo: string;
  origen: 'base' | 'variable_entorno' | 'por_defecto';
  motivo: string | null;
  cambiadoPor: string | null;
  cambiadoEn: string | null;
  impacto: ImpactoInteroperabilidad;
}

export interface ResultadoEncendido { aplicadas: number; conflicto: number; omitidas: number; errores: string[] }

const BASE = '/pta/api/v1/configuracion/interoperabilidad';

export async function getInteroperabilidad(): Promise<EstadoInteroperabilidad> {
  const raw = await apiClient.get<any>(BASE, undefined, { cache: 'no-store', skipErrorToast: true, retries: 0 });
  return (raw?.data ?? raw) as EstadoInteroperabilidad;
}

export async function cambiarInteroperabilidad(
  body: { habilitada: boolean; desdePeriodo: string; motivo: string },
): Promise<{ config: EstadoInteroperabilidad; resultado: ResultadoEncendido | null; impacto: ImpactoInteroperabilidad }> {
  const raw = await apiClient.put<any>(BASE, { ...body, confirmacion: true }, { skipErrorToast: true, retries: 0 });
  return raw?.data ?? raw;
}

/**
 * ¿Está encendida la integración? Lectura pública (solo un booleano), para el mensaje de la Docencia Directa.
 * null = no se pudo saber (no se afirma nada).
 */
export async function getInteroperabilidadHabilitada(): Promise<boolean | null> {
  try {
    const raw = await apiClient.get<any>('/pta/api/v1/contrato-programacion/v1/docencia/configuracion', undefined,
      { cache: 'no-store', skipErrorToast: true, retries: 0 });
    const d = raw?.data ?? raw;
    return typeof d?.habilitada === 'boolean' ? d.habilitada : null;
  } catch { return null; }
}
