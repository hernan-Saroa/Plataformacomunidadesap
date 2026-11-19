/**
 * RUND-003 — Varios títulos por nivel de formación.
 * El título de la plantilla de cargue es la «Información precargada»; los demás títulos del nivel son «Información adicional».
 * Espejo de backend/academic-work-plan-service/src/pta/banco-docentes/rund-titulos-adicionales.ts.
 */
export type NivelTitulo = 'pregrado' | 'especializacion' | 'maestria' | 'doctorado' | 'posDoctorado';
export type TitulosAdicionales = Partial<Record<NivelTitulo, string[]>>;

export const ETIQUETA_INFORMACION_PRECARGADA = 'Información precargada';
export const ETIQUETA_INFORMACION_ADICIONAL = 'Información adicional';
export const MAX_TITULOS_ADICIONALES_POR_NIVEL = 10;
export const MAX_LONGITUD_TITULO = 300;

export const NIVELES_TITULO: { clave: NivelTitulo; etiqueta: string }[] = [
  { clave: 'pregrado', etiqueta: 'Pregrado' },
  { clave: 'especializacion', etiqueta: 'Especialización' },
  { clave: 'maestria', etiqueta: 'Maestría' },
  { clave: 'doctorado', etiqueta: 'Doctorado' },
  { clave: 'posDoctorado', etiqueta: 'Posdoctorado' },
];

const sinTildes = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Nivel al que corresponde una fila del catálogo (por su etiqueta), o null si no es una fila de título. */
export function nivelTituloDeFila(etiqueta: string): NivelTitulo | null {
  const clave = sinTildes(etiqueta || '');
  return NIVELES_TITULO.find(nivel => sinTildes(nivel.etiqueta) === clave)?.clave ?? null;
}

/** Limpia una lista de títulos: sin vacíos, sin repetidos (ignora tildes y mayúsculas) y sin el título precargado. */
export function limpiarTitulos(titulos: unknown, precargado?: string | null): string[] {
  const vistos = new Set<string>(precargado ? [sinTildes(String(precargado))] : []);
  const resultado: string[] = [];
  for (const bruto of Array.isArray(titulos) ? titulos : []) {
    const titulo = String(bruto ?? '').replace(/\s+/g, ' ').trim();
    const clave = sinTildes(titulo);
    if (!clave || vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push(titulo);
  }
  return resultado;
}

/** Títulos adicionales de un nivel desde lo que devuelve el API (registros anteriores no traen nada). */
export function titulosAdicionalesDe(valor: unknown, nivel: NivelTitulo): string[] {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return [];
  return limpiarTitulos((valor as Record<string, unknown>)[nivel]);
}

/** Lo mismo, desde la lista de campos de la tarjeta RUND (bloque FORMACION). */
export function titulosAdicionalesDeCampos(campos: any[] | undefined, nivel: NivelTitulo): string[] {
  return titulosAdicionalesDe(campos?.find(campo => campo?.campo === 'TITULOS_ADICIONALES')?.valor, nivel);
}

/** Arma el objeto que se envía al guardar: solo niveles con títulos y sin repetir el precargado. */
export function armarTitulosAdicionales(
  borradores: Partial<Record<NivelTitulo, string[]>>,
  precargados: Partial<Record<NivelTitulo, string | null | undefined>>,
): TitulosAdicionales {
  const resultado: TitulosAdicionales = {};
  for (const { clave } of NIVELES_TITULO) {
    const titulos = limpiarTitulos(borradores[clave], precargados[clave]);
    if (titulos.length) resultado[clave] = titulos;
  }
  return resultado;
}

/** Texto para reportes y exportaciones: todos los títulos de un nivel, el precargado primero. */
export function todosLosTitulos(precargado: string | null | undefined, adicionales: string[]): string {
  return [precargado ? String(precargado).trim() : '', ...adicionales].filter(Boolean).join('; ');
}
