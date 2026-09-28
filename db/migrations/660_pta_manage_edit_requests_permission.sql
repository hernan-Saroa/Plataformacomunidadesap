-- ============================================================================
-- 660: Permiso funcional para gestionar solicitudes de edición de PTA
-- ============================================================================
-- La reapertura parcial de un PTA aprobado ya existe (migraciones 384/387),
-- pero su bandeja no tenía un permiso propio. Los roles granulares de revisión
-- podían entrar a Gestión, pero no veían "Solicitudes PTA" y el backend seguía
-- comprobando pta.backoffice.aprobar, permiso genérico retirado por la 370.
--
-- Este permiso funciona como puerta de entrada y habilita exclusivamente:
--   1. Ver la pestaña Solicitudes PTA.
--   2. Consultar solicitudes de tipo edicion_componentes.
--   3. Ejecutar la acción de aprobar o denegar.
--
-- Los componentes visibles y gestionables se calculan por los permisos
-- pta.review.* que tenga el mismo rol. Por sí solo no concede ningún componente
-- ni permite administrar solicitudes de creación. Se asigna desde Roles y
-- Permisos a los roles autorizados (revisores o Gestión Profesoral).
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
    'Habilita la pestaña y las acciones de solicitudes de edición PTA; los componentes visibles y gestionables dependen de los permisos pta.review.* del rol',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true;
END $$;
