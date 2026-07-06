-- =============================================================================
-- 371: Otorga pta.approve.all al rol SUPER_ADMIN
-- =============================================================================
-- El superusuario ya no aprueba componentes por un "bypass" en el frontend, sino
-- porque REALMENTE tiene el permiso de aprobador integral (pta.approve.all).
-- Así la autorización de aprobación queda 100% dirigida por permisos, tanto en
-- frontend como en backend, sin depender del nombre del rol.
--
-- pta.approve.all se crea en la migración 370. Esta 371 solo lo asigna.
-- Idempotente.
-- =============================================================================

DO $$
BEGIN
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
    FROM auth.role r
    JOIN auth.permission p ON p.code = 'pta.approve.all'
   WHERE r.code = 'SUPER_ADMIN'
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
END $$;
