-- Asociación individual de funciones. Ejecutar antes de desplegar el servicio.
-- No se infieren personas a partir de cargos. Los registros anteriores quedan
-- pendientes de identificación y se pueden asignar manualmente desde Editar.
-- No se alteran los snapshots de certificados ya emitidos.
BEGIN;

ALTER TABLE certification.labor_function_profiles
  ADD COLUMN IF NOT EXISTS id_number VARCHAR(50),
  ALTER COLUMN position_code DROP NOT NULL,
  ALTER COLUMN combined_code DROP NOT NULL,
  ALTER COLUMN position_name DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_labor_function_profiles_id_number
  ON certification.labor_function_profiles (id_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_labor_function_profiles_id_number'
      AND conrelid = 'certification.labor_function_profiles'::regclass
  ) THEN
    ALTER TABLE certification.labor_function_profiles
      ADD CONSTRAINT ck_labor_function_profiles_id_number
      CHECK (id_number IS NULL OR id_number ~ '^[0-9]{1,50}$');
  END IF;
END $$;

COMMIT;
