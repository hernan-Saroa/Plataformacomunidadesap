CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE auth."user"
  ADD COLUMN IF NOT EXISTS public_id uuid;

UPDATE auth."user"
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

ALTER TABLE auth."user"
  ALTER COLUMN public_id SET DEFAULT gen_random_uuid();

ALTER TABLE auth."user"
  ALTER COLUMN public_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_public_id_key'
      AND conrelid = 'auth."user"'::regclass
  ) THEN
    ALTER TABLE auth."user"
      ADD CONSTRAINT user_public_id_key UNIQUE (public_id);
  END IF;
END $$;
