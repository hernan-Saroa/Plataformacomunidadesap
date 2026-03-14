-- 163_fix_planes_evidencias_and_mejoramiento.sql
-- Fixes:
-- 1. Changes planes_evidencias.uploaded_by from UUID to VARCHAR(255) so we can store text like 'Sistema'
-- 2. Adds responsable_nombre to planes_mejoramiento (used by the entity but missing from DB)

-- 1. Fix uploaded_by column type in planes_evidencias
ALTER TABLE legal_management.planes_evidencias
    ALTER COLUMN uploaded_by TYPE VARCHAR(255) USING NULL;

-- 2. Add responsable_nombre to planes_mejoramiento if not already present
ALTER TABLE legal_management.planes_mejoramiento
    ADD COLUMN IF NOT EXISTS responsable_nombre VARCHAR(255) NULL;

-- 3. Index for faster document lookups by plan
CREATE INDEX IF NOT EXISTS idx_planes_evidencias_plan_id ON legal_management.planes_evidencias(plan_id);
