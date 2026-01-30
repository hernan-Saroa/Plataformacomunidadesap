-- Migration: Update Check Constraint for origen in planes_mejoramiento
-- Include new allowed values: CONTRALORIA, PROCURADURIA, OCI, AUDITORIA_EXTERNA

ALTER TABLE "legal_management"."planes_mejoramiento" 
DROP CONSTRAINT IF EXISTS "planes_mejoramiento_origen_check";

ALTER TABLE "legal_management"."planes_mejoramiento" 
ADD CONSTRAINT "planes_mejoramiento_origen_check" 
CHECK (origen IN ('RIESGO', 'HALLAZGO_AUDITORIA', 'AUTOEVALUACION', 'CONTRALORIA', 'PROCURADURIA', 'OCI', 'AUDITORIA_EXTERNA', 'OTRO'));
