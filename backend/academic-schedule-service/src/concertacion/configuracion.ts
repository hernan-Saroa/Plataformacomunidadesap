/**
 * Configuración de la concertación — EFDS-2315.
 *
 * ⚠️ APAGADA POR DEFECTO. Se enciende solo con PROG_CONCERTACION_HABILITADA=true.
 * Mientras el PTA siga aprobando la Docencia, encenderla deja al docente con
 * doble aprobación; por eso lo demás puede subir sin esperar el cambio del PTA.
 *
 * ⚠️ FIRMA SIMULADA (decisión de Tomás, por ahora para pruebas). Con
 * PROG_MOCK_FIRMA_OTP distinto de 'false' cualquier código de 6 dígitos pasa,
 * igual que en el PTA, pero la firma SÍ se registra en el servidor: quién,
 * cuándo, en qué rol y sobre qué huella. La firma real (OTP de auth-service con
 * contexto prog-docencia:<id>:<huella>:<rol>) queda para cuando se decida.
 */
export function concertacionHabilitada(): boolean {
  return String(process.env.PROG_CONCERTACION_HABILITADA ?? '').trim().toLowerCase() === 'true';
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
