SELECT u.id_user, u.username, u.is_active, p.id_person, p.dir_email, p.nom_largo 
FROM auth."user" u
LEFT JOIN auth.personas p ON u.id_person = p.id_person;
