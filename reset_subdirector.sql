-- Eliminar la entrada existente de Subdirector Alto Gobierno para que aparezca como candidato
DELETE FROM control_interno.configuracion_profesionales_ocig 
WHERE id_tercero = 'd0000005-0000-0000-0000-000000000005';

-- Verificar que ya no está
SELECT COUNT(*) as registros_subdirector FROM control_interno.configuracion_profesionales_ocig 
WHERE id_tercero = 'd0000005-0000-0000-0000-000000000005';

-- Verificar que aparecería como candidato (simular query del backend)
SELECT DISTINCT
  p.id_person,
  p.nom_largo,
  p.dir_email,
  r.name as role_name
FROM auth.personas p
INNER JOIN auth."user" u ON u.id_person = p.id_person
INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
INNER JOIN auth.role r ON r.id = ur.id_rol
WHERE p.nom_largo IS NOT NULL
  AND u.is_active = true
  AND r.category IN ('control_interno', 'sistema', 'backoffice', 'Control Interno')
  AND p.id_person NOT IN (SELECT id_tercero FROM control_interno.configuracion_profesionales_ocig)
ORDER BY p.nom_largo;
