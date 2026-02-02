-- Migration: Add responsable_nombre column to planes_mejoramiento
-- This allows storing the responsible person's name as text when no abogado is linked

ALTER TABLE legal_management.planes_mejoramiento 
ADD COLUMN IF NOT EXISTS responsable_nombre VARCHAR(255);

COMMENT ON COLUMN legal_management.planes_mejoramiento.responsable_nombre IS 'Text name of responsible person when no abogado is linked';
