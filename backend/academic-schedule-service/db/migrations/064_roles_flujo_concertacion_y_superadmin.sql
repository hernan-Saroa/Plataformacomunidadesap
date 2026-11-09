-- ============================================================================
-- 064 · Roles del flujo de concertación y permisos de Programación Académica
--       para el superusuario.
--
-- Contexto (QA, nov-2026): para completar el flujo de Programación Académica con
-- usuarios reales hacen falta roles que no estaban en las migraciones:
--
--   1) SUPER_ADMIN (el superusuario original, p. ej. superuser@esap.edu.co) no tenía
--      todos los permisos del módulo: faltaban «Asignar docentes» (pregrado y
--      posgrado) y «Publicar». Ahora tiene TODOS los de Programación Académica y los
--      del portal del docente.
--   2) Nadie, salvo el superusuario, podía REVISAR la docencia: ningún rol tenía
--      `pta.review.academica.<nivel>`. Se crean REVISOR_DOCENCIA_PREGRADO y
--      REVISOR_DOCENCIA_POSGRADO.
--   3) El APROBADOR de la docencia (sin alcance territorial) existía solo como rol
--      creado a mano en algunas bases. Se crea APROBADOR_DOCENCIA si no existe y se le
--      aseguran sus permisos (si existe, solo se le AGREGA lo que le falte).
--
-- ⚠️ El módulo se muestra en el backoffice por el PREFIJO del permiso: un rol que solo
-- tuviera permisos `pta.*` no vería Programación Académica. Por eso cada rol nuevo
-- lleva también `programacion-academica.docentes.disponibilidad` (lectura transversal,
-- RN-07), igual que JEFATURA_TERRITORIAL. NO llevan permisos de programar ni de asignar.
--
-- Forward-only e idempotente. SQL puro. No quita nada a nadie.
-- ============================================================================

-- 1) SUPER_ADMIN: todos los permisos de Programación Académica y del portal del docente.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
  FROM auth.role r
  JOIN auth.permission p ON (p.code LIKE 'programacion-academica.%'
                             OR p.code LIKE 'portal-transaccional.programacion-academica.%')
                        AND COALESCE(p.is_active, TRUE)
 WHERE r.code = 'SUPER_ADMIN'
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

UPDATE auth.role_permissions rp
   SET is_active = TRUE
  FROM auth.role r, auth.permission p
 WHERE rp.id_rol = r.id AND rp.id_permission = p.id_permission
   AND r.code = 'SUPER_ADMIN' AND rp.is_active IS NOT TRUE
   AND (p.code LIKE 'programacion-academica.%' OR p.code LIKE 'portal-transaccional.programacion-academica.%');

-- 2) Roles del flujo de concertación.
INSERT INTO auth.role (id, code, name, description, category, type, is_active)
SELECT gen_random_uuid(), v.code, v.name, v.descripcion, 'ACADEMICO', 'FUNCIONAL', TRUE
  FROM (VALUES
    ('REVISOR_DOCENCIA_PREGRADO', 'Revisor(a) de Docencia — Pregrado',
     'Revisa y firma la docencia de pregrado enviada por el programador (etapa 2 de la concertación). No programa ni asigna.'),
    ('REVISOR_DOCENCIA_POSGRADO', 'Revisor(a) de Docencia — Posgrado',
     'Revisa y firma la docencia de posgrado enviada por el programador (etapa 2 de la concertación). No programa ni asigna.'),
    ('APROBADOR_DOCENCIA', 'Aprobador(a) de Docencia',
     'Aprueba y firma la docencia ya revisada, de pregrado y posgrado (etapa 3 de la concertación). No programa ni asigna.')
  ) AS v(code, name, descripcion)
 WHERE NOT EXISTS (SELECT 1 FROM auth.role r WHERE r.code = v.code OR r.name = v.name);

-- 3) Rol → permisos. Solo se agregan los que faltan; los permisos `pta.*` los siembra el PTA
--    (migración 387): si alguno no existe en esta base, no se inventa (lo atrapa el canario).
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
  FROM auth.role r
  JOIN auth.permission p ON TRUE
 WHERE (r.code, p.code) IN (
        ('REVISOR_DOCENCIA_PREGRADO', 'pta.review.academica.pregrado'),
        ('REVISOR_DOCENCIA_PREGRADO', 'programacion-academica.docentes.disponibilidad'),
        ('REVISOR_DOCENCIA_POSGRADO', 'pta.review.academica.posgrado'),
        ('REVISOR_DOCENCIA_POSGRADO', 'programacion-academica.docentes.disponibilidad'),
        ('APROBADOR_DOCENCIA', 'pta.approve.academica.pregrado'),
        ('APROBADOR_DOCENCIA', 'pta.approve.academica.posgrado'),
        ('APROBADOR_DOCENCIA', 'programacion-academica.docentes.disponibilidad'))
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

-- ── CANARIOS ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_faltan TEXT;
  v_rol    TEXT;
  v_permiso TEXT;
BEGIN
  -- SUPER_ADMIN debe tener TODO lo de Programación Académica (si el rol existe en esta base).
  IF EXISTS (SELECT 1 FROM auth.role WHERE code = 'SUPER_ADMIN') THEN
    SELECT string_agg(p.code, ', ') INTO v_faltan
      FROM auth.permission p
     WHERE (p.code LIKE 'programacion-academica.%' OR p.code LIKE 'portal-transaccional.programacion-academica.%')
       AND COALESCE(p.is_active, TRUE)
       AND NOT EXISTS (SELECT 1 FROM auth.role_permissions rp JOIN auth.role r ON r.id = rp.id_rol
                        WHERE r.code = 'SUPER_ADMIN' AND rp.id_permission = p.id_permission AND rp.is_active IS NOT FALSE);
    IF v_faltan IS NOT NULL THEN
      RAISE EXCEPTION '064: SUPER_ADMIN quedó sin: %', v_faltan;
    END IF;
  END IF;

  -- Cada revisor nuevo resuelve su permiso de decisión y NINGÚN permiso de programar ni de asignar.
  FOREACH v_rol IN ARRAY ARRAY['REVISOR_DOCENCIA_PREGRADO', 'REVISOR_DOCENCIA_POSGRADO'] LOOP
    v_permiso := 'pta.review.academica.' || lower(substring(v_rol FROM 'DOCENCIA_(.*)$'));
    IF EXISTS (SELECT 1 FROM auth.role WHERE code = v_rol)
       AND NOT EXISTS (SELECT 1 FROM auth.role r JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active
                         JOIN auth.permission p ON p.id_permission = rp.id_permission
                        WHERE r.code = v_rol AND p.code = v_permiso) THEN
      RAISE EXCEPTION '064: % no resolvió %: ¿está sembrado el permiso del PTA (migración 387)?', v_rol, v_permiso;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM auth.role r JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active
               JOIN auth.permission p ON p.id_permission = rp.id_permission
              WHERE r.code IN ('REVISOR_DOCENCIA_PREGRADO', 'REVISOR_DOCENCIA_POSGRADO')
                AND (p.code = 'programacion-academica.all' OR p.code LIKE 'programacion-academica.catalogo.%'
                     OR p.code LIKE 'programacion-academica.asignacion-docente.%' OR p.code = 'programacion-academica.publicar')) THEN
    RAISE EXCEPTION '064: un revisor no debe programar, asignar ni publicar';
  END IF;
END $$;
