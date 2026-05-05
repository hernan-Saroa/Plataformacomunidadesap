-- Migración 189: Agregar columna tareas_seguimiento a actividad_plan_anual_5
-- Las tareas de seguimiento son sub-tareas dentro de cada actividad del plan anual.
-- Se almacenan como JSONB para permitir estructura flexible con responsables,
-- fechas límite, y traza de completado (quién y cuándo).

ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS tareas_seguimiento jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.tareas_seguimiento IS 
'Sub-tareas de la actividad. Cada tarea tiene: id, descripcion, completada, responsables[], fechaLimite, fechaCompletada, completadaPor';
