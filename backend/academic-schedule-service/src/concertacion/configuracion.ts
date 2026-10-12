/**
 * Configuración de la concertación — EFDS-2315.
 *
 * ⚠️ UN SOLO INTERRUPTOR PARA LOS DOS LADOS: PROG_CONCERTACION_HABILITADA.
 * La misma variable se pone en Programación Académica y en el PTA, y el régimen
 * nuevo solo rige si los DOS la tienen encendida: cada servicio lo verifica en
 * el otro por el contrato antes de actuar (ver `ConcertacionService` y, en el
 * PTA, `DocenciaProgramacionService`). Así:
 *   · ambos apagados          → todo como hoy (el PTA aprueba la Docencia);
 *   · solo el PTA encendido   → el PTA sigue aprobando; aquí no se concierta;
 *   · solo PA encendido       → aquí se rechaza concertar (el PTA aprueba);
 *   · ambos encendidos        → se concierta aquí y el PTA deja de aprobarla.
 * Nunca doble aprobación. "Ninguna" solo si el otro servicio no responde, y
 * entonces con un error explícito.
 *
 * ⚠️ CORTE POR PERIODO: PROG_CONCERTACION_DESDE_PERIODO (p. ej. '2027-1'). Solo
 * se concierta en periodos de plataforma con código >= al corte; el PTA lee el
 * corte de aquí, una sola fuente. Encendida sin corte = apagada (no se adivina).
 *
 * ⚠️ FIRMA SIMULADA (decisión de Tomás, por ahora para pruebas): con
 * PROG_MOCK_FIRMA_OTP distinto de 'false' cualquier código de 6 dígitos pasa,
 * igual que en el PTA, pero la firma SÍ se registra en el servidor.
 */
export function concertacionHabilitada(): boolean {
  return String(process.env.PROG_CONCERTACION_HABILITADA ?? '').trim().toLowerCase() === 'true'
    && desdePeriodo() !== null;
}

/** Código del periodo de corte (año-semestre). null = sin corte válido. */
export function desdePeriodo(): string | null {
  const v = String(process.env.PROG_CONCERTACION_DESDE_PERIODO ?? '').trim();
  return /^\d{4}-[12]$/.test(v) ? v : null;
}

/** ¿El periodo (código de plataforma) cae en el corte? Legado o sin código: no. */
export function periodoEnCorte(codigo: string | null | undefined): boolean {
  const desde = desdePeriodo();
  const c = String(codigo ?? '').trim();
  return desde !== null && /^\d{4}-[12]$/.test(c) && c >= desde;
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
}

export const REVISIONES_REQUERIDAS: readonly RevisionRequerida[] = [
  {
    tipo: 'academica',
    permiso: { pregrado: 'pta.review.academica.pregrado', posgrado: 'pta.review.academica.posgrado' },
  },
];

/** Permiso del PTA que habilita aprobar la docencia, por nivel. */
export const PERMISO_APROBAR: Record<'pregrado' | 'posgrado', string> = {
  pregrado: 'pta.approve.academica.pregrado',
  posgrado: 'pta.approve.academica.posgrado',
};

export const PTA_REVIEW_ALL = 'pta.review.all';
export const PTA_APPROVE_ALL = 'pta.approve.all';
