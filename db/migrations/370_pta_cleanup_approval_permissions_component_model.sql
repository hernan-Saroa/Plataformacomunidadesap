-- =============================================================================
-- 370: Limpieza del modelo de aprobación del PTA → modelo POR COMPONENTE
-- =============================================================================
-- (Corre después de la 369, que elimina el permiso comodín de extensión.)
-- El PTA ya no se aprueba por jerarquía/niveles (N1 Jefatura → N2 Decano →
-- N3 Gestión Profesoral). Ahora cada rol aprueba los componentes para los que
-- tiene permiso granular (pta.approve.<componente>), y existe un permiso de
-- aprobador integral (pta.approve.all) para el rol que aprueba todo.
--
-- Esta migración:
--   1) Crea el permiso pta.approve.all (aprobador integral / "aprueba todo").
--   2) Desactiva y desasigna los permisos SOBRANTES del modelo anterior:
--        - pta.backoffice.aprobador_N1 / _N2 / _N3   (aprobación por nivel)
--        - pta.backoffice.revisor_N1 / _N2 / _N3     (nunca usados)
--        - pta.backoffice.aprobar                    (genérico ambiguo)
--        - pta.backoffice.aprobacion_masiva          (genérico ambiguo)
--   3) Conserva las asignaciones por componente de la migración 362
--      (JEFATURA_TERRITORIAL → academica/complementarias, DECANO → investigación/
--       extensión, GESTION_PROFESORAL → academicas_admin).
--
-- Nota: la asignación del permiso integral pta.approve.all a un rol concreto se
-- deja al administrador desde el panel de Roles y Permisos (o vía un INSERT
-- dedicado), para no presuponer qué rol debe aprobar todo. SUPER_ADMIN sigue
-- aprobando todo por bypass del sistema.
-- Idempotente.
-- =============================================================================

DO $$
DECLARE
  v_module_id UUID;
  v_sobrantes TEXT[] := ARRAY[
    'pta.backoffice.aprobador_N1','pta.backoffice.aprobador_N2','pta.backoffice.aprobador_N3',
    'pta.backoffice.revisor_N1','pta.backoffice.revisor_N2','pta.backoffice.revisor_N3',
    'pta.backoffice.aprobar','pta.backoffice.aprobacion_masiva'
  ];
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';

  -- 1) Crear/activar el permiso de aprobador integral ("aprueba todo").
  IF v_module_id IS NOT NULL THEN
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES (
      gen_random_uuid(),
      'pta.approve.all',
      'Aprobar todos los componentes del PTA',
      'Aprobador integral: puede aprobar cualquier componente y el PTA completo.',
      v_module_id,
      true
    )
    ON CONFLICT (code) DO UPDATE SET is_active = true;
  END IF;

  -- 2a) Desasignar de TODOS los roles los permisos sobrantes (soft: is_active = false).
  UPDATE auth.role_permissions rp
     SET is_active = false
    FROM auth.permission p
   WHERE p.id_permission = rp.id_permission
     AND p.code = ANY(v_sobrantes);

  -- 2b) Desactivar las definiciones de los permisos sobrantes para que no aparezcan
  --     en el panel de Roles y Permisos.
  UPDATE auth.permission
     SET is_active = false
   WHERE code = ANY(v_sobrantes);
END $$;

-- Para designar un rol "aprueba todo" (aprobador integral), ejecutar (ajustando el code):
--   INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
--   SELECT r.id, p.id_permission, true
--     FROM auth.role r JOIN auth.permission p ON p.code = 'pta.approve.all'
--    WHERE r.code = '<CODE_DEL_ROL_INTEGRAL>'
--   ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
