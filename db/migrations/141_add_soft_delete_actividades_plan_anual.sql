-- Migración 141: Agregar soft delete a actividades del Plan Anual
-- Agrega campo activo para implementar soft delete

ALTER TABLE control_interno.actividad_plan_anual_5
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Índice para filtrar por activo
CREATE INDEX IF NOT EXISTS idx_actividad_plan_anual_5_activo 
ON control_interno.actividad_plan_anual_5(activo);
