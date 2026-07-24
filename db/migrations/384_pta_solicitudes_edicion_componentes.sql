-- ============================================================================
-- 384: Solicitudes de edición parcial de un PTA aprobado/terminado
-- ============================================================================
-- Amplía SolicitudPTA sin alterar los registros históricos de creación de un
-- segundo PTA. La edición referencia el mismo plan y conserva el estado previo
-- para restaurarlo al finalizar la nueva aprobación por componentes.
-- ============================================================================

ALTER TABLE academic_work_plan."SolicitudPTA"
  ADD COLUMN IF NOT EXISTS "tipoSolicitud" TEXT NOT NULL DEFAULT 'creacion',
  ADD COLUMN IF NOT EXISTS "ptaId" UUID NULL,
  ADD COLUMN IF NOT EXISTS componentes JSONB NULL,
  ADD COLUMN IF NOT EXISTS "estadoPtaAnterior" TEXT NULL;

-- Recuperación idempotente para entornos donde una versión preliminar alcanzó
-- a crear ptaId como TEXT. La conversión es estricta: un valor no UUID detiene
-- la migración en lugar de perder silenciosamente una relación.
DO $$
DECLARE
  pta_id_type TEXT;
BEGIN
  SELECT data_type
  INTO pta_id_type
  FROM information_schema.columns
  WHERE table_schema = 'academic_work_plan'
    AND table_name = 'SolicitudPTA'
    AND column_name = 'ptaId';

  IF pta_id_type IS DISTINCT FROM 'uuid' THEN
    EXECUTE '
      ALTER TABLE academic_work_plan."SolicitudPTA"
      ALTER COLUMN "ptaId" TYPE UUID
      USING NULLIF(BTRIM("ptaId"), '''')::uuid
    ';
  END IF;
END $$;

UPDATE academic_work_plan."SolicitudPTA"
SET "tipoSolicitud" = 'creacion'
WHERE "tipoSolicitud" IS NULL OR BTRIM("tipoSolicitud") = '';

CREATE INDEX IF NOT EXISTS idx_solicitud_pta_id
  ON academic_work_plan."SolicitudPTA" ("ptaId");

CREATE INDEX IF NOT EXISTS idx_solicitud_tipo_estado
  ON academic_work_plan."SolicitudPTA" ("tipoSolicitud", estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_edicion_activa_por_pta
  ON academic_work_plan."SolicitudPTA" ("ptaId")
  WHERE "tipoSolicitud" = 'edicion_componentes'
    AND estado IN ('pendiente', 'aprobado', 'en_aprobacion');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SolicitudPTA_ptaId_fkey'
      AND conrelid = 'academic_work_plan."SolicitudPTA"'::regclass
  ) THEN
    ALTER TABLE academic_work_plan."SolicitudPTA"
      ADD CONSTRAINT "SolicitudPTA_ptaId_fkey"
      FOREIGN KEY ("ptaId")
      REFERENCES academic_work_plan."PlanTrabajoAcademico"(id)
      ON DELETE SET NULL;
  END IF;
END $$;
