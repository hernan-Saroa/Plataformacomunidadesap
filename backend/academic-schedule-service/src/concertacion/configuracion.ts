/**
 * Configuración de la concertación — EFDS-2315 / EFDS-2435.
 *
 * ⚠️ DOS FLUJOS QUE CONVIVEN, SIEMPRE:
 *   · AQUÍ (Programación Académica) la concertación funciona completa todo el tiempo, SIN interruptor:
 *     asignar, revisar, aprobar, aceptar o reportar novedad. Ya no depende de PROG_CONCERTACION_HABILITADA.
 *   · EL PTA tiene el interruptor «Interoperabilidad con Programación Académica», guardado en la base
 *     (academic_work_plan."ConfiguracionSistema", clave 'interoperabilidad_programacion'). Encendido: la
 *     docencia aceptada llega al PTA. Apagado: el PTA se llena a mano y la decisión aceptada queda
 *     pendiente (aplicacion_pta = 'pendiente_interoperabilidad_apagada') hasta que se encienda.
 *
 * ⚠️ CORTE POR PERIODO: vive en la MISMA fila de la base (campo desdePeriodo). Sin fila (ambiente
 * sin migrar) se usa PROG_CONCERTACION_DESDE_PERIODO y, sin ella, CORTE_POR_DEFECTO.
 *
 * ⚠️ FIRMA SIMULADA (decisión de Tomás, por ahora para pruebas): con
 * PROG_MOCK_FIRMA_OTP distinto de 'false' cualquier código de 6 dígitos pasa,
 * igual que en el PTA, pero la firma SÍ se registra en el servidor.
 */
export const CLAVE_INTEROPERABILIDAD = 'interoperabilidad_programacion';

/** La concertación está disponible siempre (ya no hay interruptor de este lado). */
export function concertacionHabilitada(): boolean {
  return true;
}

/** Corte cuando no hay fila en la base ni PROG_CONCERTACION_DESDE_PERIODO. */
export const CORTE_POR_DEFECTO = '2026-1';

interface Consultable { query(sql: string, params?: any[]): Promise<any> }

/** Corte inicial de la variable de entorno (solo si no hay fila en la base). */
export function desdePeriodo(): string {
  const v = String(process.env.PROG_CONCERTACION_DESDE_PERIODO ?? '').trim();
  return /^\d{4}-[12]$/.test(v) ? v : CORTE_POR_DEFECTO;
}

/** Fila de configuración compartida con el PTA (una sola fuente). null si no existe o no se puede leer. */
export async function leerInteroperabilidadPta(q: Consultable): Promise<{ habilitada: boolean; desdePeriodo: string } | null> {
  try {
    const f: any[] = await q.query(
      `SELECT valor FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
    const v = f[0]?.valor;
    if (!v) return null;
    return {
      habilitada: v.habilitada === true,
      desdePeriodo: typeof v.desdePeriodo === 'string' && /^\d{4}-[12]$/.test(v.desdePeriodo) ? v.desdePeriodo : desdePeriodo(),
    };
  } catch { return null; }
}

/** Periodo de corte vigente: la base manda; sin fila, la variable o el valor por defecto. */
export async function corteVigente(q: Consultable): Promise<string> {
  return (await leerInteroperabilidadPta(q))?.desdePeriodo ?? desdePeriodo();
}

/** ¿El periodo (código de plataforma) cae en el corte? Legado o sin código: no. */
export async function periodoEnCorte(q: Consultable, codigo: string | null | undefined): Promise<boolean> {
  const desde = await corteVigente(q);
  const c = String(codigo ?? '').trim();
  return /^\d{4}-[12]$/.test(c) && c >= desde;
}

export function firmaSimulada(): boolean {
  return String(process.env.PROG_MOCK_FIRMA_OTP ?? '').trim().toLowerCase() !== 'false';
}

/**
 * Revisiones que debe tener una concertación antes de poder aprobarse.
 *
 * ⚠️ PENDIENTE DEL NEGOCIO: qué aprueban los revisores de investigación y de
 * extensión. El esquema ya admite esos tipos (migración 037); incorporarlos es
 * agregarlos aquí con su permiso, sin cambiar el flujo.
 */
export interface RevisionRequerida {
  tipo: 'academica' | 'investigacion' | 'extension';
  /** Permiso del PTA que habilita la revisión, por nivel. */
  permiso: Record<'pregrado' | 'posgrado', string>;
  /** Igual, para la Docencia de una Dirección Territorial (componente academica_territorial). */
  permisoTerritorial: Record<'pregrado' | 'posgrado', string>;
}

export const REVISIONES_REQUERIDAS: readonly RevisionRequerida[] = [
  {
    tipo: 'academica',
    permiso: { pregrado: 'pta.review.academica.pregrado', posgrado: 'pta.review.academica.posgrado' },
    permisoTerritorial: { pregrado: 'pta.review.academica.territorial.pregrado', posgrado: 'pta.review.academica.territorial.posgrado' },
  },
];

/** Permiso del PTA que habilita aprobar la docencia, por nivel. */
export const PERMISO_APROBAR: Record<'pregrado' | 'posgrado', string> = {
  pregrado: 'pta.approve.academica.pregrado',
  posgrado: 'pta.approve.academica.posgrado',
};

/**
 * Docencia de una Dirección Territorial: en el PTA va al componente
 * academica_territorial, con su permiso por nivel (TERRITORIAL_NIVEL_APPROVE_PERMISSION).
 */
export const PERMISO_APROBAR_TERRITORIAL: Record<'pregrado' | 'posgrado', string> = {
  pregrado: 'pta.approve.academica.territorial.pregrado',
  posgrado: 'pta.approve.academica.territorial.posgrado',
};

export const PTA_REVIEW_ALL = 'pta.review.all';
export const PTA_APPROVE_ALL = 'pta.approve.all';
