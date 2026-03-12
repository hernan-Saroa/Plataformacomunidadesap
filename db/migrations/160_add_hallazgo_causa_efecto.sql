-- ============================================================================
-- MIGRACIÓN 160: Agregar causa_raiz y efecto a control_interno.hallazgo
-- Fecha: 2026-03-11
-- Descripción: Permite guardar y mostrar causa raíz y efecto en detalle de hallazgo
-- ============================================================================

BEGIN;

ALTER TABLE control_interno.hallazgo
  ADD COLUMN IF NOT EXISTS causa_raiz TEXT,
  ADD COLUMN IF NOT EXISTS efecto TEXT;

COMMENT ON COLUMN control_interno.hallazgo.causa_raiz IS 'Causa raíz del hallazgo identificada';
COMMENT ON COLUMN control_interno.hallazgo.efecto IS 'Efecto o impacto del hallazgo';

COMMIT;
