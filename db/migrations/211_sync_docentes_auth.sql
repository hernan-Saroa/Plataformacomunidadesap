-- Sincroniza los docentes del banco con el auth service real.
-- Requiere haber corrido previamente el endpoint POST /pta/banco-docentes/sync-auth
-- que crea los registros en auth.personas y auth."user".
--
-- Este script:
--   1. Actualiza la contraseña de los docentes a 123456 (hash bcrypt)
--   2. Asigna el rol DOCENTE a los que no lo tengan

-- ─── 1. Actualizar contraseña ────────────────────────────────────────────────
-- Hash bcrypt de '123456' con salt 10
UPDATE auth."user" u
SET password_hash = '$2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2'
WHERE u.id_person IN (
  SELECT p.id_person
  FROM auth.personas p
  JOIN academic_work_plan."Persona" ap ON ap.identificacion = p.num_identificacion
  JOIN academic_work_plan."Docente" d ON d."personaId" = ap.id
);

-- ─── 2. Asignar rol DOCENTE ───────────────────────────────────────────────────
INSERT INTO auth.user_roles (id_user, id_rol)
SELECT u.id_user, '660e8400-e29b-41d4-a716-446655440003'
FROM auth."user" u
WHERE u.id_person IN (
  SELECT p.id_person
  FROM auth.personas p
  JOIN academic_work_plan."Persona" ap ON ap.identificacion = p.num_identificacion
  JOIN academic_work_plan."Docente" d ON d."personaId" = ap.id
)
AND NOT EXISTS (
  SELECT 1 FROM auth.user_roles ur
  WHERE ur.id_user = u.id_user
    AND ur.id_rol = '660e8400-e29b-41d4-a716-446655440003'
);
