-- REQ-RUND-F010 - Permisos administrables del módulo RUND.
-- Cualquier rol puede recibir estos permisos desde Roles y Permisos.
-- Gestión Profesoral los recibe por defecto como administrador funcional RUND.

DO $$
DECLARE
  v_module_id UUID;
  v_gestion_profesoral_id UUID;
BEGIN
  SELECT id_module
    INTO v_module_id
    FROM auth.module
   WHERE code = 'gestion-profesoral';

  IF v_module_id IS NULL THEN
    INSERT INTO auth.module (
      id_module, code, name, description, icon, color, category, is_active
    ) VALUES (
      gen_random_uuid(),
      'gestion-profesoral',
      'Registro Único Nacional Docente (RUND)',
      'Gestión integral del perfil y expediente documental docente.',
      'GraduationCap',
      '#0EA5E9',
      'Gestión Personas',
      TRUE
    )
    ON CONFLICT (code) DO NOTHING;

    SELECT id_module
      INTO v_module_id
      FROM auth.module
     WHERE code = 'gestion-profesoral';
  END IF;

  INSERT INTO auth.permission (
    id_permission, code, name, description, id_module, is_active
  ) VALUES
    (gen_random_uuid(), 'banco-docentes.rund.manage', 'Administrar RUND', 'Administrar docentes, estados y operaciones generales del RUND.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.view', 'Consultar RUND', 'Consultar el banco de docentes y los perfiles RUND.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.edit', 'Editar perfiles RUND', 'Modificar la información registrada en el perfil docente.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.validate', 'Validar soportes RUND', 'Aprobar o devolver bloques y soportes documentales.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.import', 'Importar docentes RUND', 'Ejecutar la carga masiva de docentes mediante archivo.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.export', 'Exportar información RUND', 'Exportar listados e información autorizada del RUND.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.invite', 'Gestionar invitaciones RUND', 'Crear y consultar invitaciones de autogestión docente.', v_module_id, TRUE),
    (gen_random_uuid(), 'banco-docentes.rund.documents.manage', 'Gestionar documentos RUND', 'Cargar, reemplazar y eliminar documentos PDF del perfil docente.', v_module_id, TRUE)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    id_module = EXCLUDED.id_module,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id
    INTO v_gestion_profesoral_id
    FROM auth.role
   WHERE code = 'GESTION_PROFESORAL';

  IF v_gestion_profesoral_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (
      id_rol, id_permission, is_active, created_at, updated_at
    )
    SELECT
      v_gestion_profesoral_id,
      p.id_permission,
      TRUE,
      NOW(),
      NOW()
    FROM auth.permission p
    WHERE p.code LIKE 'banco-docentes.rund.%'
    ON CONFLICT (id_rol, id_permission) DO UPDATE SET
      is_active = TRUE,
      updated_at = NOW();
  END IF;
END $$;
