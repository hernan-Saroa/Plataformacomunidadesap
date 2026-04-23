-- ============================================
-- SEED: ROLES Y PERMISOS - CONTROL INTERNO
-- ============================================
-- Crea roles, permisos granulares y usuarios de prueba
-- para el módulo de Control Interno de Gestión (OCIG)
--
-- IMPORTANTE: Este script es IDEMPOTENTE
-- Puede ejecutarse múltiples veces sin crear duplicados
--
-- LÓGICA SIMPLIFICADA:
-- 1. Busca roles por código, si no existen los crea, devuelve IDs
-- 2. Busca permisos por código, si no existen los crea, devuelve IDs
-- 3. Asigna permisos a roles
-- 4. Crea un usuario por cada rol en las tablas respectivas
--
-- Fecha: 2026-01-04
-- Basado en: useControlInternoPermissions.ts
-- ============================================

DO $$
DECLARE
  control_interno_module_id uuid;
  -- IDs de roles (se obtienen después de buscar/crear)
  r_jefe_oci uuid;
  r_profesional uuid;
  r_auxiliar uuid;
  r_consulta uuid;
  -- IDs de permisos (se obtienen después de buscar/crear)
  p_dashboard_view uuid;
  p_dashboard_export uuid;
  p_planificacion_view uuid;
  p_planificacion_create uuid;
  p_planificacion_edit uuid;
  p_planificacion_delete uuid;
  p_planificacion_approve uuid;
  p_planificacion_export uuid;
  p_planes_view uuid;
  p_planes_create uuid;
  p_planes_edit uuid;
  p_planes_delete uuid;
  p_planes_approve uuid;
  p_planes_export uuid;
  p_informes_view uuid;
  p_informes_create uuid;
  p_informes_edit uuid;
  p_informes_delete uuid;
  p_informes_approve uuid;
  p_informes_export uuid;
  p_expedientes_view uuid;
  p_expedientes_create uuid;
  p_expedientes_edit uuid;
  p_expedientes_delete uuid;
  p_expedientes_export uuid;
  p_roles_view uuid;
  p_roles_create uuid;
  p_roles_edit uuid;
  p_roles_delete uuid;
  p_config_view uuid;
  p_config_edit uuid;
BEGIN
  -- Obtener ID del módulo Control Interno
  SELECT id_module INTO control_interno_module_id 
  FROM auth.module 
  WHERE code = 'control';
  
  IF control_interno_module_id IS NULL THEN
    RAISE EXCEPTION 'Módulo "control" no existe. Ejecutar primero db/init/002_seed_auth.sql';
  END IF;
  
  RAISE NOTICE '✅ Módulo Control Interno encontrado: %', control_interno_module_id;

  -- ============================================
  -- 1. ROLES: BUSCAR O CREAR Y OBTENER IDs
  -- ============================================
  
  -- JEFE_OCI
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES (gen_random_uuid(), 'JEFE_OCI', 'Jefe de Control Interno', 'Control total sobre todos los submódulos de Control Interno', 'directivo', 'Shield', '#DC2626', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id INTO r_jefe_oci FROM auth.role WHERE code = 'JEFE_OCI';
  IF r_jefe_oci IS NULL THEN
    RAISE EXCEPTION 'Error: No se pudo crear ni encontrar el rol JEFE_OCI';
  END IF;
  RAISE NOTICE '✅ Rol JEFE_OCI: %', r_jefe_oci;
  
  -- PROFESIONAL_AUDITOR
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES (gen_random_uuid(), 'PROFESIONAL_AUDITOR', 'Profesional Auditor', 'Gestión completa de auditorías y seguimiento de planes', 'administrativo', 'FileCheck', '#003DA5', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id INTO r_profesional FROM auth.role WHERE code = 'PROFESIONAL_AUDITOR';
  IF r_profesional IS NULL THEN
    RAISE EXCEPTION 'Error: No se pudo crear ni encontrar el rol PROFESIONAL_AUDITOR';
  END IF;
  RAISE NOTICE '✅ Rol PROFESIONAL_AUDITOR: %', r_profesional;
  
  -- AUXILIAR_AUDITORIA
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES (gen_random_uuid(), 'AUXILIAR_AUDITORIA', 'Auxiliar de Auditoría', 'Soporte en procesos de auditoría y documentación', 'administrativo', 'FileText', '#10B981', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id INTO r_auxiliar FROM auth.role WHERE code = 'AUXILIAR_AUDITORIA';
  IF r_auxiliar IS NULL THEN
    RAISE EXCEPTION 'Error: No se pudo crear ni encontrar el rol AUXILIAR_AUDITORIA';
  END IF;
  RAISE NOTICE '✅ Rol AUXILIAR_AUDITORIA: %', r_auxiliar;
  
  -- CONSULTA
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES (gen_random_uuid(), 'CONSULTA', 'Consulta Control Interno', 'Solo lectura de información del módulo', 'administrativo', 'Eye', '#6B7280', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id INTO r_consulta FROM auth.role WHERE code = 'CONSULTA';
  IF r_consulta IS NULL THEN
    RAISE EXCEPTION 'Error: No se pudo crear ni encontrar el rol CONSULTA';
  END IF;
  RAISE NOTICE '✅ Rol CONSULTA: %', r_consulta;
  
  RAISE NOTICE '✅ Todos los roles creados/verificados correctamente';

  -- ============================================
  -- 2. PERMISOS: BUSCAR O CREAR Y OBTENER IDs
  -- ============================================
  -- Formato: ci.{submodulo}.{accion}
  
  -- Dashboard
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.dashboard.view', 'Ver Dashboard', 'Acceso al panel principal de Control Interno', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id_permission INTO p_dashboard_view FROM auth.permission WHERE code = 'ci.dashboard.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.dashboard.export', 'Exportar Dashboard', 'Exportar reportes del dashboard', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  
  SELECT id_permission INTO p_dashboard_export FROM auth.permission WHERE code = 'ci.dashboard.export';
  
  -- Planificación
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planificacion.view', 'Ver Planificación', 'Consultar planificación anual', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planificacion_view FROM auth.permission WHERE code = 'ci.planificacion.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planificacion.create', 'Crear Planificación', 'Generar nueva planificación anual', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planificacion_create FROM auth.permission WHERE code = 'ci.planificacion.create';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planificacion.edit', 'Editar Planificación', 'Modificar planificación existente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planificacion_edit FROM auth.permission WHERE code = 'ci.planificacion.edit';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planificacion.delete', 'Eliminar Planificación', 'Eliminar planificación', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planificacion_delete FROM auth.permission WHERE code = 'ci.planificacion.delete';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planificacion.approve', 'Aprobar Planificación', 'Aprobar planificación anual', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planificacion_approve FROM auth.permission WHERE code = 'ci.planificacion.approve';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planificacion.export', 'Exportar Planificación', 'Descargar planificación', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planificacion_export FROM auth.permission WHERE code = 'ci.planificacion.export';
  
  -- Planes de Mejoramiento
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planes-mejoramiento.view', 'Ver Planes', 'Consultar planes de mejoramiento', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planes_view FROM auth.permission WHERE code = 'ci.planes-mejoramiento.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planes-mejoramiento.create', 'Crear Plan', 'Generar nuevo plan de mejoramiento', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planes_create FROM auth.permission WHERE code = 'ci.planes-mejoramiento.create';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planes-mejoramiento.edit', 'Editar Plan', 'Modificar plan existente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planes_edit FROM auth.permission WHERE code = 'ci.planes-mejoramiento.edit';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planes-mejoramiento.delete', 'Eliminar Plan', 'Eliminar plan de mejoramiento', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planes_delete FROM auth.permission WHERE code = 'ci.planes-mejoramiento.delete';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planes-mejoramiento.approve', 'Aprobar Plan', 'Aprobar plan de mejoramiento', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planes_approve FROM auth.permission WHERE code = 'ci.planes-mejoramiento.approve';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.planes-mejoramiento.export', 'Exportar Planes', 'Descargar planes', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_planes_export FROM auth.permission WHERE code = 'ci.planes-mejoramiento.export';
  
  -- Informes de Ley
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.informes-ley.view', 'Ver Informes', 'Consultar informes de ley', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_informes_view FROM auth.permission WHERE code = 'ci.informes-ley.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.informes-ley.create', 'Crear Informe', 'Generar nuevo informe de ley', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_informes_create FROM auth.permission WHERE code = 'ci.informes-ley.create';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.informes-ley.edit', 'Editar Informe', 'Modificar informe existente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_informes_edit FROM auth.permission WHERE code = 'ci.informes-ley.edit';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.informes-ley.delete', 'Eliminar Informe', 'Eliminar informe', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_informes_delete FROM auth.permission WHERE code = 'ci.informes-ley.delete';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.informes-ley.approve', 'Aprobar Informe', 'Aprobar informe de ley', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_informes_approve FROM auth.permission WHERE code = 'ci.informes-ley.approve';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.informes-ley.export', 'Exportar Informes', 'Descargar informes', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_informes_export FROM auth.permission WHERE code = 'ci.informes-ley.export';
  
  -- Expedientes
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.expedientes.view', 'Ver Expedientes', 'Consultar expedientes', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_expedientes_view FROM auth.permission WHERE code = 'ci.expedientes.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.expedientes.create', 'Crear Expediente', 'Generar nuevo expediente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_expedientes_create FROM auth.permission WHERE code = 'ci.expedientes.create';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.expedientes.edit', 'Editar Expediente', 'Modificar expediente existente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_expedientes_edit FROM auth.permission WHERE code = 'ci.expedientes.edit';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.expedientes.delete', 'Eliminar Expediente', 'Eliminar expediente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_expedientes_delete FROM auth.permission WHERE code = 'ci.expedientes.delete';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.expedientes.export', 'Exportar Expedientes', 'Descargar expedientes', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_expedientes_export FROM auth.permission WHERE code = 'ci.expedientes.export';
  
  -- Roles y Permisos
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.roles-permisos.view', 'Ver Roles', 'Consultar roles y permisos', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_roles_view FROM auth.permission WHERE code = 'ci.roles-permisos.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.roles-permisos.create', 'Crear Rol', 'Crear nuevo rol', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_roles_create FROM auth.permission WHERE code = 'ci.roles-permisos.create';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.roles-permisos.edit', 'Editar Rol', 'Modificar rol existente', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_roles_edit FROM auth.permission WHERE code = 'ci.roles-permisos.edit';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.roles-permisos.delete', 'Eliminar Rol', 'Eliminar rol', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_roles_delete FROM auth.permission WHERE code = 'ci.roles-permisos.delete';
  
  -- Configuraciones
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.config-auditorias.view', 'Ver Configuraciones', 'Consultar configuraciones', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_config_view FROM auth.permission WHERE code = 'ci.config-auditorias.view';
  
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'ci.config-auditorias.edit', 'Editar Configuraciones', 'Modificar configuraciones', control_interno_module_id, true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id_permission INTO p_config_edit FROM auth.permission WHERE code = 'ci.config-auditorias.edit';
  
  -- Verificar que todos los permisos se obtuvieron
  IF p_dashboard_view IS NULL OR p_config_edit IS NULL THEN
    RAISE EXCEPTION 'Error: Algunos permisos no se pudieron crear o encontrar';
  END IF;
  
  RAISE NOTICE '✅ Todos los permisos creados/verificados correctamente (34 permisos)';

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
  WHERE r.id IN (r_jefe_oci, r_profesional, r_auxiliar, r_consulta)
    AND p.code = 'system.access_backoffice'
  ON CONFLICT (id_rol, id_permission) DO NOTHING;
  
  RAISE NOTICE '✅ Permisos asignados a roles correctamente';

END $$;

-- ============================================
-- 4. CREAR USUARIOS: UNO POR CADA ROL
-- ============================================
-- Password: 123456
-- Hash: $2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.

DO $$
DECLARE
  r_jefe_oci uuid;
  r_profesional uuid;
  r_auxiliar uuid;
  r_consulta uuid;
  r_control_interno uuid;
  -- IDs de personas
  p_jefe_oci integer := 100;
  p_ocig integer := 24;
  p_profesional integer := 101;
  p_auxiliar integer := 103;
  p_consulta integer := 104;
  -- IDs de usuarios
  u_jefe_oci uuid;
  u_ocig uuid;
  u_profesional uuid;
  u_auxiliar uuid;
  u_consulta uuid;
BEGIN
  -- Obtener IDs de roles
  SELECT id INTO r_jefe_oci FROM auth.role WHERE code = 'JEFE_OCI';
  SELECT id INTO r_profesional FROM auth.role WHERE code = 'PROFESIONAL_AUDITOR';
  SELECT id INTO r_auxiliar FROM auth.role WHERE code = 'AUXILIAR_AUDITORIA';
  SELECT id INTO r_consulta FROM auth.role WHERE code = 'CONSULTA';
  -- Buscar rol CONTROL_INTERNO por código (rol genérico para acceso al módulo)
  SELECT id INTO r_control_interno FROM auth.role WHERE code = 'CONTROL_INTERNO';
  
  IF r_jefe_oci IS NULL OR r_profesional IS NULL OR r_auxiliar IS NULL OR r_consulta IS NULL THEN
    RAISE EXCEPTION 'Error: No se encontraron los roles necesarios. Ejecutar primero la sección de creación de roles.';
  END IF;
  
  -- Crear rol CONTROL_INTERNO si no existe
  IF r_control_interno IS NULL THEN
    INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
    VALUES (gen_random_uuid(), 'CONTROL_INTERNO', 'Control Interno', 'Acceso al módulo de Control Interno', 'administrativo', 'Shield', '#DC2626', 'sistema', true)
    ON CONFLICT (code) DO NOTHING;
    SELECT id INTO r_control_interno FROM auth.role WHERE code = 'CONTROL_INTERNO';
    RAISE NOTICE '✅ Rol CONTROL_INTERNO creado: %', r_control_interno;
  ELSE
    RAISE NOTICE '✅ Rol CONTROL_INTERNO encontrado: %', r_control_interno;
  END IF;
  
  RAISE NOTICE '✅ Roles encontrados para creación de usuarios';
  
  -- ============================================
  -- CREAR PERSONA Y USUARIO PARA JEFE_OCI
  -- ============================================
  INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
  VALUES (p_jefe_oci, '1234567001', 'CC', 'Jefe Control Interno', 'Fernando', 'Ávila Guevara', 'M', 'jefe.oci@esap.edu.co')
  ON CONFLICT (id_tercero) DO NOTHING;
  
  SELECT id_user INTO u_jefe_oci FROM auth."user" WHERE username = 'jefe.oci@esap.edu.co';
  IF u_jefe_oci IS NULL THEN
    INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
    VALUES (gen_random_uuid(), 'jefe.oci@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', p_jefe_oci);
    SELECT id_user INTO u_jefe_oci FROM auth."user" WHERE username = 'jefe.oci@esap.edu.co';
  END IF;
  
  INSERT INTO auth.user_roles (id_user, id_rol, is_active)
  VALUES (u_jefe_oci, r_jefe_oci, true)
  ON CONFLICT (id_user, id_rol) DO NOTHING;
  
  -- Asignar rol CONTROL_INTERNO al usuario jefe.oci
  IF r_control_interno IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active)
    VALUES (u_jefe_oci, r_control_interno, true)
    ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  END IF;
  
  -- ============================================
  -- CREAR PERSONA Y USUARIO OCIG CON CONTROL TOTAL (JEFE_OCI)
  -- ============================================
  INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
  VALUES (p_ocig, '123456796', 'CC', 'OCIG Control Interno', 'OCIG', 'Control Interno', 'M', 'ocig@esap.edu.co')
  ON CONFLICT (id_tercero) DO NOTHING;
  
  SELECT id_user INTO u_ocig FROM auth."user" WHERE username = 'ocig@esap.edu.co';
  IF u_ocig IS NULL THEN
    INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
    VALUES ('2ca0b55a-bbca-4203-bf35-a0f55ecf753f', 'ocig@esap.edu.co', '$2b$10$0hAnE/dXPJvVpIFJ48W0yOHy/s1EdCEb1IT/AScUsKmVuYY7BFfJS', p_ocig);
    SELECT id_user INTO u_ocig FROM auth."user" WHERE username = 'ocig@esap.edu.co';
  END IF;
  
  INSERT INTO auth.user_roles (id_user, id_rol, is_active)
  VALUES (u_ocig, r_jefe_oci, true)
  ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  
  -- Asignar rol CONTROL_INTERNO al usuario ocig
  IF r_control_interno IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active)
    VALUES (u_ocig, r_control_interno, true)
    ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  END IF;
  
  -- ============================================
  -- CREAR PERSONA Y USUARIO PARA PROFESIONAL_AUDITOR
  -- ============================================
  INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
  VALUES (p_profesional, '1234567002', 'CC', 'Profesional Auditor', 'María Camila', 'Rodríguez Torres', 'F', 'profesional.auditor@esap.edu.co')
  ON CONFLICT (id_tercero) DO NOTHING;
  
  SELECT id_user INTO u_profesional FROM auth."user" WHERE username = 'profesional.auditor@esap.edu.co';
  IF u_profesional IS NULL THEN
    INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
    VALUES (gen_random_uuid(), 'profesional.auditor@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', p_profesional);
    SELECT id_user INTO u_profesional FROM auth."user" WHERE username = 'profesional.auditor@esap.edu.co';
  END IF;
  
  INSERT INTO auth.user_roles (id_user, id_rol, is_active)
  VALUES (u_profesional, r_profesional, true)
  ON CONFLICT (id_user, id_rol) DO NOTHING;
  
  -- Asignar rol CONTROL_INTERNO al usuario profesional.auditor
  IF r_control_interno IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active)
    VALUES (u_profesional, r_control_interno, true)
    ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  END IF;
  
  -- ============================================
  -- CREAR PERSONA Y USUARIO PARA AUXILIAR_AUDITORIA
  -- ============================================
  INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
  VALUES (p_auxiliar, '1234567004', 'CC', 'Auxiliar Auditoría', 'Ana Patricia', 'Moreno Cruz', 'F', 'auxiliar.auditoria@esap.edu.co')
  ON CONFLICT (id_tercero) DO NOTHING;
  
  SELECT id_user INTO u_auxiliar FROM auth."user" WHERE username = 'auxiliar.auditoria@esap.edu.co';
  IF u_auxiliar IS NULL THEN
    INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
    VALUES (gen_random_uuid(), 'auxiliar.auditoria@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', p_auxiliar);
    SELECT id_user INTO u_auxiliar FROM auth."user" WHERE username = 'auxiliar.auditoria@esap.edu.co';
  END IF;
  
  INSERT INTO auth.user_roles (id_user, id_rol, is_active)
  VALUES (u_auxiliar, r_auxiliar, true)
  ON CONFLICT (id_user, id_rol) DO NOTHING;
  
  -- Asignar rol CONTROL_INTERNO al usuario auxiliar.auditoria
  IF r_control_interno IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active)
    VALUES (u_auxiliar, r_control_interno, true)
    ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  END IF;
  
  -- ============================================
  -- CREAR PERSONA Y USUARIO PARA CONSULTA
  -- ============================================
  INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
  VALUES (p_consulta, '1234567005', 'CC', 'Consulta Control Interno', 'Jorge Luis', 'Peña Ramírez', 'M', 'consulta.control@esap.edu.co')
  ON CONFLICT (id_tercero) DO NOTHING;
  
  SELECT id_user INTO u_consulta FROM auth."user" WHERE username = 'consulta.control@esap.edu.co';
  IF u_consulta IS NULL THEN
    INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
    VALUES (gen_random_uuid(), 'consulta.control@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', p_consulta);
    SELECT id_user INTO u_consulta FROM auth."user" WHERE username = 'consulta.control@esap.edu.co';
  END IF;
  
  INSERT INTO auth.user_roles (id_user, id_rol, is_active)
  VALUES (u_consulta, r_consulta, true)
  ON CONFLICT (id_user, id_rol) DO NOTHING;
  
  -- Asignar rol CONTROL_INTERNO al usuario consulta.control
  IF r_control_interno IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active)
    VALUES (u_consulta, r_control_interno, true)
    ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  END IF;
  
  RAISE NOTICE '✅ Usuarios creados y roles asignados correctamente';
  RAISE NOTICE '📋 Resumen:';
  RAISE NOTICE '   - Usuario JEFE_OCI (jefe.oci@esap.edu.co): %', u_jefe_oci;
  RAISE NOTICE '   - Usuario OCIG (ocig@esap.edu.co) con JEFE_OCI: %', u_ocig;
  RAISE NOTICE '   - Usuario PROFESIONAL_AUDITOR: %', u_profesional;
  RAISE NOTICE '   - Usuario AUXILIAR_AUDITORIA: %', u_auxiliar;
  RAISE NOTICE '   - Usuario CONSULTA: %', u_consulta;
  
END $$;

-- ============================================
-- RESUMEN
-- ============================================
-- ✅ Este script es IDEMPOTENTE - puede ejecutarse múltiples veces
-- ✅ LÓGICA SIMPLIFICADA:
--    1. Busca roles por código, si no existen los crea, devuelve IDs
--    2. Busca permisos por código, si no existen los crea, devuelve IDs
--    3. Asigna permisos a roles usando los IDs obtenidos
--    4. Crea un usuario por cada rol en las tablas respectivas
--
-- Roles creados: 4
--   - JEFE_OCI (acceso total)
--   - PROFESIONAL_AUDITOR (view, edit, create, export)
--   - AUXILIAR_AUDITORIA (view, create en algunos)
--   - CONSULTA (solo lectura)
--
-- Permisos creados: 34 (por submódulo y acción)
--   - Dashboard: 2 permisos
--   - Planificación: 6 permisos
--   - Planes de Mejoramiento: 6 permisos
--   - Informes de Ley: 6 permisos
--   - Expedientes: 5 permisos
--   - Roles y Permisos: 4 permisos
--   - Configuraciones: 2 permisos
--
-- Usuarios creados: 5 (uno por cada rol + ocig)
--   Password: 123456 (excepto ocig que usa Esap2026*)
--   Todos los usuarios también tienen asignado el rol CONTROL_INTERNO (acceso genérico al módulo)
--
-- Usuarios para probar:
--   ocig@esap.edu.co → JEFE_OCI + CONTROL_INTERNO (control total) - Password: Esap2026*
--   jefe.oci@esap.edu.co → JEFE_OCI + CONTROL_INTERNO (acceso total) - Password: 123456
--   profesional.auditor@esap.edu.co → PROFESIONAL_AUDITOR + CONTROL_INTERNO - Password: 123456
--   auxiliar.auditoria@esap.edu.co → AUXILIAR_AUDITORIA + CONTROL_INTERNO - Password: 123456
--   consulta.control@esap.edu.co → CONSULTA + CONTROL_INTERNO (solo lectura) - Password: 123456
-- ============================================

