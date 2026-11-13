/**
 * Interoperabilidad PTA ↔ Programación Académica — EFDS-2435.
 *
 * UNA SOLA FUENTE: la fila `interoperabilidad_programacion` de
 * `academic_work_plan."ConfiguracionSistema"`. Los dos servicios leen ESA fila;
 * no hay réplica ni caché que se pueda desalinear.
 *
 *   valor = { habilitada, desdePeriodo, motivo, cambiadoPor, cambiadoEn, origenInicial }
 *
 * · ENCENDIDA: la Docencia Directa llega de Programación Académica (solo lectura).
 * · APAGADA (modo manual): el docente la registra a mano y el PTA no consulta a
 *   Programación Académica.
 *
 * La variable PROG_CONCERTACION_HABILITADA solo SIEMBRA el valor inicial la primera
 * vez (INSERT … ON CONFLICT DO NOTHING). Después manda la base. Sin variable: APAGADA.
 */
export const CLAVE_INTEROPERABILIDAD = 'interoperabilidad_programacion';
export const CORTE_INICIAL_POR_DEFECTO = '2026-1';

export interface Queryable { query(sql: string, params?: any[]): Promise<any> }

export type OrigenConfig = 'base' | 'variable_entorno' | 'por_defecto';

export interface ConfigInteroperabilidad {
  habilitada: boolean;
  desdePeriodo: string;
  origen: OrigenConfig;
  motivo: string | null;
  cambiadoPor: string | null;
  cambiadoEn: string | null;
}

let fuente: Queryable | null = null;

/** El módulo registra la conexión al arrancar. Sin fuente (pruebas unitarias) se usa la variable. */
export function registrarFuenteInteroperabilidad(q: Queryable | null): void { fuente = q; }

export const CORTE_VALIDO = /^\d{4}-[12]$/;

function booleanoDeVariable(): { valor: boolean; definida: boolean } {
  const v = String(process.env.PROG_CONCERTACION_HABILITADA ?? '').trim().toLowerCase();
  return { valor: v === 'true', definida: v !== '' };
}

export function corteInicial(): string {
  const v = String(process.env.PROG_CONCERTACION_DESDE_PERIODO ?? '').trim();
  return CORTE_VALIDO.test(v) ? v : CORTE_INICIAL_POR_DEFECTO;
}

/** Lo que valdría sin fila en la base: la variable (apagada si no está definida). */
export function configDeVariable(): ConfigInteroperabilidad {
  const { valor, definida } = booleanoDeVariable();
  return {
    habilitada: valor, desdePeriodo: corteInicial(),
    origen: definida ? 'variable_entorno' : 'por_defecto',
    motivo: null, cambiadoPor: null, cambiadoEn: null,
  };
}

function deFila(v: any): ConfigInteroperabilidad {
  const corte = typeof v?.desdePeriodo === 'string' && CORTE_VALIDO.test(v.desdePeriodo) ? v.desdePeriodo : corteInicial();
  return {
    habilitada: v?.habilitada === true, desdePeriodo: corte, origen: 'base',
    motivo: typeof v?.motivo === 'string' ? v.motivo : null,
    cambiadoPor: typeof v?.cambiadoPor === 'string' ? v.cambiadoPor : null,
    cambiadoEn: typeof v?.cambiadoEn === 'string' ? v.cambiadoEn : null,
  };
}

/** Lee la configuración efectiva. Sin lectura posible a la base: la variable (apagada por defecto). */
export async function leerInteroperabilidad(q: Queryable | null = fuente): Promise<ConfigInteroperabilidad> {
  if (!q) return configDeVariable();
  const filas: any[] = await q.query(
    `SELECT valor FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
  return filas.length ? deFila(filas[0].valor) : configDeVariable();
}

/** ¿Está encendida la integración? Se lee de la base en cada llamada (una fila por clave primaria). */
export async function habilitadaLocal(): Promise<boolean> {
  return (await leerInteroperabilidad()).habilitada;
}

/**
 * Siembra el valor inicial si no hay fila. Seguro con varias réplicas arrancando a la vez.
 * Devuelve la configuración efectiva y si la sembró esta réplica.
 */
export async function sembrarInteroperabilidad(q: Queryable): Promise<{ config: ConfigInteroperabilidad; sembrada: boolean; difiereDeVariable: boolean }> {
  const inicial = configDeVariable();
  const valor = {
    habilitada: inicial.habilitada, desdePeriodo: inicial.desdePeriodo,
    motivo: 'Valor inicial sembrado al arrancar desde PROG_CONCERTACION_HABILITADA', cambiadoPor: null,
    cambiadoEn: new Date().toISOString(), origenInicial: inicial.origen,
  };
  const r: any[] = await q.query(
    `INSERT INTO academic_work_plan."ConfiguracionSistema" (clave, valor, "updatedAt")
     VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (clave) DO NOTHING RETURNING clave`,
    [CLAVE_INTEROPERABILIDAD, JSON.stringify(valor)]);
  const config = await leerInteroperabilidad(q);
  const sembrada = r.length > 0;
  return { config, sembrada, difiereDeVariable: !sembrada && inicial.origen !== 'por_defecto' && inicial.habilitada !== config.habilitada };
}
