-- ============================================================================
-- 660: Permiso funcional para gestionar solicitudes de edición de PTA
-- ============================================================================
-- La reapertura parcial de un PTA aprobado ya existe (migraciones 384/387),
-- pero su bandeja no tenía un permiso propio. Los roles granulares de revisión
-- podían entrar a Gestión, pero no veían "Solicitudes PTA" y el backend seguía
-- comprobando pta.backoffice.aprobar, permiso genérico retirado por la 370.
--
-- Este permiso habilita exclusivamente:
--   1. Ver la pestaña Solicitudes PTA.
--   2. Consultar solicitudes de tipo edicion_componentes.
--   3. Aprobar o denegar esas solicitudes.
--
-- No concede permisos para revisar/aprobar componentes ni permite administrar
-- solicitudes de creación. Se asigna desde Roles y Permisos al rol funcional que
-- corresponda (por ejemplo, "Aprobación de Edición"). No se asigna masivamente a
-- todos los revisores para preservar la segregación de funciones.
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
    'pta.requests.edit.manage',
    'Gestionar solicitudes de edición PTA',
    'Permite ver, aprobar y denegar solicitudes para editar parcialmente componentes de un PTA aprobado, sin crear un nuevo plan',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true;
END $$;

