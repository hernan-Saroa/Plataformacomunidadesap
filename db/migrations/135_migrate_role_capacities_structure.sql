-- Migración #135: Cambiar estructura de roleCapacities
-- De: { "cargo_key": number }
-- A: { "cargo_key": { "nombre": string, "capacidad": number, "activo": boolean } }
-- Fecha: 2026-02-19
-- Autor: Control Interno Disciplinario

-- Actualizar registros existentes en system_configuration
UPDATE internal_disciplinary_control.system_configuration
SET "roleCapacities" = (
  SELECT jsonb_object_agg(
    key,
    jsonb_build_object(
      'nombre', INITCAP(REPLACE(key, '_', ' ')),
      'capacidad', value::int,
      'activo', true
    )
  )
  FROM jsonb_each("roleCapacities")
)
WHERE jsonb_typeof("roleCapacities") = 'object';

-- Verificar la migración
SELECT id, "roleCapacities"
FROM internal_disciplinary_control.system_configuration
LIMIT 1;
