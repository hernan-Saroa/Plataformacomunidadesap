-- Migration 136: Allow ELIMINADO in terminos_procesales estado
-- Added to support soft-deletion of Terminos Procesales (Bug 12)

ALTER TABLE legal_management.terminos_procesales 
DROP CONSTRAINT IF EXISTS terminos_procesales_estado_check;

ALTER TABLE legal_management.terminos_procesales 
ADD CONSTRAINT terminos_procesales_estado_check 
CHECK (estado::text = ANY (ARRAY['PENDIENTE'::character varying, 'CUMPLIDO'::character varying, 'VENCIDO'::character varying, 'SUSPENDIDO'::character varying, 'ELIMINADO'::character varying]::text[]));
