-- ============================================
-- Schema para Internal Disciplinary Control Service
-- Base de datos: PostgreSQL
-- Compatible con TypeORM (nombres de columnas en camelCase)
-- ============================================

CREATE SCHEMA IF NOT EXISTS internal_disciplinary_control;

-- ============================================
-- TIPOS ENUM (como TypeORM los genera)
-- ============================================
DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.disciplinary_news_origen_enum AS ENUM ('ANONIMO', 'QUEJOSO', 'OFICIO', 'REMISION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.disciplinary_news_estado_enum AS ENUM ('RADICADA', 'EN_VALORACION', 'ASIGNADA', 'DEVUELTA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum AS ENUM ('EVALUACION', 'INDAGACION_PREVIA', 'INVESTIGACION', 'JUZGAMIENTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.disciplinary_processes_estado_enum AS ENUM ('ACTIVO', 'SUSPENDIDO', 'ARCHIVADO', 'PRESCRITO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Tabla: sequences
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.sequences (
    name VARCHAR(255) PRIMARY KEY,
    "currentValue" INTEGER DEFAULT 0,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla: disciplinary_professional
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_professional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    cargo VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100),
    tipo_contrato VARCHAR(50),
    territorial VARCHAR(100),
    capacidad_maxima INTEGER DEFAULT 10,
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_professional_email ON internal_disciplinary_control.disciplinary_professional(email);
CREATE INDEX IF NOT EXISTS idx_disciplinary_professional_estado ON internal_disciplinary_control.disciplinary_professional(estado);

-- ============================================
-- Tabla: disciplinary_news
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radicado VARCHAR(255) UNIQUE NOT NULL,
    "fechaRecepcion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origen internal_disciplinary_control.disciplinary_news_origen_enum NOT NULL,
    territorial VARCHAR(100),
    "dependenciaDenunciado" VARCHAR(255),
    denunciante JSONB,
    disciplinable JSONB,
    hechos TEXT NOT NULL,
    adjuntos TEXT[],
    estado internal_disciplinary_control.disciplinary_news_estado_enum NOT NULL DEFAULT 'RADICADA',
    observaciones TEXT,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_news_radicado ON internal_disciplinary_control.disciplinary_news(radicado);
CREATE INDEX IF NOT EXISTS idx_disciplinary_news_estado ON internal_disciplinary_control.disciplinary_news(estado);

-- ============================================
-- Tabla: disciplinary_processes
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "radicadoProceso" VARCHAR(255) UNIQUE NOT NULL,
    "newsId" UUID NOT NULL,
    abogado_asignado_id UUID,
    "etapaActual" internal_disciplinary_control.disciplinary_processes_etapaactual_enum NOT NULL DEFAULT 'EVALUACION',
    estado internal_disciplinary_control.disciplinary_processes_estado_enum NOT NULL DEFAULT 'ACTIVO',
    "fechaPrescripcion" TIMESTAMP,
    "fechaVencimientoEtapa" TIMESTAMP,
    observaciones TEXT,
    pruebas TEXT[],
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_process_news FOREIGN KEY ("newsId")
        REFERENCES internal_disciplinary_control.disciplinary_news(id) ON DELETE RESTRICT,
    CONSTRAINT fk_process_professional FOREIGN KEY (abogado_asignado_id)
        REFERENCES internal_disciplinary_control.disciplinary_professional(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_radicado ON internal_disciplinary_control.disciplinary_processes("radicadoProceso");
CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_etapa ON internal_disciplinary_control.disciplinary_processes("etapaActual");
CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_abogado ON internal_disciplinary_control.disciplinary_processes(abogado_asignado_id);

-- ============================================
-- Tabla: legal_autos
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.legal_autos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processId" UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    contenido TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'BORRADOR',
    "firmaUrl" TEXT,
    comentarios TEXT,
    "aprobadoPorId" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auto_process FOREIGN KEY ("processId")
        REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_legal_autos_process ON internal_disciplinary_control.legal_autos("processId");
CREATE INDEX IF NOT EXISTS idx_legal_autos_estado ON internal_disciplinary_control.legal_autos(estado);

-- ============================================
-- Tabla: evidence
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(255) NOT NULL,
    filename VARCHAR(255),
    description TEXT,
    "fileType" VARCHAR(100),
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "processId" UUID NOT NULL,
    CONSTRAINT fk_evidence_process FOREIGN KEY ("processId")
        REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_process ON internal_disciplinary_control.evidence("processId");

-- ============================================
-- Tabla: stage_configuration
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.stage_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etapa internal_disciplinary_control.disciplinary_processes_etapaactual_enum NOT NULL,
    "diasHabiles" INTEGER NOT NULL DEFAULT 30,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla: system_configuration
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.system_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roleCapacities" JSONB DEFAULT '{}',
    "notificationSettings" JSONB DEFAULT '{}',
    "alertSettings" JSONB DEFAULT '{}',
    "securitySettings" JSONB DEFAULT '{}'
);
