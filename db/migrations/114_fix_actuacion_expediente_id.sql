-- Migration: Change actuaciones.expediente_id from UUID to VARCHAR and drop ForeignKey to support generic references
-- Created: 2026-01-31

START TRANSACTION;

-- 1. Drop the foreign key constraint (constraint name might vary, usually FK_... or generated)
-- We attempt to drop it by name if known, or generic approach. 
-- Since we don't know the exact name, we'll try to find it or just alter the column which might require dropping FK first.
-- Usually standard naming: FK_<hash>
-- Let's assume we need to ALTER the column, which will fail if there is a FK.

-- Remove FK constraint. We can do this by finding it or just assuming standard TypeORM naming if possible.
-- Often: ALTER TABLE "legal_management"."actuaciones" DROP CONSTRAINT "FK_...";
-- But without the name, it's hard.
-- However, we can use a DO block to find and drop it.

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'legal_management' 
        AND table_name = 'actuaciones'
        AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE "legal_management"."actuaciones" DROP CONSTRAINT "' || r.constraint_name || '"';
    END LOOP;
END $$;

-- 2. Alter column type
ALTER TABLE "legal_management"."actuaciones"
ALTER COLUMN "expediente_id" TYPE VARCHAR(255) USING "expediente_id"::VARCHAR;

COMMIT;
