-- Aplica exactamente la matriz confirmada para ambos formularios:
-- registro 1-20, folio 1-10 y libro 1-10 caracteres numericos.

BEGIN;

CREATE OR REPLACE FUNCTION academic_registration.validate_graduate_management_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    IF NEW.full_name IS NULL
       OR NEW.full_name <> btrim(NEW.full_name)
       OR char_length(NEW.full_name) NOT BETWEEN 5 AND 150
       OR NEW.full_name !~ '^[-[:alpha:][:space:]''’]+$' THEN
      RAISE EXCEPTION
        'El nombre completo debe tener entre 5 y 150 caracteres y solo puede contener letras, espacios, apostrofes y guiones.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.first_name IS DISTINCT FROM OLD.first_name
       AND (
         NEW.first_name IS NULL
         OR NEW.first_name <> btrim(NEW.first_name)
         OR char_length(NEW.first_name) NOT BETWEEN 1 AND 150
         OR NEW.first_name !~ '^[-[:alpha:][:space:]''’]+$'
       ) THEN
      RAISE EXCEPTION
        'El nombre solo puede contener letras, espacios, apostrofes y guiones.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.last_name IS DISTINCT FROM OLD.last_name
       AND (
         NEW.last_name IS NULL
         OR NEW.last_name <> btrim(NEW.last_name)
         OR char_length(NEW.last_name) NOT BETWEEN 1 AND 150
         OR NEW.last_name !~ '^[-[:alpha:][:space:]''’]+$'
       ) THEN
      RAISE EXCEPTION
        'El apellido solo puede contener letras, espacios, apostrofes y guiones.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.id_number IS DISTINCT FROM OLD.id_number
     AND (
       NEW.id_number IS NULL
       OR NEW.id_number <> btrim(NEW.id_number)
       OR char_length(NEW.id_number) NOT BETWEEN 5 AND 20
       OR NEW.id_number !~ '^[A-Za-z0-9]+$'
     ) THEN
    RAISE EXCEPTION
      'El documento debe tener entre 5 y 20 caracteres y solo puede contener letras y numeros.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     AND (
       NEW.email IS NULL
       OR NEW.email <> btrim(NEW.email)
       OR char_length(NEW.email) NOT BETWEEN 5 AND 254
       OR NEW.email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     ) THEN
    RAISE EXCEPTION
      'El correo electronico debe tener entre 5 y 254 caracteres y un formato valido.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.num_registro IS DISTINCT FROM OLD.num_registro
     AND (
       NEW.num_registro IS NULL
       OR NEW.num_registro !~ '^[0-9]{1,20}$'
     ) THEN
    RAISE EXCEPTION
      'El numero de registro es obligatorio y debe contener entre 1 y 20 caracteres numericos.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.num_folio IS DISTINCT FROM OLD.num_folio
     AND (
       NEW.num_folio IS NULL
       OR NEW.num_folio !~ '^[0-9]{1,10}$'
     ) THEN
    RAISE EXCEPTION
      'El numero de folio es obligatorio y debe contener entre 1 y 10 caracteres numericos.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.num_libro IS DISTINCT FROM OLD.num_libro
     AND (
       NEW.num_libro IS NULL
       OR NEW.num_libro !~ '^[0-9]{1,10}$'
     ) THEN
    RAISE EXCEPTION
      'El numero de libro es obligatorio y debe contener entre 1 y 10 caracteres numericos.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE academic_registration.graduates
  DROP CONSTRAINT IF EXISTS chk_manual_review_graduate_fields;

ALTER TABLE academic_registration.graduates
  ADD CONSTRAINT chk_manual_review_graduate_fields
  CHECK (
    created_by IS NULL
    OR created_by NOT LIKE 'manual_review%'
    OR (
      full_name = btrim(full_name)
      AND char_length(full_name) BETWEEN 5 AND 150
      AND full_name ~ '^[-[:alpha:][:space:]''’]+$'
      AND id_number = btrim(id_number)
      AND char_length(id_number) BETWEEN 5 AND 20
      AND id_number ~ '^[A-Za-z0-9]+$'
      AND email IS NOT NULL
      AND email = btrim(email)
      AND char_length(email) BETWEEN 5 AND 254
      AND email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND num_registro IS NOT NULL
      AND num_registro ~ '^[0-9]{1,20}$'
      AND num_folio IS NOT NULL
      AND num_folio ~ '^[0-9]{1,10}$'
      AND num_libro IS NOT NULL
      AND num_libro ~ '^[0-9]{1,10}$'
    )
  ) NOT VALID;

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM academic_registration.graduates
  WHERE NOT (
    created_by IS NULL
    OR created_by NOT LIKE 'manual_review%'
    OR (
      full_name = btrim(full_name)
      AND char_length(full_name) BETWEEN 5 AND 150
      AND full_name ~ '^[-[:alpha:][:space:]''’]+$'
      AND id_number = btrim(id_number)
      AND char_length(id_number) BETWEEN 5 AND 20
      AND id_number ~ '^[A-Za-z0-9]+$'
      AND email IS NOT NULL
      AND email = btrim(email)
      AND char_length(email) BETWEEN 5 AND 254
      AND email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND num_registro IS NOT NULL
      AND num_registro ~ '^[0-9]{1,20}$'
      AND num_folio IS NOT NULL
      AND num_folio ~ '^[0-9]{1,10}$'
      AND num_libro IS NOT NULL
      AND num_libro ~ '^[0-9]{1,10}$'
    )
  );

  IF invalid_count = 0 THEN
    ALTER TABLE academic_registration.graduates
      VALIDATE CONSTRAINT chk_manual_review_graduate_fields;
  ELSE
    RAISE NOTICE
      'chk_manual_review_graduate_fields queda NOT VALID por % registro(s) historico(s); los cambios nuevos quedan protegidos.',
      invalid_count;
  END IF;
END $$;

COMMENT ON FUNCTION academic_registration.validate_graduate_management_update()
  IS 'Aplica exactamente registro 1-20 y folio/libro 1-10 en Gestion.';

COMMENT ON CONSTRAINT chk_manual_review_graduate_fields
  ON academic_registration.graduates
  IS 'Valida graduados de revision manual con registro 1-20 y folio/libro 1-10.';

COMMIT;
