-- ============================================================================
-- 106 · Sin rol financiero en Contratación
--
-- Desde la 103 la Financiera no atiende el CDP desde el aplicativo: lo expide
-- por fuera y el área lo carga. En la revisión de EFDS-1146 Contratación pidió
-- dar el paso que faltaba: el rol financiero sale de la plataforma.
--
-- Aquí solo se quita el rol (decisión de Juan). Lo que todavía hacía queda con
-- quienes ya tenían permiso sobre esas actividades, y lo que no tenga a nadie
-- lo reparte la Dirección desde Configuración → Permisos:
--
--   · 8.3  Expedición de RP           · decidir: solo lo tenía la Financiera
--   · 9.4  Trámite de pagos           · decidir: solo lo tenía la Financiera
--   · 9.5  Modificaciones             · aprobar: solo lo tenía la Financiera
--   · 10.3 Cierre                     · editar: solo lo tenía la Financiera
--                                       (decidir sigue en el Gestor)
--
-- Lo que se hace, con el criterio de la 092:
--
--   1. El rol queda inactivo. No se borra: borrarlo quitaría en cascada la
--      asignación a sus usuarios y la historia de quién tuvo qué. Un rol
--      inactivo ya no cuenta para ningún permiso ni alcance.
--   2. Sus permisos de contratación se borran.
--   3. Sus alcances vigentes se apagan; la fila conserva quién la dio.
--
-- No se toca `auth.user_roles`, ni los participantes con papel FINANCIERA que
-- quedaron de antes de la 103: son historia de quién tomó cada solicitud.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

UPDATE auth.role
   SET is_active = false,
       updated_by = 'migracion-106',
       updated_at = now()
 WHERE code = 'ESTRUCTURADOR_FINANCIERO'
   AND is_active;

DELETE FROM auth.role_permissions rp
 USING auth.role r, auth.permission p
 WHERE rp.id_rol = r.id
   AND rp.id_permission = p.id_permission
   AND p.code LIKE 'contratacion.%'
   AND r.code = 'ESTRUCTURADOR_FINANCIERO';

UPDATE hiring.alcances_permiso a
   SET activo = false,
       updated_at = now()
  FROM auth.role r
 WHERE a.rol_id = r.id
   AND a.activo
   AND r.code = 'ESTRUCTURADOR_FINANCIERO';

COMMIT;
