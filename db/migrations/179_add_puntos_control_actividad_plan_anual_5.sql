-- ============================================================
-- Migración 179: Agregar columnas puntos_control, frecuencia,
-- responsables, fecha_corte y entradas_seguimiento a
-- actividad_plan_anual_5
-- ============================================================

ALTER TABLE control_interno.actividad_plan_anual_5
  ADD COLUMN IF NOT EXISTS puntos_control JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS frecuencia_puntos_control VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS responsables JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fecha_corte DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS entradas_seguimiento JSONB DEFAULT '[]';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.puntos_control IS
'Array de puntos de control de la actividad con sus estados y evidencias';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.frecuencia_puntos_control IS
'Frecuencia de evaluación de los puntos de control (diaria, semanal, quincenal, mensual, etc.)';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.responsables IS
'Array de responsables de la actividad con id, nombre, cargo y email';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.fecha_corte IS
'Fecha de corte para el seguimiento periódico de la actividad';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.entradas_seguimiento IS
'Array de entradas de seguimiento vinculadas a puntos de control';
