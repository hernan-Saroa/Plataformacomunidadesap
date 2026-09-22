-- =====================================================
-- Migración: 660_fix_investigacion_disciplinaria_stage.sql
-- Módulo: Control Disciplinario
-- Schema: internal_disciplinary_control
-- Descripción: Ajusta la etapa por defecto del Auto de Formulación de Pliegos
--              para que apunte a la etapa CARGOS en lugar de RECEPCION / INVESTIGACION.
--              Esto permite que al aprobarse pase a CARGOS y el Secretario/Radicador
--              pueda arrastrarlo a Juzgamiento.
-- =====================================================

UPDATE internal_disciplinary_control.autos_configuration
SET stage = 'CARGOS'
WHERE tipo = 'AUTO_FORMULACION_PLIEGO';
