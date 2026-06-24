-- =====================================================================
-- Migración 359: Vincula cada programa académico con el período en que se creó
-- ---------------------------------------------------------------------
-- Objetivo:
--   Permitir que un programa creado mientras un período está seleccionado
--   quede asociado únicamente a ese período. Así, al consultar otro período,
--   ese programa NO aparece en el listado ni en el detalle del período.
--
-- Seguridad / no rompe nada:
--   * La columna es NULLABLE. Los programas existentes quedan con NULL y
--     conservan exactamente su comportamiento actual (siguen visibles como
--     catálogo global mientras no tengan oferta ni período propio).
--   * El backend solo aplica el filtrado por período cuando esta columna
--     existe; si la migración aún no se ha ejecutado, el sistema funciona
--     igual que antes.
--   * Script idempotente: puede ejecutarse varias veces sin error.
-- =====================================================================

-- 1) Columna nullable de propiedad de período
ALTER TABLE academic_work_plan.programa
  ADD COLUMN IF NOT EXISTS id_periodo_academico BIGINT;

-- 2) Llave foránea hacia periodo_academico (solo si no existe)
DO $$                                                                       
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'fk_programa_periodo_academico'
       AND conrelid = 'academic_work_plan.programa'::regclass
  ) THEN
    ALTER TABLE academic_work_plan.programa
      ADD CONSTRAINT fk_programa_periodo_academico
      FOREIGN KEY (id_periodo_academico)
      REFERENCES academic_work_plan.periodo_academico(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- 3) Índice para acelerar el filtrado por período
CREATE INDEX IF NOT EXISTS idx_programa_periodo_academico
  ON academic_work_plan.programa(id_periodo_academico);
