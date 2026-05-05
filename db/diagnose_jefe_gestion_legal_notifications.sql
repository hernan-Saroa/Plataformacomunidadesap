-- 1. ¿Existe el rol?
SELECT id, code, name, is_active FROM auth.role WHERE code = 'JEFE_GESTION_LEGAL';

-- 2. ¿Qué usuarios tienen ese rol?
SELECT u.id_user, u.username, u.is_active AS user_active, ur.is_active AS asignacion_activa
FROM auth.role r
JOIN auth.user_roles ur ON ur.id_rol = r.id
JOIN auth."user" u      ON u.id_user = ur.id_user
WHERE r.code = 'JEFE_GESTION_LEGAL';

-- 3. ¿Han llegado notificaciones al Jefe?
SELECT n.tipo_notificacion, n.titulo, n.fecha_creacion, n.leida
FROM notifications.notificacion n
WHERE n.id_usuario_destinatario IN (
    SELECT u.id_user::text FROM auth.role r
    JOIN auth.user_roles ur ON ur.id_rol = r.id
    JOIN auth."user" u      ON u.id_user = ur.id_user
    WHERE r.code = 'JEFE_GESTION_LEGAL'
)
ORDER BY n.fecha_creacion DESC LIMIT 20;
