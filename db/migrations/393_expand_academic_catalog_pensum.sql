-- Amplia el catalogo academico para conservar todos los campos de la plantilla
-- CARGA_2 y habilitar la cascada Programa -> Pensum -> Asignatura en el PTA.
-- Migracion aditiva e idempotente: no elimina ni reescribe datos existentes.

BEGIN;

ALTER TABLE academic_work_plan.programa
  ADD COLUMN IF NOT EXISTS categoria_horas_circular003 VARCHAR(50),
  ADD COLUMN IF NOT EXISTS descripcion_categoria_circular003 TEXT,
  ADD COLUMN IF NOT EXISTS horas_pta_referencia_circular003 VARCHAR(150),
  ADD COLUMN IF NOT EXISTS formula_calculo_horas TEXT;

ALTER TABLE academic_work_plan.asignatura
  ADD COLUMN IF NOT EXISTS pensum VARCHAR(50),
  ADD COLUMN IF NOT EXISTS horas_clase INT,
  ADD COLUMN IF NOT EXISTS horas_pta INT;

ALTER TABLE academic_work_plan.asignatura
  DROP CONSTRAINT IF EXISTS asignatura_horas_clase_no_negativas;
ALTER TABLE academic_work_plan.asignatura
  ADD CONSTRAINT asignatura_horas_clase_no_negativas
  CHECK (horas_clase IS NULL OR horas_clase >= 0);

ALTER TABLE academic_work_plan.asignatura
  DROP CONSTRAINT IF EXISTS asignatura_horas_pta_no_negativas;
ALTER TABLE academic_work_plan.asignatura
  ADD CONSTRAINT asignatura_horas_pta_no_negativas
  CHECK (horas_pta IS NULL OR horas_pta >= 0);

CREATE INDEX IF NOT EXISTS idx_asig_programa_pensum
  ON academic_work_plan.asignatura (id_programa, pensum);

-- Los catalogos anteriores siguen siendo utilizables. Solo se completan valores
-- que pueden inferirse sin alterar informacion ya cargada.
UPDATE academic_work_plan.programa
SET categoria_horas_circular003 = CASE
      WHEN horas_pregrado_central IS NOT NULL THEN 'pregrado_sede_central'
      WHEN tipo = 'maestria' THEN 'maestria'
      WHEN tipo = 'especializacion' THEN 'especializacion'
      WHEN tipo = 'pregrado' THEN 'pregrado_territorial'
      ELSE NULL
    END
WHERE categoria_horas_circular003 IS NULL;

UPDATE academic_work_plan.asignatura a
SET horas_pta = COALESCE(
      a.horas_fijas_pta,
      CASE
        WHEN p.horas_pregrado_central IS NOT NULL THEN p.horas_pregrado_central * 3
        ELSE a.creditos * p.horas_base_por_credito * 3
      END
    )
FROM academic_work_plan.programa p
WHERE p.id = a.id_programa
  AND a.horas_pta IS NULL;

UPDATE academic_work_plan.asignatura
SET horas_clase = ROUND(horas_pta / 3.0)::INT
WHERE horas_clase IS NULL
  AND horas_pta IS NOT NULL;

COMMIT;
