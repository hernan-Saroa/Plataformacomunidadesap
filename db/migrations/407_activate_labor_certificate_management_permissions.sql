-- Convierte los permisos de correcciones y funciones laborales en controles
-- granulares de acceso. Esta migración no asigna permisos automáticamente:
-- conserva exactamente las selecciones vigentes de cada rol.

BEGIN;

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'certificados-laborales';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo auth.module certificados-laborales';
  END IF;

  INSERT INTO auth.permission (
    id_permission, code, name, description, id_module,
    is_active, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'certificados-laborales.correction.manage',
    'Aprobar solicitudes de corrección',
    'Revisar, editar, aprobar o rechazar solicitudes de corrección de certificados laborales',
    v_module_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    id_module = EXCLUDED.id_module,
    is_active = TRUE,
    updated_at = NOW();

  INSERT INTO auth.permission (
    id_permission, code, name, description, id_module,
    is_active, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'certificados-laborales.functions.manage',
    'Gestionar funciones laborales',
    'Crear, editar, eliminar y cargar la Matriz Funciones ESAP',
    v_module_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    id_module = EXCLUDED.id_module,
    is_active = TRUE,
    updated_at = NOW();
END $$;

COMMIT;
