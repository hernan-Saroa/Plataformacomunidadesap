-- Agrega columna fundamento_normativo (fuentes normativas que sustentan el informe/termino)
-- a la tabla terminos_procesales

ALTER TABLE legal_management.terminos_procesales
    ADD COLUMN IF NOT EXISTS fundamento_normativo JSONB;
