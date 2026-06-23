-- Corrige la creación manual de programas académicos.
-- No elimina tablas ni datos.
-- Regla funcional: el código identifica de forma única al programa; el nombre
-- visible puede repetirse para modalidades, jornadas o versiones diferentes.

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  IF to_regclass('academic_work_plan.programa') IS NULL THEN
    RAISE NOTICE 'academic_work_plan.programa no existe; se omite la migración.';
    RETURN;
  END IF;

  FOR constraint_record IN
    SELECT constraint_data.conname
    FROM (
      SELECT
        c.conname,
        a.attname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a
        ON a.attrelid = t.oid
       AND a.attnum = c.conkey[1]
      WHERE n.nspname = 'academic_work_plan'
        AND t.relname = 'programa'
        AND c.contype = 'u'
        AND array_length(c.conkey, 1) = 1
    ) AS constraint_data
    WHERE constraint_data.attname IN ('nombre', 'nombre_excel', 'nombre_corto')
  LOOP
    EXECUTE format(
      'ALTER TABLE academic_work_plan.programa DROP CONSTRAINT IF EXISTS %I',
      constraint_record.conname
    );
  END LOOP;

  ALTER TABLE academic_work_plan.programa
    DROP CONSTRAINT IF EXISTS programa_tipo_check;

  ALTER TABLE academic_work_plan.programa
    ADD CONSTRAINT programa_tipo_check
    CHECK (
      tipo IN (
        'pregrado',
        'tecnico_profesional',
        'tecnologico',
        'especializacion',
        'maestria',
        'doctorado'
      )
    );
END $$;

