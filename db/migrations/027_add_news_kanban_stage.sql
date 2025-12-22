ALTER TABLE internal_disciplinary_control.disciplinary_news
  ADD COLUMN IF NOT EXISTS "kanbanStage" VARCHAR(50) DEFAULT 'RECEPCION';

UPDATE internal_disciplinary_control.disciplinary_news
  SET "kanbanStage" = 'RECEPCION'
  WHERE "kanbanStage" IS NULL;
