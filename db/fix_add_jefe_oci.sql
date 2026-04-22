-- Create persona for jefe.oci@esap.edu.co
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, fec_creacion, fec_modificacion)
VALUES (
  gen_random_uuid(),
  2,
  '987654321',
  'CC',
  'Jefe OCI',
  'Jefe',
  'OCI',
  'M',
  'jefe.oci@esap.edu.co',
  NOW(),
  NOW()
);

-- Create user linked to persona
INSERT INTO auth."user" (id_user, username, password_hash, id_person, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'jefe.oci@esap.edu.co',
  '$2b$10$NAieCr98ZDj12To6894P0.abevw4xDLI3sJBBkguXAPwyx.RZpxlO',
  p.id_person,
  true,
  NOW(),
  NOW()
FROM auth.personas p WHERE p.dir_email = 'jefe.oci@esap.edu.co';

-- Assign SUPER_ADMIN role
INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
SELECT
  u.id_user,
  '660e8400-e29b-41d4-a716-446655440001',
  true,
  NOW(),
  NOW()
FROM auth."user" u WHERE u.username = 'jefe.oci@esap.edu.co';

-- Verify
SELECT u.username, p.dir_email, r.name as role
FROM auth."user" u
JOIN auth.personas p ON u.id_person = p.id_person
LEFT JOIN auth.user_roles ur ON ur.id_user = u.id_user
LEFT JOIN auth.role r ON r.id = ur.id_rol
WHERE u.username = 'jefe.oci@esap.edu.co';
