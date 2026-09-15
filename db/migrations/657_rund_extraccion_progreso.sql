-- Progreso real y entrega persistente a la campana; no modifica datos del perfil.
ALTER TABLE academic_work_plan."RundExtraccionTrabajo"
  ADD COLUMN IF NOT EXISTS etapa TEXT NOT NULL DEFAULT 'EN_COLA',
  ADD COLUMN IF NOT EXISTS etapa_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS iniciado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notificacion_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS notificado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notificacion_proxima TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_rund_extraccion_aviso
  ON academic_work_plan."RundExtraccionTrabajo"(notificacion_proxima)
  WHERE notificado_en IS NULL AND estado IN ('COMPLETADO','ERROR','OBSOLETO');
