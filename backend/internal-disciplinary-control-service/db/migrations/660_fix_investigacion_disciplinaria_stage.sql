-- =====================================================
-- Migración: 660_fix_investigacion_disciplinaria_stage.sql
-- Módulo: Control Disciplinario
-- Schema: internal_disciplinary_control
-- Descripción: Ajusta la etapa por defecto del Auto de Formulación de Pliegos
--              para que apunte a una etapa real existente en stage_configuration
--              (CARGOS si está parametrizada, o EVALUACION como etapa natural del proceso).
-- =====================================================

UPDATE internal_disciplinary_control.autos_configuration
SET stage = COALESCE(
  (
    SELECT etapa FROM internal_disciplinary_control.stage_configuration 
    WHERE (UPPER(etapa) LIKE '%CARGO%' OR UPPER(etapa) LIKE '%PLIEGO%') AND activo = true
    ORDER BY orden ASC
    LIMIT 1
  ),
  (
    SELECT etapa FROM internal_disciplinary_control.stage_configuration 
    WHERE UPPER(etapa) LIKE '%EVALUAC%' AND activo = true
    ORDER BY orden ASC
    LIMIT 1
  ),
  'EVALUACION'
)
WHERE tipo = 'AUTO_FORMULACION_PLIEGO';
