-- Update ALL existing user passwords to Esap2026*
UPDATE auth."user" SET password_hash = '$2b$10$K68IIcbxk0pjHOJMaO.09uxLK0054s22KRJ2dABF/PqDEFKD3Ea9C';

-- Create personas for new users
INSERT INTO auth.personas (num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
VALUES 
  ('100000001', 'CC', 'Admin Sistema', 'Admin', 'Sistema', 'M', 'admin@esap.edu.co'),
  ('100000002', 'CC', 'Auditor Prueba', 'Auditor', 'Prueba', 'M', 'auditor@esap.edu.co'),
  ('100000003', 'CC', 'Juridico Prueba', 'Juridico', 'Prueba', 'M', 'juridico@esap.edu.co'),
  ('100000004', 'CC', 'Disciplinario Prueba', 'Disciplinario', 'Prueba', 'M', 'disciplinario@esap.edu.co'),
  ('100000005', 'CC', 'Registro Academico', 'Registro', 'Academico', 'M', 'registro@esap.edu.co')
ON CONFLICT DO NOTHING;

-- Create users
INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
SELECT gen_random_uuid(), 'admin@esap.edu.co', '$2b$10$K68IIcbxk0pjHOJMaO.09uxLK0054s22KRJ2dABF/PqDEFKD3Ea9C', true, p.id_person
FROM auth.personas p WHERE p.dir_email = 'admin@esap.edu.co'
AND NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'admin@esap.edu.co');

INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
SELECT gen_random_uuid(), 'auditor@esap.edu.co', '$2b$10$K68IIcbxk0pjHOJMaO.09uxLK0054s22KRJ2dABF/PqDEFKD3Ea9C', true, p.id_person
FROM auth.personas p WHERE p.dir_email = 'auditor@esap.edu.co'
AND NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'auditor@esap.edu.co');

INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
SELECT gen_random_uuid(), 'juridico@esap.edu.co', '$2b$10$K68IIcbxk0pjHOJMaO.09uxLK0054s22KRJ2dABF/PqDEFKD3Ea9C', true, p.id_person
FROM auth.personas p WHERE p.dir_email = 'juridico@esap.edu.co'
AND NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'juridico@esap.edu.co');

INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
SELECT gen_random_uuid(), 'disciplinario@esap.edu.co', '$2b$10$K68IIcbxk0pjHOJMaO.09uxLK0054s22KRJ2dABF/PqDEFKD3Ea9C', true, p.id_person
FROM auth.personas p WHERE p.dir_email = 'disciplinario@esap.edu.co'
AND NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'disciplinario@esap.edu.co');

INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
SELECT gen_random_uuid(), 'registro@esap.edu.co', '$2b$10$K68IIcbxk0pjHOJMaO.09uxLK0054s22KRJ2dABF/PqDEFKD3Ea9C', true, p.id_person
FROM auth.personas p WHERE p.dir_email = 'registro@esap.edu.co'
AND NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'registro@esap.edu.co');

-- Assign Super Administrador role to all new users
INSERT INTO auth.user_roles (id_user, id_rol)
SELECT u.id_user, '660e8400-e29b-41d4-a716-446655440001'
FROM auth."user" u
WHERE u.username IN ('admin@esap.edu.co', 'auditor@esap.edu.co', 'juridico@esap.edu.co', 'disciplinario@esap.edu.co', 'registro@esap.edu.co')
AND NOT EXISTS (SELECT 1 FROM auth.user_roles ur WHERE ur.id_user = u.id_user AND ur.id_rol = '660e8400-e29b-41d4-a716-446655440001');

-- Verify
SELECT u.username, u.is_active, r.name as role FROM auth."user" u
LEFT JOIN auth.user_roles ur ON u.id_user = ur.id_user
LEFT JOIN auth.role r ON ur.id_rol = r.id
ORDER BY u.username;
