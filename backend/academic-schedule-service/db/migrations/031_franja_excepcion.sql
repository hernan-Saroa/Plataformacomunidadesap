-- ============================================================================
-- NUEVA-5b / EFDS-1941 — Cerrar el periodo
--
-- Cerrar un periodo exige que TODA su franja esté APROBADA o marcada como
-- EXCEPCIÓN (una franja que, por una razón válida, no pasará por aprobación pero
-- no debe impedir el cierre). La excepción es un flag en la franja, no un estado
-- nuevo: una franja marcada como excepción conserva su estado real.
--
-- El estado 'cerrado' del PERIODO ya existe (migración 018: planeacion | activo
-- | cerrado) y ya es inmutable (ofertas.activar rechaza reactivar un cerrado).
-- Aquí solo se agrega el insumo que faltaba para decidir el cierre.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".franja_horaria
  ADD COLUMN IF NOT EXISTS excepcion BOOLEAN NOT NULL DEFAULT false;

-- Canario de la migración.
DO $$
DECLARE v_col INT;
BEGIN
  SELECT COUNT(*) INTO v_col FROM information_schema.columns
   WHERE table_schema='academic-schedule' AND table_name='franja_horaria'
     AND column_name='excepcion';
  RAISE NOTICE '031: columna excepcion=%', v_col;
  IF v_col <> 1 THEN RAISE EXCEPTION '031: falta la columna excepcion'; END IF;
END $$;
