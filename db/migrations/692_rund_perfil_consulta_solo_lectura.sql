-- HU 2426 - Perfil de solo consulta del RUND («Consulta RUND»).
-- Aditiva e idempotente. No asigna el rol a ningún usuario (RN-02: lo asigna el
-- administrador con autorización del GGP) ni toca los roles operativos del GGP.
--
-- 1) Permiso por perfil `banco-docentes.rund.consulta`, igual que carga/revisión/incorporación
--    (671). Expande a view + sensitive.view; la lista exacta vive en rund-permission-policy.ts
--    y apps/shared/rund-permissions.ts.
-- 2) Rol `RUND_CONSULTA` de tipo `personalizado`: se comporta como un rol creado por un
--    administrador, así que se puede editar, desactivar o eliminar desde Roles y Permisos.
--    Si ya existe (por código o por nombre) no se sobrescribe nada de lo que el administrador
--    haya cambiado.
--
-- Reversión manual (solo si nadie lo usa):
--   DELETE FROM auth.role WHERE code = 'RUND_CONSULTA';
--   DELETE FROM auth.permission WHERE code = 'banco-docentes.rund.consulta';
BEGIN;

DO $$
DECLARE
  v_module_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-profesoral';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Apply 423_seed_rund_permissions.sql first';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'banco-docentes.rund.consulta', 'RUND · Consulta (solo lectura)',
    'Consulta el Banco de Docentes, la ficha del docente y sus soportes en el visor. No permite descargar, exportar, ver trazabilidad, editar, cargar, validar, aprobar ni eliminar.',
    v_module_id, true)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    id_module = EXCLUDED.id_module;

  INSERT INTO auth.role (id, code, name, description, category, type, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), 'RUND_CONSULTA', 'Consulta RUND',
    'Solo lectura del RUND para áreas autorizadas por el GGP: consulta docentes, ficha y soportes sin poder modificarlos.',
    'gestion', 'personalizado', true, now(), now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.role WHERE code = 'RUND_CONSULTA' OR name = 'Consulta RUND'
  );

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'RUND_CONSULTA';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
    SELECT v_role_id, p.id_permission, true, now(), now()
    FROM auth.permission p
    WHERE p.code = 'banco-docentes.rund.consulta'
      -- Solo en la creación inicial: si el administrador ya le cambió los permisos no se pisan.
      AND NOT EXISTS (SELECT 1 FROM auth.role_permissions rp WHERE rp.id_rol = v_role_id)
    ON CONFLICT (id_rol, id_permission) DO NOTHING;
  END IF;
END $$;

COMMIT;
