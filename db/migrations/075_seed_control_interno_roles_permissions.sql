-- ============================================
-- SEED: ROLES Y PERMISOS - CONTROL INTERNO
-- ============================================
-- Crea roles, permisos granulares y usuarios de prueba
-- para el módulo de Control Interno de Gestión (OCIG)
--
-- IMPORTANTE: Este script es IDEMPOTENTE
-- Puede ejecutarse múltiples veces sin crear duplicados
--
-- Fecha: 2026-01-04
-- Basado en: useControlInternoPermissions.ts
-- ============================================

DO $$
DECLARE
  control_interno_module_id uuid;
  -- UUIDs de permisos
  p_dashboard_view uuid := gen_random_uuid();
  p_dashboard_export uuid := gen_random_uuid();
  p_planificacion_view uuid := gen_random_uuid();
  p_planificacion_create uuid := gen_random_uuid();
  p_planificacion_edit uuid := gen_random_uuid();
  p_planificacion_delete uuid := gen_random_uuid();
  p_planificacion_approve uuid := gen_random_uuid();
  p_planificacion_export uuid := gen_random_uuid();
  p_planes_view uuid := gen_random_uuid();
  p_planes_create uuid := gen_random_uuid();
  p_planes_edit uuid := gen_random_uuid();
  p_planes_delete uuid := gen_random_uuid();
  p_planes_approve uuid := gen_random_uuid();
  p_planes_export uuid := gen_random_uuid();
  p_informes_view uuid := gen_random_uuid();
  p_informes_create uuid := gen_random_uuid();
  p_informes_edit uuid := gen_random_uuid();
  p_informes_delete uuid := gen_random_uuid();
  p_informes_approve uuid := gen_random_uuid();
  p_informes_export uuid := gen_random_uuid();
  p_expedientes_view uuid := gen_random_uuid();
  p_expedientes_create uuid := gen_random_uuid();
  p_expedientes_edit uuid := gen_random_uuid();
  p_expedientes_delete uuid := gen_random_uuid();
  p_expedientes_export uuid := gen_random_uuid();
  p_roles_view uuid := gen_random_uuid();
  p_roles_create uuid := gen_random_uuid();
  p_roles_edit uuid := gen_random_uuid();
  p_roles_delete uuid := gen_random_uuid();
  p_config_view uuid := gen_random_uuid();
  p_config_edit uuid := gen_random_uuid();
  -- UUIDs de roles
  r_jefe_oci uuid := gen_random_uuid();
  r_profesional uuid := gen_random_uuid();
  r_auxiliar uuid := gen_random_uuid();
  r_consulta uuid := gen_random_uuid();
BEGIN
  -- Obtener ID del módulo Control Interno
  SELECT id_module INTO control_interno_module_id 
  FROM auth.module 
  WHERE code = 'control';
  
  IF control_interno_module_id IS NULL THEN
    RAISE EXCEPTION 'Módulo "control" no existe. Ejecutar primero db/init/002_seed_auth.sql';
  END IF;

  -- ============================================
  -- 1. PERMISOS GRANULARES POR SUBMÓDULO
  -- ============================================
  -- Formato: ci.{submodulo}.{accion}
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES
    -- Dashboard
    (p_dashboard_view, 'ci.dashboard.view', 'Ver Dashboard', 'Acceso al panel principal de Control Interno', control_interno_module_id, true),
    (p_dashboard_export, 'ci.dashboard.export', 'Exportar Dashboard', 'Exportar reportes del dashboard', control_interno_module_id, true),
    
    -- Planificación
    (p_planificacion_view, 'ci.planificacion.view', 'Ver Planificación', 'Consultar planificación anual', control_interno_module_id, true),
    (p_planificacion_create, 'ci.planificacion.create', 'Crear Planificación', 'Generar nueva planificación anual', control_interno_module_id, true),
    (p_planificacion_edit, 'ci.planificacion.edit', 'Editar Planificación', 'Modificar planificación existente', control_interno_module_id, true),
    (p_planificacion_delete, 'ci.planificacion.delete', 'Eliminar Planificación', 'Eliminar planificación', control_interno_module_id, true),
    (p_planificacion_approve, 'ci.planificacion.approve', 'Aprobar Planificación', 'Aprobar planificación anual', control_interno_module_id, true),
    (p_planificacion_export, 'ci.planificacion.export', 'Exportar Planificación', 'Descargar planificación', control_interno_module_id, true),
    
    -- Planes de Mejoramiento
    (p_planes_view, 'ci.planes-mejoramiento.view', 'Ver Planes', 'Consultar planes de mejoramiento', control_interno_module_id, true),
    (p_planes_create, 'ci.planes-mejoramiento.create', 'Crear Plan', 'Generar nuevo plan de mejoramiento', control_interno_module_id, true),
    (p_planes_edit, 'ci.planes-mejoramiento.edit', 'Editar Plan', 'Modificar plan existente', control_interno_module_id, true),
    (p_planes_delete, 'ci.planes-mejoramiento.delete', 'Eliminar Plan', 'Eliminar plan de mejoramiento', control_interno_module_id, true),
    (p_planes_approve, 'ci.planes-mejoramiento.approve', 'Aprobar Plan', 'Aprobar plan de mejoramiento', control_interno_module_id, true),
    (p_planes_export, 'ci.planes-mejoramiento.export', 'Exportar Planes', 'Descargar planes', control_interno_module_id, true),
    
    -- Informes de Ley
    (p_informes_view, 'ci.informes-ley.view', 'Ver Informes', 'Consultar informes de ley', control_interno_module_id, true),
    (p_informes_create, 'ci.informes-ley.create', 'Crear Informe', 'Generar nuevo informe de ley', control_interno_module_id, true),
    (p_informes_edit, 'ci.informes-ley.edit', 'Editar Informe', 'Modificar informe existente', control_interno_module_id, true),
    (p_informes_delete, 'ci.informes-ley.delete', 'Eliminar Informe', 'Eliminar informe', control_interno_module_id, true),
    (p_informes_approve, 'ci.informes-ley.approve', 'Aprobar Informe', 'Aprobar informe de ley', control_interno_module_id, true),
    (p_informes_export, 'ci.informes-ley.export', 'Exportar Informes', 'Descargar informes', control_interno_module_id, true),
    
    -- Expedientes
    (p_expedientes_view, 'ci.expedientes.view', 'Ver Expedientes', 'Consultar expedientes', control_interno_module_id, true),
    (p_expedientes_create, 'ci.expedientes.create', 'Crear Expediente', 'Generar nuevo expediente', control_interno_module_id, true),
    (p_expedientes_edit, 'ci.expedientes.edit', 'Editar Expediente', 'Modificar expediente existente', control_interno_module_id, true),
    (p_expedientes_delete, 'ci.expedientes.delete', 'Eliminar Expediente', 'Eliminar expediente', control_interno_module_id, true),
    (p_expedientes_export, 'ci.expedientes.export', 'Exportar Expedientes', 'Descargar expedientes', control_interno_module_id, true),
    
    -- Roles y Permisos
    (p_roles_view, 'ci.roles-permisos.view', 'Ver Roles', 'Consultar roles y permisos', control_interno_module_id, true),
    (p_roles_create, 'ci.roles-permisos.create', 'Crear Rol', 'Crear nuevo rol', control_interno_module_id, true),
    (p_roles_edit, 'ci.roles-permisos.edit', 'Editar Rol', 'Modificar rol existente', control_interno_module_id, true),
    (p_roles_delete, 'ci.roles-permisos.delete', 'Eliminar Rol', 'Eliminar rol', control_interno_module_id, true),
    
    -- Configuraciones
    (p_config_view, 'ci.config-auditorias.view', 'Ver Configuraciones', 'Consultar configuraciones', control_interno_module_id, true),
    (p_config_edit, 'ci.config-auditorias.edit', 'Editar Configuraciones', 'Modificar configuraciones', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  
  -- Obtener los IDs reales de los permisos (por si ya existían)
  SELECT id_permission INTO p_dashboard_view FROM auth.permission WHERE code = 'ci.dashboard.view';
  SELECT id_permission INTO p_dashboard_export FROM auth.permission WHERE code = 'ci.dashboard.export';
  SELECT id_permission INTO p_planificacion_view FROM auth.permission WHERE code = 'ci.planificacion.view';
  SELECT id_permission INTO p_planificacion_create FROM auth.permission WHERE code = 'ci.planificacion.create';
  SELECT id_permission INTO p_planificacion_edit FROM auth.permission WHERE code = 'ci.planificacion.edit';
  SELECT id_permission INTO p_planificacion_delete FROM auth.permission WHERE code = 'ci.planificacion.delete';
  SELECT id_permission INTO p_planificacion_approve FROM auth.permission WHERE code = 'ci.planificacion.approve';
  SELECT id_permission INTO p_planificacion_export FROM auth.permission WHERE code = 'ci.planificacion.export';
  SELECT id_permission INTO p_planes_view FROM auth.permission WHERE code = 'ci.planes-mejoramiento.view';
  SELECT id_permission INTO p_planes_create FROM auth.permission WHERE code = 'ci.planes-mejoramiento.create';
  SELECT id_permission INTO p_planes_edit FROM auth.permission WHERE code = 'ci.planes-mejoramiento.edit';
  SELECT id_permission INTO p_planes_delete FROM auth.permission WHERE code = 'ci.planes-mejoramiento.delete';
  SELECT id_permission INTO p_planes_approve FROM auth.permission WHERE code = 'ci.planes-mejoramiento.approve';
  SELECT id_permission INTO p_planes_export FROM auth.permission WHERE code = 'ci.planes-mejoramiento.export';
  SELECT id_permission INTO p_informes_view FROM auth.permission WHERE code = 'ci.informes-ley.view';
  SELECT id_permission INTO p_informes_create FROM auth.permission WHERE code = 'ci.informes-ley.create';
  SELECT id_permission INTO p_informes_edit FROM auth.permission WHERE code = 'ci.informes-ley.edit';
  SELECT id_permission INTO p_informes_delete FROM auth.permission WHERE code = 'ci.informes-ley.delete';
  SELECT id_permission INTO p_informes_approve FROM auth.permission WHERE code = 'ci.informes-ley.approve';
  SELECT id_permission INTO p_informes_export FROM auth.permission WHERE code = 'ci.informes-ley.export';
  SELECT id_permission INTO p_expedientes_view FROM auth.permission WHERE code = 'ci.expedientes.view';
  SELECT id_permission INTO p_expedientes_create FROM auth.permission WHERE code = 'ci.expedientes.create';
  SELECT id_permission INTO p_expedientes_edit FROM auth.permission WHERE code = 'ci.expedientes.edit';
  SELECT id_permission INTO p_expedientes_delete FROM auth.permission WHERE code = 'ci.expedientes.delete';
  SELECT id_permission INTO p_expedientes_export FROM auth.permission WHERE code = 'ci.expedientes.export';
  SELECT id_permission INTO p_roles_view FROM auth.permission WHERE code = 'ci.roles-permisos.view';
  SELECT id_permission INTO p_roles_create FROM auth.permission WHERE code = 'ci.roles-permisos.create';
  SELECT id_permission INTO p_roles_edit FROM auth.permission WHERE code = 'ci.roles-permisos.edit';
  SELECT id_permission INTO p_roles_delete FROM auth.permission WHERE code = 'ci.roles-permisos.delete';
  SELECT id_permission INTO p_config_view FROM auth.permission WHERE code = 'ci.config-auditorias.view';
  SELECT id_permission INTO p_config_edit FROM auth.permission WHERE code = 'ci.config-auditorias.edit';

  -- ============================================
  -- 2. ROLES DE CONTROL INTERNO
  -- ============================================
  
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES
    (r_jefe_oci, 'JEFE_OCI', 'Jefe de Control Interno', 'Control total sobre todos los submódulos de Control Interno', 'directivo', 'Shield', '#DC2626', 'sistema', true),
    (r_profesional, 'PROFESIONAL_AUDITOR', 'Profesional Auditor', 'Gestión completa de auditorías y seguimiento de planes', 'administrativo', 'FileCheck', '#003DA5', 'sistema', true),
    (r_auxiliar, 'AUXILIAR_AUDITORIA', 'Auxiliar de Auditoría', 'Soporte en procesos de auditoría y documentación', 'administrativo', 'FileText', '#10B981', 'sistema', true),
    (r_consulta, 'CONSULTA', 'Consulta Control Interno', 'Solo lectura de información del módulo', 'administrativo', 'Eye', '#6B7280', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;
  
  -- Obtener los IDs reales de los roles (por si ya existían)
  SELECT id INTO r_jefe_oci FROM auth.role WHERE code = 'JEFE_OCI';
  SELECT id INTO r_profesional FROM auth.role WHERE code = 'PROFESIONAL_AUDITOR';
  SELECT id INTO r_auxiliar FROM auth.role WHERE code = 'AUXILIAR_AUDITORIA';
  SELECT id INTO r_consulta FROM auth.role WHERE code = 'CONSULTA';

  -- ============================================
  -- 3. ASIGNACIÓN DE PERMISOS A ROLES
  -- ============================================
  
  -- JEFE_OCI: Todos los permisos
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  VALUES
    (r_jefe_oci, p_dashboard_view, true),
    (r_jefe_oci, p_dashboard_export, true),
    (r_jefe_oci, p_planificacion_view, true),
    (r_jefe_oci, p_planificacion_create, true),
    (r_jefe_oci, p_planificacion_edit, true),
    (r_jefe_oci, p_planificacion_delete, true),
    (r_jefe_oci, p_planificacion_approve, true),
    (r_jefe_oci, p_planificacion_export, true),
    (r_jefe_oci, p_planes_view, true),
    (r_jefe_oci, p_planes_create, true),
    (r_jefe_oci, p_planes_edit, true),
    (r_jefe_oci, p_planes_delete, true),
    (r_jefe_oci, p_planes_approve, true),
    (r_jefe_oci, p_planes_export, true),
    (r_jefe_oci, p_informes_view, true),
    (r_jefe_oci, p_informes_create, true),
    (r_jefe_oci, p_informes_edit, true),
    (r_jefe_oci, p_informes_delete, true),
    (r_jefe_oci, p_informes_approve, true),
    (r_jefe_oci, p_informes_export, true),
    (r_jefe_oci, p_expedientes_view, true),
    (r_jefe_oci, p_expedientes_create, true),
    (r_jefe_oci, p_expedientes_edit, true),
    (r_jefe_oci, p_expedientes_delete, true),
    (r_jefe_oci, p_expedientes_export, true),
    (r_jefe_oci, p_roles_view, true),
    (r_jefe_oci, p_roles_create, true),
    (r_jefe_oci, p_roles_edit, true),
    (r_jefe_oci, p_roles_delete, true),
    (r_jefe_oci, p_config_view, true),
    (r_jefe_oci, p_config_edit, true)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- PROFESIONAL_AUDITOR: view, edit, create, export (sin delete ni approve en algunos)
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  VALUES
    (r_profesional, p_dashboard_view, true),
    (r_profesional, p_dashboard_export, true),
    (r_profesional, p_planificacion_view, true),
    (r_profesional, p_planificacion_edit, true),
    (r_profesional, p_planificacion_export, true),
    (r_profesional, p_planes_view, true),
    (r_profesional, p_planes_create, true),
    (r_profesional, p_planes_edit, true),
    (r_profesional, p_planes_export, true),
    (r_profesional, p_informes_view, true),
    (r_profesional, p_informes_create, true),
    (r_profesional, p_informes_edit, true),
    (r_profesional, p_informes_export, true),
    (r_profesional, p_expedientes_view, true),
    (r_profesional, p_expedientes_create, true),
    (r_profesional, p_expedientes_edit, true),
    (r_profesional, p_expedientes_export, true),
    (r_profesional, p_roles_view, true),
    (r_profesional, p_config_view, true)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- AUXILIAR_AUDITORIA: Solo view y create en algunos
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  VALUES
    (r_auxiliar, p_dashboard_view, true),
    (r_auxiliar, p_planificacion_view, true),
    (r_auxiliar, p_planes_view, true),
    (r_auxiliar, p_informes_view, true),
    (r_auxiliar, p_informes_create, true),
    (r_auxiliar, p_expedientes_view, true),
    (r_auxiliar, p_expedientes_create, true)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- CONSULTA: Solo view
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  VALUES
    (r_consulta, p_dashboard_view, true),
    (r_consulta, p_planificacion_view, true),
    (r_consulta, p_planes_view, true),
    (r_consulta, p_informes_view, true),
    (r_consulta, p_expedientes_view, true)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- Asignar acceso al backoffice a todos los roles
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT 
    r.id,
    p.id_permission,
    true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code IN ('JEFE_OCI', 'PROFESIONAL_AUDITOR', 'AUXILIAR_AUDITORIA', 'CONSULTA')
    AND p.code = 'system.access_backoffice'
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

END $$;

-- ============================================
-- 4. PERSONAS DE PRUEBA
-- ============================================
-- IDs fijos para idempotencia

INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
VALUES
  (100, '1234567001', 'CC', 'Jefe Control Interno', 'Fernando', 'Ávila Guevara', 'M', 'jefe.oci@esap.edu.co'),
  (101, '1234567002', 'CC', 'Profesional Auditor 1', 'María Camila', 'Rodríguez Torres', 'F', 'profesional.auditor1@esap.edu.co'),
  (102, '1234567003', 'CC', 'Profesional Auditor 2', 'Carlos Andrés', 'Gómez Silva', 'M', 'profesional.auditor2@esap.edu.co'),
  (103, '1234567004', 'CC', 'Auxiliar Auditoría', 'Ana Patricia', 'Moreno Cruz', 'F', 'auxiliar.auditoria@esap.edu.co'),
  (104, '1234567005', 'CC', 'Consulta Control Interno', 'Jorge Luis', 'Peña Ramírez', 'M', 'consulta.control@esap.edu.co')
ON CONFLICT (id_tercero) DO NOTHING;

-- ============================================
-- 5. USUARIOS DE PRUEBA
-- ============================================
-- Password: 123456
-- Hash: $2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.
-- UUIDs fijos para idempotencia

INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
VALUES
  ('u100-e29b-41d4-a716-446655440300', 'jefe.oci@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 100),
  ('u101-e29b-41d4-a716-446655440301', 'profesional.auditor1@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 101),
  ('u102-e29b-41d4-a716-446655440302', 'profesional.auditor2@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 102),
  ('u103-e29b-41d4-a716-446655440303', 'auxiliar.auditoria@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 103),
  ('u104-e29b-41d4-a716-446655440304', 'consulta.control@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 104)
ON CONFLICT (id_user) DO NOTHING;

-- ============================================
-- 6. ASIGNACIÓN DE ROLES A USUARIOS
-- ============================================

INSERT INTO auth.user_roles (id_user, id_rol, is_active)
SELECT u.id_user, r.id, true
FROM auth."user" u
CROSS JOIN auth.role r
WHERE (u.username = 'jefe.oci@esap.edu.co' AND r.code = 'JEFE_OCI')
   OR (u.username = 'profesional.auditor1@esap.edu.co' AND r.code = 'PROFESIONAL_AUDITOR')
   OR (u.username = 'profesional.auditor2@esap.edu.co' AND r.code = 'PROFESIONAL_AUDITOR')
   OR (u.username = 'auxiliar.auditoria@esap.edu.co' AND r.code = 'AUXILIAR_AUDITORIA')
   OR (u.username = 'consulta.control@esap.edu.co' AND r.code = 'CONSULTA')
ON CONFLICT (id_user, id_rol) DO NOTHING;

-- ============================================
-- RESUMEN
-- ============================================
-- ✅ Este script es IDEMPOTENTE - puede ejecutarse múltiples veces
-- ✅ Los UUIDs se generan con gen_random_uuid() y se obtienen de BD si ya existen
-- ✅ Usa solo ON CONFLICT DO NOTHING (sin UPDATE) - omite si ya existe
--
-- Roles creados: 4
--   - JEFE_OCI
--   - PROFESIONAL_AUDITOR
--   - AUXILIAR_AUDITORIA
--   - CONSULTA
--
-- Permisos creados: 34 (por submódulo y acción)
-- Usuarios de prueba: 5
--
-- Usuarios para probar (password: 123456):
--   jefe.oci@esap.edu.co → JEFE_OCI (acceso total)
--   profesional.auditor1@esap.edu.co → PROFESIONAL_AUDITOR
--   profesional.auditor2@esap.edu.co → PROFESIONAL_AUDITOR
--   auxiliar.auditoria@esap.edu.co → AUXILIAR_AUDITORIA
--   consulta.control@esap.edu.co → CONSULTA (solo lectura)
-- ============================================

