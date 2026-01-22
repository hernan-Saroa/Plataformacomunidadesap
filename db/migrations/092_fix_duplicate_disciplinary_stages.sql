-- Migration: AGGRESSIVE cleanup of duplicate disciplinary stages
-- This script DELETES ALL stages and recreates only the 7 correct ones

-- PASO 1: Eliminar TODAS las etapas existentes
DELETE FROM stage_configuration;

-- PASO 2: Insertar solo las 7 etapas correctas (sin acentos, matching ProcessStage enum)
INSERT INTO stage_configuration (etapa, "diasHabiles", descripcion, activo) VALUES
('RECEPCION', 3, 'Recepción de la noticia', true),
('VALORACION', 10, 'Valoración inicial', true),
('INDAGACION_PREVIA', 40, 'Indagación previa', true),
('INVESTIGACION', 60, 'Investigación disciplinaria', true),
('EVALUACION', 10, 'Evaluación de investigación', true),
('JUZGAMIENTO', 50, 'Etapa de juzgamiento', true),
('SEGUNDA_INSTANCIA', 10, 'Segunda instancia', true);

-- Verificar resultado
SELECT * FROM stage_configuration ORDER BY "diasHabiles";
