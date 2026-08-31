-- ============================================================================
-- Migration: 006_add_extemporanea.sql
-- Description: Agregar columna extemporanea a solicitudes_comision para marcar
--              comisiones con menos de 14 días hábiles de anticipación.
-- ============================================================================

SET search_path TO travel_expenses, public;

ALTER TABLE solicitudes_comision
    ADD COLUMN IF NOT EXISTS extemporanea BOOLEAN NOT NULL DEFAULT FALSE;
