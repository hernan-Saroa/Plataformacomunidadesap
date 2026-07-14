-- =============================================================================
-- 378: Solicitud de modificación de PTA (segundo PTA / versión R01 → R02)
-- =============================================================================
-- HU-12. Hasta ahora una "solicitud aprobada" habilitaba crear una FILA NUEVA e
-- independiente de PlanTrabajoAcademico (modelo viejo, sin linaje). El requisito
-- es NO crear un PTA nuevo, sino reabrir el PTA existente (R01) para editarlo y,
-- al reenviarlo por el flujo normal, dejarlo como la versión vigente (R02),
-- conservando R01 como snapshot inmutable en HistorialEstadoPTA.
--
-- Esta migración agrega a SolicitudPTA:
--   - ptaId: el PTA que se desea modificar (cuando es una solicitud de modificación).
--   - tipoSolicitud: 'creacion' (flujo legacy de segundo PTA) | 'modificacion' (R01→R02).
-- Idempotente.
-- =============================================================================

ALTER TABLE academic_work_plan."SolicitudPTA"
  ADD COLUMN IF NOT EXISTS "ptaId" text NULL,
  ADD COLUMN IF NOT EXISTS "tipoSolicitud" text NOT NULL DEFAULT 'creacion';

COMMENT ON COLUMN academic_work_plan."SolicitudPTA"."ptaId" IS
  'PTA objetivo de la solicitud de modificación (R01 que se reabrirá como R02). Null en solicitudes de creación.';
COMMENT ON COLUMN academic_work_plan."SolicitudPTA"."tipoSolicitud" IS
  'Tipo de solicitud: creacion (segundo PTA legacy) | modificacion (versionamiento R01→R02 sobre el mismo PTA).';
