-- Add missing columns to pei_indicadores
ALTER TABLE legal_management.pei_indicadores 
ADD COLUMN IF NOT EXISTS prioridad VARCHAR(20) DEFAULT 'MEDIA',
ADD COLUMN IF NOT EXISTS tipo_indicador VARCHAR(50) DEFAULT 'GESTION';
