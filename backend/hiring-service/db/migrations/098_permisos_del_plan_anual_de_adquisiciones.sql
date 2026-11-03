-- ============================================================================
-- 098 · Quién administra el PAA y quién decide sobre sus cambios
--
-- Dos trámites nuevos en el modelo de alcances, con las mismas cuatro
-- acciones de siempre:
--
--   PAA     ver      consultar regiones, vigencias, versiones, diferencias y
--                    los procesos que un cambio tocaría
--           editar   regiones, vigencias, cargar archivos, campos del formulario
--           aprobar  activar o descartar una versión y declarar vigente un año
--   PAA.R   ver      consultar las revisiones abiertas por un cambio
--           decidir  continuar, devolver o cancelar un proceso afectado
--           aprobar  autorizar la migración de un proceso a otra vigencia
--
-- Separados porque quien carga el Excel no es quien decide si un proceso
-- sigue: lo primero es de la Dirección, lo segundo del abogado del proceso.
--
-- Las filas quedan con `confirmado = false`: es la propuesta inicial y la
-- confirma la Dirección desde «Permisos por etapa».
-- ============================================================================

BEGIN;

ALTER TABLE hiring.alcances_permiso
  DROP CONSTRAINT IF EXISTS ck_alcance_tramite;

ALTER TABLE hiring.alcances_permiso
  ADD CONSTRAINT ck_alcance_tramite
  CHECK (tramite IS NULL OR tramite IN ('INC.1', 'INC.2', 'PAA', 'PAA.R'));

INSERT INTO hiring.alcances_permiso (rol_id, accion, tramite, created_by)
SELECT r.id, v.accion, v.tramite, 'migracion-098'
FROM (VALUES
  ('DIRECTOR_CONTRATACION',      'ver',     'PAA'),
  ('DIRECTOR_CONTRATACION',      'editar',  'PAA'),
  ('DIRECTOR_CONTRATACION',      'aprobar', 'PAA'),
  ('DIRECTOR_CONTRATACION',      'ver',     'PAA.R'),
  ('DIRECTOR_CONTRATACION',      'aprobar', 'PAA.R'),
  ('ADMINISTRADOR_CONTRATACION', 'ver',     'PAA'),
  ('ADMINISTRADOR_CONTRATACION', 'editar',  'PAA'),
  ('ADMINISTRADOR_CONTRATACION', 'aprobar', 'PAA'),
  ('GESTOR_CONTRATACION',        'ver',     'PAA'),
  ('GESTOR_CONTRATACION',        'ver',     'PAA.R'),
  ('REVISOR_CONTRATACION',       'ver',     'PAA'),
  ('REVISOR_CONTRATACION',       'ver',     'PAA.R'),
  ('REVISOR_CONTRATACION',       'decidir', 'PAA.R')
) AS v(rol, accion, tramite)
JOIN auth.role r ON r.code = v.rol
ON CONFLICT DO NOTHING;

-- El permiso de la acción acompaña al alcance, como en la 083 y la 092.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT DISTINCT a.rol_id, p.id_permission, true
  FROM hiring.alcances_permiso a
  JOIN auth.permission p ON p.code = 'contratacion.' || a.accion
 WHERE a.activo
   AND a.created_by = 'migracion-098'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

COMMIT;
