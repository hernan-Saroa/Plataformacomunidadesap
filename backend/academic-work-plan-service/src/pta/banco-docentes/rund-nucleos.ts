/**
 * EFDS-2345 / EFDS-2375 — Interpretación del NUCLEO_TEMATICO del RUND.
 *
 * El RUND trae el núcleo como texto libre: a veces un área, a veces varias
 * («Organizaciones Públicas / Gerencia Pública Integral», «A, Y B», «A - B»), a veces
 * una frase genérica que no es un núcleo («Labores de docencia…»). Este módulo es
 * puro: recibe el texto y las equivalencias (tabla `nucleo_equivalencia`, datos
 * editables) y devuelve las áreas canónicas, lo genérico y lo que no se pudo
 * resolver, para reportarlo. Nunca adivina: una parte sin equivalencia se reporta.
 */

export type TipoEquivalencia = 'area' | 'generica' | 'sin_area';

export interface Equivalencia {
  varianteNormalizada: string;
  coincidencia: 'exacta' | 'prefijo';
  tipo: TipoEquivalencia;
  idArea: number | null;
}

export interface AreaInterpretada {
  idArea: number;
  /** La parte del texto original de la que salió el área. */
  texto: string;
}

export interface Interpretacion {
  areas: AreaInterpretada[];
  /** El texto completo es una frase genérica: no hay núcleo. */
  generica: boolean;
  /** Núcleos reales que todavía no tienen área (se reportan). */
  sinArea: string[];
  /** Partes que no coinciden con ninguna equivalencia (se reportan). */
  sinResolver: string[];
}

/** Misma regla que `academic_work_plan.normalizar_nucleo` (migración 669). */
export function normalizarNucleo(texto: unknown): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca la equivalencia de un texto: primero exacta, luego el prefijo más largo. */
export function buscarEquivalencia(texto: string, equivalencias: Equivalencia[], permitirPrefijo = true): Equivalencia | null {
  const n = normalizarNucleo(texto);
  if (!n) return null;
  const exacta = equivalencias.find((e) => e.varianteNormalizada === n);
  if (exacta) return exacta;
  if (!permitirPrefijo) return null;
  let mejor: Equivalencia | null = null;
  for (const e of equivalencias) {
    if (e.coincidencia !== 'prefijo') continue;
    if (!n.startsWith(e.varianteNormalizada + ' ')) continue;
    if (!mejor || e.varianteNormalizada.length > mejor.varianteNormalizada.length) mejor = e;
  }
  return mejor;
}

const limpiarParte = (parte: string) => parte.trim().replace(/^y\s+/i, '').trim();

/**
 * Resuelve un fragmento (sin «/»). Orden: coincidencia exacta del fragmento; luego
 * separar por «-» o «,» (cada pedazo es un núcleo); luego el prefijo del fragmento
 * completo; por último partir en « y » cuando ambos lados son áreas
 * («Desarrollo y Gestión Territorial y Gestión del Desarrollo»).
 */
function resolverFragmento(fragmento: string, equivalencias: Equivalencia[]): Array<{ texto: string; eq: Equivalencia | null }> {
  const texto = limpiarParte(fragmento);
  if (!normalizarNucleo(texto)) return [];

  const exacta = buscarEquivalencia(texto, equivalencias, false);
  if (exacta) return [{ texto, eq: exacta }];

  const pedazos = texto.split(/\s*[-,]\s*/).map(limpiarParte).filter((p) => normalizarNucleo(p));
  if (pedazos.length > 1) {
    return pedazos.flatMap((p) => resolverFragmento(p, equivalencias));
  }

  const prefijo = buscarEquivalencia(texto, equivalencias, true);
  if (prefijo) return [{ texto, eq: prefijo }];

  const conY = partirEnY(texto, equivalencias);
  if (conY) return conY;

  return [{ texto, eq: null }];
}

function partirEnY(texto: string, equivalencias: Equivalencia[]): Array<{ texto: string; eq: Equivalencia }> | null {
  const re = /\s+y\s+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const izquierda = texto.slice(0, m.index);
    const derecha = texto.slice(m.index + m[0].length);
    const eqIzq = buscarEquivalencia(izquierda, equivalencias, true);
    if (!eqIzq || eqIzq.tipo !== 'area') continue;
    const eqDer = buscarEquivalencia(derecha, equivalencias, true);
    if (eqDer && eqDer.tipo === 'area') return [{ texto: izquierda.trim(), eq: eqIzq }, { texto: derecha.trim(), eq: eqDer }];
    const resto = partirEnY(derecha, equivalencias);
    if (resto) return [{ texto: izquierda.trim(), eq: eqIzq }, ...resto];
  }
  return null;
}

export function interpretarNucleo(texto: unknown, equivalencias: Equivalencia[]): Interpretacion {
  const resultado: Interpretacion = { areas: [], generica: false, sinArea: [], sinResolver: [] };
  const original = String(texto ?? '').trim();
  if (!normalizarNucleo(original)) return resultado;

  // Una frase genérica describe funciones, no un núcleo: se descarta completa.
  const completa = buscarEquivalencia(original, equivalencias, true);
  if (completa?.tipo === 'generica') {
    resultado.generica = true;
    return resultado;
  }

  const vistas = new Set<number>();
  for (const fragmento of original.split('/')) {
    for (const { texto: parte, eq } of resolverFragmento(fragmento, equivalencias)) {
      if (!eq) resultado.sinResolver.push(parte);
      else if (eq.tipo === 'sin_area') resultado.sinArea.push(parte);
      else if (eq.tipo === 'area' && eq.idArea != null && !vistas.has(eq.idArea)) {
        vistas.add(eq.idArea);
        resultado.areas.push({ idArea: eq.idArea, texto: parte });
      }
      // Una frase genérica dentro de un compuesto no aporta área.
    }
  }
  return resultado;
}
