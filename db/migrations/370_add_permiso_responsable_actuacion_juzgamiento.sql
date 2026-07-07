-- Migración 370: Permiso "Puede ser responsable de actuación" - Juzgamiento Disciplinario
--
-- Crea el permiso granular que habilita a una persona para ser seleccionada como
-- "Responsable de la Actuación" al registrar una actuación en Juzgamiento Disciplinario
-- (Gestión Legal). Es el equivalente al permiso de Defensa Judicial creado en la
-- migración 347 (gestion-legal.defensa-judicial.actuacion.responsable).
--
-- IMPORTANTE: este permiso NO se asigna a ningún rol en esta migración.
-- La asignación a roles se hace posteriormente desde el panel de Roles y Permisos.
-- Una vez asignado a uno o varios roles, todas las personas con esos roles
-- aparecerán como opciones de responsable en el modal de nueva actuación.

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener el módulo de Gestión Legal (juzgamiento vive bajo el mismo módulo)
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo auth.module con code = ''gestion-legal''. Ejecute primero las migraciones del módulo de Gestión Legal.';
  END IF;

  -- Insertar el permiso (idempotente)
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'gestion-legal.juzgamiento-disciplinario.actuacion.responsable',
    'Puede ser responsable de actuación',
    'Habilita a la persona para ser seleccionada como responsable al registrar una actuación en Juzgamiento Disciplinario.',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO NOTHING;
END $$;
