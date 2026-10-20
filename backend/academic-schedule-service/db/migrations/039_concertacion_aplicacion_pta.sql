-- ============================================================================
-- 039 · EFDS-2315 — Qué hizo el PTA con la decisión concertada.
--
-- El PTA responde al registrar la decisión si la APLICÓ a su componente de
-- Docencia o si quedó pendiente (sin PTA todavía, PTA ya firmado, PTA en el
-- flujo anterior). Se guarda aquí para que quede visible y se pueda reportar.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".concertacion_docencia
  ADD COLUMN IF NOT EXISTS aplicacion_pta VARCHAR(40);
