-- Migration: Add configurable prescription years for legal-management-service

-- Ensure the legal_management schema is used
SET search_path TO legal_management;

-- Insert the initial config if it doesn't exist
INSERT INTO system_configurations (key, module, value, description)
VALUES (
    'prescripcion_juzgamiento',
    'juzgamiento',
    '{"years": 5}'::jsonb,
    'Configuración de años para prescripción en Juzgamiento Disciplinario'
)
ON CONFLICT (key) DO NOTHING;

