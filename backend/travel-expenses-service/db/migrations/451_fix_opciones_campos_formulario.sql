-- ============================================================================
-- 451: Corregir opciones vacías/corrompidas en campos de tipo SELECT
-- ============================================================================
SET client_encoding = 'UTF8';

UPDATE travel_expenses.config_campos_formulario
SET opciones = '[{"value": "AHORROS", "label": "Ahorros"}, {"value": "CORRIENTE", "label": "Corriente"}]'::jsonb
WHERE clave = 'tipo_cuenta' AND (opciones IS NULL OR opciones::text = '[[], []]');
