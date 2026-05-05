SELECT 
  r.name AS rol, 
  r.type, 
  r.is_active,
  u.username, 
  p.dir_email AS email, 
  p.nom_largo AS nombre
FROM auth.role r 
LEFT JOIN auth.user_roles ur ON r.id = ur.id_rol 
LEFT JOIN auth."user" u ON ur.id_user = u.id_user 
LEFT JOIN auth.personas p ON u.id_person = p.id_person 
ORDER BY r.name, u.username;
