-- 683_rund_clase_docente.sql
-- Clase del docente: Planta o Cátedra. Se guarda al cargar o editar el perfil:
-- horas PTA que trae el Excel de carga masiva mayores que 0 = planta; 0 o sin horas = cátedra.
-- Aditiva e idempotente. Los docentes ya cargados se clasifican con el valor ORIGINAL de HORAS_PTA que quedó
-- guardado en "datosCargaMasiva" (no con las horas finales, que el sistema completa por defecto cuando el
-- Excel no las trae). Los que no tienen datos de carga quedan en NULL y el sistema los deduce de sus horas PTA.
BEGIN;

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "claseDocente" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Docente_claseDocente_check'
  ) THEN
    ALTER TABLE academic_work_plan."Docente"
      ADD CONSTRAINT "Docente_claseDocente_check"
      CHECK ("claseDocente" IS NULL OR "claseDocente" IN ('PLANTA', 'CATEDRA'));
  END IF;
END $$;

UPDATE academic_work_plan."Docente"
SET "claseDocente" = CASE
  WHEN btrim(COALESCE("datosCargaMasiva"->>'HORAS_PTA', '')) ~ '^[0-9]+([.,][0-9]+)?$'
    THEN CASE WHEN replace(btrim("datosCargaMasiva"->>'HORAS_PTA'), ',', '.')::numeric > 0 THEN 'PLANTA' ELSE 'CATEDRA' END
  ELSE 'CATEDRA'
END
WHERE "claseDocente" IS NULL
  AND "datosCargaMasiva" IS NOT NULL
  AND jsonb_typeof("datosCargaMasiva") = 'object';

COMMIT;
