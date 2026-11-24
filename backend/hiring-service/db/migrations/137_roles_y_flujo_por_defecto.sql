-- ============================================================================
-- 137 · Los roles y el flujo que armó Juan pasan a ser los por defecto
--
-- Juan (2026-10-28) rehízo desde las pantallas los roles del módulo y el flujo:
-- creó siete roles en la de roles, les dio alcance en Permisos por etapa y
-- activó la versión 3 del flujo con sus puestos y sus cadenas. Hasta aquí eso
-- vivía solo en su base. Juan (2026-10-29): que sea lo que trae el módulo.
--
--   1. Los siete roles, con sus permisos de contratación y sus alcances. Se
--      crean donde no estén (con el mismo id de la base de Juan); donde estén se
--      conservan su ícono y su color. Lo que tengan de más en el módulo se
--      apaga, no se borra.
--
--        Directora de Contratación      todo, configura, reparte y ve todos
--        Secretario de Contratación     ve todo, recibe en la 3.3 y reparte
--        Gestor Área Radicadora         diligencia la 3.1 y la 4.2
--        Abogado Estructurador          el caso de la etapa 5 a la 8, y 9-10
--        Abogado Revisor                aprueba 3.1, 4.2, 5.1 y 5.6.1
--        Gestor de Archivo y Supervisión  etapas 9 y 10 (la 136)
--        Experto en Análisis del Sector y del Mercado  aprueba 3.1 y 4.2
--
--   2. Los roles viejos del módulo se desactivan: los diez que Juan apagó en su
--      base y, por decisión suya, también el Estructurador Técnico, el Gestor y
--      el Revisor de Contratación. Rol, permisos, alcances y asignaciones a
--      usuarios quedan en is_active/activo = false: no se borran, y reactivarlos
--      es volver a encender esas filas. El Ente de Control sigue (consulta).
--      Ojo: quien tenga uno de esos roles en el ambiente pierde ese acceso
--      hasta que se le asigne uno de los nuevos.
--
--   3. Los puestos del proceso y las cadenas de aprobación activas, por nombre:
--      en cada ambiente nacieron con ids distintos (109, 110, 113, 128).
--
--   4. El flujo: si la versión activa no es ya la de abajo, se crea una versión
--      nueva con esas asignaciones, se activa y pasan a ella los procesos vivos,
--      igual que al activar desde la pantalla (FlujoService.activar). En la base
--      de Juan la activa ya es esta, así que no cambia nada.
--
-- Lo que NO se toca: SUPER_ADMIN, los permisos de otros módulos, el borrador
-- del flujo si lo hay, ni el rol SUPERVISOR_DEL_CONTRATO (está creado pero sin
-- nada: el supervisor no entra, 136).
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ============================================================== 1. roles --

INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active,
                       alcance, created_by, created_at, updated_at, sistema_destino)
SELECT v.id::uuid, v.code, v.name, v.description, 'sistema', 'Shield', '#003DA5', 'personalizado',
       true, '{"tipo": "Global", "cetap": "Todos", "programa": "Todos", "territorial": "Todas"}'::jsonb,
       'migracion-137', now(), now(), 'Backoffice'
FROM (VALUES
  ('5220699f-243e-4147-b71b-ab9f14b0b043', 'DIRECTORA_DE_CONTRATACION',
   'Directora De Contratación', 'Directora de contratación'),
  ('caf12ae5-d87b-432d-809d-bb6736316eb6', 'SECRETARIO_DE_CONTRATACION',
   'Secretario De Contratación', 'Encargado de asignar los procesos'),
  ('94d65eb8-30fb-47c2-bc67-f6d2d66254bb', 'AREA_RADICADORA',
   'Gestor Área Radicadora', 'Área que radica los procesos'),
  ('dd537c28-8b4e-44d9-9393-ca60e0d573bd', 'ABOGADO_ESTRUCTURADOR',
   'Abogado Estructurador', 'Líder encargado del proceso'),
  ('08fa0b9a-661f-4a89-8adb-1570e93825a9', 'ABOGADO_REVISOR',
   'Abogado Revisor', 'Revisa y aprueba los procesos'),
  ('f1f525ef-a06b-43a0-bc23-13c16e15836c', 'GESTOR_DE_ARCHIVO_Y_SUPERVISION',
   'Gestor De Archivo Y Supervisión', 'Gestión de archivos y documentación del proceso'),
  ('2cf196e3-8e5c-47dd-ba6a-37a379fe9e4d', 'EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO',
   'Experto En Análisis Del Sector Y Del Mercado', 'Experto en análisis del sector y del mercado')
) AS v(id, code, name, description)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_active = true,
       alcance = COALESCE(auth.role.alcance, EXCLUDED.alcance),
       updated_by = 'migracion-137',
       updated_at = now();

CREATE TEMP TABLE roles_137 (code varchar(60) PRIMARY KEY) ON COMMIT DROP;
INSERT INTO roles_137 VALUES
  ('DIRECTORA_DE_CONTRATACION'), ('SECRETARIO_DE_CONTRATACION'), ('AREA_RADICADORA'),
  ('ABOGADO_ESTRUCTURADOR'), ('ABOGADO_REVISOR'), ('GESTOR_DE_ARCHIVO_Y_SUPERVISION'),
  ('EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO');

-- ------------------------------------------------------------- permisos --

CREATE TEMP TABLE permisos_137 (rol varchar(60), permiso varchar(100)) ON COMMIT DROP;
INSERT INTO permisos_137 VALUES
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.ver'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.editar'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.aprobar'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.decidir'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.config.manage'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.proceso.view-all'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.proceso.assign'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.proceso.delete'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.plazo.terminar'),
  ('DIRECTORA_DE_CONTRATACION', 'contratacion.reporte.view'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.ver'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.editar'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.aprobar'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.decidir'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.proceso.view-all'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.proceso.assign'),
  ('SECRETARIO_DE_CONTRATACION', 'contratacion.reporte.view'),
  ('AREA_RADICADORA', 'contratacion.ver'),
  ('AREA_RADICADORA', 'contratacion.editar'),
  ('ABOGADO_ESTRUCTURADOR', 'contratacion.ver'),
  ('ABOGADO_ESTRUCTURADOR', 'contratacion.editar'),
  ('ABOGADO_ESTRUCTURADOR', 'contratacion.aprobar'),
  ('ABOGADO_ESTRUCTURADOR', 'contratacion.decidir'),
  ('ABOGADO_REVISOR', 'contratacion.ver'),
  ('ABOGADO_REVISOR', 'contratacion.editar'),
  ('ABOGADO_REVISOR', 'contratacion.aprobar'),
  ('ABOGADO_REVISOR', 'contratacion.decidir'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'contratacion.ver'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'contratacion.editar'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'contratacion.aprobar'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'contratacion.decidir'),
  ('EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO', 'contratacion.ver'),
  ('EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO', 'contratacion.aprobar');

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
SELECT r.id, p.id_permission, true, now(), now()
  FROM permisos_137 s
  JOIN auth.role r ON r.code = s.rol
  JOIN auth.permission p ON p.code = s.permiso
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true, updated_at = now()
 WHERE auth.role_permissions.is_active IS DISTINCT FROM true;

UPDATE auth.role_permissions rp
   SET is_active = false, updated_at = now()
  FROM auth.role r, auth.permission p
 WHERE rp.id_rol = r.id AND rp.id_permission = p.id_permission
   AND r.code IN (SELECT code FROM roles_137)
   AND p.code LIKE 'contratacion.%'
   AND rp.is_active IS DISTINCT FROM false
   AND NOT EXISTS (SELECT 1 FROM permisos_137 s WHERE s.rol = r.code AND s.permiso = p.code);

-- ------------------------------------------------------------- alcances --

CREATE TEMP TABLE alcances_137 (rol varchar(60), accion varchar(10), etapa smallint, numeral varchar(20))
  ON COMMIT DROP;
INSERT INTO alcances_137 VALUES
  ('DIRECTORA_DE_CONTRATACION',       'ver',     NULL, NULL),
  ('DIRECTORA_DE_CONTRATACION',       'editar',  NULL, NULL),
  ('DIRECTORA_DE_CONTRATACION',       'aprobar', NULL, NULL),
  ('DIRECTORA_DE_CONTRATACION',       'decidir', NULL, NULL),

  ('SECRETARIO_DE_CONTRATACION',      'ver',     NULL, NULL),
  ('SECRETARIO_DE_CONTRATACION',      'editar',  NULL, '3.1'),
  ('SECRETARIO_DE_CONTRATACION',      'editar',  NULL, '3.3'),

  ('AREA_RADICADORA',                 'ver',     NULL, NULL),
  ('AREA_RADICADORA',                 'editar',  NULL, '3.1'),
  ('AREA_RADICADORA',                 'editar',  NULL, '4.2'),

  ('ABOGADO_ESTRUCTURADOR',           'ver',     NULL, NULL),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  5,    NULL),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  6,    NULL),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  7,    NULL),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  8,    NULL),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '3.7'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '9.1'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '9.3'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '9.5'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '10.2'),
  ('ABOGADO_ESTRUCTURADOR',           'aprobar', NULL, '3.1'),
  ('ABOGADO_ESTRUCTURADOR',           'aprobar', NULL, '3.4'),
  ('ABOGADO_ESTRUCTURADOR',           'aprobar', NULL, '3.6'),
  ('ABOGADO_ESTRUCTURADOR',           'aprobar', NULL, '4.2'),
  ('ABOGADO_ESTRUCTURADOR',           'aprobar', NULL, '5.6.1'),
  ('ABOGADO_ESTRUCTURADOR',           'decidir', NULL, '6.2'),
  ('ABOGADO_ESTRUCTURADOR',           'decidir', NULL, '9.3'),

  ('ABOGADO_REVISOR',                 'ver',     NULL, NULL),
  ('ABOGADO_REVISOR',                 'aprobar', NULL, '3.1'),
  ('ABOGADO_REVISOR',                 'aprobar', NULL, '4.2'),
  ('ABOGADO_REVISOR',                 'aprobar', NULL, '5.1'),
  ('ABOGADO_REVISOR',                 'aprobar', NULL, '5.6.1'),

  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver',     8,    NULL),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver',     9,    NULL),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver',     10,   NULL),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '9.2'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '9.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '10.1'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '10.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'aprobar', NULL, '9.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'decidir', NULL, '9.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'decidir', NULL, '10.4'),

  ('EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO', 'ver',     NULL, NULL),
  ('EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO', 'aprobar', NULL, '3.1'),
  ('EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO', 'aprobar', NULL, '4.2');

UPDATE hiring.alcances_permiso ap
   SET activo = false, updated_at = now()
  FROM auth.role r
 WHERE r.id = ap.rol_id AND ap.activo
   AND r.code IN (SELECT code FROM roles_137)
   AND NOT EXISTS (
     SELECT 1 FROM alcances_137 s
      WHERE s.rol = r.code AND s.accion = ap.accion AND ap.tramite IS NULL
        AND COALESCE(s.etapa, 0) = COALESCE(ap.etapa, 0)
        AND COALESCE(s.numeral, '') = COALESCE(ap.numeral, ''));

UPDATE hiring.alcances_permiso ap
   SET confirmado = true, updated_at = now()
  FROM auth.role r, alcances_137 s
 WHERE r.id = ap.rol_id AND ap.activo AND NOT ap.confirmado
   AND s.rol = r.code AND s.accion = ap.accion AND ap.tramite IS NULL
   AND COALESCE(s.etapa, 0) = COALESCE(ap.etapa, 0)
   AND COALESCE(s.numeral, '') = COALESCE(ap.numeral, '');

INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, confirmado, created_by)
SELECT r.id, s.accion, s.etapa, s.numeral, true, 'migracion-137'
  FROM alcances_137 s
  JOIN auth.role r ON r.code = s.rol
 WHERE NOT EXISTS (
   SELECT 1 FROM hiring.alcances_permiso ap
    WHERE ap.rol_id = r.id AND ap.accion = s.accion AND ap.activo AND ap.tramite IS NULL
      AND COALESCE(ap.etapa, 0) = COALESCE(s.etapa, 0)
      AND COALESCE(ap.numeral, '') = COALESCE(s.numeral, ''));

-- ===================================================== 2. roles viejos --

CREATE TEMP TABLE viejos_137 (code varchar(60) PRIMARY KEY) ON COMMIT DROP;
INSERT INTO viejos_137 VALUES
  ('DIRECTOR_CONTRATACION'), ('ADMINISTRADOR_CONTRATACION'), ('ORDENADOR_GASTO'),
  ('SUPERVISOR_CONTRATO'), ('APOYO_SUPERVISION'), ('EVALUADOR_TECNICO'),
  ('EVALUADOR_JURIDICO'), ('EVALUADOR_FINANCIERO'), ('ARCHIVO_GESTION_DC'),
  ('ESTRUCTURADOR_FINANCIERO'), ('APROBADOR_FINANCIERO'),
  ('ESTRUCTURADOR_TECNICO'), ('GESTOR_CONTRATACION'), ('REVISOR_CONTRATACION');

UPDATE auth.role
   SET is_active = false, updated_by = 'migracion-137', updated_at = now()
 WHERE code IN (SELECT code FROM viejos_137) AND is_active IS DISTINCT FROM false;

UPDATE auth.role_permissions rp
   SET is_active = false, updated_at = now()
  FROM auth.role r
 WHERE r.id = rp.id_rol AND r.code IN (SELECT code FROM viejos_137)
   AND rp.is_active IS DISTINCT FROM false;

UPDATE auth.user_roles ur
   SET is_active = false, updated_at = now()
  FROM auth.role r
 WHERE r.id = ur.id_rol AND r.code IN (SELECT code FROM viejos_137)
   AND ur.is_active IS DISTINCT FROM false;

UPDATE hiring.alcances_permiso ap
   SET activo = false, updated_at = now()
  FROM auth.role r
 WHERE r.id = ap.rol_id AND r.code IN (SELECT code FROM viejos_137) AND ap.activo;

-- ===================================================== 3. puestos y cadenas --

INSERT INTO hiring.puestos_proceso (nombre, descripcion, obligatorio, orden, created_by)
SELECT v.nombre, v.descripcion, v.obligatorio, v.orden, 'migracion-137'
FROM (VALUES
  ('Abogado estructurador',
   'Toma el caso cuando Contratación recibe el proceso y hace las actividades que se le asignen.', true, 1),
  ('Abogado revisor',
   'Aprueba, devuelve o niega lo que se le pone a revisión.', true, 2),
  ('Revisor estudios de sector y de mercado',
   'Aprueba el estudio previo junto con el abogado estructurador.', true, 3)
) AS v(nombre, descripcion, obligatorio, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM hiring.puestos_proceso p WHERE lower(p.nombre) = lower(v.nombre) AND p.activo);

UPDATE hiring.puestos_proceso p
   SET descripcion = v.descripcion, obligatorio = v.obligatorio, orden = v.orden,
       updated_by = 'migracion-137', updated_at = now()
  FROM (VALUES
    ('abogado estructurador',
     'Toma el caso cuando Contratación recibe el proceso y hace las actividades que se le asignen.', true, 1),
    ('abogado revisor', 'Aprueba, devuelve o niega lo que se le pone a revisión.', true, 2),
    ('revisor estudios de sector y de mercado',
     'Aprueba el estudio previo junto con el abogado estructurador.', true, 3)
  ) AS v(nombre, descripcion, obligatorio, orden)
 WHERE lower(p.nombre) = v.nombre AND p.activo
   AND (p.descripcion IS DISTINCT FROM v.descripcion OR p.obligatorio <> v.obligatorio OR p.orden <> v.orden);

-- Las cadenas se escriben con el nombre del puesto en cada escalón y aquí se
-- cambia por el id que el puesto tenga en este ambiente.
CREATE TEMP TABLE cadenas_137 (nombre varchar(160), descripcion text, permite_mismo boolean, escalones jsonb)
  ON COMMIT DROP;
INSERT INTO cadenas_137 VALUES
  ('Revisión del estudio previo',
   'El abogado estructurador y el revisor de estudios de sector y de mercado, el abogado revisor y la Directora de Contratación (migración 137).',
   true,
   '[{"roles": [], "nombre": "Estructurador y revisor estudios de sector y de mercado", "papeles": [], "puestos": ["Abogado estructurador", "Revisor estudios de sector y de mercado"], "acciones": ["APROBAR"], "personas": [], "reglaDecision": "TODOS"},
     {"roles": [], "nombre": "Abogado revisor", "papeles": [], "puestos": ["Abogado revisor"], "acciones": ["APROBAR"], "personas": [], "reglaDecision": "UNO"},
     {"roles": [], "nombre": "Abogado estructurador", "papeles": [], "puestos": ["Abogado estructurador"], "acciones": ["APROBAR", "DEVOLVER"], "personas": [], "reglaDecision": "UNO"},
     {"roles": ["DIRECTORA_DE_CONTRATACION"], "nombre": "Jefe", "papeles": [], "puestos": [], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"], "personas": [], "reglaDecision": "UNO"}]'),
  ('Revisión del pliego definitivo',
   'El abogado revisor del proceso y después la Directora de Contratación, antes de la segunda sesión del Comité (migración 113).',
   true,
   '[{"roles": [], "nombre": "Abogado revisor", "papeles": [], "puestos": ["Abogado revisor"], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"], "personas": [], "reglaDecision": "UNO"},
     {"roles": ["DIRECTORA_DE_CONTRATACION"], "nombre": "Jefe", "papeles": [], "puestos": [], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"], "personas": [], "reglaDecision": "UNO"}]'),
  ('Revisión de los documentos del proceso',
   'El abogado revisor del proceso y después la Directora de Contratación revisan el aviso, el proyecto de pliego y la minuta antes de publicar (migración 128).',
   false,
   '[{"roles": [], "nombre": "Abogado revisor", "papeles": [], "puestos": ["Abogado revisor"], "acciones": ["APROBAR", "DEVOLVER"], "personas": [], "reglaDecision": "UNO"},
     {"roles": ["DIRECTORA_DE_CONTRATACION"], "nombre": "Directora", "papeles": [], "puestos": [], "acciones": ["APROBAR", "DEVOLVER"], "personas": [], "reglaDecision": "UNO"}]');

UPDATE cadenas_137 c
   SET escalones = (
     SELECT jsonb_agg(
              e || jsonb_build_object('puestos', (
                SELECT COALESCE(jsonb_agg(p.id::text ORDER BY o.n), '[]'::jsonb)
                  FROM jsonb_array_elements_text(e -> 'puestos') WITH ORDINALITY o(nombre, n)
                  JOIN hiring.puestos_proceso p ON lower(p.nombre) = lower(o.nombre) AND p.activo))
              ORDER BY i)
       FROM jsonb_array_elements(c.escalones) WITH ORDINALITY x(e, i));

UPDATE hiring.cadenas_aprobacion ca
   SET descripcion = c.descripcion, escalones = c.escalones, permite_mismo_aprobador = c.permite_mismo,
       updated_by = 'migracion-137', updated_at = now()
  FROM cadenas_137 c
 WHERE ca.nombre = c.nombre AND ca.activa
   AND (ca.escalones IS DISTINCT FROM c.escalones OR ca.descripcion IS DISTINCT FROM c.descripcion
        OR ca.permite_mismo_aprobador <> c.permite_mismo);

INSERT INTO hiring.cadenas_aprobacion (nombre, descripcion, escalones, permite_mismo_aprobador, created_by)
SELECT c.nombre, c.descripcion, c.escalones, c.permite_mismo, 'migracion-137'
  FROM cadenas_137 c
 WHERE NOT EXISTS (SELECT 1 FROM hiring.cadenas_aprobacion ca WHERE ca.nombre = c.nombre AND ca.activa);

-- ============================================================== 4. flujo --

-- La versión 3 de Juan, con el puesto y la cadena por nombre.
CREATE TEMP TABLE flujo_137 (numeral varchar(10), la_hace text, puesto text, aprobacion text, cadena text,
                             secuencia jsonb)
  ON COMMIT DROP;
INSERT INTO flujo_137 VALUES
  ('3.1',   NULL,      NULL,                    'CADENA',  'Revisión del estudio previo',    NULL),
  ('3.6',   'PUESTO',  'Abogado estructurador', NULL,      NULL,                             NULL),
  ('3.7',   'PUESTO',  'Abogado estructurador', NULL,      NULL,                             NULL),
  ('4.2',   'PERMISO', NULL,                    'CADENA',  'Revisión del estudio previo',    NULL),
  ('5.1',   'PERMISO', NULL,                    'CADENA',  'Revisión del estudio previo',    NULL),
  ('5.2',   NULL,      NULL,                    NULL,      NULL,  '{"dependeDe": ["4.2"], "noBloquea": false}'),
  ('5.4',   'PERMISO', NULL,                    'NINGUNA', NULL,  '{"dependeDe": ["5.3"], "noBloquea": true}'),
  ('5.6.1', 'PUESTO',  'Abogado estructurador', 'CADENA',  'Revisión del pliego definitivo', NULL),
  ('5.12',  NULL,      NULL,                    NULL,      NULL,  '{"dependeDe": ["5.7"], "noBloquea": false}'),
  ('5.13',  'PUESTO',  'Abogado estructurador', NULL,      NULL,                             NULL),
  ('8.8',   NULL,      NULL,                    NULL,      NULL,  '{"dependeDe": ["8.1"], "noBloquea": true}'),
  ('9.1',   NULL,      NULL,                    NULL,      NULL,  '{"dependeDe": null, "noBloquea": true}'),
  ('9.5',   NULL,      NULL,                    NULL,      NULL,  '{"dependeDe": ["8.7"], "noBloquea": true}'),
  ('10.4',  NULL,      NULL,                    NULL,      NULL,  '{"dependeDe": ["10.2"], "noBloquea": false}');

CREATE TEMP TABLE asignaciones_137 ON COMMIT DROP AS
SELECT f.numeral,
       CASE f.la_hace
         WHEN 'PERMISO' THEN jsonb_build_object('tipo', 'PERMISO')
         WHEN 'PUESTO'  THEN jsonb_build_object('tipo', 'PUESTO', 'puestoId', p.id::text)
       END AS la_hace,
       CASE f.aprobacion
         WHEN 'NINGUNA' THEN jsonb_build_object('tipo', 'NINGUNA')
         WHEN 'CADENA'  THEN jsonb_build_object('tipo', 'CADENA', 'cadenaId', c.id::text)
       END AS aprobacion,
       f.secuencia
  FROM flujo_137 f
  LEFT JOIN hiring.puestos_proceso p ON lower(p.nombre) = lower(f.puesto) AND p.activo
  LEFT JOIN LATERAL (
    SELECT id FROM hiring.cadenas_aprobacion ca
     WHERE ca.nombre = f.cadena AND ca.activa ORDER BY ca.created_at LIMIT 1) c ON true;

DO $$
DECLARE
  activa   uuid;
  nueva    uuid;
  num_de   integer;
  num_a    integer;
  distinta boolean;
  p        record;
BEGIN
  SELECT id, numero INTO activa, num_de FROM hiring.flujo_versiones WHERE estado = 'ACTIVA';

  -- Las filas sin nada (las que dejó la pantalla al volver una actividad a lo
  -- predeterminado) no cuentan para comparar.
  SELECT EXISTS (
           (SELECT numeral, la_hace, aprobacion, secuencia FROM asignaciones_137
            EXCEPT
            SELECT numeral, la_hace, aprobacion, secuencia FROM hiring.flujo_asignaciones
             WHERE version_id = activa AND modalidad IS NULL)
           UNION ALL
           (SELECT numeral, la_hace, aprobacion, secuencia FROM hiring.flujo_asignaciones
             WHERE version_id = activa
               AND (modalidad IS NOT NULL OR la_hace IS NOT NULL OR aprobacion IS NOT NULL OR secuencia IS NOT NULL)
            EXCEPT
            SELECT numeral, la_hace, aprobacion, secuencia FROM asignaciones_137))
    INTO distinta;

  IF activa IS NOT NULL AND NOT distinta THEN
    RETURN;
  END IF;

  SELECT COALESCE(max(numero), 0) + 1 INTO num_a FROM hiring.flujo_versiones;
  UPDATE hiring.flujo_versiones SET estado = 'RETIRADA', retirada_at = now() WHERE estado = 'ACTIVA';
  INSERT INTO hiring.flujo_versiones (numero, estado, nota, creada_por, activada_por, activada_at)
  VALUES (num_a, 'ACTIVA', 'El flujo por defecto del módulo (migración 137).',
          'migracion-137', 'migracion-137', now())
  RETURNING id INTO nueva;

  INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, aprobacion, secuencia, updated_by)
  SELECT nueva, numeral, NULL, la_hace, aprobacion, secuencia, 'migracion-137' FROM asignaciones_137;

  -- Los procesos vivos pasan a la nueva, como al activar desde la pantalla.
  FOR p IN
    SELECT pr.id, v.numero AS de
      FROM hiring.procesos pr LEFT JOIN hiring.flujo_versiones v ON v.id = pr.flujo_version_id
     WHERE pr.estado IN ('EN_CURSO', 'ADJUDICADO')
  LOOP
    UPDATE hiring.procesos SET flujo_version_id = nueva WHERE id = p.id;
    INSERT INTO hiring.trazabilidad (proceso_id, entidad_id, entidad, accion, detalle, usuario_nombre)
    VALUES (p.id, p.id, 'flujo_version', 'ACTUALIZAR',
            jsonb_build_object('de', p.de, 'a', num_a, 'automatico', true,
                               'motivo', 'Se activó la versión ' || num_a || ' del flujo: el flujo por defecto del módulo'),
            'migracion-137');
  END LOOP;
END $$;

COMMIT;
