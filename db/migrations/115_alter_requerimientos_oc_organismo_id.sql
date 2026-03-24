-- Migration to change organismo_id from integer to string (varchar)
-- to support UUIDs and 'CONTRALORIA' string IDs

-- First, drop the foreign key constraint that enforces integer IDs
ALTER TABLE legal_management.requerimientos_oc DROP CONSTRAINT IF EXISTS requerimientos_oc_organismo_id_fkey;

-- Now safe to alter the column type to VARCHAR
ALTER TABLE legal_management.requerimientos_oc 
ALTER COLUMN organismo_id TYPE VARCHAR(255) USING organismo_id::text;
