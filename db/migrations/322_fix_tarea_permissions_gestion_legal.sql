-- MIGRATION 322: Corrige permisos de tareas en Gestión Legal
--
-- Contexto: La migración 210 dejó dos inconsistencias:
--   1. RESUELVE_GESTION_LEGAL tenía tarea.create pero no debería.
--      El rol RESUELVE solo ejecuta tareas asignadas; crearlas es responsabilidad del JEFE/SECRETARIADO.
--   2. SECRETARIADO_GESTION_LEGAL no tenía tarea.complete pero sí debería.
--      El secretariado hace seguimiento y debe poder cerrar tareas.
--
-- Resultado esperado:
--   JEFE_GESTION_LEGAL       → tarea.create ✓  tarea.edit ✓  tarea.complete ✓  (sin cambio, ya tiene todo)
--   SECRETARIADO_GESTION_LEGAL → tarea.create ✓  tarea.edit ✓  tarea.complete ✓  (se agrega complete)
--   RESUELVE_GESTION_LEGAL   → tarea.create ✗  tarea.edit ✗  tarea.complete ✓  (se quita create)
--   MONITOREO_GESTION_LEGAL  → sin cambio (solo lectura)

BEGIN;

DO $$
DECLARE
  v_resuelve_id      uuid;
  v_secretariado_id  uuid;
  v_perm_create_id   uuid;
  v_perm_complete_id uuid;
BEGIN

  -- Obtener IDs de roles
  SELECT id INTO v_resuelve_id
    FROM auth.role WHERE code = 'RESUELVE_GESTION_LEGAL';

  SELECT id INTO v_secretariado_id
    FROM auth.role WHERE code = 'SECRETARIADO_GESTION_LEGAL';

  -- Obtener IDs de permisos
  SELECT id_permission INTO v_perm_create_id
    FROM auth.permission
    WHERE code = 'gestion-legal.defensa-judicial.expediente.tarea.create';

  SELECT id_permission INTO v_perm_complete_id
    FROM auth.permission
    WHERE code = 'gestion-legal.defensa-judicial.expediente.tarea.complete';

  -- ================================================================
  -- 1. Quitar tarea.create de RESUELVE_GESTION_LEGAL
  -- ================================================================
  IF v_resuelve_id IS NULL THEN
    RAISE NOTICE '[322] Rol RESUELVE_GESTION_LEGAL no encontrado, se omite paso 1.';
  ELSIF v_perm_create_id IS NULL THEN
    RAISE NOTICE '[322] Permiso tarea.create no encontrado, se omite paso 1.';
  ELSE
    DELETE FROM auth.role_permissions
    WHERE id_rol = v_resuelve_id
      AND id_permission = v_perm_create_id;

    RAISE NOTICE '[322] tarea.create eliminado de RESUELVE_GESTION_LEGAL (% filas).', found::int;
  END IF;

  -- ================================================================
  -- 2. Agregar tarea.complete a SECRETARIADO_GESTION_LEGAL
  -- ================================================================
  IF v_secretariado_id IS NULL THEN
    RAISE NOTICE '[322] Rol SECRETARIADO_GESTION_LEGAL no encontrado, se omite paso 2.';
  ELSIF v_perm_complete_id IS NULL THEN
    RAISE NOTICE '[322] Permiso tarea.complete no encontrado, se omite paso 2.';
  ELSE
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
    VALUES (v_secretariado_id, v_perm_complete_id, true, NOW(), NOW())
    ON CONFLICT (id_rol, id_permission) DO UPDATE
      SET is_active  = true,
          updated_at = NOW();

    RAISE NOTICE '[322] tarea.complete asignado a SECRETARIADO_GESTION_LEGAL.';
  END IF;

END $$;

COMMIT;
