-- El controlador exige banco-docentes.rund.create (alta de perfiles) y el perfil Cargador lo concede por expansión,
-- pero el permiso no existía en el catálogo de Auth: ningún rol personalizado podía recibirlo directamente.
-- No asigna personas ni roles.
DO $$
DECLARE module_id uuid;
BEGIN
  SELECT id_module INTO module_id FROM auth.module WHERE code IN ('rund','gestion-profesoral') ORDER BY (code='rund') DESC LIMIT 1;
  IF module_id IS NULL THEN RAISE EXCEPTION 'Apply 002/006 (rund-service) first'; END IF;
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'banco-docentes.rund.create', 'RUND · Crear perfiles',
    'Registra perfiles docentes individualmente. No autoriza importar, editar datos existentes ni aprobar.', module_id, true)
  ON CONFLICT (code) DO NOTHING;
END $$;
