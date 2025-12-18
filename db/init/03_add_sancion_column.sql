-- Migration to add 'sancion_proyectada' to 'expedientes' table
ALTER TABLE legal_management.expedientes ADD COLUMN IF NOT EXISTS sancion_proyectada VARCHAR;
