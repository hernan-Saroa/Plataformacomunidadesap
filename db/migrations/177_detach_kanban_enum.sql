-- Migration 177: Detach kanban fields from enum constraints and convert kanbanStage to UUID
-- Schema: control_interno, internal_disciplinary_control
-- Date: 2026-04-08
-- Description: Remove CHECK constraints from kanban fields in auditoria table and convert kanbanStage to UUID in disciplinary tables

-- Remove CHECK constraints from auditoria kanban fields

-- Convert kanbanStage to UUID in disciplinary_processes
ALTER TABLE internal_disciplinary_control.disciplinary_processes ALTER COLUMN "kanbanStage" DROP DEFAULT;
ALTER TABLE internal_disciplinary_control.disciplinary_processes ALTER COLUMN "kanbanStage" TYPE UUID USING NULL;

-- Convert kanbanStage to UUID in disciplinary_news
ALTER TABLE internal_disciplinary_control.disciplinary_news ALTER COLUMN "kanbanStage" DROP DEFAULT;
ALTER TABLE internal_disciplinary_control.disciplinary_news ALTER COLUMN "kanbanStage" TYPE UUID USING NULL;