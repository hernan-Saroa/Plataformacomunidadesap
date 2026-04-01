-- Migration: Fix stage_configuration values
-- Schema: internal_disciplinary_control
-- Date: 2026-04-01
-- Description: Corregir valores de etapa en stage_configuration:
--   - Eliminar tildes para que coincidan con el enum ProcessStage del backend
--   - Corregir orden (RECEPCION debe ser la primera etapa)
--   - Eliminar entrada 'Nuevo Estado' que no existe en el enum

UPDATE internal_disciplinary_control.stage_configuration SET etapa = 'RECEPCION',     orden = 1 WHERE etapa = 'RECEPCIÓN';
UPDATE internal_disciplinary_control.stage_configuration SET etapa = 'VALORACION',    orden = 2 WHERE etapa = 'VALORACIÓN';
UPDATE internal_disciplinary_control.stage_configuration SET etapa = 'INDAGACION',    orden = 3 WHERE etapa = 'INDAGACIÓN';
UPDATE internal_disciplinary_control.stage_configuration SET etapa = 'INVESTIGACION', orden = 4 WHERE etapa = 'INVESTIGACIÓN';
UPDATE internal_disciplinary_control.stage_configuration SET orden = 5 WHERE etapa = 'JUZGAMIENTO';
UPDATE internal_disciplinary_control.stage_configuration SET orden = 6 WHERE etapa = 'FALLO';
DELETE FROM internal_disciplinary_control.stage_configuration WHERE etapa = 'Nuevo Estado';
