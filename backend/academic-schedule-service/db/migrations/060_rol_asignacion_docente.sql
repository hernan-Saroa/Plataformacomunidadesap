-- ============================================================================
-- 060 · EFDS-2342 — Rol de asignación docente, pregrado y posgrado.
--
-- La reunión del 20 de octubre cambió el flujo: el docente ya no toma franjas
-- (EFDS-2348). Con los grupos ya programados, un rol nuevo asigna el docente de
-- cada grupo. Dos variantes, con la misma segregación por nivel (RN-08) que los
-- programadores, aplicada en el servidor (`EscrituraGuard`, `exigeNivel:
-- 'asignacion'`).
--
-- ⚠️ ASIGNAR NO ES PROGRAMAR. Los permisos `asignacion-docente.<nivel>` dejan ver
-- la programación del nivel y asignar sus docentes, pero NO crear ni cambiar
-- grupos, franjas o ciclos (eso sigue siendo `catalogo.<nivel>`). Y al revés: los
-- programadores dejan de asignar. Si el negocio quiere que también asignen,
-- basta con darles el permiso en una migración, sin tocar código.
--
-- `programacion-academica.all` (administración, SUPER_ADMIN) sigue pudiendo todo.
-- Los roles aparecen solos en la gestión de usuarios de la plataforma: la lista de
-- roles se lee de auth.role.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Permisos: uno por nivel, bajo el prefijo del módulo (el sidebar deriva el
--    módulo del prefijo; con otro prefijo el rol quedaría huérfano).
INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(), v.code, v.name, v.descripcion,
       (SELECT id_module FROM auth.module WHERE code = 'programacion-academica'), TRUE
  FROM (VALUES
    ('programacion-academica.asignacion-docente.pregrado',
     'Programación — Asignar docentes (pregrado)',
     'Permite ver la programación de pregrado y asignar el docente de sus grupos. No permite programar.'),
    ('programacion-academica.asignacion-docente.posgrado',
     'Programación — Asignar docentes (posgrado)',
     'Permite ver la programación de posgrado y asignar el docente de sus grupos. No permite programar.')
  ) AS v(code, name, descripcion)
 WHERE NOT EXISTS (SELECT 1 FROM auth.permission p WHERE p.code = v.code);

-- 2) Roles.
INSERT INTO auth.role (id, code, name, description, category, type, is_active)
SELECT gen_random_uuid(), v.code, v.name, v.descripcion, 'ACADEMICO', 'FUNCIONAL', TRUE
  FROM (VALUES
    ('PROGRAMADOR_DOCENTE_PREGRADO', 'Programador(a) Docente — Pregrado',
     'Asigna los docentes a los grupos ya programados de pregrado. Ve la programación de pregrado; no la modifica.'),
    ('PROGRAMADOR_DOCENTE_POSGRADO', 'Programador(a) Docente — Posgrado',
     'Asigna los docentes a los grupos ya programados de posgrado. Ve la programación de posgrado; no la modifica.')
  ) AS v(code, name, descripcion)
 WHERE NOT EXISTS (SELECT 1 FROM auth.role r WHERE r.code = v.code);

-- 3) Rol -> permisos. La disponibilidad docente es transversal (RN-07): el cruce
--    de un docente se ve aunque la franja que lo ocupa sea del otro nivel.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
  FROM auth.role r
  JOIN auth.permission p ON TRUE
 WHERE (r.code, p.code) IN (
        ('PROGRAMADOR_DOCENTE_PREGRADO', 'programacion-academica.asignacion-docente.pregrado'),
        ('PROGRAMADOR_DOCENTE_PREGRADO', 'programacion-academica.docentes.disponibilidad'),
        ('PROGRAMADOR_DOCENTE_POSGRADO', 'programacion-academica.asignacion-docente.posgrado'),
        ('PROGRAMADOR_DOCENTE_POSGRADO', 'programacion-academica.docentes.disponibilidad'))
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x
                    WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

-- ── CANARIO DE ALCANZABILIDAD ──────────────────────────────────────────────
-- Cada rol debe resolver SU permiso de asignación, NINGÚN permiso de programar
-- (catalogo.*, all) y ninguno del otro nivel. Si alguien mezcla los roles, la
-- migración falla en vez de abrir la programación a quien solo asigna.
DO $$
DECLARE
  v_rol   TEXT;
  v_nivel TEXT;
  v_otro  TEXT;
BEGIN
  FOREACH v_nivel IN ARRAY ARRAY['pregrado', 'posgrado'] LOOP
    v_rol  := 'PROGRAMADOR_DOCENTE_' || upper(v_nivel);
    v_otro := CASE v_nivel WHEN 'pregrado' THEN 'posgrado' ELSE 'pregrado' END;
    IF NOT EXISTS (
      SELECT 1 FROM auth.role r
        JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active
        JOIN auth.permission p ON p.id_permission = rp.id_permission
       WHERE r.code = v_rol AND p.code = 'programacion-academica.asignacion-docente.' || v_nivel
         AND split_part(p.code, '.', 1) = 'programacion-academica') THEN
      RAISE EXCEPTION '060: el rol % no resuelve su permiso de asignación', v_rol;
    END IF;
    IF EXISTS (
      SELECT 1 FROM auth.role r
        JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active
        JOIN auth.permission p ON p.id_permission = rp.id_permission
       WHERE r.code = v_rol
         AND (p.code LIKE 'programacion-academica.catalogo.%'
              OR p.code = 'programacion-academica.all'
              OR p.code = 'programacion-academica.asignacion-docente.' || v_otro)) THEN
      RAISE EXCEPTION '060: el rol % tiene un permiso de programar o del otro nivel', v_rol;
    END IF;
  END LOOP;
END $$;
