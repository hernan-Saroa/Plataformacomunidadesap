-- ============================================
-- Migration 013: Update Disciplinary Control Schema
-- Description: Adds missing indexes and comments to existing tables
-- Dependencies: Assumes tables already exist (created by TypeORM synchronize)
-- ============================================

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS internal_disciplinary_control;

-- ============================================
-- ADD MISSING INDEXES (IF NOT EXISTS)
-- ============================================

-- DISCIPLINARY PROFESSIONAL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_professional_email') THEN
        CREATE INDEX idx_professional_email ON internal_disciplinary_control.disciplinary_professional(email);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_professional_estado') THEN
        CREATE INDEX idx_professional_estado ON internal_disciplinary_control.disciplinary_professional(estado);
    END IF;
END$$;

-- DISCIPLINARY NEWS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_news_radicado') THEN
        CREATE INDEX idx_news_radicado ON internal_disciplinary_control.disciplinary_news(radicado);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_news_estado') THEN
        CREATE INDEX idx_news_estado ON internal_disciplinary_control.disciplinary_news(estado);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_news_fecha') THEN
        CREATE INDEX idx_news_fecha ON internal_disciplinary_control.disciplinary_news("fechaRecepcion");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_news_territorial') THEN
        CREATE INDEX idx_news_territorial ON internal_disciplinary_control.disciplinary_news(territorial);
    END IF;
END$$;

-- DISCIPLINARY PROCESSES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_process_radicado') THEN
        CREATE INDEX idx_process_radicado ON internal_disciplinary_control.disciplinary_processes("radicadoProceso");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_process_etapa') THEN
        CREATE INDEX idx_process_etapa ON internal_disciplinary_control.disciplinary_processes("etapaActual");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_process_estado') THEN
        CREATE INDEX idx_process_estado ON internal_disciplinary_control.disciplinary_processes(estado);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_process_abogado') THEN
        CREATE INDEX idx_process_abogado ON internal_disciplinary_control.disciplinary_processes(abogado_asignado_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_process_news') THEN
        CREATE INDEX idx_process_news ON internal_disciplinary_control.disciplinary_processes("newsId");
    END IF;
END$$;

-- LEGAL AUTOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_process') THEN
        CREATE INDEX idx_auto_process ON internal_disciplinary_control.legal_autos("processId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_estado') THEN
        CREATE INDEX idx_auto_estado ON internal_disciplinary_control.legal_autos(estado);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_tipo') THEN
        CREATE INDEX idx_auto_tipo ON internal_disciplinary_control.legal_autos(tipo);
    END IF;
END$$;

-- AUTO VERSIONS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_version_auto') THEN
        CREATE INDEX idx_version_auto ON internal_disciplinary_control.auto_versions("autoId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_version_number') THEN
        CREATE INDEX idx_version_number ON internal_disciplinary_control.auto_versions(version);
    END IF;
END$$;

-- EVIDENCE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evidence_process') THEN
        CREATE INDEX idx_evidence_process ON internal_disciplinary_control.evidence("processId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evidence_filetype') THEN
        CREATE INDEX idx_evidence_filetype ON internal_disciplinary_control.evidence("fileType");
    END IF;
END$$;

-- ============================================
-- ADD COMMENTS TO TABLES
-- ============================================

COMMENT ON TABLE internal_disciplinary_control.sequences IS 'Tabla para gestionar secuencias de radicados';

COMMENT ON TABLE internal_disciplinary_control.disciplinary_professional IS 'Profesionales (abogados) asignados a procesos disciplinarios';

COMMENT ON TABLE internal_disciplinary_control.disciplinary_news IS 'Noticias disciplinarias recibidas';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.denunciante IS 'Datos del denunciante en formato JSON';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.disciplinable IS 'Datos del disciplinable en formato JSON';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.estado IS 'Estados: RADICADA, ASIGNADA, DEVUELTA, ARCHIVADA';

COMMENT ON TABLE internal_disciplinary_control.disciplinary_processes IS 'Procesos disciplinarios activos';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes."etapaActual" IS 'Etapas: EVALUACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes.estado IS 'Estados: ACTIVO, SUSPENDIDO, ARCHIVADO, TERMINADO';

COMMENT ON TABLE internal_disciplinary_control.legal_autos IS 'Autos legales generados en los procesos';
COMMENT ON COLUMN internal_disciplinary_control.legal_autos.estado IS 'Estados: BORRADOR, EN_REVISION, APROBADO, RECHAZADO, NOTIFICADO';
COMMENT ON COLUMN internal_disciplinary_control.legal_autos.tipo IS 'Tipos: AUTO_APERTURA, AUTO_PRUEBAS, AUTO_CIERRE, etc.';

COMMENT ON TABLE internal_disciplinary_control.auto_versions IS 'Historial de versiones de autos legales';

COMMENT ON TABLE internal_disciplinary_control.evidence IS 'Evidencias y documentos adjuntos a los procesos';
COMMENT ON COLUMN internal_disciplinary_control.evidence."fileType" IS 'Tipo de archivo: pdf, docx, jpg, etc.';

COMMENT ON TABLE internal_disciplinary_control.stage_configuration IS 'Configuración de días hábiles por etapa procesal';

COMMENT ON TABLE internal_disciplinary_control.system_configuration IS 'Configuración global del sistema disciplinario';

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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_news_timestamp ON internal_disciplinary_control.disciplinary_news;
DROP TRIGGER IF EXISTS update_process_timestamp ON internal_disciplinary_control.disciplinary_processes;
DROP TRIGGER IF EXISTS update_auto_timestamp ON internal_disciplinary_control.legal_autos;
DROP TRIGGER IF EXISTS update_professional_timestamp ON internal_disciplinary_control.disciplinary_professional;
DROP TRIGGER IF EXISTS update_sequence_timestamp ON internal_disciplinary_control.sequences;

-- Create triggers
CREATE TRIGGER update_news_timestamp
    BEFORE UPDATE ON internal_disciplinary_control.disciplinary_news
    FOR EACH ROW
    EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();

CREATE TRIGGER update_process_timestamp
    BEFORE UPDATE ON internal_disciplinary_control.disciplinary_processes
    FOR EACH ROW
    EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();

CREATE TRIGGER update_auto_timestamp
    BEFORE UPDATE ON internal_disciplinary_control.legal_autos
    FOR EACH ROW
    EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();

CREATE TRIGGER update_professional_timestamp
    BEFORE UPDATE ON internal_disciplinary_control.disciplinary_professional
    FOR EACH ROW
    EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();

CREATE TRIGGER update_sequence_timestamp
    BEFORE UPDATE ON internal_disciplinary_control.sequences
    FOR EACH ROW
    EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();

-- ============================================
-- VERIFY TABLES EXIST
-- ============================================

DO $$
DECLARE
    missing_tables TEXT[];
    table_name TEXT;
BEGIN
    -- List of expected tables
    missing_tables := ARRAY[
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

    -- Check each table
    FOREACH table_name IN ARRAY missing_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'internal_disciplinary_control'
            AND table_name = table_name
        ) THEN
            RAISE WARNING 'Table internal_disciplinary_control.% does not exist!', table_name;
        ELSE
            RAISE NOTICE 'Table internal_disciplinary_control.% exists ✓', table_name;
        END IF;
    END LOOP;
END$$;

-- ============================================
-- END OF MIGRATION
-- ============================================
