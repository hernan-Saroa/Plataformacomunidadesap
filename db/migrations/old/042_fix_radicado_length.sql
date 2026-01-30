-- 042_fix_radicado_length.sql
-- Aumentar longitud del campo radicado de 23 a 50 caracteres

SET search_path TO legal_management, public;

ALTER TABLE expedientes 
ALTER COLUMN radicado TYPE VARCHAR(50);

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 042_fix_radicado_length.sql ejecutada';
    RAISE NOTICE '   - Campo radicado aumentado a VARCHAR(50)';
END $$;
