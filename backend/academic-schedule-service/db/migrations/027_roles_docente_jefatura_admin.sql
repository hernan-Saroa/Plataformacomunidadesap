-- ============================================================================
-- Lote 2 · 2.2 — Roles DOCENTE, JEFATURA_TERRITORIAL y ADMIN_PROGRAMACION
--
-- ⚠️ EL PREFIJO DE TODO PERMISO NUEVO ES `programacion-academica.`, idéntico
-- carácter por carácter al código del módulo. El backoffice deriva el módulo
-- visible del prefijo (lo de antes del primer punto). Con cualquier otro
-- prefijo el permiso existe, el rol existe, y el módulo queda INALCANZABLE en
-- el sidebar. Ya pasó dos veces: EFDS-1643 y el huérfano. El canario del final
-- verifica alcanzabilidad, no existencia.
--
-- ⚠️ UN SOLO ROL JEFATURA_TERRITORIAL, no 17. La territorial va en tabla de
-- asignación y se referencia POR ID, no por nombre. 17 códigos de rol serían 17
-- lugares donde el nombre puede divergir.
--
-- ⚠️ INTERPRETACIÓN QUE DEBE CONFIRMARSE: la asignación se modeló
-- USUARIO↔TERRITORIAL, no rol↔territorial. El rol es el mismo para todas las
-- jefaturas; lo que cambia es QUÉ territorial gobierna CADA usuario, y eso es
-- lo que exige NUEVA-3 ("cada jefatura ve solo lo suyo"). Una tabla
-- rol↔territorial no podría acotar a un usuario concreto.
--
-- ⚠️ Aprovisionamiento de datos de DESARROLLO, no el mecanismo de producción.
-- RN-09 sigue vigente: el RUND es de solo lectura para las decanaturas.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Permisos nuevos, colgados del mismo módulo que los existentes.
INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(), v.code, v.name, v.descripcion,
       (SELECT id_module FROM auth.module WHERE code = 'programacion-academica'), TRUE
  FROM (VALUES
    ('programacion-academica.franjas.tomar',
     'Programación — Tomar franjas publicadas',
     'Permite al docente tomar franjas de la programación publicada de sus programas'),
    ('programacion-academica.franjas.propias',
     'Programación — Ver franjas propias y acumulado',
     'Permite al docente ver las franjas que tomó y su acumulado frente al tope del RUND'),
    ('programacion-academica.aprobacion.territorial',
     'Programación — Aprobar o devolver por territorial',
     'Permite a la jefatura territorial aprobar o devolver las franjas tomadas por docentes de su territorial')
  ) AS v(code, name, descripcion)
 WHERE NOT EXISTS (SELECT 1 FROM auth.permission p WHERE p.code = v.code);

-- 2) Roles nuevos.
INSERT INTO auth.role (id, code, name, description, category, type, is_active)
SELECT gen_random_uuid(), v.code, v.name, v.descripcion, 'ACADEMICO', 'FUNCIONAL', TRUE
  FROM (VALUES
    ('DOCENTE', 'Docente',
     'Docente: consulta la programación publicada de sus programas y toma las franjas que puede dictar'),
    ('JEFATURA_TERRITORIAL', 'Jefatura Territorial',
     'Jefatura territorial: aprueba o devuelve las franjas tomadas por docentes de SU territorial. La territorial se asigna en academic-schedule.jefatura_territorial'),
    ('ADMIN_PROGRAMACION', 'Administrador(a) de Programación Académica',
     'Administración integral del módulo de Programación Académica')
  ) AS v(code, name, descripcion)
 WHERE NOT EXISTS (SELECT 1 FROM auth.role r WHERE r.code = v.code);

-- 3) Asignación rol -> permiso.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
  FROM auth.role r
  JOIN auth.permission p ON TRUE
 WHERE (r.code, p.code) IN (
        ('DOCENTE',              'programacion-academica.franjas.tomar'),
        ('DOCENTE',              'programacion-academica.franjas.propias'),
        ('JEFATURA_TERRITORIAL', 'programacion-academica.aprobacion.territorial'),
        ('JEFATURA_TERRITORIAL', 'programacion-academica.docentes.disponibilidad'),
        ('ADMIN_PROGRAMACION',   'programacion-academica.all'),
        ('ADMIN_PROGRAMACION',   'programacion-academica.catalogo.pregrado'),
        ('ADMIN_PROGRAMACION',   'programacion-academica.catalogo.posgrado'),
        ('ADMIN_PROGRAMACION',   'programacion-academica.docentes.disponibilidad'))
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x
                    WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);

-- 4) Asignación de territorial a la jefatura. Por ID, nunca por nombre.
CREATE TABLE IF NOT EXISTS "academic-schedule".jefatura_territorial (
    id_user                  UUID   NOT NULL REFERENCES auth."user"(id_user) ON DELETE CASCADE,
    id_direccion_territorial BIGINT NOT NULL
                             REFERENCES academic_work_plan.direccion_territorial(id) ON DELETE RESTRICT,
    asignado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_user, id_direccion_territorial)
);

COMMENT ON TABLE "academic-schedule".jefatura_territorial IS
  'Qué territorial(es) gobierna cada usuario con el rol JEFATURA_TERRITORIAL. Referencia la territorial por id: un nombre puede divergir, un id no.';

CREATE INDEX IF NOT EXISTS idx_jefatura_territorial ON "academic-schedule".jefatura_territorial (id_direccion_territorial);

-- ── CANARIO DE ALCANZABILIDAD ──────────────────────────────────────────────
-- No basta con que el rol y el permiso EXISTAN. En EFDS-1643 y en el huérfano
-- del sidebar el registro existía y era inútil.
DO $$
DECLARE
  v_modulo    TEXT;
  v_mal_pref  INT;
  v_sin_perms INT;
  v_rol       TEXT;
BEGIN
  SELECT code INTO v_modulo FROM auth.module WHERE code = 'programacion-academica';
  IF v_modulo IS NULL THEN
    RAISE EXCEPTION '027: no existe el modulo programacion-academica';
  END IF;

  -- (a) El prefijo de CADA permiso del módulo debe derivar exactamente al
  --     código del módulo. Es la misma derivación que hace auth.service.
  SELECT COUNT(*) INTO v_mal_pref
    FROM auth.permission p
   WHERE p.id_module = (SELECT id_module FROM auth.module WHERE code = v_modulo)
     AND replace(lower(split_part(p.code, '.', 1)), '_', '-') <> v_modulo;
  IF v_mal_pref > 0 THEN
    RAISE EXCEPTION '027: % permisos con prefijo que NO deriva a "%" — el modulo quedaria huerfano',
      v_mal_pref, v_modulo;
  END IF;

  -- (b) Cada rol nuevo debe resolver al menos un permiso. Un rol sin permisos
  --     es exactamente el bug de EFDS-1643.
  FOR v_rol IN SELECT unnest(ARRAY['DOCENTE','JEFATURA_TERRITORIAL','ADMIN_PROGRAMACION']) LOOP
    SELECT COUNT(*) INTO v_sin_perms
      FROM auth.role r
      JOIN auth.role_permissions rp ON rp.id_rol = r.id AND COALESCE(rp.is_active, TRUE)
      JOIN auth.permission p ON p.id_permission = rp.id_permission
     WHERE r.code = v_rol AND p.code LIKE 'programacion-academica.%';
    IF v_sin_perms = 0 THEN
      RAISE EXCEPTION '027: el rol % existe pero no resuelve NINGUN permiso del modulo', v_rol;
    END IF;
    RAISE NOTICE '027: rol % resuelve % permisos', v_rol, v_sin_perms;
  END LOOP;
END $$;
