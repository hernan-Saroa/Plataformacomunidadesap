/**
 * Catálogo de estados del ciclo de vida de una solicitud de comisión.
 *
 * Flujo Etapa 3 (RF-LIQ-004 — Consolidación y cierre de expediente):
 *   PENDIENTE (borrador) → RADICADA → SOLICITADO / EXTEMPORANEA → APROBADO_JEFE → …
 *
 * - `RADICADA`: expediente radicado por el enlace (sin evaluación de anticipación).
 *   Solo se diferencia de `EXTEMPORANEA` en el momento de la consolidación.
 * - `EXTEMPORANEA`: expediente consolidado con anticipación menor a 14 días hábiles.
 *   Se genera en consolidación, no en radicación.
 * - `DEVUELTA`: el Grupo de Viáticos devolvió el expediente al enlace para
 *   corregir faltantes; puede volver a consolidarse.
 * - `SOLICITADO`: expediente consolidado en revisión del Grupo de Viáticos
 *   (anticipación >= 14 días hábiles). Queda en solo lectura.
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
 * El enlace solo puede enviar a revisión una comisión `RADICADA` (o `DEVUELTA`
 * tras una devolución del Grupo de Viáticos). `EXTEMPORANEA` se mantiene por
 * compatibilidad con expedientes existentes.
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
