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
    "kanbanStage" VARCHAR(50),
    "kanbanNotice" TEXT,
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
    numero VARCHAR(50),
    contenido TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'BORRADOR',
    "firmaUrl" TEXT,
    "documentUrl" TEXT,
    "documentName" TEXT,
    "documentType" TEXT,
    "documentSize" INTEGER,
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
-- NOTA: El campo 'url' puede almacenar tanto rutas relativas de archivos locales
-- como URLs externas completas (http:// o https://). Por eso se usa TEXT en lugar de VARCHAR.
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL, -- Cambiado a TEXT para soportar URLs externas largas
    "archivoUrl" VARCHAR(255), -- Mantener compatibilidad con TypeORM
    "nombreArchivo" VARCHAR(255), -- Mantener compatibilidad con TypeORM
    filename VARCHAR(255),
    description TEXT,
    "fileType" VARCHAR(100),
    "fileSize" INTEGER,
    "nombreDocumento" VARCHAR(255),
    "tipoDocumento" VARCHAR(50),
    categoria VARCHAR(50),
    destinatario VARCHAR(255),
    asunto VARCHAR(255),
    participantes INTEGER,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Función para actualizar automáticamente updatedAt en stage_configuration
CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar automáticamente updatedAt en stage_configuration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_stage_configuration_timestamp'
    ) THEN
        CREATE TRIGGER update_stage_configuration_timestamp
            BEFORE UPDATE ON internal_disciplinary_control.stage_configuration
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();
    END IF;
END $$;

-- Comentarios en las columnas de stage_configuration
COMMENT ON COLUMN internal_disciplinary_control.stage_configuration."createdAt" IS 'Fecha de creación del registro';
COMMENT ON COLUMN internal_disciplinary_control.stage_configuration."updatedAt" IS 'Fecha de última actualización del registro';

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
-- NOTA: Usamos un índice único con expresión para manejar NULLs correctamente.
-- PostgreSQL trata cada NULL como único en restricciones UNIQUE normales,
-- pero con un índice único usando COALESCE podemos prevenir duplicados.
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.dias_festivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    tipo internal_disciplinary_control.tipo_festivo_enum NOT NULL,
    territorio VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por_id UUID NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- NOTA: El índice único se crea después de limpiar duplicados (ver sección de migraciones)
-- para evitar errores si ya existen duplicados en la tabla

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
-- NOTA: Usamos INSERT con WHERE NOT EXISTS porque el índice único usa COALESCE
-- y ON CONFLICT no puede usar expresiones directamente
INSERT INTO internal_disciplinary_control.dias_festivos (fecha, descripcion, tipo, territorio, activo, creado_por_id)
SELECT * FROM (VALUES
    ('2025-01-01'::DATE, 'Año Nuevo', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-01-06'::DATE, 'Día de los Reyes Magos', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-03-24'::DATE, 'Día de San José', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-04-17'::DATE, 'Jueves Santo', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-04-18'::DATE, 'Viernes Santo', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-05-01'::DATE, 'Día del Trabajo', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-06-23'::DATE, 'Día de San Pedro y San Pablo', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-07-20'::DATE, 'Día de la Independencia', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-08-07'::DATE, 'Batalla de Boyacá', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-08-18'::DATE, 'Asunción de la Virgen', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-10-13'::DATE, 'Día de la Raza', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-11-03'::DATE, 'Todos los Santos', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-11-17'::DATE, 'Independencia de Cartagena', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-12-08'::DATE, 'Inmaculada Concepción', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID),
    ('2025-12-25'::DATE, 'Navidad', 'nacional'::internal_disciplinary_control.tipo_festivo_enum, NULL::VARCHAR(100), TRUE, '00000000-0000-0000-0000-000000000000'::UUID)
) AS v(fecha, descripcion, tipo, territorio, activo, creado_por_id)
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.dias_festivos df
    WHERE df.fecha = v.fecha 
    AND df.tipo = v.tipo 
    AND COALESCE(df.territorio, '') = COALESCE(v.territorio, '')
);

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
-- VERIFICACIÓN Y CORRECCIÓN DE COLUMNAS FALTANTES
-- ============================================
-- Agregar columnas que puedan faltar en tablas existentes

-- Agregar columna pruebas a disciplinary_processes si no existe
DO $$
DECLARE
    table_name_found TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'pruebas'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN pruebas TEXT[];
    END IF;

    -- Agregar columnas de estadísticas si no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'drafts_count'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN drafts_count INTEGER DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'documents_count'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN documents_count INTEGER DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_processes'
        AND column_name = 'time_percentage'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_processes
        ADD COLUMN time_percentage DECIMAL(5,2) DEFAULT 0.00 NOT NULL;
    END IF;

    -- Agregar columnas a disciplinary_news si no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_news'
        AND column_name = 'fechaQueja'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_news
        ADD COLUMN "fechaQueja" TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_news'
        AND column_name = 'conductas'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_news
        ADD COLUMN conductas TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_news'
        AND column_name = 'kanbanStage'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_news
        ADD COLUMN "kanbanStage" VARCHAR(50) DEFAULT 'RECEPCION';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_news'
        AND column_name = 'historialAuditoria'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_news
        ADD COLUMN "historialAuditoria" JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Verificar y agregar columna observaciones a tabla de relación si existe
    -- (TypeORM puede crear tablas de relación automáticamente)
    -- Buscar directamente en el catálogo de PostgreSQL usando pg_class
    BEGIN
        -- Buscar la tabla usando pg_class (más confiable que pg_tables para nombres con comillas)
        SELECT c.relname INTO table_name_found
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'internal_disciplinary_control'
        AND c.relkind = 'r'
        AND (
            c.relname = 'DisciplinaryProcess__DisciplinaryProcess_news'
            OR c.relname = 'disciplinaryprocess__disciplinaryprocess_news'
            OR c.relname = 'disciplinary_process__disciplinary_process_news'
            OR c.relname ILIKE '%disciplinaryprocess%news%'
        )
        LIMIT 1;

        -- Si se encontró la tabla, agregar la columna si no existe
        IF table_name_found IS NOT NULL THEN
            -- Verificar si la columna ya existe
            IF NOT EXISTS (
                SELECT 1 
                FROM pg_attribute a
                JOIN pg_class c ON a.attrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'internal_disciplinary_control'
                AND c.relname = table_name_found
                AND a.attname = 'observaciones'
                AND a.attnum > 0
                AND NOT a.attisdropped
            ) THEN
                -- Agregar la columna usando el nombre exacto encontrado
                EXECUTE format('ALTER TABLE internal_disciplinary_control.%I ADD COLUMN observaciones TEXT', table_name_found);
            END IF;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Si hay algún error en la búsqueda, intentar agregar directamente con el nombre del error
            BEGIN
                -- Verificar si la tabla existe con el nombre exacto del error
                IF EXISTS (
                    SELECT 1 
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'internal_disciplinary_control'
                    AND c.relname = 'DisciplinaryProcess__DisciplinaryProcess_news'
                    AND c.relkind = 'r'
                ) THEN
                    -- Verificar si la columna no existe
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM pg_attribute a
                        JOIN pg_class c ON a.attrelid = c.oid
                        JOIN pg_namespace n ON c.relnamespace = n.oid
                        WHERE n.nspname = 'internal_disciplinary_control'
                        AND c.relname = 'DisciplinaryProcess__DisciplinaryProcess_news'
                        AND a.attname = 'observaciones'
                        AND a.attnum > 0
                        AND NOT a.attisdropped
                    ) THEN
                        EXECUTE 'ALTER TABLE internal_disciplinary_control."DisciplinaryProcess__DisciplinaryProcess_news" ADD COLUMN observaciones TEXT';
                    END IF;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    NULL;
            END;
    END;

    -- Verificación adicional: intentar agregar la columna directamente
    -- (por si la búsqueda anterior no funcionó)
    BEGIN
        EXECUTE 'ALTER TABLE internal_disciplinary_control."DisciplinaryProcess__DisciplinaryProcess_news" ADD COLUMN observaciones TEXT';
    EXCEPTION
        WHEN duplicate_column THEN
            -- La columna ya existe, perfecto
            NULL;
        WHEN undefined_table THEN
            -- La tabla no existe, no hacer nada
            NULL;
        WHEN OTHERS THEN
            -- Cualquier otro error, ignorar
            NULL;
    END;
END $$;

-- ============================================
-- FIX DIRECTO: Agregar columna observaciones a tabla de relación
-- ============================================
-- Este bloque se ejecuta independientemente para asegurar que la columna exista
DO $$
BEGIN
    -- Intentar agregar la columna directamente (maneja todos los errores posibles)
    BEGIN
        ALTER TABLE internal_disciplinary_control."DisciplinaryProcess__DisciplinaryProcess_news" 
        ADD COLUMN observaciones TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Columna observaciones ya existe en DisciplinaryProcess__DisciplinaryProcess_news';
        WHEN undefined_table THEN
            RAISE NOTICE 'Tabla DisciplinaryProcess__DisciplinaryProcess_news no existe aún';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error al agregar columna: %', SQLERRM;
    END;
    
    -- Intentar también con nombre en minúsculas por si acaso
    BEGIN
        ALTER TABLE internal_disciplinary_control.disciplinaryprocess__disciplinaryprocess_news 
        ADD COLUMN observaciones TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
            NULL;
        WHEN undefined_table THEN
            NULL;
        WHEN OTHERS THEN
            NULL;
    END;
    
    -- Intentar con guiones bajos
    BEGIN
        ALTER TABLE internal_disciplinary_control.disciplinary_process__disciplinary_process_news 
        ADD COLUMN observaciones TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
            NULL;
        WHEN undefined_table THEN
            NULL;
        WHEN OTHERS THEN
            NULL;
    END;
END $$;

-- ============================================
-- FIX: Agregar columna telefono a disciplinary_professional
-- ============================================
DO $$
BEGIN
    -- Verificamos si disciplinary_professional tiene telefono
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_professional'
        AND column_name = 'telefono'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_professional
        ADD COLUMN "telefono" VARCHAR(50);
        RAISE NOTICE 'Columna telefono agregada a tabla disciplinary_professional';
    END IF;

    -- Verificamos si disciplinary_professional tiene especialidad
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_professional'
        AND column_name = 'especialidad'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_professional
        ADD COLUMN "especialidad" VARCHAR(100);
        RAISE NOTICE 'Columna especialidad agregada a tabla disciplinary_professional';
    END IF;

    -- Verificamos si disciplinary_professional tiene tipo_contrato
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_professional'
        AND column_name = 'tipo_contrato'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_professional
        ADD COLUMN "tipo_contrato" VARCHAR(50);
        RAISE NOTICE 'Columna tipo_contrato agregada a tabla disciplinary_professional';
    END IF;

    -- Verificamos si disciplinary_professional tiene territorial
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_professional'
        AND column_name = 'territorial'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_professional
        ADD COLUMN "territorial" VARCHAR(100);
        RAISE NOTICE 'Columna territorial agregada a tabla disciplinary_professional';
    END IF;

    -- Verificamos si disciplinary_professional tiene capacidad_maxima
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'disciplinary_professional'
        AND column_name = 'capacidad_maxima'
    ) THEN
        ALTER TABLE internal_disciplinary_control.disciplinary_professional
        ADD COLUMN "capacidad_maxima" INTEGER DEFAULT 10;
        RAISE NOTICE 'Columna capacidad_maxima agregada a tabla disciplinary_professional';
    END IF;
END $$;

-- ============================================
-- MIGRACIONES: Actualizar tablas existentes
-- ============================================
-- Estas migraciones actualizan tablas existentes para soportar nuevas funcionalidades

-- Migración: Cambiar campo 'url' de VARCHAR(255) a TEXT en tabla evidence
-- para soportar URLs externas largas (http:// o https://)
DO $$
BEGIN
    -- 1. url (TEXT)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'url') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "url" TEXT;
        RAISE NOTICE 'Columna url agregada a tabla evidence';
    END IF;
    -- Ajustar tipo url a TEXT si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'url' AND data_type = 'character varying' AND character_maximum_length = 255) THEN
        ALTER TABLE internal_disciplinary_control.evidence ALTER COLUMN url TYPE TEXT;
        RAISE NOTICE 'Campo url actualizado a TEXT';
    END IF;

    -- 2. archivoUrl (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'archivoUrl') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "archivoUrl" VARCHAR;
        RAISE NOTICE 'Columna archivoUrl agregada';
    END IF;

    -- 3. nombreArchivo (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'nombreArchivo') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "nombreArchivo" VARCHAR;
        RAISE NOTICE 'Columna nombreArchivo agregada';
    END IF;

    -- 4. filename (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'filename') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "filename" VARCHAR;
        RAISE NOTICE 'Columna filename agregada';
    END IF;

    -- 5. description (VARCHAR/TEXT)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'description') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "description" TEXT;
        RAISE NOTICE 'Columna description agregada';
    END IF;

    -- 6. fileType (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'fileType') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "fileType" VARCHAR;
        RAISE NOTICE 'Columna fileType agregada';
    END IF;

    -- 7. fileSize (INTEGER)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'fileSize') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "fileSize" INTEGER;
        RAISE NOTICE 'Columna fileSize agregada';
    END IF;

    -- 8. nombreDocumento (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'nombreDocumento') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "nombreDocumento" VARCHAR;
        RAISE NOTICE 'Columna nombreDocumento agregada';
    END IF;

    -- 9. tipoDocumento (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'tipoDocumento') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "tipoDocumento" VARCHAR;
        RAISE NOTICE 'Columna tipoDocumento agregada';
    END IF;

    -- 10. tipo (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'tipo') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "tipo" VARCHAR DEFAULT 'DOCUMENTO';
        RAISE NOTICE 'Columna tipo agregada';
    END IF;

    -- 11. categoria (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'categoria') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "categoria" VARCHAR;
        RAISE NOTICE 'Columna categoria agregada';
    END IF;

    -- 12. destinatario (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'destinatario') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "destinatario" VARCHAR;
        RAISE NOTICE 'Columna destinatario agregada';
    END IF;

    -- 13. asunto (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'asunto') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "asunto" VARCHAR;
        RAISE NOTICE 'Columna asunto agregada';
    END IF;

    -- 14. participantes (INTEGER) - Int type inferred from entity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'participantes') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "participantes" INTEGER;
        RAISE NOTICE 'Columna participantes agregada';
    END IF;

    -- 15. etapa (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'etapa') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "etapa" VARCHAR;
        RAISE NOTICE 'Columna etapa agregada';
    END IF;

    -- 16. usuarioCarga (VARCHAR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'usuarioCarga') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "usuarioCarga" VARCHAR;
        RAISE NOTICE 'Columna usuarioCarga agregada';
    END IF;

    -- 17. createdAt (TIMESTAMP)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'createdAt') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "createdAt" TIMESTAMP DEFAULT now();
        RAISE NOTICE 'Columna createdAt agregada';
    END IF;

    -- 18. processId (UUID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'evidence' AND column_name = 'processId') THEN
        ALTER TABLE internal_disciplinary_control.evidence ADD COLUMN "processId" UUID;
        RAISE NOTICE 'Columna processId agregada';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al actualizar columnas de evidence: %', SQLERRM;
END $$;

-- Migración: Agregar columnas archivoUrl y nombreArchivo si no existen
-- (para compatibilidad con TypeORM)
DO $$
BEGIN
    -- Agregar columna archivoUrl si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'evidence'
        AND column_name = 'archivoUrl'
    ) THEN
        ALTER TABLE internal_disciplinary_control.evidence
        ADD COLUMN "archivoUrl" VARCHAR(255);
        
        RAISE NOTICE 'Columna archivoUrl agregada a tabla evidence';
    END IF;

    -- Agregar columna nombreArchivo si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'evidence'
        AND column_name = 'nombreArchivo'
    ) THEN
        ALTER TABLE internal_disciplinary_control.evidence
        ADD COLUMN "nombreArchivo" VARCHAR(255);
        
        RAISE NOTICE 'Columna nombreArchivo agregada a tabla evidence';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al agregar columnas archivoUrl/nombreArchivo: %', SQLERRM;
END $$;

-- Migración: Agregar createdAt y updatedAt a stage_configuration si no existen
-- y crear trigger para actualización automática
DO $$
BEGIN
    -- Agregar columna createdAt si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'stage_configuration'
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE internal_disciplinary_control.stage_configuration
        ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Columna createdAt agregada a tabla stage_configuration';
    ELSE
        -- Si existe pero no es NOT NULL, actualizarla
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns
            WHERE table_schema = 'internal_disciplinary_control'
            AND table_name = 'stage_configuration'
            AND column_name = 'createdAt'
            AND is_nullable = 'YES'
        ) THEN
            -- Primero actualizar valores NULL
            UPDATE internal_disciplinary_control.stage_configuration
            SET "createdAt" = CURRENT_TIMESTAMP
            WHERE "createdAt" IS NULL;
            
            -- Luego hacerla NOT NULL
            ALTER TABLE internal_disciplinary_control.stage_configuration
            ALTER COLUMN "createdAt" SET NOT NULL;
            
            RAISE NOTICE 'Columna createdAt actualizada a NOT NULL en tabla stage_configuration';
        END IF;
    END IF;

    -- Agregar columna updatedAt si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns
        WHERE table_schema = 'internal_disciplinary_control'
        AND table_name = 'stage_configuration'
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE internal_disciplinary_control.stage_configuration
        ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Columna updatedAt agregada a tabla stage_configuration';
    ELSE
        -- Si existe pero no es NOT NULL, actualizarla
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns
            WHERE table_schema = 'internal_disciplinary_control'
            AND table_name = 'stage_configuration'
            AND column_name = 'updatedAt'
            AND is_nullable = 'YES'
        ) THEN
            -- Primero actualizar valores NULL
            UPDATE internal_disciplinary_control.stage_configuration
            SET "updatedAt" = CURRENT_TIMESTAMP
            WHERE "updatedAt" IS NULL;
            
            -- Luego hacerla NOT NULL
            ALTER TABLE internal_disciplinary_control.stage_configuration
            ALTER COLUMN "updatedAt" SET NOT NULL;
            
            RAISE NOTICE 'Columna updatedAt actualizada a NOT NULL en tabla stage_configuration';
        END IF;
    END IF;

    -- Actualizar filas existentes con timestamps actuales si son NULL
    UPDATE internal_disciplinary_control.stage_configuration
    SET "createdAt" = CURRENT_TIMESTAMP
    WHERE "createdAt" IS NULL;

    UPDATE internal_disciplinary_control.stage_configuration
    SET "updatedAt" = CURRENT_TIMESTAMP
    WHERE "updatedAt" IS NULL;

    -- Crear función del trigger si no existe
    CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $func$ language 'plpgsql';

    -- Crear trigger si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_stage_configuration_timestamp'
    ) THEN
        CREATE TRIGGER update_stage_configuration_timestamp
            BEFORE UPDATE ON internal_disciplinary_control.stage_configuration
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();
        
        RAISE NOTICE 'Trigger update_stage_configuration_timestamp creado';
    END IF;

    -- Agregar comentarios en las columnas
    COMMENT ON COLUMN internal_disciplinary_control.stage_configuration."createdAt" IS 'Fecha de creación del registro';
    COMMENT ON COLUMN internal_disciplinary_control.stage_configuration."updatedAt" IS 'Fecha de última actualización del registro';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en migración de stage_configuration: %', SQLERRM;
END $$;

-- Migración: Limpiar días festivos duplicados
-- El problema es que cuando territorio es NULL, PostgreSQL permite múltiples filas
-- con la misma combinación (fecha, tipo, NULL) porque NULL != NULL en restricciones únicas
DO $$
DECLARE
    duplicados_count INTEGER;
BEGIN
    -- PASO 1: Eliminar el índice único si existe (para poder limpiar duplicados)
    BEGIN
        DROP INDEX IF EXISTS internal_disciplinary_control.idx_unique_festivo_fecha_tipo_territorio;
        RAISE NOTICE 'Índice único eliminado temporalmente para limpiar duplicados';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo eliminar el índice (puede que no exista): %', SQLERRM;
    END;

    -- PASO 2: Eliminar duplicados, manteniendo solo el más reciente (o el primero si tienen la misma fecha)
    WITH duplicados AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY fecha, tipo, COALESCE(territorio::text, '')
                   ORDER BY fecha_creacion DESC, id
               ) as rn
        FROM internal_disciplinary_control.dias_festivos
    )
    DELETE FROM internal_disciplinary_control.dias_festivos
    WHERE id IN (
        SELECT id FROM duplicados WHERE rn > 1
    );
    
    GET DIAGNOSTICS duplicados_count = ROW_COUNT;
    
    IF duplicados_count > 0 THEN
        RAISE NOTICE 'Eliminados % días festivos duplicados', duplicados_count;
    END IF;

    -- PASO 3: Eliminar cualquier restricción única existente si existe
    BEGIN
        ALTER TABLE internal_disciplinary_control.dias_festivos
        DROP CONSTRAINT IF EXISTS uq_festivo_fecha_tipo_territorio;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    -- PASO 4: Crear el índice único después de limpiar duplicados
    -- Esto asegura que solo haya un registro por (fecha, tipo, territorio)
    -- donde territorio puede ser NULL
    BEGIN
        CREATE UNIQUE INDEX idx_unique_festivo_fecha_tipo_territorio
        ON internal_disciplinary_control.dias_festivos (
            fecha, 
            tipo, 
            COALESCE(territorio, '')
        );
        
        RAISE NOTICE 'Índice único creado para días festivos';
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'El índice único ya existe';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error al crear índice único: %', SQLERRM;
    END;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al limpiar días festivos duplicados: %', SQLERRM;
END $$;

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
-- FUNCIONALIDADES ESPECIALES:
-- - Soporte para URLs externas en tabla evidence:
--   El campo 'url' puede almacenar tanto rutas relativas de archivos locales
--   como URLs externas completas (http:// o https://). Por eso se usa TEXT.
--   El backend detecta automáticamente si es URL externa o archivo local.
--
-- - Timestamps automáticos en stage_configuration:
--   La tabla stage_configuration incluye columnas createdAt y updatedAt con
--   un trigger que actualiza automáticamente updatedAt en cada modificación.
--   Incluye función update_updated_at_column() y trigger update_stage_configuration_timestamp.
--
-- MIGRACIONES INCLUIDAS:
-- - Migración 030: Agregar createdAt y updatedAt a stage_configuration
--   (incluye función del trigger y trigger automático)
-- - Migración: Actualizar campo url de evidence de VARCHAR(255) a TEXT
-- - Migración: Agregar columnas archivoUrl y nombreArchivo a evidence
--
-- NOTA: Este schema es idempotente y puede ejecutarse múltiples veces
-- usando CREATE TABLE IF NOT EXISTS y ON CONFLICT para evitar duplicados.
-- Las migraciones al final actualizan tablas existentes automáticamente.
-- ============================================
