-- Agrega columna ente_solicitante (entidad u organismo que solicita el informe/termino)
-- a la tabla terminos_procesales

ALTER TABLE legal_management.terminos_procesales
    ADD COLUMN IF NOT EXISTS ente_solicitante VARCHAR(255);
