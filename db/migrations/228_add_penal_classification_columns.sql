-- Migración: Agregar columnas de clasificación penal a expedientes
-- Requerimiento: Clasificación para informes de Contraloría General y ANDJE
-- Estas columnas solo aplican cuando tipo_proceso = 'Proceso Penal'

ALTER TABLE legal_management.expedientes
    ADD COLUMN IF NOT EXISTS es_delito_admin_publica BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS es_conducta_patrimonio_publico BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN legal_management.expedientes.es_delito_admin_publica IS 'Indica si el proceso penal corresponde a delitos contra la administración pública';
COMMENT ON COLUMN legal_management.expedientes.es_conducta_patrimonio_publico IS 'Indica si el proceso penal involucra conductas que afecten el patrimonio público';
