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
    "notificationDate" TIMESTAMP,
    "notificationEvidence" TEXT,
    comentarios TEXT,
    "rejection_comments" TEXT,
    "aprobadoPorId" UUID,
    "currentVersion" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auto_process FOREIGN KEY ("processId")
        REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_legal_autos_process ON internal_disciplinary_control.legal_autos("processId");
CREATE INDEX IF NOT EXISTS idx_legal_autos_estado ON internal_disciplinary_control.legal_autos(estado);

-- ============================================
-- Tabla: auto_versions
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.auto_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "autoId" UUID NOT NULL,
    contenido TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" UUID,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auto_version_auto FOREIGN KEY ("autoId")
        REFERENCES internal_disciplinary_control.legal_autos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_versions_auto ON internal_disciplinary_control.auto_versions("autoId");
CREATE INDEX IF NOT EXISTS idx_auto_versions_number ON internal_disciplinary_control.auto_versions("versionNumber");

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
    "nombreDocumento" VARCHAR(255),
    "tipoDocumento" VARCHAR(50),
    etapa VARCHAR(100),
    "usuarioCarga" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "processId" UUID NOT NULL,
    CONSTRAINT fk_evidence_process FOREIGN KEY ("processId")
        REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_process ON internal_disciplinary_control.evidence("processId");
CREATE INDEX IF NOT EXISTS idx_evidence_tipo_documento ON internal_disciplinary_control.evidence("tipoDocumento");

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

-- ============================================
-- TÉRMINOS PROCESALES Y ALERTAS
-- RF006 - GESTIÓN DE TÉRMINOS Y ALERTAS
-- ============================================

-- ============================================
-- TIPOS ENUM para Términos y Alertas
-- ============================================
DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.termino_estado_enum AS ENUM ('pendiente', 'proximo_vencer', 'vencido', 'cumplido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.tipo_festivo_enum AS ENUM ('nacional', 'regional', 'institucional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.tipo_alerta_enum AS ENUM ('email', 'visual', 'sistema');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.estado_alerta_enum AS ENUM ('enviada', 'pendiente', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Tabla: terminos_procesales
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.terminos_procesales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proceso_id UUID NOT NULL,
    numero_proceso VARCHAR(20),
    actuacion VARCHAR(200) NOT NULL,
    responsable_id UUID NOT NULL,
    responsable_nombre VARCHAR(200) NOT NULL,
    email_responsable VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    dias_habiles INTEGER NOT NULL CHECK (dias_habiles > 0 AND dias_habiles <= 180),
    fecha_vencimiento DATE NOT NULL,
    dias_restantes INTEGER NOT NULL CHECK (dias_restantes >= -365),
    estado internal_disciplinary_control.termino_estado_enum NOT NULL DEFAULT 'pendiente',
    alerta_enviada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_cumplimiento DATE,
    observaciones TEXT,
    creado_por_id UUID NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_termino_proceso FOREIGN KEY (proceso_id)
        REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE,
    CONSTRAINT chk_fecha_vencimiento CHECK (fecha_vencimiento >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_terminos_proceso ON internal_disciplinary_control.terminos_procesales(proceso_id);
CREATE INDEX IF NOT EXISTS idx_terminos_responsable ON internal_disciplinary_control.terminos_procesales(responsable_id);
CREATE INDEX IF NOT EXISTS idx_terminos_estado ON internal_disciplinary_control.terminos_procesales(estado);
CREATE INDEX IF NOT EXISTS idx_terminos_fecha_vencimiento ON internal_disciplinary_control.terminos_procesales(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_terminos_dias_restantes ON internal_disciplinary_control.terminos_procesales(dias_restantes);

-- ============================================
-- Tabla: dias_festivos
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.dias_festivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    tipo internal_disciplinary_control.tipo_festivo_enum NOT NULL,
    territorio VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por_id UUID NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_festivo_fecha_tipo_territorio UNIQUE (fecha, tipo, territorio)
);

CREATE INDEX IF NOT EXISTS idx_festivos_fecha ON internal_disciplinary_control.dias_festivos(fecha);
CREATE INDEX IF NOT EXISTS idx_festivos_tipo ON internal_disciplinary_control.dias_festivos(tipo);
CREATE INDEX IF NOT EXISTS idx_festivos_activo ON internal_disciplinary_control.dias_festivos(activo) WHERE activo = TRUE;

-- ============================================
-- Tabla: reglas_alerta
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.reglas_alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL UNIQUE,
    dias_anticipacion INTEGER NOT NULL CHECK (dias_anticipacion > 0 AND dias_anticipacion <= 30),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    enviar_email BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_panel BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion TEXT,
    creado_por_id UUID NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reglas_activa ON internal_disciplinary_control.reglas_alerta(activa) WHERE activa = TRUE;

-- ============================================
-- Tabla: alertas_enviadas
-- ============================================
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.alertas_enviadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    termino_id UUID NOT NULL,
    regla_alerta_id UUID NOT NULL,
    tipo internal_disciplinary_control.tipo_alerta_enum NOT NULL,
    destinatario VARCHAR(200) NOT NULL,
    asunto VARCHAR(500),
    mensaje TEXT,
    estado internal_disciplinary_control.estado_alerta_enum NOT NULL DEFAULT 'pendiente',
    fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP,
    error_mensaje TEXT,
    creado_por_id UUID,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_alerta_termino FOREIGN KEY (termino_id)
        REFERENCES internal_disciplinary_control.terminos_procesales(id) ON DELETE CASCADE,
    CONSTRAINT fk_alerta_regla FOREIGN KEY (regla_alerta_id)
        REFERENCES internal_disciplinary_control.reglas_alerta(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_alertas_termino ON internal_disciplinary_control.alertas_enviadas(termino_id);
CREATE INDEX IF NOT EXISTS idx_alertas_regla ON internal_disciplinary_control.alertas_enviadas(regla_alerta_id);
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON internal_disciplinary_control.alertas_enviadas(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha_envio ON internal_disciplinary_control.alertas_enviadas(fecha_envio);

-- ============================================
-- DATOS INICIALES: Días Festivos Colombia 2025
-- ============================================
INSERT INTO internal_disciplinary_control.dias_festivos (fecha, descripcion, tipo, territorio, activo, creado_por_id)
VALUES
    ('2025-01-01', 'Año Nuevo', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-01-06', 'Día de los Reyes Magos', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-03-24', 'Día de San José', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-04-17', 'Jueves Santo', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-04-18', 'Viernes Santo', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-05-01', 'Día del Trabajo', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-06-23', 'Día de San Pedro y San Pablo', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-07-20', 'Día de la Independencia', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-08-07', 'Batalla de Boyacá', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-08-18', 'Asunción de la Virgen', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-10-13', 'Día de la Raza', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-11-03', 'Todos los Santos', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-11-17', 'Independencia de Cartagena', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-12-08', 'Inmaculada Concepción', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000'),
    ('2025-12-25', 'Navidad', 'nacional', NULL, TRUE, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (fecha, tipo, territorio) DO NOTHING;

-- ============================================
-- DATOS INICIALES: Reglas de Alerta por Defecto
-- ============================================
INSERT INTO internal_disciplinary_control.reglas_alerta (nombre, dias_anticipacion, activa, enviar_email, mostrar_panel, descripcion, creado_por_id)
VALUES
    ('Alerta Crítica - 2 días antes', 2, TRUE, TRUE, TRUE, 'Se envía cuando faltan 2 días hábiles para el vencimiento', '00000000-0000-0000-0000-000000000000'),
    ('Alerta Preventiva - 5 días antes', 5, TRUE, TRUE, TRUE, 'Se envía cuando faltan 5 días hábiles para el vencimiento', '00000000-0000-0000-0000-000000000000'),
    ('Alerta Temprana - 10 días antes', 10, FALSE, FALSE, TRUE, 'Se envía cuando faltan 10 días hábiles para el vencimiento', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Este archivo contiene TODO el schema necesario para el módulo
-- de Control Disciplinario Interno:
--
-- - Tablas principales: disciplinary_news, disciplinary_processes, 
--   legal_autos, auto_versions, evidence
-- - Tablas de términos procesales: terminos_procesales, dias_festivos,
--   reglas_alerta, alertas_enviadas
-- - Tablas de configuración: stage_configuration, system_configuration,
--   disciplinary_professional, sequences
-- - Todos los ENUMs necesarios
-- - Índices para optimización
-- - Datos iniciales: días festivos y reglas de alerta
--
-- NOTA: Este schema es idempotente y puede ejecutarse múltiples veces
-- usando CREATE TABLE IF NOT EXISTS y ON CONFLICT para evitar duplicados.
-- ============================================
