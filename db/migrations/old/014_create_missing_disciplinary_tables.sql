-- ============================================
-- Migration 014: Create Missing Disciplinary Tables
-- Description: Creates only the tables that don't exist yet
-- Dependencies: None
-- ============================================

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS internal_disciplinary_control;

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE AUTO_VERSIONS TABLE (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'auto_versions'
    ) THEN
        CREATE TABLE internal_disciplinary_control.auto_versions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "autoId" UUID NOT NULL,
            version INTEGER NOT NULL,
            contenido TEXT NOT NULL,
            "editadoPorId" UUID,
            comentarios TEXT,
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_auto FOREIGN KEY ("autoId") REFERENCES internal_disciplinary_control.legal_autos(id) ON DELETE CASCADE,
            CONSTRAINT unique_auto_version UNIQUE ("autoId", version)
        );

        COMMENT ON TABLE internal_disciplinary_control.auto_versions IS 'Historial de versiones de autos legales';

        CREATE INDEX idx_version_auto ON internal_disciplinary_control.auto_versions("autoId");
        CREATE INDEX idx_version_number ON internal_disciplinary_control.auto_versions(version);

        RAISE NOTICE 'Created table: auto_versions ✓';
    ELSE
        RAISE NOTICE 'Table auto_versions already exists, skipping...';
    END IF;
END$$;

-- ============================================
-- CREATE STAGE_CONFIGURATION TABLE (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'stage_configuration'
    ) THEN
        CREATE TABLE internal_disciplinary_control.stage_configuration (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            etapa VARCHAR(50) UNIQUE NOT NULL,
            "diasHabiles" INTEGER NOT NULL,
            descripcion TEXT,
            activo BOOLEAN NOT NULL DEFAULT TRUE
        );

        COMMENT ON TABLE internal_disciplinary_control.stage_configuration IS 'Configuración de días hábiles por etapa procesal';

        RAISE NOTICE 'Created table: stage_configuration ✓';
    ELSE
        RAISE NOTICE 'Table stage_configuration already exists, skipping...';
    END IF;
END$$;

-- ============================================
-- CREATE SYSTEM_CONFIGURATION TABLE (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'system_configuration'
    ) THEN
        CREATE TABLE internal_disciplinary_control.system_configuration (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "roleCapacities" JSONB,
            "notificationSettings" JSONB,
            "alertSettings" JSONB,
            "securitySettings" JSONB
        );

        COMMENT ON TABLE internal_disciplinary_control.system_configuration IS 'Configuración global del sistema disciplinario';

        RAISE NOTICE 'Created table: system_configuration ✓';
    ELSE
        RAISE NOTICE 'Table system_configuration already exists, skipping...';
    END IF;
END$$;

-- ============================================
-- ADD INDEXES TO EXISTING TABLES (safe)
-- ============================================

-- DISCIPLINARY PROFESSIONAL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_professional_email') THEN
        CREATE INDEX idx_professional_email ON internal_disciplinary_control.disciplinary_professional(email);
        RAISE NOTICE 'Created index: idx_professional_email ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_professional_estado') THEN
        CREATE INDEX idx_professional_estado ON internal_disciplinary_control.disciplinary_professional(estado);
        RAISE NOTICE 'Created index: idx_professional_estado ✓';
    END IF;
END$$;

-- DISCIPLINARY NEWS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_news_radicado') THEN
        CREATE INDEX idx_news_radicado ON internal_disciplinary_control.disciplinary_news(radicado);
        RAISE NOTICE 'Created index: idx_news_radicado ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_news_estado') THEN
        CREATE INDEX idx_news_estado ON internal_disciplinary_control.disciplinary_news(estado);
        RAISE NOTICE 'Created index: idx_news_estado ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_news_fecha') THEN
        CREATE INDEX idx_news_fecha ON internal_disciplinary_control.disciplinary_news("fechaRecepcion");
        RAISE NOTICE 'Created index: idx_news_fecha ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_news_territorial') THEN
        CREATE INDEX idx_news_territorial ON internal_disciplinary_control.disciplinary_news(territorial);
        RAISE NOTICE 'Created index: idx_news_territorial ✓';
    END IF;
END$$;

-- DISCIPLINARY PROCESSES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_process_radicado') THEN
        CREATE INDEX idx_process_radicado ON internal_disciplinary_control.disciplinary_processes("radicadoProceso");
        RAISE NOTICE 'Created index: idx_process_radicado ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_process_etapa') THEN
        CREATE INDEX idx_process_etapa ON internal_disciplinary_control.disciplinary_processes("etapaActual");
        RAISE NOTICE 'Created index: idx_process_etapa ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_process_estado') THEN
        CREATE INDEX idx_process_estado ON internal_disciplinary_control.disciplinary_processes(estado);
        RAISE NOTICE 'Created index: idx_process_estado ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_process_abogado') THEN
        CREATE INDEX idx_process_abogado ON internal_disciplinary_control.disciplinary_processes(abogado_asignado_id);
        RAISE NOTICE 'Created index: idx_process_abogado ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_process_news') THEN
        CREATE INDEX idx_process_news ON internal_disciplinary_control.disciplinary_processes("newsId");
        RAISE NOTICE 'Created index: idx_process_news ✓';
    END IF;
END$$;

-- LEGAL AUTOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_auto_process') THEN
        CREATE INDEX idx_auto_process ON internal_disciplinary_control.legal_autos("processId");
        RAISE NOTICE 'Created index: idx_auto_process ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_auto_estado') THEN
        CREATE INDEX idx_auto_estado ON internal_disciplinary_control.legal_autos(estado);
        RAISE NOTICE 'Created index: idx_auto_estado ✓';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_auto_tipo') THEN
        CREATE INDEX idx_auto_tipo ON internal_disciplinary_control.legal_autos(tipo);
        RAISE NOTICE 'Created index: idx_auto_tipo ✓';
    END IF;
END$$;

-- EVIDENCE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_evidence_process') THEN
        CREATE INDEX idx_evidence_process ON internal_disciplinary_control.evidence("processId");
        RAISE NOTICE 'Created index: idx_evidence_process ✓';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'evidence'
        AND column_name = 'fileType'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'internal_disciplinary_control' AND indexname = 'idx_evidence_filetype') THEN
            CREATE INDEX idx_evidence_filetype ON internal_disciplinary_control.evidence("fileType");
            RAISE NOTICE 'Created index: idx_evidence_filetype ✓';
        END IF;
    END IF;
END$$;

-- ============================================
-- CREATE OR UPDATE TRIGGERS
-- ============================================

-- Drop existing function if exists and recreate
DROP FUNCTION IF EXISTS internal_disciplinary_control.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables that have updatedAt column
DO $$
BEGIN
    -- disciplinary_news
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_news'
        AND column_name = 'updatedAt'
    ) THEN
        DROP TRIGGER IF EXISTS update_news_timestamp ON internal_disciplinary_control.disciplinary_news;
        CREATE TRIGGER update_news_timestamp
            BEFORE UPDATE ON internal_disciplinary_control.disciplinary_news
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();
        RAISE NOTICE 'Created trigger: update_news_timestamp ✓';
    END IF;

    -- disciplinary_processes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'updatedAt'
    ) THEN
        DROP TRIGGER IF EXISTS update_process_timestamp ON internal_disciplinary_control.disciplinary_processes;
        CREATE TRIGGER update_process_timestamp
            BEFORE UPDATE ON internal_disciplinary_control.disciplinary_processes
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();
        RAISE NOTICE 'Created trigger: update_process_timestamp ✓';
    END IF;

    -- legal_autos
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'legal_autos'
        AND column_name = 'updatedAt'
    ) THEN
        DROP TRIGGER IF EXISTS update_auto_timestamp ON internal_disciplinary_control.legal_autos;
        CREATE TRIGGER update_auto_timestamp
            BEFORE UPDATE ON internal_disciplinary_control.legal_autos
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();
        RAISE NOTICE 'Created trigger: update_auto_timestamp ✓';
    END IF;

    -- disciplinary_professional
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_professional'
        AND column_name = 'updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS update_professional_timestamp ON internal_disciplinary_control.disciplinary_professional;
        -- Note: This table uses updated_at instead of updatedAt, need different trigger
        RAISE NOTICE 'Note: disciplinary_professional uses updated_at (lowercase), skipping trigger';
    END IF;

    -- sequences
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'sequences'
        AND column_name = 'updatedAt'
    ) THEN
        DROP TRIGGER IF EXISTS update_sequence_timestamp ON internal_disciplinary_control.sequences;
        CREATE TRIGGER update_sequence_timestamp
            BEFORE UPDATE ON internal_disciplinary_control.sequences
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();
        RAISE NOTICE 'Created trigger: update_sequence_timestamp ✓';
    END IF;
END$$;

-- ============================================
-- VERIFY TABLES EXIST
-- ============================================

DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'sequences',
        'disciplinary_professional',
        'disciplinary_news',
        'disciplinary_processes',
        'legal_autos',
        'auto_versions',
        'evidence',
        'stage_configuration',
        'system_configuration'
    ];
    tbl_name TEXT;
    exists_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TABLE VERIFICATION REPORT';
    RAISE NOTICE '========================================';

    FOREACH tbl_name IN ARRAY expected_tables
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'internal_disciplinary_control'
            AND table_name = tbl_name
        ) THEN
            RAISE NOTICE '✓ Table: %', tbl_name;
            exists_count := exists_count + 1;
        ELSE
            RAISE WARNING '✗ Missing table: %', tbl_name;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total tables: % / %', exists_count, array_length(expected_tables, 1);
    RAISE NOTICE '========================================';
END$$;

-- ============================================
-- END OF MIGRATION
-- ============================================
