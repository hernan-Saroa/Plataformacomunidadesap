-- Migración: Agregar PROCESOS_COACTIVOS al CHECK constraint de terminos_procesales
-- Fecha: 2026-01-17

SET search_path TO legal_management, public;

-- Eliminar el constraint CHECK existente
ALTER TABLE legal_management.terminos_procesales 
DROP CONSTRAINT IF EXISTS terminos_procesales_origen_modulo_check;

-- Crear el nuevo constraint CHECK incluyendo PROCESOS_COACTIVOS
ALTER TABLE legal_management.terminos_procesales 
ADD CONSTRAINT terminos_procesales_origen_modulo_check 
CHECK (origen_modulo IN ('DEFENSA', 'JUZGAMIENTO', 'ASESORIA', 'MANUAL', 'ORGANOS_CONTROL', 'PROCESOS_COACTIVOS'));
