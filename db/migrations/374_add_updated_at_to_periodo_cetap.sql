-- Migration 374: Add updated_at column to academic_work_plan.periodo_cetap
--
-- Contexto: la migración 332 creó periodo_cetap con las columnas
--   (id, id_periodo_academico, id_cetap, activo, created_at)
-- pero SIN updated_at. La importación masiva de estructura geográfica
-- (estructura-import.service.ts) hace un upsert de la activación por periodo con
--   ON CONFLICT ... DO UPDATE SET activo = EXCLUDED.activo, updated_at = CURRENT_TIMESTAMP
-- por lo que cada importación fallaba con:
--   "no existe la columna «updated_at» en la relación «periodo_cetap»"
-- y revertía toda la transacción (no se guardaba nada).
--
-- Esta migración es puramente ADITIVA e idempotente.

ALTER TABLE academic_work_plan.periodo_cetap
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill: para filas preexistentes deja updated_at alineado con created_at.
UPDATE academic_work_plan.periodo_cetap
   SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
 WHERE updated_at IS NULL;
