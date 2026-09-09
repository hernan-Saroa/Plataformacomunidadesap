-- ============================================================================
-- EFDS-1368 — Roles de decanatura y asignación de permisos de programación
--
-- Detectado en el humo E2E del Bloque 4: la migración 004 crea los permisos pero
-- NINGÚN rol los tenía, y no existían roles de decanatura. El resultado era que
-- el catálogo respondía 403 a todo el mundo y el módulo se veía como una pantalla
-- de "sin niveles habilitados" — la funcionalidad estaba bien y era inalcanzable.
--
-- Se crean los dos perfiles del levantamiento (RN-08: visibilidad segregada por
-- nivel) y se les asigna únicamente lo suyo.
--
-- ⚠️ La disponibilidad de docentes se asigna a AMBOS: RN-08 segrega el CATÁLOGO,
-- no la ocupación del docente. Es lo que hará posible el bloqueo transversal de
-- franjas (RN-07) en la fase 3.
--
-- Idempotente.
-- ============================================================================

INSERT INTO auth.role (id, code, name, description, category, type, is_active)
SELECT gen_random_uuid(), 'PROGRAMADOR_PREGRADO', 'Programador(a) de Pregrado',
       'Decanatura de Pregrado: programa la oferta académica de los programas de pregrado',
       'ACADEMICO', 'FUNCIONAL', true
WHERE NOT EXISTS (SELECT 1 FROM auth.role WHERE code = 'PROGRAMADOR_PREGRADO');

INSERT INTO auth.role (id, code, name, description, category, type, is_active)
SELECT gen_random_uuid(), 'PROGRAMADOR_POSGRADO', 'Programador(a) de Posgrado',
       'Decanatura de Posgrado: programa la oferta académica de especializaciones y maestrías',
       'ACADEMICO', 'FUNCIONAL', true
WHERE NOT EXISTS (SELECT 1 FROM auth.role WHERE code = 'PROGRAMADOR_POSGRADO');

-- Cada decanatura ve SOLO su nivel (RN-08, AC-02).
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r, auth.permission p
WHERE r.code = 'PROGRAMADOR_PREGRADO' AND p.code = 'programacion.catalogo.pregrado'
  AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r, auth.permission p
WHERE r.code = 'PROGRAMADOR_POSGRADO' AND p.code = 'programacion.catalogo.posgrado'
  AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

-- La disponibilidad de docentes NO se segrega por nivel: ambos perfiles la ven.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r, auth.permission p
WHERE r.code IN ('PROGRAMADOR_PREGRADO', 'PROGRAMADOR_POSGRADO')
  AND p.code = 'programacion.docentes.disponibilidad'
  AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

-- La Subdirección Académica supervisa ambos niveles.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r, auth.permission p
WHERE r.code = 'SUBDIRECTOR_ACADEMICO' AND p.code IN ('programacion.all', 'programacion.docentes.disponibilidad')
  AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);
