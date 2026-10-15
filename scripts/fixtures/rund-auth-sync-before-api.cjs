/* SELECT anteriores a la API; referencia solo para la base temporal de integración. */
exports.roleSql = `SELECT id FROM auth.role WHERE UPPER(code) = 'DOCENTE' AND is_active = true`;
exports.identitySql = `SELECT p.id_person, p.num_identificacion, p.dir_email,
            p.id_seccional::text AS territorial_id, s.nom_seccional AS territorial_nombre, p.id_sede::text AS sede_id,
            u.is_active AS usuario_activo,
            EXISTS(SELECT 1 FROM auth.user_roles ur JOIN auth.role r ON r.id = ur.id_rol
              WHERE ur.id_user = u.id_user AND ur.id_rol = $3 AND ur.is_active = true AND r.is_active = true) AS rol_docente_activo
          FROM auth.personas p JOIN auth."user" u ON u.id_person = p.id_person
          LEFT JOIN auth.seccionales s ON s.id_seccional = p.id_seccional
          WHERE p.id_person = $1 AND u.id_user = $2 LIMIT 1`;
