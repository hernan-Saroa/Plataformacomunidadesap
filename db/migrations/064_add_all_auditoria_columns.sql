-- ============================================
-- Migración: Agregar todas las columnas y tablas relacionadas para Auditoria
-- Fecha: 2026-01-04
-- Descripción: Script completo para crear todas las tablas relacionadas y columnas faltantes
-- ============================================

-- ============================================
-- PARTE 1: Agregar columna descripcion a auditoria
-- ============================================

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ============================================
-- PARTE 2: Crear tablas relacionadas si no existen
-- ============================================

-- Tabla objetivo_auditoria (IDs autoincrementales - SERIAL)
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

-- Tabla criterio_auditoria (IDs autoincrementales - SERIAL)
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

CREATE INDEX IF NOT EXISTS idx_criterio_auditoria ON control_interno.criterio_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_criterio_auditoria_activo ON control_interno.criterio_auditoria(activo);

-- Tabla equipo_auditor (IDs autoincrementales - SERIAL)
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

CREATE INDEX IF NOT EXISTS idx_equipo_auditor_auditoria ON control_interno.equipo_auditor(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_persona ON control_interno.equipo_auditor(persona_id);
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_activo ON control_interno.equipo_auditor(activo);

-- Tabla auditoria_territorial_info (IDs autoincrementales - SERIAL)
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

-- Tabla auditoria_especial_info (IDs autoincrementales - SERIAL)
CREATE TABLE IF NOT EXISTS control_interno.auditoria_especial_info (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID UNIQUE NOT NULL,
    tipo_motivo VARCHAR(255) NOT NULL,
    solicitante VARCHAR(255) NOT NULL,
    justificacion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_especial_info FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auditoria_especial_info_auditoria ON control_interno.auditoria_especial_info(auditoria_id);

-- ============================================
-- PARTE 3: Agregar columnas faltantes a auditoria
-- ============================================

-- Campos del Kanban
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS estado_kanban VARCHAR(50);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS riesgo_kanban VARCHAR(20);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS semaforo VARCHAR(20) DEFAULT 'verde';

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS tipo_kanban VARCHAR(50) DEFAULT 'regular';

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS prioridad_kanban VARCHAR(20) DEFAULT 'media';

-- Campos adicionales
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS area_objetivo VARCHAR(255);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS permite_cambiar_objetivos BOOLEAN DEFAULT true;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS calificacion_riesgo VARCHAR(255);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS ultima_actuacion TEXT;

-- Métricas calculadas
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS dias_restantes INTEGER;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS porcentaje_tiempo INTEGER;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS total_documentos INTEGER DEFAULT 0;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS total_informes INTEGER DEFAULT 0;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS total_tareas INTEGER DEFAULT 0;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS actividades_completas BOOLEAN DEFAULT false;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS actividades_pendientes INTEGER DEFAULT 0;

-- Foreign Keys a auth.personas
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS auditor_lider_id BIGINT;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS auditor_asignado_id BIGINT;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS supervisor_asignado_id BIGINT;

-- Campos adicionales del formulario
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS alcance TEXT;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS proceso_auditado VARCHAR(500);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS responsable_area_nombre VARCHAR(255);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS responsable_area_cargo VARCHAR(255);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS responsable_area_email VARCHAR(255);

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS fecha_reunion_apertura TIMESTAMP;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS observaciones_adicionales TEXT;

-- Estado de checkboxes de actividades (JSON)
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS checklist_completados JSONB;

-- Metadata del programa anual
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS programa_anual_metadata JSONB;

-- Soft delete / Archivo
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS archivada BOOLEAN DEFAULT false;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS fecha_archivo TIMESTAMP;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP;

-- ============================================
-- PARTE 4: Crear índices para mejor rendimiento
-- ============================================

CREATE INDEX IF NOT EXISTS idx_auditoria_estado_kanban ON control_interno.auditoria(estado_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_semaforo ON control_interno.auditoria(semaforo);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo_kanban ON control_interno.auditoria(tipo_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_prioridad_kanban ON control_interno.auditoria(prioridad_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_riesgo_kanban ON control_interno.auditoria(riesgo_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_lider ON control_interno.auditoria(auditor_lider_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_asignado ON control_interno.auditoria(auditor_asignado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_supervisor ON control_interno.auditoria(supervisor_asignado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_activa ON control_interno.auditoria(activa);

-- ============================================
-- PARTE 5: Comentarios en las columnas
-- ============================================

COMMENT ON COLUMN control_interno.auditoria.descripcion IS 'Descripción detallada de la auditoría';
COMMENT ON COLUMN control_interno.auditoria.estado_kanban IS 'Estado de la auditoría en el Kanban';
COMMENT ON COLUMN control_interno.auditoria.activa IS 'Indica si la auditoría está activa';