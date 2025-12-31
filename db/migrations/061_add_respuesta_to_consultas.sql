-- Agregar columna para respuesta de consulta jurídica
ALTER TABLE legal_management.consultas_juridicas
ADD COLUMN IF NOT EXISTS respuesta TEXT;
