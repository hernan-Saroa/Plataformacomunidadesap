-- Migration to add origin tracking for unified history
BEGIN;

ALTER TABLE legal_management.actuaciones
ADD COLUMN IF NOT EXISTS origen VARCHAR(50) DEFAULT 'MANUAL', -- 'MANUAL', 'AUDIENCIA', 'AUTO', 'ACTA', 'EVIDENCIA', 'OFICIO'
ADD COLUMN IF NOT EXISTS referencia_id UUID, -- ID del registro original (Auto, Audiencia, etc.)
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'; -- Para guardar datos extra si se requiere

-- Crear índice para búsquedas rápidas por origen/referencia
CREATE INDEX IF NOT EXISTS idx_actuaciones_referencia ON legal_management.actuaciones(referencia_id);

COMMIT;
