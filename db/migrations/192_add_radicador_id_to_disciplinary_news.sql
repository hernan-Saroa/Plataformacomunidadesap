-- ============================================
-- MIGRATION: Add radicador_id to disciplinary_news
-- ============================================

DO $$
BEGIN
    -- Check if the table exists and add the column if it doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_news'
    ) THEN
        -- Check if the column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'internal_disciplinary_control'
            AND table_name = 'disciplinary_news'
            AND column_name = 'radicador_id'
        ) THEN
            -- Add the column
            EXECUTE 'ALTER TABLE internal_disciplinary_control.disciplinary_news ADD COLUMN radicador_id UUID';
            RAISE NOTICE 'Column radicador_id added to disciplinary_news';
        ELSE
            RAISE NOTICE 'Column radicador_id already exists in disciplinary_news';
        END IF;
    ELSE
        RAISE NOTICE 'Table disciplinary_news does not exist';
    END IF;
END $$;