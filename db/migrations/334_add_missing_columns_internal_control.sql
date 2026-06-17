-- Add missing columns to evaluacion_proceso
ALTER TABLE control_interno.evaluacion_proceso
ADD COLUMN IF NOT EXISTS auditable_calculado BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auditable_manual BOOLEAN;

-- Add missing columns to tablero_kanban
ALTER TABLE control_interno.tablero_kanban
ADD COLUMN IF NOT EXISTS configuracion_visual JSONB;
