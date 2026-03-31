-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Crear tabla evaluacion_proceso
-- ═══════════════════════════════════════════════════════════════════════════
-- Tabla para almacenar múltiples evaluaciones DAFP por proceso.
-- Cada proceso del catálogo puede tener N evaluaciones con diferente vigencia/fecha_corte.
-- FK: proceso_id → proceso_auditable.id
-- ═══════════════════════════════════════════════════════════════════════════

-- Crear tabla de evaluaciones de proceso
CREATE TABLE IF NOT EXISTS control_interno.evaluacion_proceso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con proceso maestro
    proceso_id UUID NOT NULL REFERENCES control_interno.proceso_auditable(id) ON DELETE CASCADE,
    
    -- Encabezado de la evaluación
    vigencia INTEGER NOT NULL,
    fecha_corte DATE NOT NULL,
    dependencia_responsable VARCHAR(255) NOT NULL,
    
    -- Sección 1: Número de riesgos inherentes (D, E, F, G, H)
    riesgos_extremos INTEGER DEFAULT 0,
    riesgos_altos INTEGER DEFAULT 0,
    riesgos_moderados INTEGER DEFAULT 0,
    riesgos_bajos INTEGER DEFAULT 0,
    total_riesgos INTEGER DEFAULT 0,
    
    -- Sección 2: Requerimientos especiales (J, K)
    requerimiento_comite BOOLEAN DEFAULT FALSE,
    requerimiento_entes_reg BOOLEAN DEFAULT FALSE,
    
    -- Sección 3: Información de auditoría anterior (L, N)
    fecha_ultima_auditoria DATE,
    resultado_ultima_auditoria VARCHAR(100),
    
    -- Score de riesgo C+E-M (modelo simplificado 0-15)
    criticidad INTEGER DEFAULT 0,
    exposicion INTEGER DEFAULT 0,
    mitigantes INTEGER DEFAULT 0,
    score_riesgo INTEGER DEFAULT 0,
    
    -- Cálculos automáticos DAFP
    ponderacion_riesgo VARCHAR(20),
    dias_transcurridos INTEGER,
    plan_rotacion VARCHAR(20),
    dias_rotacion INTEGER DEFAULT 360,
    decision_rotacion VARCHAR(20),
    
    -- Decisión final
    decision_final VARCHAR(50),
    motivo_decision TEXT,
    prioridad_regla INTEGER,
    
    -- Metadatos
    creado_por VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único: un proceso solo puede tener una evaluación por vigencia+fecha_corte
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluacion_proceso_unique 
ON control_interno.evaluacion_proceso(proceso_id, vigencia, fecha_corte);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_evaluacion_proceso_vigencia 
ON control_interno.evaluacion_proceso(vigencia);

CREATE INDEX IF NOT EXISTS idx_evaluacion_proceso_decision 
ON control_interno.evaluacion_proceso(decision_final);

CREATE INDEX IF NOT EXISTS idx_evaluacion_proceso_activo 
ON control_interno.evaluacion_proceso(activo);

-- Comentarios de documentación
COMMENT ON TABLE control_interno.evaluacion_proceso IS 'Evaluaciones DAFP de procesos auditables. Cada proceso puede tener múltiples evaluaciones con diferentes vigencias/fechas de corte.';
COMMENT ON COLUMN control_interno.evaluacion_proceso.proceso_id IS 'FK al proceso maestro del catálogo';
COMMENT ON COLUMN control_interno.evaluacion_proceso.vigencia IS 'Año de la evaluación (ej: 2025, 2026)';
COMMENT ON COLUMN control_interno.evaluacion_proceso.fecha_corte IS 'Fecha de corte para la evaluación';
COMMENT ON COLUMN control_interno.evaluacion_proceso.ponderacion_riesgo IS 'Resultado del cálculo DAFP: EXTREMO, ALTO, MODERADO, BAJO, MUY BAJO';
COMMENT ON COLUMN control_interno.evaluacion_proceso.decision_final IS 'Decisión: INCLUIR PLAN ANUAL o AUDITORÍA POSTERIOR';
