-- Script para agregar VALORACION al enum de etapas
-- Ejecutar este script directamente en PostgreSQL si aparece el error de enum

-- Primero, verificar qué valores tiene actualmente el enum
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'internal_disciplinary_control.disciplinary_processes_etapaactual_enum'::regtype
ORDER BY enumsortorder;

-- Agregar VALORACION si no existe
DO $$
BEGIN
    -- Intentar agregar VALORACION al enum
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'VALORACION'
        AND enumtypid = 'internal_disciplinary_control.disciplinary_processes_etapaactual_enum'::regtype
    ) THEN
        ALTER TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum ADD VALUE 'VALORACION';
        RAISE NOTICE 'VALORACION agregado al enum exitosamente';
    ELSE
        RAISE NOTICE 'VALORACION ya existe en el enum';
    END IF;
END $$;

-- Verificar que se agregó correctamente
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'internal_disciplinary_control.disciplinary_processes_etapaactual_enum'::regtype
ORDER BY enumsortorder;
