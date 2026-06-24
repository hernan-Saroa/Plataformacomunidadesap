-- Corrige la validacion de Gestion de Graduados para impedir que registro,
-- folio o libro se guarden vacios. Los datos historicos no se modifican:
-- la regla se aplica solamente cuando alguno de estos campos cambia.

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

COMMENT ON FUNCTION academic_registration.validate_graduate_management_update()
  IS 'Valida campos editables y exige registro, folio y libro cuando se actualizan.';

COMMIT;
