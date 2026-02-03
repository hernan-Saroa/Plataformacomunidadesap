-- ============================================
-- Schema: Órganos de Control (Requerimientos)
-- ============================================

CREATE SCHEMA IF NOT EXISTS requerimientos_oc;

-- ============================================
-- Tabla Maestra: cat_organismos_control
-- ============================================
CREATE TABLE IF NOT EXISTS requerimientos_oc.cat_organismos_control (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    sigla VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- CONTRALORIA, PROCURADURIA, MINISTERIO, SUPERINTENDENCIA, OTROS
    nivel VARCHAR(50) NOT NULL, -- NACIONAL, DEPARTAMENTAL, MUNICIPAL
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla Principal: requerimientos
-- ============================================
CREATE TABLE IF NOT EXISTS requerimientos_oc.requerimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radicado_externo VARCHAR(50) NOT NULL,
    radicado_interno VARCHAR(20) UNIQUE NOT NULL,
    entidad_id INTEGER NOT NULL REFERENCES requerimientos_oc.cat_organismos_control(id),
    asunto TEXT NOT NULL,
    tipo_requerimiento VARCHAR(50) NOT NULL, -- INFORMACION, AUDITORIA, HALLAZGO, AJUSTE
    fecha_recepcion DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'EN_PREPARACION', -- EN_PREPARACION, EN_REVISION, APROBADO, ENVIADO, CERRADO
    prioridad_calculada VARCHAR(20) DEFAULT 'NORMAL', -- CRITICA, ALTA, NORMAL, BAJA
    archivo_adjunto_url VARCHAR(500),
    usuario_asignado_id INTEGER, -- FK a auth.personas (se asume que existe)
    auditoria_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_tipo_requerimiento CHECK (tipo_requerimiento IN ('INFORMACION', 'AUDITORIA', 'HALLAZGO', 'AJUSTE')),
    CONSTRAINT chk_estado CHECK (estado IN ('EN_PREPARACION', 'EN_REVISION', 'APROBADO', 'ENVIADO', 'CERRADO')),
    CONSTRAINT chk_prioridad CHECK (prioridad_calculada IN ('CRITICA', 'ALTA', 'NORMAL', 'BAJA'))
);

-- ============================================
-- Índices para Optimización
-- ============================================
CREATE INDEX idx_requerimientos_estado ON requerimientos_oc.requerimientos(estado);
CREATE INDEX idx_requerimientos_entidad ON requerimientos_oc.requerimientos(entidad_id);
CREATE INDEX idx_requerimientos_fecha_vencimiento ON requerimientos_oc.requerimientos(fecha_vencimiento);
CREATE INDEX idx_requerimientos_radicado_interno ON requerimientos_oc.requerimientos(radicado_interno);
CREATE INDEX idx_requerimientos_usuario_asignado ON requerimientos_oc.requerimientos(usuario_asignado_id);

-- ============================================
-- Comentarios de Documentación
-- ============================================
COMMENT ON TABLE requerimientos_oc.cat_organismos_control IS 'Catálogo maestro de organismos de control que pueden generar requerimientos a la ESAP';
COMMENT ON TABLE requerimientos_oc.requerimientos IS 'Gestión de requerimientos de órganos de control con radicado automático y cálculo de vencimiento';
COMMENT ON COLUMN requerimientos_oc.requerimientos.radicado_interno IS 'Formato: OC-YYYY-NNNNN (generado automáticamente)';
COMMENT ON COLUMN requerimientos_oc.requerimientos.fecha_vencimiento IS 'Calculada automáticamente sumando días hábiles (sin sábados/domingos) a fecha_recepcion';
COMMENT ON COLUMN requerimientos_oc.requerimientos.prioridad_calculada IS 'Calculada dinámicamente basada en días restantes y tipo de requerimiento';

