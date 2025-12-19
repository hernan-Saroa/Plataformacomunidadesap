-- ============================================
-- Migration 012: Create Disciplinary Control Schema
-- Description: Creates all tables for Internal Disciplinary Control Service
-- Dependencies: None (creates schema from scratch)
-- ============================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS internal_disciplinary_control;

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. SEQUENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.sequences (
    name VARCHAR(100) PRIMARY KEY,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE internal_disciplinary_control.sequences IS 'Tabla para gestionar secuencias de radicados';

-- ============================================
-- 2. DISCIPLINARY PROFESSIONAL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_professional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    capacidad_maxima INTEGER NOT NULL DEFAULT 10,
    estado VARCHAR(50) NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE internal_disciplinary_control.disciplinary_professional IS 'Profesionales (abogados) asignados a procesos disciplinarios';

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_professional_email ON internal_disciplinary_control.disciplinary_professional(email);
CREATE INDEX IF NOT EXISTS idx_professional_estado ON internal_disciplinary_control.disciplinary_professional(estado);

-- ============================================
-- 3. DISCIPLINARY NEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    radicado VARCHAR(50) UNIQUE NOT NULL,
    "fechaRecepcion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origen VARCHAR(50) NOT NULL,
    territorial VARCHAR(100) NOT NULL,
    "dependenciaDenunciado" VARCHAR(255),
    denunciante JSONB NOT NULL,
    disciplinable JSONB NOT NULL,
    hechos TEXT NOT NULL,
    adjuntos TEXT[] DEFAULT ARRAY[]::TEXT[],
    estado VARCHAR(50) NOT NULL DEFAULT 'RADICADA',
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE internal_disciplinary_control.disciplinary_news IS 'Noticias disciplinarias recibidas';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.denunciante IS 'Datos del denunciante en formato JSON';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.disciplinable IS 'Datos del disciplinable en formato JSON';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.estado IS 'Estados: RADICADA, ASIGNADA, DEVUELTA, ARCHIVADA';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_radicado ON internal_disciplinary_control.disciplinary_news(radicado);
CREATE INDEX IF NOT EXISTS idx_news_estado ON internal_disciplinary_control.disciplinary_news(estado);
CREATE INDEX IF NOT EXISTS idx_news_fecha ON internal_disciplinary_control.disciplinary_news("fechaRecepcion");
CREATE INDEX IF NOT EXISTS idx_news_territorial ON internal_disciplinary_control.disciplinary_news(territorial);

-- ============================================
-- 4. DISCIPLINARY PROCESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "radicadoProceso" VARCHAR(50) UNIQUE NOT NULL,
    "newsId" UUID NOT NULL,
    abogado_asignado_id UUID,
    "etapaActual" VARCHAR(50) NOT NULL DEFAULT 'EVALUACION',
    estado VARCHAR(50) NOT NULL DEFAULT 'ACTIVO',
    "fechaPrescripcion" TIMESTAMP,
    "fechaVencimientoEtapa" TIMESTAMP,
    observaciones TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_news FOREIGN KEY ("newsId") REFERENCES internal_disciplinary_control.disciplinary_news(id) ON DELETE CASCADE,
    CONSTRAINT fk_professional FOREIGN KEY (abogado_asignado_id) REFERENCES internal_disciplinary_control.disciplinary_professional(id) ON DELETE SET NULL
);

COMMENT ON TABLE internal_disciplinary_control.disciplinary_processes IS 'Procesos disciplinarios activos';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes."etapaActual" IS 'Etapas: EVALUACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes.estado IS 'Estados: ACTIVO, SUSPENDIDO, ARCHIVADO, TERMINADO';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_process_radicado ON internal_disciplinary_control.disciplinary_processes("radicadoProceso");
CREATE INDEX IF NOT EXISTS idx_process_etapa ON internal_disciplinary_control.disciplinary_processes("etapaActual");
CREATE INDEX IF NOT EXISTS idx_process_estado ON internal_disciplinary_control.disciplinary_processes(estado);
CREATE INDEX IF NOT EXISTS idx_process_abogado ON internal_disciplinary_control.disciplinary_processes(abogado_asignado_id);
CREATE INDEX IF NOT EXISTS idx_process_news ON internal_disciplinary_control.disciplinary_processes("newsId");

-- ============================================
-- 5. LEGAL AUTOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.legal_autos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "processId" UUID NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'BORRADOR',
    "firmaUrl" TEXT,
    "notificationDate" TIMESTAMP,
    "notificationEvidence" TEXT,
    comentarios TEXT,
    "rejection_comments" TEXT,
    "aprobadoPorId" UUID,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_process FOREIGN KEY ("processId") REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE
);

COMMENT ON TABLE internal_disciplinary_control.legal_autos IS 'Autos legales generados en los procesos';
COMMENT ON COLUMN internal_disciplinary_control.legal_autos.estado IS 'Estados: BORRADOR, EN_REVISION, APROBADO, RECHAZADO, NOTIFICADO';
COMMENT ON COLUMN internal_disciplinary_control.legal_autos.tipo IS 'Tipos: AUTO_APERTURA, AUTO_PRUEBAS, AUTO_CIERRE, etc.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_process ON internal_disciplinary_control.legal_autos("processId");
CREATE INDEX IF NOT EXISTS idx_auto_estado ON internal_disciplinary_control.legal_autos(estado);
CREATE INDEX IF NOT EXISTS idx_auto_tipo ON internal_disciplinary_control.legal_autos(tipo);

-- ============================================
-- 6. AUTO VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.auto_versions (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_version_auto ON internal_disciplinary_control.auto_versions("autoId");
CREATE INDEX IF NOT EXISTS idx_version_number ON internal_disciplinary_control.auto_versions(version);

-- ============================================
-- 7. EVIDENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "processId" UUID NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    "archivoUrl" TEXT NOT NULL,
    "nombreArchivo" VARCHAR(255) NOT NULL,
    "tamanoBytes" BIGINT,
    "cargadoPorId" UUID,
    "fechaCarga" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_process_evidence FOREIGN KEY ("processId") REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE
);

COMMENT ON TABLE internal_disciplinary_control.evidence IS 'Evidencias y documentos adjuntos a los procesos';
COMMENT ON COLUMN internal_disciplinary_control.evidence.tipo IS 'Tipos: DENUNCIA, TESTIMONIO, PRUEBA_DOCUMENTAL, AUDIO, VIDEO, etc.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_process ON internal_disciplinary_control.evidence("processId");
CREATE INDEX IF NOT EXISTS idx_evidence_tipo ON internal_disciplinary_control.evidence(tipo);

-- ============================================
-- 8. STAGE CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.stage_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etapa VARCHAR(50) UNIQUE NOT NULL,
    "diasHabiles" INTEGER NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE internal_disciplinary_control.stage_configuration IS 'Configuración de días hábiles por etapa procesal';

-- ============================================
-- 9. SYSTEM CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.system_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "roleCapacities" JSONB,
    "notificationSettings" JSONB,
    "alertSettings" JSONB,
    "securitySettings" JSONB
);

COMMENT ON TABLE internal_disciplinary_control.system_configuration IS 'Configuración global del sistema disciplinario';

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updatedAt
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
-- GRANT PERMISSIONS (adjust as needed)
-- ============================================
-- GRANT USAGE ON SCHEMA internal_disciplinary_control TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA internal_disciplinary_control TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA internal_disciplinary_control TO your_app_user;

-- ============================================
-- END OF MIGRATION
-- ============================================
