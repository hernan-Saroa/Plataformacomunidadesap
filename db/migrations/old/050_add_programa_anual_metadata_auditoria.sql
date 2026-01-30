-- Agregar campo JSONB para almacenar metadata del programa anual
-- (duraciones de fases, mes de inicio, semana de inicio)

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'programa_anual_metadata'
    ) THEN
        ALTER TABLE control_interno.auditoria
        ADD COLUMN programa_anual_metadata JSONB NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.programa_anual_metadata IS 
        'Metadata del programa anual: { "mesInicio": 0-11, "semanaInicio": 1-4, "duraciones": { "planeacion": number, "ejecucion": number, "comunicacion": number } }';
    END IF;
END $$;

