-- Add id_dependencia FK to personas table
-- References auth.dependencias(id_dependencia), created in 003_dependencias_app_columns_and_seed.sql

ALTER TABLE auth.personas
  ADD COLUMN IF NOT EXISTS id_dependencia bigint NULL;

-- FK (guarded against existing constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_personas_dependencia'
      AND table_schema = 'auth'
      AND table_name = 'personas'
  ) THEN
    ALTER TABLE auth.personas
      ADD CONSTRAINT fk_personas_dependencia
        FOREIGN KEY (id_dependencia)
        REFERENCES auth.dependencias (id_dependencia)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
  END IF;
END $$;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_personas_id_dependencia
  ON auth.personas (id_dependencia);

-- Backfill: default dependencia for any existing personas (first dependencia, nullable-safe)
UPDATE auth.personas
   SET id_dependencia = (SELECT id_dependencia FROM auth.dependencias ORDER BY id_dependencia LIMIT 1)
 WHERE id_dependencia IS NULL
   AND EXISTS (SELECT 1 FROM auth.dependencias);
