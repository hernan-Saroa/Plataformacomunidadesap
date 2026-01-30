-- Migration: 052_update_origen_modulo_constraint.sql
-- Purpose: Add 'ORGANOS_CONTROL' to the allowed values for origen_modulo in terminos_procesales

-- 1. Drop existing constraint
ALTER TABLE legal_management.terminos_procesales 
DROP CONSTRAINT IF EXISTS terminos_procesales_origen_modulo_check;

-- 2. Add new constraint with ORGANOS_CONTROL
ALTER TABLE legal_management.terminos_procesales 
ADD CONSTRAINT terminos_procesales_origen_modulo_check 
CHECK (origen_modulo IN ('DEFENSA', 'JUZGAMIENTO', 'ASESORIA', 'MANUAL', 'ORGANOS_CONTROL'));
