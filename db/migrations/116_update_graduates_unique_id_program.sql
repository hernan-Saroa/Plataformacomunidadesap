-- Permitir múltiples programas por documento manteniendo unicidad por programa
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'graduates_id_number_key'
          AND conrelid = 'academic_registration.graduates'::regclass
    ) THEN
        ALTER TABLE academic_registration.graduates
            DROP CONSTRAINT graduates_id_number_key;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'graduates_id_number_program_name_key'
          AND conrelid = 'academic_registration.graduates'::regclass
    ) THEN
        ALTER TABLE academic_registration.graduates
            ADD CONSTRAINT graduates_id_number_program_name_key
            UNIQUE (id_number, program_name);
    END IF;
END$$;
