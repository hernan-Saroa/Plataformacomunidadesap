-- 1. Verificar la tabla configuracion_profesionales_ocig
SELECT * FROM control_interno.configuracion_profesionales_ocig;

-- 2. Verificar si el usuario de Subdirector Alto Gobierno está activo
SELECT u.id_user, u.username, u.is_active, u.id_person, p.nom_largo, p.dir_email
FROM auth."user" u
JOIN auth.personas p ON u.id_person = p.id_person
WHERE u.username LIKE '%altogobierno%';

-- 3. Verificar user_roles para Subdirector Alto Gobierno
SELECT u.username, r.name, ur.is_active as role_active
FROM auth.user_roles ur
JOIN auth."user" u ON ur.id_user = u.id_user
JOIN auth.role r ON r.id = ur.id_rol
WHERE u.username LIKE '%altogobierno%';

-- 4. Ver todos los usuarios que podrían ser candidatos (simular la query del backend)
SELECT DISTINCT
  p.id_person,
  p.nom_largo,
  p.dir_email,
  r.name as role_name,
  r.category
FROM auth.personas p
INNER JOIN auth."user" u ON u.id_person = p.id_person
INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
INNER JOIN auth.role r ON r.id = ur.id_rol
WHERE p.nom_largo IS NOT NULL
  AND u.is_active = true
  AND r.category IN ('control_interno', 'sistema', 'backoffice', 'Control Interno')
ORDER BY p.nom_largo;
