-- Migration 020: HOTFIX - Fix reglas_alerta constraints
-- Description: Allow system-generated alert rules and immediate alerts (dias_anticipacion = 0)
-- This fixes TWO issues preventing configuration save:
--   1. creado_por_id must be nullable for system-generated rules
--   2. dias_anticipacion CHECK constraint must allow 0 for "Proceso Vencido" alert

-- 1. Make creado_por_id nullable
ALTER TABLE "internal_disciplinary_control"."reglas_alerta" 
ALTER COLUMN "creado_por_id" DROP NOT NULL;

-- 2. Drop existing CHECK constraint
ALTER TABLE "internal_disciplinary_control"."reglas_alerta" 
DROP CONSTRAINT IF EXISTS "reglas_alerta_dias_anticipacion_check";

-- 3. Add new CHECK constraint allowing 0 (for immediate alerts like "Proceso Vencido")
ALTER TABLE "internal_disciplinary_control"."reglas_alerta" 
ADD CONSTRAINT "reglas_alerta_dias_anticipacion_check" 
CHECK (dias_anticipacion >= 0 AND dias_anticipacion <= 30);

