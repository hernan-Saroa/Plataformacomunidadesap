-- Migration: Make referencia_id nullable for Terminos Procesales
-- Description: Allows creating Manual terms that do not link to a specific system entity (expediente, etc).

ALTER TABLE legal_management.terminos_procesales
ALTER COLUMN referencia_id DROP NOT NULL;
