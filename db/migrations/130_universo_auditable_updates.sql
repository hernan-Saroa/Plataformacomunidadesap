-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 130: Actualizaciones Universo Auditable
-- Fecha: 2026-02-17
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Agregar programa_anual_id a auditoria_programada
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE control_interno.auditoria_programada 
ADD COLUMN IF NOT EXISTS programa_anual_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_auditoria_programada_plan_anual'
        AND table_schema = 'control_interno'
        AND table_name = 'auditoria_programada'
    ) THEN
        ALTER TABLE control_interno.auditoria_programada
        ADD CONSTRAINT fk_auditoria_programada_plan_anual
        FOREIGN KEY (programa_anual_id) 
        REFERENCES control_interno.plan_anual(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auditoria_programada_programa_anual 
ON control_interno.auditoria_programada(programa_anual_id);

COMMENT ON COLUMN control_interno.auditoria_programada.programa_anual_id 
IS 'Referencia al plan anual al que pertenece esta auditoría';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Agregar resultado_ultima_auditoria a proceso_auditable
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE control_interno.proceso_auditable 
ADD COLUMN IF NOT EXISTS resultado_ultima_auditoria VARCHAR(255);

COMMENT ON COLUMN control_interno.proceso_auditable.resultado_ultima_auditoria 
IS 'Resultado de la última auditoría realizada (Adecuado, Con observaciones, etc.)';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Eliminar constraint de tipo de auditoría para permitir tipos personalizados
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE control_interno.auditoria 
DROP CONSTRAINT IF EXISTS auditoria_tipo_check;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN MIGRACIÓN 130
-- ═══════════════════════════════════════════════════════════════════════════
