-- Migration 332: Create periodo_cetap relation table
-- Schema: academic_work_plan

CREATE TABLE IF NOT EXISTS academic_work_plan.periodo_cetap (
  id BIGSERIAL PRIMARY KEY,
  id_periodo_academico BIGINT NOT NULL,
  id_cetap BIGINT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_periodo_cetap_periodo_academico'
      AND conrelid = 'academic_work_plan.periodo_cetap'::regclass
  ) THEN
    ALTER TABLE academic_work_plan.periodo_cetap
      ADD CONSTRAINT fk_periodo_cetap_periodo_academico
      FOREIGN KEY (id_periodo_academico)
      REFERENCES academic_work_plan.periodo_academico(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_periodo_cetap_cetap'
      AND conrelid = 'academic_work_plan.periodo_cetap'::regclass
  ) THEN
    ALTER TABLE academic_work_plan.periodo_cetap
      ADD CONSTRAINT fk_periodo_cetap_cetap
      FOREIGN KEY (id_cetap)
      REFERENCES academic_work_plan.cetap(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_periodo_cetap_periodo_cetap'
      AND conrelid = 'academic_work_plan.periodo_cetap'::regclass
  ) THEN
    ALTER TABLE academic_work_plan.periodo_cetap
      ADD CONSTRAINT uq_periodo_cetap_periodo_cetap
      UNIQUE (id_periodo_academico, id_cetap);
  END IF;
END $$;
