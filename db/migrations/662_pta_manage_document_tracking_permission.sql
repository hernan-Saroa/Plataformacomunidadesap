-- ============================================================================
-- 662: Permiso funcional para gestionar el Seguimiento documental del PTA
-- ============================================================================
-- Este permiso habilita la pestaña, la consulta y las acciones de Seguimiento.
-- No concede componentes: los registros y evidencias visibles/gestionables
-- continúan definidos por los permisos pta.approve.* asignados al mismo rol.
-- Se asigna expresamente desde Roles y Permisos a los roles autorizados.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module
    INTO v_module_id
    FROM auth.module
   WHERE code = 'pta';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo PTA en auth.module';
  END IF;

  INSERT INTO auth.permission (
    id_permission,
    code,
    name,
    description,
    id_module,
    is_active
  )
  VALUES (
    gen_random_uuid(),
    'pta.backoffice.seguimiento',
    'Gestionar seguimiento documental PTA',
    'Habilita la pestaña y las acciones de Seguimiento de documentos; los registros visibles y gestionables dependen de los permisos de aprobación por componente del rol',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true;
END $$;
