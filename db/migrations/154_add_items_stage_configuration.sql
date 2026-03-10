-- Migration to add columns to stage_configuration table
-- This table already exists, we need to add color and orden columns

-- Add color column
ALTER TABLE internal_disciplinary_control.stage_configuration ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Add orden column
ALTER TABLE internal_disciplinary_control.stage_configuration ADD COLUMN IF NOT EXISTS orden INTEGER;

-- Update existing records with default values
UPDATE internal_disciplinary_control.stage_configuration SET color = '#6B7280' WHERE color IS NULL;
UPDATE internal_disciplinary_control.stage_configuration SET orden = 0 WHERE orden IS NULL;
