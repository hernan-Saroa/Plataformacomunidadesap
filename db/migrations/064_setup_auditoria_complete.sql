-- ============================================
-- MIGRACIÓN CONSOLIDADA: Sistema de Auditoría Completo
-- ============================================
-- Fecha: 2026-01-09
-- Descripción: Consolidación de migraciones 064, 067-069, 071-074, 082
--              Crea/actualiza todas las estructuras del módulo de auditoría
--              Incluye: tablas relacionadas, ampliación de plazo, notificaciones, historial
-- ============================================

-- ===========================================
-- SECCIÓN 0: CREAR SCHEMA Y TABLA BASE
-- ===========================================

-- Crear schema si no existe
CREATE SCHEMA IF NOT EXISTS control_interno;

-- Crear tabla auditoria si no existe (estructura base)
CREATE TABLE IF NOT EXISTS control_interno.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    estado VARCHAR(50),
    territorial BOOLEAN DEFAULT false,
    fecha_inicio DATE,
    fecha_fin DATE,
    progreso INTEGER DEFAULT 0,
    hallazgos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice básico
CREATE INDEX IF NOT EXISTS idx_auditoria_codigo ON control_interno.auditoria(codigo);

-- Crear tabla historial_auditoria si no existe (estructura base)
CREATE TABLE IF NOT EXISTS control_interno.historial_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    accion VARCHAR(255) NOT NULL,
    descripcion TEXT,
    observaciones TEXT,
    documento_adjunto VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    cambios JSONB DEFAULT '[]'::jsonb,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

-- Crear índices básicos para historial
CREATE INDEX IF NOT EXISTS idx_historial_auditoria ON control_interno.historial_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON control_interno.historial_auditoria(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON control_interno.historial_auditoria(fecha DESC, hora DESC);

-- Crear tabla notificacion si no existe (estructura completa)
CREATE TABLE IF NOT EXISTS control_interno.notificacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(255) NOT NULL,
    tipo_notificacion VARCHAR(100) NOT NULL CHECK (tipo_notificacion IN (
        'anuncio_auditoria', 'recordatorio_plazo', 'alerta_vencimiento',
        'hallazgo_identificado', 'solicitud_evidencia', 'recepcion_documento',
        'aprobacion_plan', 'rechazo_plan', 'controversia_hallazgo',
        'validacion_evidencia', 'solicitud_ampliacion_plazo', 
        'ampliacion_plazo_aprobada', 'ampliacion_plazo_rechazada', 'otro'
    )),
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'leida', 'archivada')),
    canal VARCHAR(50) DEFAULT 'sistema' CHECK (canal IN ('email', 'sistema', 'ambos')),
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP,
    enviada_email BOOLEAN DEFAULT FALSE,
    fecha_envio_email TIMESTAMP,
    metadata JSONB,
    accion_url VARCHAR(500),
    prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'critica')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para notificacion
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario ON control_interno.notificacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacion_estado ON control_interno.notificacion(estado);
CREATE INDEX IF NOT EXISTS idx_notificacion_created ON control_interno.notificacion(created_at);
CREATE INDEX IF NOT EXISTS idx_notificacion_tipo ON control_interno.notificacion(tipo_notificacion);

-- Crear tabla preferencia_notificacion si no existe (estructura completa)
CREATE TABLE IF NOT EXISTS control_interno.preferencia_notificacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(255) UNIQUE NOT NULL,
    notificaciones_email BOOLEAN DEFAULT TRUE,
    notificaciones_sistema BOOLEAN DEFAULT TRUE,
    frecuencia_recordatorios VARCHAR(50),
    tipos_notificacion JSONB,
    horario_preferido VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para preferencia_notificacion
CREATE INDEX IF NOT EXISTS idx_preferencia_usuario ON control_interno.preferencia_notificacion(usuario_id);

-- Crear tabla proceso_auditable (para migración 065)
CREATE TABLE IF NOT EXISTS control_interno.proceso_auditable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50),
    macroproceso VARCHAR(255),
    responsable VARCHAR(255),
    dependencia VARCHAR(255),
    territorial BOOLEAN DEFAULT false,
    evaluacion_riesgo JSONB,
    frecuencia_auditoria VARCHAR(50),
    ultima_auditoria DATE,
    proxima_auditoria DATE,
    prioridad INTEGER,
    priorizacion_anos INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proceso_auditable_codigo ON control_interno.proceso_auditable(codigo);
CREATE INDEX IF NOT EXISTS idx_proceso_auditable_tipo ON control_interno.proceso_auditable(tipo);
CREATE INDEX IF NOT EXISTS idx_proceso_auditable_macroproceso ON control_interno.proceso_auditable(macroproceso);

-- Crear tabla plan_anual_5_roles (para migración 066)
-- Si existe con esquema incorrecto, la eliminamos y recreamos
DROP TABLE IF EXISTS control_interno.plan_anual_5_roles CASCADE;

CREATE TABLE control_interno.plan_anual_5_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano INTEGER NOT NULL,
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    responsable VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en-revision', 'aprobado', 'en-ejecucion', 'completado')),
    porcentaje_cumplimiento_general INTEGER DEFAULT 0,
    total_actividades INTEGER DEFAULT 0,
    actividades_completadas INTEGER DEFAULT 0,
    actividades_en_progreso INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plan_anual_ano UNIQUE(ano)
);

CREATE INDEX idx_plan_anual_5_roles_ano ON control_interno.plan_anual_5_roles(ano);
CREATE INDEX idx_plan_anual_5_roles_estado ON control_interno.plan_anual_5_roles(estado);

-- ===========================================
-- SECCIÓN 1: TABLA PRINCIPAL AUDITORIA
-- ===========================================

-- Columnas básicas
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS alcance TEXT;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS proceso_auditado VARCHAR(500);

-- Campos del Kanban
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS estado_kanban VARCHAR(50);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS riesgo_kanban VARCHAR(20);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS semaforo VARCHAR(20) DEFAULT 'verde';
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS tipo_kanban VARCHAR(50) DEFAULT 'regular';
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS prioridad_kanban VARCHAR(20) DEFAULT 'media';

-- Área objetivo y permisos
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS area_objetivo VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS permite_cambiar_objetivos BOOLEAN DEFAULT true;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS calificacion_riesgo VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS ultima_actuacion TEXT;

-- Métricas calculadas
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS dias_restantes INTEGER;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS porcentaje_tiempo INTEGER;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS total_documentos INTEGER DEFAULT 0;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS total_informes INTEGER DEFAULT 0;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS total_tareas INTEGER DEFAULT 0;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS actividades_completas BOOLEAN DEFAULT false;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS actividades_pendientes INTEGER DEFAULT 0;

-- Responsable del área auditada
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS responsable_area_nombre VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS responsable_area_cargo VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS responsable_area_email VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS fecha_reunion_apertura TIMESTAMP;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS observaciones_adicionales TEXT;

-- Datos estructurados JSON
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS checklist_completados JSONB;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS programa_anual_metadata JSONB;

-- Corregir tipo de checklist_completados si existe como INTEGER
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'checklist_completados'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        -- Quitar DEFAULT si existe
        ALTER TABLE control_interno.auditoria 
        ALTER COLUMN checklist_completados DROP DEFAULT;
        
        -- Cambiar tipo a JSONB
        ALTER TABLE control_interno.auditoria 
        ALTER COLUMN checklist_completados TYPE jsonb 
        USING CASE 
            WHEN checklist_completados = 0 THEN '{}'::jsonb
            WHEN checklist_completados IS NULL THEN NULL
            ELSE '{}'::jsonb
        END;
        
        -- Poner nuevo DEFAULT
        ALTER TABLE control_interno.auditoria 
        ALTER COLUMN checklist_completados SET DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Columna checklist_completados convertida de INTEGER a JSONB';
    END IF;
END $$;

-- Soft delete / Archivo
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS archivada BOOLEAN DEFAULT false;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS fecha_archivo TIMESTAMP;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP;

-- ===========================================
-- SECCIÓN 2: AUDITOR IDS (CORREGIR TIPO UUID → BIGINT)
-- ===========================================

DO $$
DECLARE
    v_view RECORD;
    v_views TEXT[] := '{}';
    v_view_def TEXT;
BEGIN
    -- Guardar y eliminar vistas que dependan de auditoria
    FOR v_view IN 
        SELECT DISTINCT 
            schemaname || '.' || viewname as full_view_name,
            schemaname,
            viewname
        FROM pg_views
        WHERE schemaname = 'control_interno'
        AND definition ILIKE '%auditoria%'
    LOOP
        SELECT definition INTO v_view_def
        FROM pg_views
        WHERE schemaname = v_view.schemaname
        AND viewname = v_view.viewname;
        
        v_views := array_append(v_views, v_view.full_view_name || '|||' || v_view_def);
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', v_view.schemaname, v_view.viewname);
    END LOOP;

    -- Eliminar constraints existentes
    ALTER TABLE control_interno.auditoria DROP CONSTRAINT IF EXISTS fk_auditoria_auditor_lider CASCADE;
    ALTER TABLE control_interno.auditoria DROP CONSTRAINT IF EXISTS fk_auditoria_auditor_asignado CASCADE;
    ALTER TABLE control_interno.auditoria DROP CONSTRAINT IF EXISTS fk_auditoria_supervisor_asignado CASCADE;

    -- Agregar columnas si no existen, convertir UUID → BIGINT si existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_lider_id'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN auditor_lider_id BIGINT;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_lider_id'
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE control_interno.auditoria ALTER COLUMN auditor_lider_id TYPE BIGINT USING NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_asignado_id'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN auditor_asignado_id BIGINT;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_asignado_id'
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE control_interno.auditoria ALTER COLUMN auditor_asignado_id TYPE BIGINT USING NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'supervisor_asignado_id'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN supervisor_asignado_id BIGINT;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'supervisor_asignado_id'
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE control_interno.auditoria ALTER COLUMN supervisor_asignado_id TYPE BIGINT USING NULL;
    END IF;

    -- Crear foreign keys
    ALTER TABLE control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_auditor_lider
    FOREIGN KEY (auditor_lider_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;

    ALTER TABLE control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_auditor_asignado
    FOREIGN KEY (auditor_asignado_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;

    ALTER TABLE control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_supervisor_asignado
    FOREIGN KEY (supervisor_asignado_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;

    -- Recrear vistas (intentar)
    IF array_length(v_views, 1) > 0 THEN
        FOR i IN 1..array_length(v_views, 1) LOOP
            DECLARE
                v_parts TEXT[];
                v_full_name TEXT;
                v_definition TEXT;
            BEGIN
                v_parts := string_to_array(v_views[i], '|||');
                v_full_name := v_parts[1];
                v_definition := v_parts[2];
                EXECUTE format('CREATE OR REPLACE VIEW %s AS %s', v_full_name, v_definition);
            EXCEPTION WHEN others THEN NULL;
            END;
        END LOOP;
    END IF;
END $$;

-- Índices en auditores
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_lider ON control_interno.auditoria(auditor_lider_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_asignado ON control_interno.auditoria(auditor_asignado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_supervisor ON control_interno.auditoria(supervisor_asignado_id);

-- ===========================================
-- SECCIÓN 3: ÍNDICES GENERALES AUDITORIA
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_auditoria_estado_kanban ON control_interno.auditoria(estado_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_semaforo ON control_interno.auditoria(semaforo);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo_kanban ON control_interno.auditoria(tipo_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_prioridad_kanban ON control_interno.auditoria(prioridad_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_riesgo_kanban ON control_interno.auditoria(riesgo_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_activa ON control_interno.auditoria(activa);

-- ===========================================
-- SECCIÓN 4: TABLAS RELACIONADAS
-- ===========================================

-- Tabla objetivo_auditoria
CREATE TABLE IF NOT EXISTS control_interno.objetivo_auditoria (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID NOT NULL,
    descripcion TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_objetivo_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_objetivo_auditoria ON control_interno.objetivo_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_objetivo_auditoria_activo ON control_interno.objetivo_auditoria(activo);

-- Tabla criterio_auditoria
CREATE TABLE IF NOT EXISTS control_interno.criterio_auditoria (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID NOT NULL,
    criterio TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_criterio_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_criterio_auditoria_auditoria_id ON control_interno.criterio_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_criterio_auditoria_activo ON control_interno.criterio_auditoria(activo);

-- Tabla equipo_auditor (CORREGIR persona_id de UUID a BIGINT si existe)
CREATE TABLE IF NOT EXISTS control_interno.equipo_auditor (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID NOT NULL,
    persona_id BIGINT NOT NULL,
    rol VARCHAR(100) DEFAULT 'Auditor',
    activo BOOLEAN DEFAULT true,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_retiro TIMESTAMP,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipo_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

-- Corregir tipo de persona_id si existe como UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'equipo_auditor' 
        AND column_name = 'persona_id'
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE control_interno.equipo_auditor DROP CONSTRAINT IF EXISTS fk_equipo_persona;
        DELETE FROM control_interno.equipo_auditor;
        ALTER TABLE control_interno.equipo_auditor DROP COLUMN persona_id;
        ALTER TABLE control_interno.equipo_auditor ADD COLUMN persona_id BIGINT NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipo_auditor_auditoria ON control_interno.equipo_auditor(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_persona ON control_interno.equipo_auditor(persona_id);
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_activo ON control_interno.equipo_auditor(activo);

-- Tabla auditoria_territorial_info
CREATE TABLE IF NOT EXISTS control_interno.auditoria_territorial_info (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    ciudad VARCHAR(255) NOT NULL,
    departamento VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_territorial_info FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auditoria_territorial_info_auditoria ON control_interno.auditoria_territorial_info(auditoria_id);

-- Tabla auditoria_especial_info
CREATE TABLE IF NOT EXISTS control_interno.auditoria_especial_info (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID UNIQUE NOT NULL,
    tipo_motivo VARCHAR(255) NOT NULL,
    solicitante VARCHAR(255) NOT NULL,
    justificacion TEXT NOT NULL,
    fecha_solicitud DATE,
    fecha_aprobacion DATE,
    aprobado_por_id BIGINT,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_especial_info FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT fk_especial_aprobado_por FOREIGN KEY (aprobado_por_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auditoria_especial_info_auditoria ON control_interno.auditoria_especial_info(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_especial_fecha_solicitud ON control_interno.auditoria_especial_info(fecha_solicitud);

-- ===========================================
-- SECCIÓN 5: AMPLIACIÓN DE PLAZO
-- ===========================================

CREATE TABLE IF NOT EXISTS control_interno.ampliacion_plazo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    fecha_fin_original DATE NOT NULL,
    fecha_fin_solicitada DATE NOT NULL,
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_respuesta TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
        CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    justificacion TEXT NOT NULL,
    motivo_rechazo TEXT,
    comentarios TEXT,
    solicitado_por VARCHAR(100) NOT NULL,
    aprobado_rechazado_por VARCHAR(100),
    dias_ampliacion INTEGER GENERATED ALWAYS AS (
        fecha_fin_solicitada - fecha_fin_original
    ) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ampliacion_auditoria 
        FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ampliacion_auditoria ON control_interno.ampliacion_plazo(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_ampliacion_estado ON control_interno.ampliacion_plazo(estado);
CREATE INDEX IF NOT EXISTS idx_ampliacion_fecha_solicitud ON control_interno.ampliacion_plazo(fecha_solicitud DESC);

CREATE OR REPLACE FUNCTION control_interno.update_ampliacion_plazo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ampliacion_plazo_timestamp ON control_interno.ampliacion_plazo;
CREATE TRIGGER trigger_update_ampliacion_plazo_timestamp
    BEFORE UPDATE ON control_interno.ampliacion_plazo
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.update_ampliacion_plazo_timestamp();

-- ===========================================
-- SECCIÓN 6: HISTORIAL AUDITORIA
-- ===========================================

-- Asegurar que usuario_id sea BIGINT con FK a auth.personas(id_tercero)
DO $$
BEGIN
    -- Eliminar constraint antigua si existe
    ALTER TABLE control_interno.historial_auditoria DROP CONSTRAINT IF EXISTS fk_historial_usuario;
    ALTER TABLE control_interno.historial_auditoria DROP CONSTRAINT IF EXISTS fk_historial_auditoria_usuario;
    
    -- Si la columna no existe, crearla como BIGINT
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'historial_auditoria' 
        AND column_name = 'usuario_id'
    ) THEN
        ALTER TABLE control_interno.historial_auditoria ADD COLUMN usuario_id BIGINT;
    END IF;
    
    -- Crear foreign key a auth.personas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'control_interno' 
        AND table_name = 'historial_auditoria' 
        AND constraint_name = 'fk_historial_auditoria_usuario'
    ) THEN
        ALTER TABLE control_interno.historial_auditoria
        ADD CONSTRAINT fk_historial_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;
    END IF;
END $$;

-- Actualizar CHECK constraint de tipo_evento
ALTER TABLE control_interno.historial_auditoria DROP CONSTRAINT IF EXISTS historial_auditoria_tipo_evento_check;
ALTER TABLE control_interno.historial_auditoria 
ADD CONSTRAINT historial_auditoria_tipo_evento_check 
CHECK (tipo_evento IN (
    'creacion', 'cambio_estado', 'asignacion', 'actualizacion', 
    'documento', 'hallazgo', 'nota', 'aprobacion', 'finalizacion',
    'eliminacion', 'archivo', 'ampliacion_plazo'
));

-- ===========================================
-- SECCIÓN 7: NOTIFICACIONES
-- ===========================================

-- Actualizar CHECK constraint tipo_notificacion
ALTER TABLE control_interno.notificacion DROP CONSTRAINT IF EXISTS notificacion_tipo_notificacion_check;
ALTER TABLE control_interno.notificacion
ADD CONSTRAINT notificacion_tipo_notificacion_check 
CHECK (tipo_notificacion IN (
  'anuncio_auditoria', 'recordatorio_plazo', 'alerta_vencimiento',
  'hallazgo_identificado', 'solicitud_evidencia', 'recepcion_documento',
  'aprobacion_plan', 'rechazo_plan', 'controversia_hallazgo',
  'validacion_evidencia', 'solicitud_ampliacion_plazo',
  'ampliacion_plazo_aprobada', 'ampliacion_plazo_rechazada', 'otro'
));

-- ===========================================
-- SECCIÓN 8: PREFERENCIAS DE NOTIFICACIÓN
-- ===========================================

-- Agregar columna horario_preferido si no existe (para BDs existentes)
ALTER TABLE control_interno.preferencia_notificacion 
ADD COLUMN IF NOT EXISTS horario_preferido VARCHAR(50);

-- ===========================================
-- SECCIÓN 9: TRIGGER AUTOMÁTICO DE AUDITORÍA
-- ===========================================

-- Función para registrar cambios de estado automáticamente en auditorías
CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si cambió el estado_kanban
    IF (TG_OP = 'UPDATE' AND OLD.estado_kanban IS DISTINCT FROM NEW.estado_kanban) THEN
        INSERT INTO control_interno.historial_auditoria (
            auditoria_id,
            tipo_evento,
            fecha,
            hora,
            usuario_id,
            accion,
            descripcion,
            estado_anterior,
            estado_nuevo,
            cambios
        ) VALUES (
            NEW.id,
            'cambio_estado',
            CURRENT_DATE,
            CURRENT_TIME,
            1, -- Usuario sistema (ajustar si tienes campo updated_by en auditoria)
            'Cambio de estado automático',
            format('Estado cambiado de "%s" a "%s"', OLD.estado_kanban, NEW.estado_kanban),
            OLD.estado_kanban,
            NEW.estado_kanban,
            jsonb_build_array(
                jsonb_build_object(
                    'campo', 'estado_kanban',
                    'valorAnterior', OLD.estado_kanban,
                    'valorNuevo', NEW.estado_kanban
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar la función
DROP TRIGGER IF EXISTS trg_registrar_cambio_estado_auditoria ON control_interno.auditoria;
CREATE TRIGGER trg_registrar_cambio_estado_auditoria
    AFTER UPDATE ON control_interno.auditoria
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria();

-- ===========================================
-- SECCIÓN 10: COMENTARIOS
-- ===========================================

COMMENT ON TABLE control_interno.ampliacion_plazo IS 'Solicitudes de ampliación de plazo de auditorías';
COMMENT ON COLUMN control_interno.ampliacion_plazo.estado IS 'Estados: pendiente, aprobada, rechazada';
COMMENT ON COLUMN control_interno.ampliacion_plazo.dias_ampliacion IS 'Días de ampliación solicitados (calculado automáticamente)';
COMMENT ON COLUMN control_interno.auditoria.descripcion IS 'Descripción detallada de la auditoría';
COMMENT ON COLUMN control_interno.auditoria.estado_kanban IS 'Estado de la auditoría en el Kanban';
COMMENT ON COLUMN control_interno.auditoria.activa IS 'Indica si la auditoría está activa';
COMMENT ON COLUMN control_interno.auditoria.calificacion_riesgo IS 'Calificación del riesgo de la auditoría (ampliado a 255 caracteres)';
COMMENT ON COLUMN control_interno.preferencia_notificacion.horario_preferido IS 'Horario preferido del usuario para recibir notificaciones';
COMMENT ON COLUMN control_interno.historial_auditoria.usuario_id IS 'ID del usuario que realizó la acción (FK a auth.personas.id_tercero)';
COMMENT ON TABLE control_interno.criterio_auditoria IS 'Criterios de auditoría (normas, políticas, estándares aplicables)';

-- ===========================================
-- SECCIÓN 11: ACTUALIZACIÓN DE CONSTRAINTS
-- ===========================================

-- Actualizar constraint de tipo en tabla auditoria para incluir 'Regular', 'Territorial', 'Especial'
ALTER TABLE control_interno.auditoria 
DROP CONSTRAINT IF EXISTS auditoria_tipo_check;

ALTER TABLE control_interno.auditoria 
ADD CONSTRAINT auditoria_tipo_check 
CHECK (tipo IN ('Gestión', 'Control Interno', 'Académica', 'RRHH', 'Financiera', 'TI', 'Cumplimiento', 'Operacional', 'Regular', 'Territorial', 'Especial'));
