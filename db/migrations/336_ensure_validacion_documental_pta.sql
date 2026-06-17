-- Garantiza la tabla usada por getRUNDDocente/syncRUNDDocuments.
-- Repara entornos donde 328_create_validacion_documental.sql no se ejecuto,
-- fallo por diferencia de tipos, o quedo marcada sin crear la relacion.

CREATE SCHEMA IF NOT EXISTS academic_work_plan;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_docente_id_type regtype;
  v_docente_id_sql text;
BEGIN
  SELECT a.atttypid::regtype
  INTO v_docente_id_type
  FROM pg_attribute a
  WHERE a.attrelid = 'academic_work_plan."Docente"'::regclass
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF v_docente_id_type IS NULL THEN
    RAISE EXCEPTION 'No existe la columna academic_work_plan."Docente".id requerida por validacion_documental';
  END IF;

  v_docente_id_sql := CASE
    WHEN v_docente_id_type = 'uuid'::regtype THEN 'UUID'
    ELSE 'TEXT'
  END;

  IF to_regclass('academic_work_plan.validacion_documental') IS NULL THEN
    EXECUTE format($sql$
      CREATE TABLE academic_work_plan.validacion_documental (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        docente_id %s NOT NULL,
        campo_rund VARCHAR(100) NOT NULL,
        tipo_documento_soporte VARCHAR(100) NOT NULL,
        id_documento_carpeta TEXT,
        estado_documento VARCHAR(30) NOT NULL DEFAULT 'Sin cargar',
        fecha_carga TIMESTAMP,
        fecha_validacion TIMESTAMP,
        validado_por VARCHAR(150),
        observacion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    $sql$, v_docente_id_sql);
  END IF;
END
$$;

ALTER TABLE academic_work_plan.validacion_documental
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS campo_rund VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tipo_documento_soporte VARCHAR(100),
  ADD COLUMN IF NOT EXISTS id_documento_carpeta TEXT,
  ADD COLUMN IF NOT EXISTS estado_documento VARCHAR(30) DEFAULT 'Sin cargar',
  ADD COLUMN IF NOT EXISTS fecha_carga TIMESTAMP,
  ADD COLUMN IF NOT EXISTS fecha_validacion TIMESTAMP,
  ADD COLUMN IF NOT EXISTS validado_por VARCHAR(150),
  ADD COLUMN IF NOT EXISTS observacion TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

ALTER TABLE academic_work_plan.validacion_documental
  ALTER COLUMN id_documento_carpeta TYPE TEXT USING id_documento_carpeta::text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'validacion_documental_pkey'
      AND conrelid = 'academic_work_plan.validacion_documental'::regclass
  ) THEN
    ALTER TABLE academic_work_plan.validacion_documental
      ADD CONSTRAINT validacion_documental_pkey PRIMARY KEY (id);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_docente_campo
  ON academic_work_plan.validacion_documental(docente_id, campo_rund);

CREATE INDEX IF NOT EXISTS idx_val_docente
  ON academic_work_plan.validacion_documental(docente_id);

DO $$
DECLARE
  v_docente_id_type regtype;
  v_docente_ref_type regtype;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'validacion_documental_estado_documento_check'
      AND conrelid = 'academic_work_plan.validacion_documental'::regclass
  ) THEN
    ALTER TABLE academic_work_plan.validacion_documental
      ADD CONSTRAINT validacion_documental_estado_documento_check
      CHECK (estado_documento IN ('Sin cargar', 'Pendiente', 'Aceptado', 'Rechazado', 'No aplica'))
      NOT VALID;
  END IF;

  SELECT a.atttypid::regtype
  INTO v_docente_id_type
  FROM pg_attribute a
  WHERE a.attrelid = 'academic_work_plan.validacion_documental'::regclass
    AND a.attname = 'docente_id'
    AND NOT a.attisdropped;

  SELECT a.atttypid::regtype
  INTO v_docente_ref_type
  FROM pg_attribute a
  WHERE a.attrelid = 'academic_work_plan."Docente"'::regclass
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF v_docente_id_type = v_docente_ref_type
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'validacion_documental_docente_id_fkey'
         AND conrelid = 'academic_work_plan.validacion_documental'::regclass
     ) THEN
    ALTER TABLE academic_work_plan.validacion_documental
      ADD CONSTRAINT validacion_documental_docente_id_fkey
      FOREIGN KEY (docente_id)
      REFERENCES academic_work_plan."Docente"(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;
