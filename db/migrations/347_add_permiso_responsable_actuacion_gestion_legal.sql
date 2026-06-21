-- Migración 347: Permiso "Puede ser responsable de actuación" - Gestión Legal
--
-- Crea el permiso granular que habilita a una persona para ser seleccionada como
-- "Responsable de la Actuación" al registrar una actuación procesal en Defensa Judicial.
--
-- IMPORTANTE: este permiso NO se asigna a ningún rol en esta migración.
-- La asignación a roles se hace posteriormente desde el panel de Roles y Permisos
-- (o con una migración aparte). Una vez asignado a uno o varios roles, todas las
-- personas con esos roles aparecerán como opciones de responsable en el modal.

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener el módulo de Gestión Legal
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo auth.module con code = ''gestion-legal''. Ejecute primero las migraciones del módulo de Gestión Legal.';
  END IF;

  -- Insertar el permiso (idempotente)
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'gestion-legal.defensa-judicial.actuacion.responsable',
    'Puede ser responsable de actuación',
    'Habilita a la persona para ser seleccionada como responsable al registrar una actuación procesal en Defensa Judicial.',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO NOTHING;
END $$;
