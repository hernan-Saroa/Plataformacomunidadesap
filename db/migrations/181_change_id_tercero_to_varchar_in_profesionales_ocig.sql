-- Migration 181: Change id_tercero from INTEGER to VARCHAR(36) in configuracion_profesionales_ocig
-- Motivation: auth.personas no longer uses an integer id_tercero as PK;
--             new users are identified by id_person (UUID).  Widening the
--             column to VARCHAR(36) lets the table store both the legacy
--             integer keys (4, 5, 6, 7 -- now stored as '4','5','6','7')
--             and new UUID strings without data loss.
--
-- This migration is idempotent: if the column is already varchar it exits
-- cleanly via the IS NULL guard.

DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type
    INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'control_interno'
      AND table_name   = 'configuracion_profesionales_ocig'
      AND column_name  = 'id_tercero';

    IF col_type IS NULL THEN
        RAISE NOTICE 'Column id_tercero not found in configuracion_profesionales_ocig. Skipping.';
        RETURN;
    END IF;

    IF col_type NOT IN ('integer', 'bigint') THEN
        RAISE NOTICE 'Column id_tercero is already % – no conversion needed.', col_type;
        RETURN;
    END IF;

    -- Drop the unique constraint that binds to the integer column.
    -- The constraint will be recreated below on the varchar column.
    ALTER TABLE control_interno.configuracion_profesionales_ocig
        DROP CONSTRAINT IF EXISTS uq_profesional_ocig_activo;

    -- Drop the unique index if it was created separately.
    DROP INDEX IF EXISTS control_interno.uq_profesional_ocig_activo;

    -- Change column type.  The USING clause converts the integer to text.
    ALTER TABLE control_interno.configuracion_profesionales_ocig
        ALTER COLUMN id_tercero TYPE VARCHAR(36)
        USING id_tercero::VARCHAR(36);

    -- Recreate unique constraint.
    ALTER TABLE control_interno.configuracion_profesionales_ocig
        ADD CONSTRAINT uq_profesional_ocig_activo UNIQUE (id_tercero);

    RAISE NOTICE 'Migration 181 applied: id_tercero is now VARCHAR(36).';
END;
$$;
