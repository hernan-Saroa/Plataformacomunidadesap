-- =====================================================
-- Migración: Gestión de Riesgos Institucionales
-- Schema: legal_management
-- Módulo: Riesgos (MOD-10)
-- =====================================================

SET search_path TO legal_management, public;

-- =====================================================
-- TABLA: riesgos (Riesgos Institucionales)
-- =====================================================
CREATE TABLE IF NOT EXISTS riesgos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    
    -- Clasificación
    proceso VARCHAR(100) NOT NULL,
    tipo_riesgo VARCHAR(30) NOT NULL 
        CHECK (tipo_riesgo IN ('GESTION', 'CORRUPCION', 'SEGURIDAD_DIGITAL', 'FISCAL')),
    
    -- Etapa del ciclo de gestión
    etapa VARCHAR(30) DEFAULT 'IDENTIFICADO'
        CHECK (etapa IN ('IDENTIFICADO', 'ANALIZADO', 'VALORADO', 'TRATAMIENTO', 'MONITOREO', 'CERRADO', 'MATERIALIZADO')),
    
    -- Valoración Inherente (antes de controles)
    probabilidad_inherente INTEGER DEFAULT 3 CHECK (probabilidad_inherente BETWEEN 1 AND 5),
    impacto_inherente INTEGER DEFAULT 3 CHECK (impacto_inherente BETWEEN 1 AND 5),
    zona_inherente VARCHAR(20) DEFAULT 'MODERADO'
        CHECK (zona_inherente IN ('EXTREMO', 'ALTO', 'MODERADO', 'BAJO')),
    
    -- Valoración Residual (después de controles)
    probabilidad_residual INTEGER DEFAULT 3 CHECK (probabilidad_residual BETWEEN 1 AND 5),
    impacto_residual INTEGER DEFAULT 3 CHECK (impacto_residual BETWEEN 1 AND 5),
    zona_residual VARCHAR(20) DEFAULT 'MODERADO'
        CHECK (zona_residual IN ('EXTREMO', 'ALTO', 'MODERADO', 'BAJO')),
    
    -- Análisis
    causas JSONB DEFAULT '[]'::jsonb,
    consecuencias JSONB DEFAULT '[]'::jsonb,
    
    -- Controles y Plan de Tratamiento (almacenados como JSON para flexibilidad)
    controles_existentes JSONB DEFAULT '[]'::jsonb,
    plan_tratamiento JSONB DEFAULT '[]'::jsonb,
    
    -- Responsable
    responsable VARCHAR(200) NOT NULL,
    responsable_id UUID REFERENCES abogados(id),
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'ARCHIVADO', 'CERRADO')),
    
    -- Auditoría
    created_by VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: riesgos_historial (Bitácora de Re-calificación)
-- =====================================================
CREATE TABLE IF NOT EXISTS riesgos_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con riesgo
    riesgo_id UUID NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
    
    -- Valoración en ese momento
    probabilidad INTEGER NOT NULL,
    impacto INTEGER NOT NULL,
    zona VARCHAR(20) NOT NULL,
    
    -- Motivo del cambio
    motivo TEXT,
    hito_procesal VARCHAR(255),
    
    -- Quién hizo el cambio
    usuario VARCHAR(200),
    
    -- Cuándo
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_riesgos_codigo ON riesgos(codigo);
CREATE INDEX IF NOT EXISTS idx_riesgos_proceso ON riesgos(proceso);
CREATE INDEX IF NOT EXISTS idx_riesgos_tipo ON riesgos(tipo_riesgo);
CREATE INDEX IF NOT EXISTS idx_riesgos_zona ON riesgos(zona_residual);
CREATE INDEX IF NOT EXISTS idx_riesgos_etapa ON riesgos(etapa);
CREATE INDEX IF NOT EXISTS idx_riesgos_estado ON riesgos(estado);

CREATE INDEX IF NOT EXISTS idx_riesgos_historial_riesgo ON riesgos_historial(riesgo_id);
CREATE INDEX IF NOT EXISTS idx_riesgos_historial_fecha ON riesgos_historial(fecha_evaluacion DESC);

-- =====================================================
-- TRIGGER: Updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION legal_management.update_riesgos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_riesgos_updated ON legal_management.riesgos;
CREATE TRIGGER trg_riesgos_updated
    BEFORE UPDATE ON legal_management.riesgos
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.update_riesgos_timestamp();

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 056_create_riesgos_module.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla riesgos creada';
    RAISE NOTICE '   - Tabla riesgos_historial creada';
    RAISE NOTICE '   - Índices y triggers creados';
END $$;
