-- ============================================================================
-- 034 · EFDS-2303 — El programador publica la programación de su nivel.
--
-- La HU dice que publica el PROGRAMADOR, y el endpoint exigía
-- `programacion-academica.all` (administración): ningún programador podía
-- publicar. Se crea un permiso propio y se otorga a los dos programadores y al
-- administrador. Cada uno publica SOLO las franjas de los niveles que programa
-- (RN-08): el servicio acota la publicación por nivel; este permiso abre la
-- acción, el nivel lo decide el catálogo.
--
-- Cerrar el periodo y marcar excepciones siguen siendo de administración: son
-- actos sobre el periodo completo, no sobre un nivel.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(),
       'programacion-academica.publicar',
       'Programación — Publicar la programación de su nivel',
       'Permite publicar y retirar la publicación de las franjas de los niveles que el usuario programa',
       (SELECT id_module FROM auth.module WHERE code = 'programacion-academica'),
       TRUE
 WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'programacion-academica.publicar');

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
  FROM auth.role r
  JOIN auth.permission p ON p.code = 'programacion-academica.publicar'
 WHERE r.code IN ('PROGRAMADOR_PREGRADO', 'PROGRAMADOR_POSGRADO', 'ADMIN_PROGRAMACION')
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x
                    WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

-- Verificación: los roles que existan quedan con el permiso.
DO $$
DECLARE
  v_rol TEXT;
BEGIN
  FOREACH v_rol IN ARRAY ARRAY['PROGRAMADOR_PREGRADO', 'PROGRAMADOR_POSGRADO', 'ADMIN_PROGRAMACION'] LOOP
    IF EXISTS (SELECT 1 FROM auth.role WHERE code = v_rol)
       AND NOT EXISTS (
         SELECT 1 FROM auth.role r
           JOIN auth.role_permissions rp ON rp.id_rol = r.id
           JOIN auth.permission p ON p.id_permission = rp.id_permission
          WHERE r.code = v_rol AND p.code = 'programacion-academica.publicar') THEN
      RAISE EXCEPTION '034: el rol % existe pero no quedó con el permiso de publicar', v_rol;
    END IF;
  END LOOP;
END $$;
