-- Migration 181: Change kanbanStage back to UUID in disciplinary tables
-- Schema: internal_disciplinary_control
-- Date: 2026-04-08
-- Description: Change kanbanStage back from INTEGER to UUID to store stage configuration ID

-- Change kanbanStage back to UUID in disciplinary_processes
ALTER TABLE internal_disciplinary_control.disciplinary_processes ALTER COLUMN "kanbanStage" DROP DEFAULT;
ALTER TABLE internal_disciplinary_control.disciplinary_processes ALTER COLUMN "kanbanStage" TYPE UUID USING NULL;

-- Change kanbanStage back to UUID in disciplinary_news
ALTER TABLE internal_disciplinary_control.disciplinary_news ALTER COLUMN "kanbanStage" DROP DEFAULT;
ALTER TABLE internal_disciplinary_control.disciplinary_news ALTER COLUMN "kanbanStage" TYPE UUID USING NULL;