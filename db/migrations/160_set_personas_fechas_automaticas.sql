-- Migration 160: Automatic timestamps for auth.personas and auth."user"
-- - auth.personas:
--   - fec_creacion: set automatically on INSERT
--   - fec_modificacion: set automatically on UPDATE
-- - auth."user":
--   - created_at: set automatically on INSERT
--   - updated_at: set automatically on UPDATE

ALTER TABLE auth.personas
ALTER COLUMN fec_creacion TYPE timestamp with time zone
USING
    CASE
        WHEN fec_creacion IS NULL THEN NULL
        ELSE fec_creacion::timestamp with time zone
    END;

ALTER TABLE auth.personas
ALTER COLUMN fec_modificacion TYPE timestamp with time zone
USING
    CASE
        WHEN fec_modificacion IS NULL THEN NULL
        ELSE fec_modificacion::timestamp with time zone
    END;

ALTER TABLE auth.personas
ALTER COLUMN fec_creacion SET DEFAULT CURRENT_TIMESTAMP;

-- Optional normalization for existing rows without creation date.
UPDATE auth.personas
SET fec_creacion = CURRENT_TIMESTAMP
WHERE fec_creacion IS NULL;

CREATE OR REPLACE FUNCTION auth.trg_set_personas_fechas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.fec_creacion := COALESCE(NEW.fec_creacion, CURRENT_TIMESTAMP);
        NEW.fec_modificacion := COALESCE(NEW.fec_modificacion, CURRENT_TIMESTAMP);
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.fec_creacion := COALESCE(NEW.fec_creacion, OLD.fec_creacion, CURRENT_TIMESTAMP);
        NEW.fec_modificacion := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personas_set_fechas ON auth.personas;

CREATE TRIGGER trg_personas_set_fechas
BEFORE INSERT OR UPDATE ON auth.personas
FOR EACH ROW
EXECUTE FUNCTION auth.trg_set_personas_fechas();

ALTER TABLE auth."user"
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE auth."user"
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE auth."user"
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

CREATE OR REPLACE FUNCTION auth.trg_set_user_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
        NEW.updated_at := COALESCE(NEW.updated_at, CURRENT_TIMESTAMP);
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.created_at := COALESCE(NEW.created_at, OLD.created_at, CURRENT_TIMESTAMP);
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_set_timestamps ON auth."user";

CREATE TRIGGER trg_user_set_timestamps
BEFORE INSERT OR UPDATE ON auth."user"
FOR EACH ROW
EXECUTE FUNCTION auth.trg_set_user_timestamps();
