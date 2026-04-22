-- Fix auth.personas: add id_person UUID column expected by auth-service entities
-- The init script used id_tercero as PK, but auth-service entities expect id_person (uuid)

-- 1. Drop old FK from user table
ALTER TABLE auth."user" DROP CONSTRAINT IF EXISTS "FK_USER_PERSONAS";

-- 2. Add id_person UUID column to personas
ALTER TABLE auth.personas ADD COLUMN IF NOT EXISTS id_person UUID;

-- 3. Generate UUIDs for existing rows
UPDATE auth.personas SET id_person = gen_random_uuid() WHERE id_person IS NULL;

-- 4. Make it NOT NULL
ALTER TABLE auth.personas ALTER COLUMN id_person SET NOT NULL;

-- 5. Now update auth.user: the user table has id_person column referencing old id_tercero (numeric)
--    We need to change user.id_person to reference the new UUID
--    First check what the current user has and map it

-- Get the id_person UUID for the persona linked to user
-- Current user.id_tercero = 1 which maps to personas.id_tercero = 1
-- We need to set user.id_person = personas.id_person WHERE user.id_tercero = personas.id_tercero

-- Drop old column type and recreate with UUID
ALTER TABLE auth."user" DROP COLUMN IF EXISTS id_person;
ALTER TABLE auth."user" ADD COLUMN id_person UUID;

-- Link users to personas via id_tercero
UPDATE auth."user" u SET id_person = p.id_person
FROM auth.personas p 
WHERE u.id_tercero = p.id_tercero;

-- Add FK constraint
ALTER TABLE auth."user" ADD CONSTRAINT "fk_user_person" 
  FOREIGN KEY (id_person) REFERENCES auth.personas(id_person);

-- Verify
SELECT u.username, u.id_person, p.id_person as persona_id_person, p.dir_email 
FROM auth."user" u 
LEFT JOIN auth.personas p ON u.id_person = p.id_person;
