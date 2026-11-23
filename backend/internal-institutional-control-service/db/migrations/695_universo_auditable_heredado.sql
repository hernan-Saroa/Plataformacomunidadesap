-- EFDS-2450: el universo auditable de una vigencia nueva se hereda del año anterior.
-- Cada unidad copiada guarda de qué vigencia y de qué evaluación viene, para mostrar "Heredada de AAAA".
ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS vigencia_origen integer NULL,
  ADD COLUMN IF NOT EXISTS evaluacion_origen_id uuid NULL;

COMMENT ON COLUMN control_interno.evaluacion_proceso.vigencia_origen IS
  'Vigencia de la que se heredó la unidad al crear el Plan Anual (NULL si se registró directamente)';
COMMENT ON COLUMN control_interno.evaluacion_proceso.evaluacion_origen_id IS
  'Evaluación de la vigencia anterior que se copió (NULL si se registró directamente)';
