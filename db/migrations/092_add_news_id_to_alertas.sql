-- Migration: Add news_id column to alertas_enviadas table
-- Purpose: Allow linking alerts to disciplinary news for return notifications

DO $$
BEGIN
    -- Add news_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'alertas_enviadas'
        AND column_name = 'news_id'
    ) THEN
        ALTER TABLE internal_disciplinary_control.alertas_enviadas
        ADD COLUMN news_id UUID NULL;

        -- Add foreign key constraint
        ALTER TABLE internal_disciplinary_control.alertas_enviadas
        ADD CONSTRAINT fk_alertas_news
        FOREIGN KEY (news_id)
        REFERENCES internal_disciplinary_control.disciplinary_news(id)
        ON DELETE SET NULL;

        -- Create index for better query performance
        CREATE INDEX idx_alertas_news_id
        ON internal_disciplinary_control.alertas_enviadas(news_id);

        RAISE NOTICE 'Column news_id added to alertas_enviadas table';
    ELSE
        RAISE NOTICE 'Column news_id already exists in alertas_enviadas table';
    END IF;
END $$;
