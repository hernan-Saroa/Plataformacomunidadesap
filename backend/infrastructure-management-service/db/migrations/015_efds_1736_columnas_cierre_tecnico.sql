-- ---------------------------------------------------------------------------
-- Migracion 015 · EFDS-1736 RF-INF-007 — Cierre Técnico Ejecución y Evidencia Fotográfica
-- Fecha: 2026-09-22
-- Responsable: Coordinación UMI
-- Objetivo:
--   1. Extender la tabla solicitud_mantenimiento con 8 columnas nuevas para
--      registro oficial del cierre técnico de la ejecución:
--      - fecha_cierre_tecnico: marca temporal de cierre COMPLETADA
--      - usuario_cierre_tecnico_id: UUID usuario auth.user que cerró
--      - responsable_cierre_display: texto TEC-XXX · Nombre Técnico display
--      - evidencias_cierre: jsonb array MinIO prefijo mantenimiento/cierre-tecnico/
--      - costo_final_efectivo_cop: monto final real en COP
--      - trabajo_realizado: descripción trabajo ejecutado
--      - observaciones_cierre: comentarios opcionales
--      - requiere_seguimiento: boolean default false para flujo EFDS-1737 conformidad
--
-- Idempotente: todos los ALTER TABLE llevan ADD COLUMN IF NOT EXISTS.
-- ---------------------------------------------------------------------------

BEGIN;

SET LOCAL search_path TO "infrastructure-management", public;

-- ===========================================================================
-- PASO 1 — Columnas nuevas cierre técnico solicitud_mantenimiento
-- ===========================================================================

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_cierre_tecnico        timestamptz NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS usuario_cierre_tecnico_id   uuid NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS responsable_cierre_display text NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS evidencias_cierre           jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS costo_final_efectivo_cop   numeric(15,2) NOT NULL DEFAULT 0;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS trabajo_realizado          text NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS observaciones_cierre        text NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS requiere_seguimiento        boolean NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.fecha_cierre_tecnico      IS 'Momento oficial del cierre técnico en estado COMPLETADA. EFDS-1736 RF-INF-007.';
COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.evidencias_cierre      IS 'Array jsonb de objetos {name,size,type,url,bucket,key} subidos a MinIO mantenimiento/cierre-tecnico/{idSolicitud}/. Mínimo 1 obligatorio.';
COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.costo_final_efectivo_cop    IS 'Valor real ejecutado COP (incluye MO + materiales propios del técnico. Diferencia con costo_estimado para BI EFDS-1739.';
COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.trabajo_realizado          IS 'Descripción min 15 chars del trabajo realizado por el técnico ejecutor.';
COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.requiere_seguimiento      IS 'Si true el cierre marcado para seguimiento futuro en EFDS-1737 Conformidad o EFDS-1739 Reportes.';

COMMIT;
