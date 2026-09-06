/**
 * Catálogo de estados del ciclo de vida de una solicitud de comisión.
 *
 * Flujo Etapa 3 (RF-LIQ-004 — Consolidación y cierre de expediente):
 *   PENDIENTE (borrador) → RADICADA → SOLICITADO → APROBADO_JEFE → …
 *
 * - `RADICADA` / `EXTEMPORANEA`: expediente radicado por el enlace pero aún NO
 *   consolidado (puede seguir cargando soportes en PDF).
 * - `DEVUELTA`: el Grupo de Viáticos devolvió el expediente al enlace para
 *   corregir faltantes; puede volver a consolidarse.
 * - `SOLICITADO`: expediente CONSOLIDADO y enviado a revisión del Grupo de
 *   Viáticos. A partir de este estado el expediente queda en modo **solo
 *   lectura** (inmutable) para el rol Enlace de Dependencia.
 */
export enum EstadoSolicitud {
  BORRADOR = 'BORRADOR',
  PENDIENTE = 'PENDIENTE',
  RADICADA = 'RADICADA',
  EXTEMPORANEA = 'EXTEMPORANEA',
  /** Devuelta por el Grupo de Viáticos para subsanar faltantes. */
  DEVUELTA = 'DEVUELTA',
  SOLICITADO = 'SOLICITADO',
  APROBADO_JEFE = 'APROBADO_JEFE',
  APROBADO_TALENTO_HUMANO = 'APROBADO_TALENTO_HUMANO',
  RESOLUCION_EMITIDA = 'RESOLUCION_EMITIDA',
  TIQUETES_COMPRADOS = 'TIQUETES_COMPRADOS',
  EN_COMISION = 'EN_COMISION',
  PENDIENTE_LEGALIZACION = 'PENDIENTE_LEGALIZACION',
  LEGALIZADO = 'LEGALIZADO',
  RECHAZADO = 'RECHAZADO',
}

export const ESTADOS_SOLICITUD = Object.values(EstadoSolicitud);

/**
 * Estados de entrada permitidos para consolidar el expediente (RF-LIQ-004).
 * El enlace solo puede enviar a revisión una comisión `RADICADA` (o sus
 * variantes `EXTEMPORANEA` / `DEVUELTA` por analista).
 */
export const ESTADOS_CONSOLIDABLES: ReadonlySet<EstadoSolicitud> = new Set([
  EstadoSolicitud.RADICADA,
  EstadoSolicitud.EXTEMPORANEA,
  EstadoSolicitud.DEVUELTA,
]);

/**
 * Estados que bloquean CUALQUIER mutación del expediente (edición de campos,
 * subida/eliminación de documentos) porque ya fue consolidado o avanzó en el
 * flujo de aprobación (solo lectura).
 */
export const ESTADOS_SOLO_LECTURA: ReadonlySet<EstadoSolicitud> = new Set([
  EstadoSolicitud.SOLICITADO,
  EstadoSolicitud.APROBADO_JEFE,
  EstadoSolicitud.APROBADO_TALENTO_HUMANO,
  EstadoSolicitud.RESOLUCION_EMITIDA,
  EstadoSolicitud.TIQUETES_COMPRADOS,
  EstadoSolicitud.EN_COMISION,
  EstadoSolicitud.PENDIENTE_LEGALIZACION,
  EstadoSolicitud.LEGALIZADO,
  EstadoSolicitud.RECHAZADO,
]);
