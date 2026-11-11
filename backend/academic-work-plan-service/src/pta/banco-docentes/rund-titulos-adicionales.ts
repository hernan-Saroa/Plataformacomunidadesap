import { BadRequestException } from '@nestjs/common';

/**
 * RUND-003 — Varios títulos por nivel de formación.
 *
 * El título con el que el docente fue vinculado (el de la plantilla de cargue) se guarda en las columnas de
 * siempre (`pregrado`, `especializacion`…) y se muestra como «Información precargada». Los demás títulos del
 * mismo nivel viven en `titulosAdicionales` y se muestran como «Información adicional».
 */
export const NIVELES_TITULO = ['pregrado', 'especializacion', 'maestria', 'doctorado', 'posDoctorado'] as const;
export type NivelTitulo = (typeof NIVELES_TITULO)[number];
export type TitulosAdicionales = Partial<Record<NivelTitulo, string[]>>;

/** Límites defensivos; el título principal ya admite 300 caracteres en el formulario. */
export const MAX_TITULOS_ADICIONALES_POR_NIVEL = 10;
export const MAX_LONGITUD_TITULO = 300;

/** Columnas de la plantilla que traen títulos adicionales de cada nivel (varios separados por «;», «|» o salto de línea). */
export const COLUMNAS_TITULOS_ADICIONALES: Record<NivelTitulo, string> = {
  pregrado: 'TITULOS_ADICIONALES_PREGRADO',
  especializacion: 'TITULOS_ADICIONALES_ESPECIALIZACION',
  maestria: 'TITULOS_ADICIONALES_MAESTRIA',
  doctorado: 'TITULOS_ADICIONALES_DOCTORADO',
  posDoctorado: 'TITULOS_ADICIONALES_POSDOCTORADO',
};

const clave = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const aTexto = (value: unknown): string => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Separa una celda con varios títulos. */
export function separarTitulos(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(separarTitulos);
  return String(value ?? '').split(/[;|\r\n]+/).map(aTexto).filter(Boolean);
}

/**
 * Limpia los títulos adicionales de un nivel: quita vacíos, repetidos (sin importar tildes ni mayúsculas) y el
 * que ya es el título precargado. Conserva el orden de ingreso.
 */
export function limpiarTitulosNivel(value: unknown, principal?: string | null): string[] {
  const vistos = new Set<string>();
  if (principal) vistos.add(clave(aTexto(principal)));
  const resultado: string[] = [];
  for (const titulo of separarTitulos(value)) {
    const k = clave(titulo);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    resultado.push(titulo);
  }
  return resultado;
}

/**
 * Lee los títulos adicionales de la solicitud. `undefined` significa «no vino»: quien guarda debe conservar lo
 * que ya existe (la carga masiva sin esas columnas no borra títulos). Un objeto, aunque sea vacío, reemplaza.
 */
export function leerTitulosAdicionales(raw: any, principales: Partial<Record<NivelTitulo, string | null>>): TitulosAdicionales | undefined {
  const desdeObjeto = raw?.titulosAdicionales ?? raw?.titulos_adicionales;
  const hayColumnas = NIVELES_TITULO.some(nivel => raw?.[COLUMNAS_TITULOS_ADICIONALES[nivel]] !== undefined);
  if ((desdeObjeto === undefined || desdeObjeto === null || typeof desdeObjeto !== 'object') && !hayColumnas) return undefined;
  const resultado: TitulosAdicionales = {};
  for (const nivel of NIVELES_TITULO) {
    const origen = desdeObjeto && typeof desdeObjeto === 'object' && !Array.isArray(desdeObjeto) && (desdeObjeto as any)[nivel] !== undefined
      ? (desdeObjeto as any)[nivel]
      : raw?.[COLUMNAS_TITULOS_ADICIONALES[nivel]];
    const titulos = limpiarTitulosNivel(origen, principales[nivel]);
    const columna = COLUMNAS_TITULOS_ADICIONALES[nivel];
    if (titulos.length > MAX_TITULOS_ADICIONALES_POR_NIVEL) {
      throw new BadRequestException({ message: `Solo se admiten ${MAX_TITULOS_ADICIONALES_POR_NIVEL} títulos adicionales por nivel.`, columna, datoErrado: `${titulos.length} títulos`, valorEsperado: `Máximo ${MAX_TITULOS_ADICIONALES_POR_NIVEL} títulos` });
    }
    const largo = titulos.find(t => t.length > MAX_LONGITUD_TITULO);
    if (largo) {
      throw new BadRequestException({ message: `Cada título adicional admite máximo ${MAX_LONGITUD_TITULO} caracteres.`, columna, datoErrado: largo.slice(0, 60) + '…', valorEsperado: `Máximo ${MAX_LONGITUD_TITULO} caracteres` });
    }
    if (titulos.length) resultado[nivel] = titulos;
  }
  return resultado;
}

/**
 * Qué se guarda: lo que llegó si hay algo que cambiar; si no llegó (undefined) o llegó vacío sobre un registro sin
 * títulos adicionales, se conserva lo existente para no reportar cambios que no existen.
 */
export function resolverTitulosAdicionales(nuevo: TitulosAdicionales | undefined, existente: unknown): TitulosAdicionales | null {
  const guardado = titulosAdicionalesGuardados(existente);
  if (nuevo === undefined) return Object.keys(guardado).length ? guardado : (existente as TitulosAdicionales | null) ?? null;
  if (!Object.keys(nuevo).length && !Object.keys(guardado).length) return (existente as TitulosAdicionales | null) ?? null;
  return nuevo;
}

/** Forma segura de leer lo guardado (registros anteriores tienen null). */
export function titulosAdicionalesGuardados(value: unknown): TitulosAdicionales {
  const resultado: TitulosAdicionales = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return resultado;
  for (const nivel of NIVELES_TITULO) {
    const titulos = limpiarTitulosNivel((value as any)[nivel]);
    if (titulos.length) resultado[nivel] = titulos;
  }
  return resultado;
}
