-- Priorización auditable: valor calculado (DAFP) + override manual desde tabla

ALTER TABLE control_interno.evaluacion_proceso
ADD COLUMN IF NOT EXISTS auditable_calculado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE control_interno.evaluacion_proceso
ADD COLUMN IF NOT EXISTS auditable_manual BOOLEAN NULL;

COMMENT ON COLUMN control_interno.evaluacion_proceso.auditable_calculado IS
'Calculado al guardar evaluación DAFP: false si ciclo es No auditar, true si hay rotación.';

COMMENT ON COLUMN control_interno.evaluacion_proceso.auditable_manual IS
'Override manual desde tabla Universo. NULL = usar auditable_calculado.';

-- Backfill desde ciclo DAFP existente
UPDATE control_interno.evaluacion_proceso
SET auditable_calculado = (
  ciclo_rotacion_dafp IS NOT NULL
  AND TRIM(ciclo_rotacion_dafp) <> ''
  AND LOWER(TRIM(ciclo_rotacion_dafp)) <> 'no auditar'
)
WHERE auditable_calculado = false;
