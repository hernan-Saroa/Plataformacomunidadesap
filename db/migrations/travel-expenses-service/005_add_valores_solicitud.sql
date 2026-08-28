-- ============================================================================
-- Migration: 005_add_valores_solicitud.sql
-- Description: Agregar campos monetarios y de días a solicitudes_comision
--              para el cálculo de viáticos (compatibilidad SIIF).
-- ============================================================================

SET search_path TO travel_expenses, public;

-- Monto estimado de viáticos
ALTER TABLE solicitudes_comision
    ADD COLUMN IF NOT EXISTS monto_viaticos NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Monto estimado de gastos de viaje (transporte, alojamiento, etc.)
ALTER TABLE solicitudes_comision
    ADD COLUMN IF NOT EXISTS monto_gastos_viaje NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Días de comisión
ALTER TABLE solicitudes_comision
    ADD COLUMN IF NOT EXISTS dias_comision INTEGER NOT NULL DEFAULT 1;

-- Índice opcional por comisionado y fechas ya existente (idx_solicitudes_comisionado_fechas).
