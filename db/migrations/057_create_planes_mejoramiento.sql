-- =====================================================
-- Migración: Planes de Mejoramiento (Hijo de Riesgos)
-- Schema: legal_management
-- Dependencia: Requiere tabla 'riesgos' (Schema 56)
-- =====================================================

SET search_path TO legal_management, public;

-- 1. Tabla Principal: Planes de Mejoramiento
CREATE TABLE IF NOT EXISTS planes_mejoramiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    codigo VARCHAR(50) UNIQUE NOT NULL, -- Ej: PM-2025-001
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    
    -- Vinculación (El corazón del módulo)
    origen VARCHAR(50) NOT NULL CHECK (origen IN ('RIESGO', 'HALLAZGO_AUDITORIA', 'AUTOEVALUACION')),
    origen_id UUID, -- FK Lógica a la tabla 'riesgos' si origen es 'RIESGO'
    
    -- Gestión
    responsable_id UUID REFERENCES abogados(id), -- Quién lidera el plan
    fecha_inicio DATE NOT NULL,
    fecha_fin_estimada DATE NOT NULL,
    fecha_cierre_real DATE,
    
    -- Métricas
    avance_porcentaje DECIMAL(5,2) DEFAULT 0 CHECK (avance_porcentaje BETWEEN 0 AND 100),
    presupuesto DECIMAL(15,2) DEFAULT 0,
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'ABIERTO' 
        CHECK (estado IN ('ABIERTO', 'EN_EJECUCION', 'VENCIDO', 'CERRADO')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla: Evidencias (Para el botón "Evidencias")
CREATE TABLE IF NOT EXISTS planes_evidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planes_mejoramiento(id) ON DELETE CASCADE,
    
    titulo VARCHAR(150) NOT NULL,
    url_archivo TEXT NOT NULL,
    tipo_archivo VARCHAR(50), -- PDF, JPG, DOCX
    
    uploaded_by UUID, -- Usuario que subió
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla: Seguimiento/Bitácora (Para el botón "Seguimiento")
CREATE TABLE IF NOT EXISTS planes_seguimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planes_mejoramiento(id) ON DELETE CASCADE,
    
    descripcion_avance TEXT NOT NULL,
    porcentaje_reportado DECIMAL(5,2), -- Cuánto avanzó en este hito
    
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id UUID
);

-- 4. Tabla: Comentarios (Para el botón "Comentarios")
CREATE TABLE IF NOT EXISTS planes_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planes_mejoramiento(id) ON DELETE CASCADE,
    
    mensaje TEXT NOT NULL,
    usuario_id UUID, -- Quién comentó
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_planes_origen_id ON planes_mejoramiento(origen_id);
CREATE INDEX idx_planes_estado ON planes_mejoramiento(estado);
