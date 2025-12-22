-- ============================================
-- Migracion: Guardar etapa del Kanban en procesos
-- ============================================

ALTER TABLE internal_disciplinary_control.disciplinary_processes
ADD COLUMN IF NOT EXISTS "kanbanStage" VARCHAR(50);
