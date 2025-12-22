-- Agregar valores faltantes al enum de etapas de proceso
-- Necesario para soportar todas las etapas definidas en el código

-- Agregar RECEPCION
ALTER TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum
ADD VALUE IF NOT EXISTS 'RECEPCION';

-- Agregar FALLO
ALTER TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum
ADD VALUE IF NOT EXISTS 'FALLO';

-- Agregar INDAGACION (alias de INDAGACION_PREVIA)
ALTER TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum
ADD VALUE IF NOT EXISTS 'INDAGACION';

-- Verificar valores del enum
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'internal_disciplinary_control.disciplinary_processes_etapaactual_enum'::regtype
ORDER BY enumsortorder;
