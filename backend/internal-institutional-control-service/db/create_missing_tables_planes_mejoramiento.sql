-- Script para crear las tablas faltantes para planes de mejoramiento
-- Estas tablas son requeridas por las entidades TypeORM pero no existen en el schema

-- ============================================
-- Tabla: accion_correctiva
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.accion_correctiva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'correctiva' CHECK (tipo IN ('correctiva', 'preventiva', 'mejora')),
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    recursos TEXT,
    indicador VARCHAR(500),
    meta_indicador VARCHAR(500),
    estado VARCHAR(50) NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'en-progreso', 'implementada', 'vencida', 'completada')),
    porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    observaciones TEXT,
    evidencias JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accion_correctiva_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE
);

CREATE INDEX idx_accion_correctiva_plan ON control_interno.accion_correctiva(plan_id);
CREATE INDEX idx_accion_correctiva_estado ON control_interno.accion_correctiva(estado);

-- ============================================
-- Tabla: seguimiento_trimestral
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.seguimiento_trimestral (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    año INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    fecha_seguimiento DATE,
    avance_global INTEGER DEFAULT 0 CHECK (avance_global BETWEEN 0 AND 100),
    porcentaje_cumplimiento INTEGER DEFAULT 0 CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100),
    porcentaje_efectividad INTEGER DEFAULT 0 CHECK (porcentaje_efectividad BETWEEN 0 AND 100),
    acciones_revisadas INTEGER DEFAULT 0,
    acciones_totales INTEGER DEFAULT 0,
    observaciones_generales TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seguimiento_trimestral_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE
);

CREATE INDEX idx_seguimiento_trimestral_plan ON control_interno.seguimiento_trimestral(plan_id);
CREATE INDEX idx_seguimiento_trimestral_trimestre ON control_interno.seguimiento_trimestral(trimestre, año);

-- ============================================
-- Tabla: registro_seguimiento
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.registro_seguimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion_id UUID NOT NULL,
    seguimiento_id UUID NOT NULL,
    accion_descripcion TEXT NOT NULL,
    acciones_programadas INTEGER DEFAULT 1,
    acciones_implementadas INTEGER DEFAULT 0,
    puntaje_cumplimiento INTEGER DEFAULT 0 CHECK (puntaje_cumplimiento BETWEEN 0 AND 2),
    controles_implementados VARCHAR(20) NOT NULL CHECK (controles_implementados IN ('SI', 'NO', 'PARCIAL')),
    hallazgo_se_repite VARCHAR(20) NOT NULL CHECK (hallazgo_se_repite IN ('SI', 'NO')),
    puntaje_efectividad INTEGER DEFAULT 0 CHECK (puntaje_efectividad BETWEEN 0 AND 2),
    observaciones TEXT,
    evidencias JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registro_seguimiento_accion FOREIGN KEY (accion_id) 
        REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE,
    CONSTRAINT fk_registro_seguimiento_seguimiento FOREIGN KEY (seguimiento_id) 
        REFERENCES control_interno.seguimiento_trimestral(id) ON DELETE CASCADE
);

CREATE INDEX idx_registro_seguimiento_accion ON control_interno.registro_seguimiento(accion_id);
CREATE INDEX idx_registro_seguimiento_seguimiento ON control_interno.registro_seguimiento(seguimiento_id);

