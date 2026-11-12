import { RUND_CARPETAS, type RundCarpeta } from './rundCarpetas';

export type RundConfigTipo = { codigo: string; nombre: string };
export type RundConfigCarpeta = { bloque: string; obligatoria: boolean };
export type RundConfigMatriz = { tipos: RundConfigTipo[]; carpetas: RundConfigCarpeta[]; inactivas: Record<string, string[]> };

/** Permiso propio de la pestaña Configuración (no lo concede ningún perfil de carga, revisión o incorporación). */
export const RUND_CONFIGURE_PERMISSION = 'banco-docentes.rund.configure';

/** Filas de la matriz en el orden del archivo de codificación, con su nombre. */
export function filasConfiguracion(matriz: RundConfigMatriz): Array<RundCarpeta & { obligatoria: boolean }> {
  const porBloque = new Map(matriz.carpetas.map(carpeta => [carpeta.bloque, carpeta]));
  return RUND_CARPETAS.filter(carpeta => porBloque.has(carpeta.bloque))
    .map(carpeta => ({ ...carpeta, obligatoria: porBloque.get(carpeta.bloque)!.obligatoria }));
}

export const carpetaActiva = (matriz: RundConfigMatriz, tipo: string, bloque: string) =>
  !(matriz.inactivas[tipo] || []).includes(bloque);

/** Devuelve una matriz nueva con la carpeta activada o desactivada para el tipo; no modifica la original. */
export function conCarpeta(matriz: RundConfigMatriz, tipo: string, bloque: string, activo: boolean): RundConfigMatriz {
  const actuales = (matriz.inactivas[tipo] || []).filter(item => item !== bloque);
  const inactivas = { ...matriz.inactivas, [tipo]: activo ? actuales : [...actuales, bloque] };
  if (!inactivas[tipo].length) delete inactivas[tipo];
  return { ...matriz, inactivas };
}

/** Cuántas carpetas aplican a un tipo de vinculación. */
export const carpetasActivas = (matriz: RundConfigMatriz, tipo: string) =>
  matriz.carpetas.filter(carpeta => carpetaActiva(matriz, tipo, carpeta.bloque)).length;
