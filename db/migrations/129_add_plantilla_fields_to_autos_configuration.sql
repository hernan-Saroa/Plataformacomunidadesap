-- Agregar campos de plantilla a la tabla autos_configuration
-- Fecha: 2026-02-17
-- Objetivo: Permitir guardar información de la plantilla en la misma tabla autos_configuration

ALTER TABLE internal_disciplinary_control.autos_configuration 
ADD COLUMN IF NOT EXISTS nombre_plantilla VARCHAR(255) DEFAULT null,
ADD COLUMN IF NOT EXISTS descripcion_plantilla TEXT DEFAULT null,
ADD COLUMN IF NOT EXISTS version_plantilla VARCHAR(50) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS estado_plantilla VARCHAR(50) DEFAULT 'activo';

-- Agregar comentario a las nuevas columnas
COMMENT ON COLUMN internal_disciplinary_control.autos_configuration.nombre_plantilla IS 'Nombre de la plantilla asociada al tipo de auto';
COMMENT ON COLUMN internal_disciplinary_control.autos_configuration.descripcion_plantilla IS 'Descripción de la plantilla';
COMMENT ON COLUMN internal_disciplinary_control.autos_configuration.version_plantilla IS 'Versión de la plantilla (ej: 1.0, 2.0)';
COMMENT ON COLUMN internal_disciplinary_control.autos_configuration.estado_plantilla IS 'Estado de la plantilla (activo/inactivo)';
