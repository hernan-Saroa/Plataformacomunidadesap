-- ============================================================================
-- 035 · EFDS-2308 — Jornada DISTANCIA.
--
-- La programación real trae 158 franjas en Distancia y el CHECK solo admitía
-- DIURNA, NOCTURNA y FIN_DE_SEMANA. Se agrega DISTANCIA como código.
--
-- ⚠️ Se MANTIENE FIN_DE_SEMANA: el backend lo sugiere para sábado y domingo.
-- DISTANCIA es una modalidad, no se deduce del día ni de la hora: solo entra
-- cuando se declara explícitamente.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".franja_horaria DROP CONSTRAINT IF EXISTS chk_franja_jornada;
ALTER TABLE "academic-schedule".franja_horaria
  ADD CONSTRAINT chk_franja_jornada
  CHECK (jornada IS NULL OR jornada IN ('DIURNA', 'NOCTURNA', 'FIN_DE_SEMANA', 'DISTANCIA'));
