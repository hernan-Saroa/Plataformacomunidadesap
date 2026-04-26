-- Agrega soporte de múltiples destinatarios en las respuestas de consultas jurídicas
ALTER TABLE legal_management.consultas_juridicas
ADD COLUMN IF NOT EXISTS destinatarios_adicionales TEXT DEFAULT NULL;

COMMENT ON COLUMN legal_management.consultas_juridicas.destinatarios_adicionales
    IS 'JSON array con los emails adicionales a los que se envió la respuesta, ej: ["a@b.com","c@d.com"]';
