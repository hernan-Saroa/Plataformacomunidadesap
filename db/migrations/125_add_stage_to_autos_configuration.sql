-- =====================================================
-- Migración: 125_add_stage_to_autos_configuration.sql
-- Módulo: Control Disciplinario
-- Schema: internal_disciplinary_control
-- Descripción: Añade la columna etapa (stage) para relacionar los autos
--              parametrizados con las etapas del proceso disciplinario
-- =====================================================

-- Añadir columna stage a la tabla autos_configuration
ALTER TABLE internal_disciplinary_control.autos_configuration
ADD COLUMN stage VARCHAR(50);

-- Actualizar registros existentes con valores de etapa basados en el tipo de auto
-- Los autos que son específicos de una etapa reciben su stage correspondiente
-- Los autos que pueden usarse en cualquier etapa (como AUTO_NO_PREVISTO) quedan con stage NULL

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'INDAGACION_PREVIA'
WHERE tipo = 'AUTO_INDAGACION_PRELIMINAR';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'INDAGACION_PREVIA'
WHERE tipo = 'AUTO_APERTURA_INDAGACION';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'INVESTIGACION'
WHERE tipo = 'AUTO_APERTURA_INVESTIGACION';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'INVESTIGACION'
WHERE tipo = 'AUTO_FORMULACION_PLIEGO';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'EVALUACION'
WHERE tipo = 'AUTO_CIERRE';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'JUZGAMIENTO'
WHERE tipo = 'FALLO_SANCION';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'JUZGAMIENTO'
WHERE tipo = 'FALLO_ABSOLUTORIO';

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'RECEPCION'
WHERE tipo = 'AUTO_APERTURA';

-- AUTO_NO_PREVISTO queda con stage NULL para que esté disponible en todas las etapas

-- Verificar los resultados
SELECT tipo, nombre, stage FROM internal_disciplinary_control.autos_configuration ORDER BY orden;
