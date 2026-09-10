-- ============================================================================
-- Migration: 020_salario_y_costo_tiquete.sql
-- Created: 2026-09-05
-- Description: Persiste el salario básico mensual y el costo estimado del
--              tiquete en la solicitud de comisión para que estén disponibles
--              en la visualización de detalles y expedientes pendientes.
-- ============================================================================

-- ============================================================================
-- 1. Alterar tabla solicitudes_comision
-- ============================================================================

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS salario_basico NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS costo_estimado_tiquete NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. Comentarios de documentación
-- ============================================================================

COMMENT ON COLUMN travel_expenses.solicitudes_comision.salario_basico IS 'Salario básico mensual del comisionado (mayor salario en caso de doble rol). Se usa para cálculos de liquidación y consulta en detalle.';
COMMENT ON COLUMN travel_expenses.solicitudes_comision.costo_estimado_tiquete IS 'Costo estimado del tiquete aéreo ingresado por el usuario en la solicitud.';

RESET search_path;
