-- Add tipo_archivo column to evidencias table
ALTER TABLE legal_management.evidencias 
ADD COLUMN IF NOT EXISTS tipo_archivo VARCHAR(50);

-- Comment for clarity
COMMENT ON COLUMN legal_management.evidencias.tipo_archivo IS 'File extension (e.g., jpg, pdf, png) for correct icon display';
