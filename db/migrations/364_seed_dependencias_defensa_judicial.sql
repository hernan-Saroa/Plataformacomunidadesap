-- Migration: Seed de dependencias para la configuración de Defensa Judicial
-- Las dependencias del paso 3 del formulario de Nueva Demanda viven dentro del
-- jsonb `value` de system_configurations (key 'defensa-judicial'), no en tabla propia.
-- Sembramos la dependencia por defecto "Legal" para que el backend sea autoritativo.

-- Usar el esquema de legal-management-service
SET search_path TO legal_management;

-- Añadir la clave 'dependencias' con la dependencia "Legal" SOLO si la fila existe
-- y aún no tiene esa clave. Idempotente: no pisa dependencias ya configuradas.
UPDATE system_configurations
SET value = jsonb_set(
    value,
    '{dependencias}',
    '[{"id": "legal", "nombre": "Legal", "activo": true}]'::jsonb,
    true
)
WHERE key = 'defensa-judicial'
  AND NOT (value ? 'dependencias');
