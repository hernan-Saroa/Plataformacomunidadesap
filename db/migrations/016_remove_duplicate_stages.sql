-- Migration 016: Remove Duplicate Stage Configurations
-- Description: Clean up duplicate entries in stage_configuration table

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT etapa, COUNT(*) as cnt
             FROM internal_disciplinary_control.stage_configuration
             GROUP BY etapa
             HAVING COUNT(*) > 1
    LOOP
        -- Delete all but the most recently created entry for each duplicate etapa
        DELETE FROM internal_disciplinary_control.stage_configuration
        WHERE id IN (
            SELECT id
            FROM internal_disciplinary_control.stage_configuration
            WHERE etapa = r.etapa
            ORDER BY "createdAt" DESC
            OFFSET 1
        );
        RAISE NOTICE 'Removed duplicates for etapa: %', r.etapa;
    END LOOP;
END $$;
