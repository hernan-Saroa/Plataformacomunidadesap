-- ============================================================================
-- 668 · EFDS-2315 — La aprobación territorial puede venir de la concertación.
--
-- La Docencia de una Dirección Territorial se aprueba en el PTA por par
-- (territorial, nivel) en PtaTerritorialApproval. Con la concertación encendida
-- (PROG_CONCERTACION_HABILITADA), esa aprobación la da Programación Académica y
-- el PTA la marca con scope = 'programacion' y scope_id = id de la concertación,
-- igual que ya hace PtaComponentApproval (scope/scope_id, migración 340).
-- Así un reenvío del PTA no borra lo concertado, y se distingue de lo aprobado
-- en el PTA.
--
-- Apagada la concertación, las columnas quedan en NULL y nada cambia.
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE academic_work_plan."PtaTerritorialApproval"
  ADD COLUMN IF NOT EXISTS scope VARCHAR(50),
  ADD COLUMN IF NOT EXISTS scope_id VARCHAR(100);
