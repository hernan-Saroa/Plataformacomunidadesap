-- ============================================================
-- Migración 426: Agregar permisos granulares por paso para edición de Auditorías OCI
-- ============================================================
-- Módulo: 'control-interno'
-- Propósito: Permitir control de acceso granular por cada paso del formulario
-- de auditoría en modo edición (FormularioAuditoriaUnificado).
-- ============================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Buscar el ID del módulo control-interno
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'control-interno';

  IF v_module_id IS NULL THEN
    RAISE NOTICE 'El módulo "control-interno" no fue encontrado en auth.module. Omitiendo inserción.';
    RETURN;
  END IF;

  -- Limpiar alias redundante previo si existiera
  DELETE FROM auth.role_permissions WHERE id_permission IN (
    SELECT id_permission FROM auth.permission WHERE code = 'control-interno.auditoria.edit.informacion-general'
  );
  DELETE FROM auth.permission WHERE code = 'control-interno.auditoria.edit.informacion-general';

  -- 1. Insertar permisos para cada uno de los 9 pasos de edición de auditoría
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'control-interno.auditoria.edit.informacion-basica',     'Editar Información Básica Auditoría',      'Permite editar la información básica de la auditoría (Paso 1)',                     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.clasificacion-alcance',  'Editar Clasificación y Alcance Auditoría', 'Permite editar la clasificación, alcance, territorial y dependencias (Paso 2)',       v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.equipo-auditor',         'Editar Equipo Auditor',                    'Permite asignar y modificar líderes, auditores y supervisores (Paso 3)',            v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.programacion',           'Editar Programación Auditoría',            'Permite editar cronograma y fechas de planeación, ejecución y comunicación (Paso 4)',v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.objetivos-criterios',    'Editar Objetivos y Criterios Auditoría',   'Permite editar objetivos específicos, criterios y normatividad (Paso 5)',           v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.recursos-productos',     'Editar Recursos y Productos Auditoría',    'Permite editar presupuesto, horas estimadas y entregables (Paso 6)',                v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.riesgos-controles',      'Editar Riesgos y Controles Auditoría',     'Permite editar riesgos asociados y controles a evaluar (Paso 7)',                   v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.hallazgos-preliminares', 'Editar Hallazgos Preliminares Auditoría',  'Permite registrar y gestionar hallazgos preliminares (Paso 8)',                      v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'control-interno.auditoria.edit.vinculacion-plan',       'Editar Vinculación a Plan Auditoría',      'Permite editar la vinculación con el Plan Anual de Auditoría (Paso 9)',             v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE 
  SET name = EXCLUDED.name, 
      description = EXCLUDED.description,
      updated_at = NOW();

  -- 2. Asignar los nuevos permisos automáticamente a los roles autorizados para gestionar/editar auditorías
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT DISTINCT r.id, p.id_permission
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE p.code IN (
    'control-interno.auditoria.edit.informacion-basica',
    'control-interno.auditoria.edit.clasificacion-alcance',
    'control-interno.auditoria.edit.equipo-auditor',
    'control-interno.auditoria.edit.programacion',
    'control-interno.auditoria.edit.objetivos-criterios',
    'control-interno.auditoria.edit.recursos-productos',
    'control-interno.auditoria.edit.riesgos-controles',
    'control-interno.auditoria.edit.hallazgos-preliminares',
    'control-interno.auditoria.edit.vinculacion-plan'
  )
  AND (
    r.code IN ('SUPER_ADMIN', 'ADMIN', 'JEFE_OCI', 'auditor-senior', 'PROFESIONAL_AUDITOR', 'auditor')
    OR r.id IN (
      SELECT rp.id_rol 
      FROM auth.role_permissions rp 
      JOIN auth.permission p2 ON p2.id_permission = rp.id_permission 
      WHERE p2.code IN ('control-interno.auditoria.edit', 'control-interno.auditoria.manage')
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.role_permissions rp2 
    WHERE rp2.id_rol = r.id AND rp2.id_permission = p.id_permission
  );

  RAISE NOTICE 'Permisos de edición granular de auditoría insertados y asignados exitosamente.';
END $$;
