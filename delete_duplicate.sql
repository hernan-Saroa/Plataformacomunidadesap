DELETE FROM auth.user_roles ur
USING auth."user" u
WHERE ur.id_user = u.id_user
  AND u.username = 'jefe.oci@esap.edu.co'
  AND u.id_person IS NULL;

DELETE FROM auth."user"
WHERE username = 'jefe.oci@esap.edu.co'
  AND id_person IS NULL;

SELECT username, id_person FROM auth."user";
