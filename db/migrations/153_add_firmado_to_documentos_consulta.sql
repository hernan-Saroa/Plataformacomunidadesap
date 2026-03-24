-- Migration 153: Agregar campo firmado a documentos_consulta
-- Para diferenciar documentos firmados de los que aún requieren firma

ALTER TABLE legal_management.documentos_consulta
ADD COLUMN IF NOT EXISTS firmado BOOLEAN DEFAULT false;

COMMENT ON COLUMN legal_management.documentos_consulta.firmado IS 'Indica si el documento ha sido firmado (true=firmado, false=sin firmar)';
