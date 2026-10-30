-- Permiso único para ver y editar Configuración de PTA.
-- No concede Gestión, aprobación, revisión ni acceso a otros módulos.
-- La asignación a roles se realiza expresamente desde Roles y Permisos.
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo PTA en auth.module';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'pta.backoffice.config_reglas',
    'Ver y editar configuración PTA',
    'Habilita exclusivamente la pestaña Configuración del módulo PTA y permite consultar, editar, guardar, bloquear, desbloquear y restaurar sus reglas',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true;
END $$;
