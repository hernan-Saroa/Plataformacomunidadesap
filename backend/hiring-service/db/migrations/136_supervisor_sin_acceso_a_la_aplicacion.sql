-- ============================================================================
-- 136 · El supervisor no entra a la aplicación
--
-- Juan (2026-10-29): el supervisor del contrato no tiene acceso al aplicativo.
-- Lo que la 121 y la 133 le pusieron en las manos —avalar las cuentas de la
-- 9.4, registrar su trámite y hacer el informe final de la 10.1— lo registran
-- por él dos roles de Contratación, que se reparten las etapas 9 y 10:
--
--   Abogado estructurador            9.1, 9.3, 9.5 y 10.2
--   Gestor de archivo y supervisión  9.2, 9.4 (radica, carga el aval firmado
--                                    del supervisor y el trámite), 10.1 y 10.4
--   Sin cambio                       10.3 (cierre financiero)
--
-- Por eso:
--
--   · El puesto «Supervisor del contrato» se desactiva y sus ocupantes se
--     relevan. La 8.2 deja de llenarlo: el supervisor se registra con su
--     nombre, cargo y correo escritos a mano, y le sigue llegando el correo.
--   · La 9.4 deja de aprobarla ese puesto y la 10.1 deja de hacerla: sin regla,
--     las hace quien tenga el permiso. En todas las versiones del flujo, para
--     que ningún proceso en curso quede esperando a un puesto vacío.
--   · El aval firmado del supervisor es un soporte más de la cuenta de cobro.
--   · Los alcances de los dos roles, solo donde los roles existen (se crearon
--     desde la pantalla de roles, no por migración).
--   · El rol SUPERVISOR_CONTRATO pierde lo que tenía en las etapas 9 y 10.
--   · El gestor de Contratación deja de editar la 9.2, que pasa a ser solo
--     del gestor de archivo y supervisión.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- 1. El puesto.
UPDATE hiring.asignaciones_puesto a
   SET estado = 'RELEVADO', relevado_at = now(),
       motivo_relevo = 'El supervisor no entra a la aplicación (migración 136)'
  FROM hiring.puestos_proceso p
 WHERE p.id = a.puesto_id AND lower(p.nombre) = 'supervisor del contrato'
   AND a.estado = 'VIGENTE';

-- 2. El flujo: la 9.4 sin el puesto como escalón, la 10.1 sin el puesto como regla.
UPDATE hiring.flujo_asignaciones f
   SET aprobacion = NULL, updated_by = 'migracion-136', updated_at = now()
  FROM hiring.puestos_proceso p
 WHERE lower(p.nombre) = 'supervisor del contrato'
   AND f.aprobacion->>'tipo' = 'ESCALON'
   AND f.aprobacion->'puestos' @> jsonb_build_array(p.id::text)
   AND jsonb_array_length(COALESCE(f.aprobacion->'roles', '[]'::jsonb)) = 0
   AND jsonb_array_length(COALESCE(f.aprobacion->'personas', '[]'::jsonb)) = 0
   AND jsonb_array_length(f.aprobacion->'puestos') = 1;

UPDATE hiring.flujo_asignaciones f
   SET la_hace = NULL, updated_by = 'migracion-136', updated_at = now()
  FROM hiring.puestos_proceso p
 WHERE lower(p.nombre) = 'supervisor del contrato'
   AND f.la_hace->>'tipo' = 'PUESTO'
   AND f.la_hace->>'puestoId' = p.id::text;

UPDATE hiring.puestos_proceso
   SET activo = false
 WHERE lower(nombre) = 'supervisor del contrato' AND activo;

-- 3. El aval firmado del supervisor, como soporte de la cuenta.
ALTER TABLE hiring.soportes_pago DROP CONSTRAINT IF EXISTS ck_soporte_pago_tipo;
ALTER TABLE hiring.soportes_pago ADD CONSTRAINT ck_soporte_pago_tipo
  CHECK (tipo IN ('SEGURIDAD_SOCIAL', 'RUT', 'CERTIFICACION_BANCARIA', 'OTRO', 'AVAL_SUPERVISOR'));

-- 4. Los alcances del reparto.
CREATE TEMP TABLE semilla_136 (rol varchar(60), accion varchar(10), etapa smallint, numeral varchar(20))
  ON COMMIT DROP;
INSERT INTO semilla_136 VALUES
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '9.1'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '9.3'),
  ('ABOGADO_ESTRUCTURADOR',           'decidir', NULL, '9.3'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '9.5'),
  ('ABOGADO_ESTRUCTURADOR',           'editar',  NULL, '10.2'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver',     8,    NULL),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver',     9,    NULL),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver',     10,   NULL),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '9.2'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '9.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'aprobar', NULL, '9.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'decidir', NULL, '9.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '10.1'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'editar',  NULL, '10.4'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'decidir', NULL, '10.4');

INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, confirmado, created_by)
SELECT r.id, s.accion, s.etapa, s.numeral, true, 'migracion-136'
  FROM semilla_136 s
  JOIN auth.role r ON r.code = s.rol
 WHERE NOT EXISTS (
   SELECT 1 FROM hiring.alcances_permiso ap
    WHERE ap.rol_id = r.id AND ap.accion = s.accion AND ap.activo AND ap.tramite IS NULL
      AND COALESCE(ap.etapa, 0) = COALESCE(s.etapa, 0)
      AND COALESCE(ap.numeral, '') = COALESCE(s.numeral, '')
 );

-- Los alcances solo valen con el permiso base de la acción en el rol.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT DISTINCT r.id, p.id_permission, true
  FROM semilla_136 s
  JOIN auth.role r ON r.code = s.rol
  JOIN auth.permission p ON p.code = 'contratacion.' || s.accion
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

-- 5. Lo que el supervisor tenía en las etapas 9 y 10.
UPDATE hiring.alcances_permiso ap
   SET activo = false, updated_at = now()
  FROM auth.role r
 WHERE r.id = ap.rol_id AND r.code IN ('SUPERVISOR_CONTRATO', 'SUPERVISOR_DEL_CONTRATO')
   AND ap.activo
   AND (ap.etapa IN (9, 10) OR ap.numeral ~ '^(9|10)\.');

-- 6. La 9.2 es solo del gestor de archivo y supervisión: quien la edita
--    recibe las alertas de pólizas y de liquidación del contrato.
UPDATE hiring.alcances_permiso ap
   SET activo = false, updated_at = now()
  FROM auth.role r
 WHERE r.id = ap.rol_id AND r.code = 'GESTOR_CONTRATACION'
   AND ap.activo AND ap.accion = 'editar' AND ap.numeral = '9.2';

COMMIT;
