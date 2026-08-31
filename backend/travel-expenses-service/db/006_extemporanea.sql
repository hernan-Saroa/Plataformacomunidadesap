-- ============================================================================
-- 006_extemporanea.sql
-- Description: Agregar columna extemporanea a solicitudes_comision para
--              marcar comisiones con menos de 14 días hábiles de anticipación.
--              Idempotente (ADD COLUMN IF NOT EXISTS).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;
SET search_path TO travel_expenses, public;

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS extemporanea BOOLEAN NOT NULL DEFAULT FALSE;

RESET search_path;