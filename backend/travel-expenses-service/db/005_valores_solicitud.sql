-- ============================================================================
-- 005_valores_solicitud.sql
-- Description: Agregar campos monetarios y de días a solicitudes_comision
--              para el cálculo de viáticos (compatibilidad SIIF).
--              Idempotente (ADD COLUMN IF NOT EXISTS).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;
SET search_path TO travel_expenses, public;

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS monto_viaticos NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS monto_gastos_viaje NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS dias_comision INTEGER NOT NULL DEFAULT 1;

RESET search_path;