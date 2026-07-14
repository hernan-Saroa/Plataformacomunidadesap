-- =============================================================================
-- 379: Permiso para gestionar solicitudes de PTA (creación / modificación)
-- =============================================================================
-- HU-12. El seguimiento y la resolución (aprobar/denegar) de las solicitudes de
-- creación de segundo PTA y de MODIFICACIÓN (R01→R02) debe estar gobernado por un
-- permiso, no por el nombre del rol ni un bypass de superusuario.
--
-- Se crea el permiso granular `pta.backoffice.solicitudes` bajo el módulo 'pta' y se
-- asigna a:
--   - SUPER_ADMIN         (administrador del sistema)
--   - GESTION_PROFESORAL  (rol que hace seguimiento al ciclo de vida del PTA docente)
--
-- El administrador puede reasignarlo a otros roles desde Roles y Permisos.
-- Idempotente.
-- =============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';

  IF v_module_id IS NOT NULL THEN
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES (
      gen_random_uuid(),
      'pta.backoffice.solicitudes',
      'Gestionar solicitudes de PTA',
      'Ver y resolver (aprobar/denegar) solicitudes de creación de segundo PTA y de modificación (R01→R02).',
      v_module_id,
      true
    )
    ON CONFLICT (code) DO UPDATE SET is_active = true;
  END IF;

  -- Asignación a los roles que hacen seguimiento a estas solicitudes.
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
    FROM auth.role r
    JOIN auth.permission p ON p.code = 'pta.backoffice.solicitudes'
   WHERE r.code IN ('SUPER_ADMIN', 'GESTION_PROFESORAL')
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
END $$;
