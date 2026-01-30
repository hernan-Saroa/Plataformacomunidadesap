-- ============================================
-- Migracion: Guardar aviso de regreso en Kanban
-- ============================================

ALTER TABLE internal_disciplinary_control.disciplinary_processes
ADD COLUMN IF NOT EXISTS "kanbanNotice" TEXT;
