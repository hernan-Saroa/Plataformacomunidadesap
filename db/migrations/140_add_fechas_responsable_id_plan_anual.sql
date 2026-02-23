-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 140: Agregar fechas de ejecución y responsable_id al Plan Anual
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2026-02-21
-- Descripción:
--   1. Agregar fecha_inicio y fecha_fin para delimitar el periodo de ejecución
--   2. Agregar responsable_id (UUID) para vincular al profesional OCIG como líder
-- ═══════════════════════════════════════════════════════════════════════════

-- Agregar columna fecha_inicio (periodo de ejecución del plan)
ALTER TABLE control_interno.plan_anual_5_roles 
ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

-- Agregar columna fecha_fin (periodo de ejecución del plan)
ALTER TABLE control_interno.plan_anual_5_roles 
ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- Agregar columna responsable_id (FK a configuracion_profesionales_ocig)
ALTER TABLE control_interno.plan_anual_5_roles 
ADD COLUMN IF NOT EXISTS responsable_id UUID;

-- Comentarios descriptivos
COMMENT ON COLUMN control_interno.plan_anual_5_roles.fecha_inicio IS 'Fecha de inicio del periodo de ejecución del plan anual';
COMMENT ON COLUMN control_interno.plan_anual_5_roles.fecha_fin IS 'Fecha de finalización del periodo de ejecución del plan anual';
COMMENT ON COLUMN control_interno.plan_anual_5_roles.responsable_id IS 'UUID del profesional OCIG responsable/líder del plan (FK a configuracion_profesionales_ocig)';

-- Índice para búsquedas por responsable
CREATE INDEX IF NOT EXISTS idx_plan_anual_5_roles_responsable_id 
ON control_interno.plan_anual_5_roles(responsable_id);
