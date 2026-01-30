-- 041_fix_expedientes_abogado_nombre.sql
-- Actualiza abogado_sustanciador para mostrar nombres en vez de UUIDs

SET search_path TO legal_management, public;

-- =====================================================
-- Actualizar expedientes con el nombre del abogado
-- basado en el UUID guardado en abogado_sustanciador
-- =====================================================

UPDATE expedientes e
SET abogado_sustanciador = a.nombre_completo
FROM abogados a
WHERE e.abogado_sustanciador = a.id::text;

-- Para expedientes sin abogado asignado o con UUID inválido
UPDATE expedientes
SET abogado_sustanciador = 'Sin asignar'
WHERE abogado_sustanciador IS NULL 
   OR abogado_sustanciador ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verificación
DO $$
DECLARE
    cnt INT;
BEGIN
    SELECT COUNT(*) INTO cnt FROM expedientes WHERE abogado_sustanciador NOT LIKE '%-%-%-%-%';
    RAISE NOTICE '✅ Migración 041_fix_expedientes_abogado_nombre.sql ejecutada';
    RAISE NOTICE '   - % expedientes con nombres de abogado actualizados', cnt;
END $$;
