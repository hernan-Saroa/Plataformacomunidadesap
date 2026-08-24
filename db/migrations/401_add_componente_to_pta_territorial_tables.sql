-- EFDS-1353: la aprobación/revisión parcial por territorial deja de ser exclusiva
-- de Docencia.
--
-- Las tablas PtaTerritorialApproval (396/398) y PtaTerritorialReview (399) se
-- crearon asumiendo un único componente territorial: 'academica_territorial'.
-- Su unicidad es (pta_id, territorial_id, nivel), sin la dimensión "componente".
--
-- Al habilitar Complementarias de tipo Decanatura (Territorial), un mismo PTA
-- puede tener Docencia territorial Y Complementarias territoriales en la MISMA
-- territorial y nivel (ej. Antioquia/pregrado en ambos). Sin esta columna las dos
-- decisiones colisionarían en la misma fila: aprobar la Docencia de Antioquia
-- daría por aprobada también la Complementaria de Antioquia, y viceversa.
--
-- Backfill: todas las filas existentes son de Docencia, de ahí el DEFAULT.
--
-- Idempotente.

ALTER TABLE academic_work_plan."PtaTerritorialApproval"
    ADD COLUMN IF NOT EXISTS componente VARCHAR(60) NOT NULL DEFAULT 'academica_territorial';

ALTER TABLE academic_work_plan."PtaTerritorialReview"
    ADD COLUMN IF NOT EXISTS componente VARCHAR(60) NOT NULL DEFAULT 'academica_territorial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_pta_territorial_componente_nivel'
  ) THEN
    ALTER TABLE academic_work_plan."PtaTerritorialApproval"
        DROP CONSTRAINT IF EXISTS uq_pta_territorial_nivel;
    ALTER TABLE academic_work_plan."PtaTerritorialApproval"
        ADD CONSTRAINT uq_pta_territorial_componente_nivel
        UNIQUE (pta_id, componente, territorial_id, nivel);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_pta_territorial_review_componente_nivel'
  ) THEN
    ALTER TABLE academic_work_plan."PtaTerritorialReview"
        DROP CONSTRAINT IF EXISTS uq_pta_territorial_review;
    ALTER TABLE academic_work_plan."PtaTerritorialReview"
        ADD CONSTRAINT uq_pta_territorial_review_componente_nivel
        UNIQUE (pta_id, componente, territorial_id, nivel);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pta_territorial_approval_pta_componente
    ON academic_work_plan."PtaTerritorialApproval" (pta_id, componente);

CREATE INDEX IF NOT EXISTS idx_pta_territorial_review_pta_componente
    ON academic_work_plan."PtaTerritorialReview" (pta_id, componente);
