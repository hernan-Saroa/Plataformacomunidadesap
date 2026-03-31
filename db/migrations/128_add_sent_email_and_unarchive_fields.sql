-- Migration: Add fields for sent email tracking and unarchive support
-- Adds 'direccion' to distinguish incoming vs sent emails
-- Adds 'destinatarios_to' to store TO recipients for sent emails

DO $$
BEGIN
    -- Column: direccion (ENTRANTE or ENVIADO)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'legal_management'
          AND table_name = 'correos_juridicos'
          AND column_name = 'direccion'
    ) THEN
        ALTER TABLE legal_management.correos_juridicos
            ADD COLUMN direccion VARCHAR(20) DEFAULT 'ENTRANTE';
    END IF;

    -- Column: destinatarios_to (TO recipients for sent emails)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'legal_management'
          AND table_name = 'correos_juridicos'
          AND column_name = 'destinatarios_to'
    ) THEN
        ALTER TABLE legal_management.correos_juridicos
            ADD COLUMN destinatarios_to TEXT;
    END IF;
END$$;
