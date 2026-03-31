-- Migration: Add abogados_anteriores column to expedientes
-- Tracks previously assigned lawyers when a case is reassigned

ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS abogados_anteriores text[] DEFAULT '{}';

COMMENT ON COLUMN legal_management.expedientes.abogados_anteriores IS 'Array of previously assigned lawyer names, populated when abogado_sustanciador is changed via reassignment';
