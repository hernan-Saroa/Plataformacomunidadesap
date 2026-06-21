-- Separa el tipo pedagógico de la asignatura de las excepciones PTA.
-- Es una migración aditiva: no elimina ni modifica registros existentes.

ALTER TABLE academic_work_plan.asignatura
  ADD COLUMN IF NOT EXISTS tipo_asignatura VARCHAR(30) NOT NULL DEFAULT 'teorica';

ALTER TABLE academic_work_plan.asignatura
  DROP CONSTRAINT IF EXISTS asignatura_tipo_asignatura_check;

ALTER TABLE academic_work_plan.asignatura
  ADD CONSTRAINT asignatura_tipo_asignatura_check
  CHECK (
    tipo_asignatura IN (
      'teorica',
      'practica',
      'taller',
      'seminario',
      'laboratorio'
    )
  );
