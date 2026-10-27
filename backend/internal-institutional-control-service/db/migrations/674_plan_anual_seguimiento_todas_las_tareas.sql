-- ============================================================
-- Migración 674: seguimiento de todas las tareas del Plan Anual (EFDS-2376)
-- ============================================================
-- En Plan Anual → Seguimiento → Roles y Actividades solo el responsable de
-- una tarea la completa, le registra el seguimiento y le carga evidencias
-- (EFDS-2322). Este permiso deja hacerlo sobre las tareas de cualquier
-- responsable; se asigna al Jefe de la Oficina de Control Interno. Los
-- auditores no lo tienen y siguen limitados a sus propias tareas.
-- Se puede quitar o dar a otros roles desde Roles y Permisos.
-- ============================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'control-interno';

  IF v_module_id IS NULL THEN
    RAISE NOTICE 'El módulo "control-interno" no fue encontrado en auth.module. Omitiendo inserción.';
    RETURN;
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'control-interno.plan-anual.follow-up.all',
    'Seguimiento de todas las tareas del Plan Anual',
    'Permite completar, registrar el seguimiento y cargar evidencias de las tareas de cualquier responsable en Roles y Actividades',
    v_module_id, true, NOW(), NOW()
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

  -- Jefe OCI (y administradores)
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT DISTINCT r.id, p.id_permission
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE p.code = 'control-interno.plan-anual.follow-up.all'
    AND (
      r.code IN ('JEFE_OCI', 'jefe-oci', 'JEFE_CONTROL_INTERNO', 'SUPER_ADMIN', 'ADMIN')
      OR r.name ILIKE 'Jefe%Oficina%Control Interno%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp2
      WHERE rp2.id_rol = r.id AND rp2.id_permission = p.id_permission
    );

  RAISE NOTICE 'Permiso control-interno.plan-anual.follow-up.all creado y asignado al Jefe OCI (EFDS-2376)';
END $$;
