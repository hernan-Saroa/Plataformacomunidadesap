-- Verificar y crear las columnas si no existen
DO $$
BEGIN
    -- Agregar drafts_count si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'drafts_count'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN drafts_count INTEGER DEFAULT 0;
    END IF;

    -- Agregar documents_count si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'documents_count'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN documents_count INTEGER DEFAULT 0;
    END IF;

    -- Agregar time_percentage si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'time_percentage'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN time_percentage DECIMAL(5,2) DEFAULT 0.00;
    END IF;
END $$;

SELECT 'Columnas verificadas/creadas correctamente' AS resultado;
