-- Migración: Agregar columna de clasificación penal "Otros" a expedientes
-- Contexto: Extiende la clasificación penal (migración 228) con una tercera categoría
--   para procesos penales que no encajan en "Delitos contra la Administración Pública"
--   ni en "Conductas que afectan el Patrimonio Público".
-- Estas columnas solo aplican cuando tipo_proceso = 'Proceso Penal'

ALTER TABLE legal_management.expedientes
    ADD COLUMN IF NOT EXISTS es_otro_delito_penal        BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS otro_delito_penal_descripcion VARCHAR(200) NULL;

COMMENT ON COLUMN legal_management.expedientes.es_otro_delito_penal
    IS 'Indica si el proceso penal corresponde a una categoría distinta a las definidas (otros delitos penales)';

COMMENT ON COLUMN legal_management.expedientes.otro_delito_penal_descripcion
    IS 'Descripción libre del tipo de delito penal cuando es_otro_delito_penal = true';
