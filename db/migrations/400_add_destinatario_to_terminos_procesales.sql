-- Agrega columna destinatario (entidad/dependencia receptora del informe)
-- a la tabla terminos_procesales

ALTER TABLE legal_management.terminos_procesales
    ADD COLUMN IF NOT EXISTS destinatario VARCHAR(255);
