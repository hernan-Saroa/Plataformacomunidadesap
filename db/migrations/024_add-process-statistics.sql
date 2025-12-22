-- Migration: Add statistics columns to disciplinary_processes table
-- Purpose: Track dynamic statistics for each process (drafts, documents, time percentage)
-- Created: 2025-12-22

-- Add statistics columns to disciplinary_processes
ALTER TABLE disciplinary_processes
ADD COLUMN IF NOT EXISTS drafts_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS documents_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS time_percentage DECIMAL(5,2) DEFAULT 0.00 NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN disciplinary_processes.drafts_count IS 'Number of drafts (autos in BORRADOR state)';
COMMENT ON COLUMN disciplinary_processes.documents_count IS 'Total number of documents uploaded to the case file';
COMMENT ON COLUMN disciplinary_processes.time_percentage IS 'Percentage of time elapsed based on stage deadline';

-- Create index for performance when querying by statistics
CREATE INDEX IF NOT EXISTS idx_process_statistics ON disciplinary_processes(drafts_count, documents_count, time_percentage);

-- Initialize statistics for existing processes
-- Count drafts (autos in BORRADOR state)
UPDATE disciplinary_processes p
SET drafts_count = (
    SELECT COUNT(*)
    FROM legal_autos a
    WHERE a."processId" = p.id
    AND a.estado = 'BORRADOR'
);

-- Count documents (evidence/attachments)
UPDATE disciplinary_processes p
SET documents_count = (
    SELECT COUNT(*)
    FROM evidence e
    WHERE e."processId" = p.id
);

-- Calculate time percentage based on creation date and deadline
UPDATE disciplinary_processes p
SET time_percentage = (
    CASE
        WHEN p."fechaVencimientoEtapa" IS NOT NULL THEN
            CASE
                WHEN p."fechaVencimientoEtapa" <= CURRENT_TIMESTAMP THEN 100.00
                ELSE
                    LEAST(
                        100.00,
                        GREATEST(
                            0.00,
                            ((EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p."createdAt")) /
                              EXTRACT(EPOCH FROM (p."fechaVencimientoEtapa" - p."createdAt"))) * 100)::DECIMAL(5,2)
                        )
                    )
            END
        ELSE 0.00
    END
);

-- Create trigger function to update statistics automatically
CREATE OR REPLACE FUNCTION update_process_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update drafts_count
    UPDATE disciplinary_processes
    SET drafts_count = (
        SELECT COUNT(*)
        FROM legal_autos
        WHERE "processId" = NEW."processId"
        AND estado = 'BORRADOR'
    )
    WHERE id = NEW."processId";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for evidence (documents)
CREATE OR REPLACE FUNCTION update_process_documents_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE disciplinary_processes
        SET documents_count = (
            SELECT COUNT(*)
            FROM evidence
            WHERE "processId" = OLD."processId"
        )
        WHERE id = OLD."processId";
        RETURN OLD;
    ELSE
        UPDATE disciplinary_processes
        SET documents_count = (
            SELECT COUNT(*)
            FROM evidence
            WHERE "processId" = NEW."processId"
        )
        WHERE id = NEW."processId";
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_drafts_count ON legal_autos;
DROP TRIGGER IF EXISTS trigger_update_documents_count ON evidence;

-- Create triggers for automatic updates
CREATE TRIGGER trigger_update_drafts_count
AFTER INSERT OR UPDATE OR DELETE ON legal_autos
FOR EACH ROW
EXECUTE FUNCTION update_process_statistics();

CREATE TRIGGER trigger_update_documents_count
AFTER INSERT OR DELETE ON evidence
FOR EACH ROW
EXECUTE FUNCTION update_process_documents_count();

-- Add comment to explain the triggers
COMMENT ON TRIGGER trigger_update_drafts_count ON legal_autos IS 'Automatically updates drafts_count when autos are created, updated, or deleted';
COMMENT ON TRIGGER trigger_update_documents_count ON evidence IS 'Automatically updates documents_count when evidence is added or removed';
