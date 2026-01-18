-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 031: Agregar campo hallazgo_id a accion_correctiva
-- ═══════════════════════════════════════════════════════════════════════════
-- Descripción: Permite vincular cada acción correctiva a un hallazgo específico
-- Fecha: 2026-01-10
-- ═══════════════════════════════════════════════════════════════════════════

-- Agregar columna hallazgo_id a accion_correctiva
ALTER TABLE control_interno.accion_correctiva 
ADD COLUMN IF NOT EXISTS hallazgo_id UUID;

-- Agregar comentario a la columna
COMMENT ON COLUMN control_interno.accion_correctiva.hallazgo_id IS 
'ID del hallazgo al que está vinculada esta acción correctiva (opcional)';

-- Crear índice para mejorar búsquedas por hallazgo
CREATE INDEX IF NOT EXISTS idx_accion_correctiva_hallazgo_id 
ON control_interno.accion_correctiva(hallazgo_id);
