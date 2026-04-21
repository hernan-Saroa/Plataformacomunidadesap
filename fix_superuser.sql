-- Create person for superuser
INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
VALUES (gen_random_uuid(), '999999999', 'CC', 'Super Administrador', 'Super', 'Administrador', 'M', 'superuser@esap.edu.co')
ON CONFLICT DO NOTHING;

-- Link superuser to person
UPDATE auth."user" 
SET id_person = (SELECT id_person FROM auth.personas WHERE dir_email = 'superuser@esap.edu.co' LIMIT 1)
WHERE username = 'superuser@esap.edu.co' AND id_person IS NULL;

-- Also fix jefe.oci if person email doesn't match
UPDATE auth.personas 
SET dir_email = 'jefe.oci@esap.edu.co' 
WHERE id_person = (SELECT id_person FROM auth."user" WHERE username = 'jefe.oci@esap.edu.co' AND id_person IS NOT NULL LIMIT 1)
AND dir_email != 'jefe.oci@esap.edu.co';

-- Verify the fix
SELECT u.username, u.id_person, p.dir_email, p.nom_largo 
FROM auth."user" u 
LEFT JOIN auth.personas p ON u.id_person = p.id_person;
