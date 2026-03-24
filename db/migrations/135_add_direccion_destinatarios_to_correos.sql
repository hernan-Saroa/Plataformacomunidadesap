-- Migration 135: Add missing columns to correos_juridicos
-- The entity has 'direccion' and 'destinatarios_to' but they were never added to the DB

ALTER TABLE legal_management.correos_juridicos
ADD COLUMN IF NOT EXISTS direccion VARCHAR(20) DEFAULT 'ENTRANTE',
ADD COLUMN IF NOT EXISTS destinatarios_to TEXT;
