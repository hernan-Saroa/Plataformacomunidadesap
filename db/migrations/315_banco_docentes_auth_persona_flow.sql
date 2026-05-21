-- Ajusta Banco de Docentes para que academic_work_plan."Docente"."personaId"
-- referencie auth.personas.id_person y para que territorialId/sedeId usen
-- auth.seccionales/auth.sedes en lugar de tablas espejo de academic_work_plan.

ALTER TABLE auth."user"
ADD COLUMN IF NOT EXISTS password_temp boolean DEFAULT false;

ALTER TABLE academic_work_plan."Docente"
DROP CONSTRAINT IF EXISTS "Docente_personaId_fkey";

ALTER TABLE academic_work_plan."Docente"
DROP CONSTRAINT IF EXISTS "Docente_territorialId_fkey";

ALTER TABLE academic_work_plan."Docente"
DROP CONSTRAINT IF EXISTS "Docente_sedeId_fkey";

UPDATE academic_work_plan."Docente" d
SET "personaId" = p.id_person::text
FROM academic_work_plan."Persona" ap
JOIN auth.personas p ON p.num_identificacion = ap.identificacion
WHERE d."personaId" = ap.id
  AND p.id_person IS NOT NULL;

UPDATE academic_work_plan."Docente" d
SET "territorialId" = sec.id_seccional::text
FROM academic_work_plan."Territorial" t
JOIN auth.seccionales sec
  ON NULLIF(BTRIM(sec.cod_seccional), '') = NULLIF(BTRIM(t.codigo), '')
  OR LOWER(BTRIM(sec.nom_seccional)) = LOWER(BTRIM(t.nombre))
WHERE d."territorialId" = t.id;

UPDATE academic_work_plan."Docente" d
SET "sedeId" = sede.id_sede::text
FROM academic_work_plan."Sede" old_sede
JOIN auth.sedes sede
  ON NULLIF(BTRIM(sede.cod_sede), '') = NULLIF(BTRIM(old_sede.codigo), '')
  OR LOWER(BTRIM(sede.nom_sede)) = LOWER(BTRIM(old_sede.nombre))
WHERE d."sedeId" = old_sede.id;

ALTER TABLE academic_work_plan."Docente"
ALTER COLUMN "personaId" TYPE uuid USING "personaId"::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Docente_personaId_auth_personas_fkey'
      AND conrelid = 'academic_work_plan."Docente"'::regclass
  ) THEN
    ALTER TABLE academic_work_plan."Docente"
    ADD CONSTRAINT "Docente_personaId_auth_personas_fkey"
    FOREIGN KEY ("personaId")
    REFERENCES auth.personas(id_person)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
    NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Docente_personaId_key"
ON academic_work_plan."Docente" ("personaId");
