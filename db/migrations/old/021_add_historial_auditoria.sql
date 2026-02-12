DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'internal_disciplinary_control' 
                   AND table_name = 'disciplinary_news' 
                   AND column_name = 'historialAuditoria') THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_news 
        ADD COLUMN "historialAuditoria" JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
