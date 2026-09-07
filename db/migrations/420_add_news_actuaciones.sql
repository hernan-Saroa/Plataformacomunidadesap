-- ============================================================================
-- MIGRACIÓN 420: Permitir actuaciones asociadas a una Noticia Disciplinaria (EFDS-1562)
-- Descripción: hasta ahora las actuaciones solo podían colgar de un proceso
--              (processId NOT NULL). Se debe poder registrar actuaciones desde
--              la etapa de Radicación de la Noticia, cuando aún no existe proceso.
--              Se relaja processId a NULL y se agrega newsId; una actuación
--              pertenece a un proceso O a una noticia (al menos uno).
-- ============================================================================

BEGIN;

ALTER TABLE internal_disciplinary_control.disciplinary_process_actuaciones
    ALTER COLUMN "processId" DROP NOT NULL;

ALTER TABLE internal_disciplinary_control.disciplinary_process_actuaciones
    ADD COLUMN IF NOT EXISTS "newsId" UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_disciplinary_process_actuaciones_news'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_process_actuaciones
            ADD CONSTRAINT fk_disciplinary_process_actuaciones_news
            FOREIGN KEY ("newsId")
            REFERENCES internal_disciplinary_control.disciplinary_news(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_disciplinary_process_actuaciones_target'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_process_actuaciones
            ADD CONSTRAINT chk_disciplinary_process_actuaciones_target
            CHECK ("processId" IS NOT NULL OR "newsId" IS NOT NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_actuaciones_news
    ON internal_disciplinary_control.disciplinary_process_actuaciones("newsId");

COMMIT;
