-- Add ON DELETE CASCADE to pagos_coactivos
ALTER TABLE legal_management.pagos_coactivos
DROP CONSTRAINT IF EXISTS pagos_coactivos_proceso_id_fkey;

ALTER TABLE legal_management.pagos_coactivos
ADD CONSTRAINT pagos_coactivos_proceso_id_fkey
FOREIGN KEY (proceso_id)
REFERENCES legal_management.procesos_coactivos(id)
ON DELETE CASCADE;

-- Add ON DELETE CASCADE to coactivos_historial
ALTER TABLE legal_management.coactivos_historial
DROP CONSTRAINT IF EXISTS FK_cfbac3de95df874558e8055653b; -- Try random hash name if standard fails
-- Or better, if naming was standard:
ALTER TABLE legal_management.coactivos_historial
DROP CONSTRAINT IF EXISTS coactivos_historial_proceso_id_fkey;

-- Since we don't know the exact constraint name for historial, let's try to add it with a standard name after dropping safely
-- Note: existing constraint might have auto-generated name. 
-- Best effort drop by column:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'coactivos_historial' AND column_name = 'proceso_id' AND table_schema = 'legal_management'
    )
    LOOP
        EXECUTE 'ALTER TABLE legal_management.coactivos_historial DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE legal_management.coactivos_historial
ADD CONSTRAINT coactivos_historial_proceso_id_fkey
FOREIGN KEY (proceso_id)
REFERENCES legal_management.procesos_coactivos(id)
ON DELETE CASCADE;
