-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 070: Crear sistema independiente de evidencias/documentos
-- ═══════════════════════════════════════════════════════════════════════════
-- Descripción: Sistema completo para gestión de evidencias y documentos
--              vinculados a Hallazgos, Acciones Correctivas, Planes y Auditorías
--              Incluye validación por auditor (US-032) y versionado
-- Fecha: 2026-01-15
-- ═══════════════════════════════════════════════════════════════════════════

SET search_path TO control_interno, public;

-- Crear tipo enum para tipos de documento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_documento_evidencia') THEN
        CREATE TYPE control_interno.tipo_documento_evidencia AS ENUM (
            'evidencia_hallazgo',
            'evidencia_accion',
            'evidencia_plan',
            'documento_plan',
            'certificado',
            'acta',
            'informe',
            'otro'
        );
    END IF;
END $$;

-- Crear tipo enum para estado de validación
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_validacion_evidencia') THEN
        CREATE TYPE control_interno.estado_validacion_evidencia AS ENUM (
            'pendiente',
            'aceptado',
            'rechazado',
            'con_observaciones'
        );
    END IF;
END $$;

-- Crear tabla principal de evidencias/documentos
CREATE TABLE IF NOT EXISTS control_interno.evidencia_documento (
    -- Identificación
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL, -- Ej: EVD-2025-001
    
    -- Metadatos del documento
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo_documento control_interno.tipo_documento_evidencia NOT NULL,
    
    -- Vinculación flexible (solo una puede estar activa)
    hallazgo_id UUID,
    accion_correctiva_id UUID,
    plan_mejoramiento_id UUID,
    auditoria_id UUID, -- Para documentos generales de auditoría
    
    -- Archivo físico
    ruta_archivo VARCHAR(500) NOT NULL,
    nombre_archivo_original VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanio_bytes BIGINT NOT NULL,
    hash_archivo VARCHAR(255), -- SHA256 para integridad
    
    -- Versionado
    version INTEGER DEFAULT 1,
    version_anterior_id UUID,
    es_version_actual BOOLEAN DEFAULT TRUE,
    
    -- Validación (US-032)
    estado_validacion control_interno.estado_validacion_evidencia DEFAULT 'pendiente',
    validado_por VARCHAR(255),
    fecha_validacion TIMESTAMP,
    observaciones_validacion TEXT,
    
    -- Metadatos adicionales
    subido_por VARCHAR(255) NOT NULL,
    subido_por_id BIGINT, -- FK a auth.personas (opcional)
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Sincronización con servidor G:
    ruta_servidor_g VARCHAR(500),
    sincronizado_servidor_g BOOLEAN DEFAULT FALSE,
    fecha_sincronizacion TIMESTAMP,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints de Foreign Keys
    CONSTRAINT fk_evidencia_hallazgo FOREIGN KEY (hallazgo_id) 
        REFERENCES control_interno.hallazgo(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidencia_accion FOREIGN KEY (accion_correctiva_id) 
        REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidencia_plan FOREIGN KEY (plan_mejoramiento_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidencia_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE SET NULL,
    CONSTRAINT fk_evidencia_version FOREIGN KEY (version_anterior_id) 
        REFERENCES control_interno.evidencia_documento(id) ON DELETE SET NULL,
    
    -- Validación: al menos una vinculación debe existir
    CONSTRAINT chk_evidencia_vinculacion CHECK (
        (hallazgo_id IS NOT NULL)::int + 
        (accion_correctiva_id IS NOT NULL)::int + 
        (plan_mejoramiento_id IS NOT NULL)::int + 
        (auditoria_id IS NOT NULL)::int >= 1
    )
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_evidencia_hallazgo ON control_interno.evidencia_documento(hallazgo_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_accion ON control_interno.evidencia_documento(accion_correctiva_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_plan ON control_interno.evidencia_documento(plan_mejoramiento_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_auditoria ON control_interno.evidencia_documento(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_estado_validacion ON control_interno.evidencia_documento(estado_validacion);
CREATE INDEX IF NOT EXISTS idx_evidencia_tipo ON control_interno.evidencia_documento(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_evidencia_subido_por ON control_interno.evidencia_documento(subido_por_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_fecha_subida ON control_interno.evidencia_documento(fecha_subida);
CREATE INDEX IF NOT EXISTS idx_evidencia_codigo ON control_interno.evidencia_documento(codigo);

-- Función para generar código automático
CREATE OR REPLACE FUNCTION control_interno.generar_codigo_evidencia()
RETURNS TRIGGER AS $$
DECLARE
    año_actual INTEGER;
    secuencia INTEGER;
    nuevo_codigo VARCHAR(50);
BEGIN
    año_actual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'EVD-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO secuencia
    FROM control_interno.evidencia_documento
    WHERE codigo LIKE 'EVD-' || año_actual || '-%';
    
    nuevo_codigo := 'EVD-' || año_actual || '-' || LPAD(secuencia::TEXT, 4, '0');
    NEW.codigo := nuevo_codigo;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código automático
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_generar_codigo_evidencia' 
        AND tgrelid = 'control_interno.evidencia_documento'::regclass
    ) THEN
        DROP TRIGGER trg_generar_codigo_evidencia ON control_interno.evidencia_documento;
    END IF;
END $$;

CREATE TRIGGER trg_generar_codigo_evidencia
    BEFORE INSERT ON control_interno.evidencia_documento
    FOR EACH ROW
    WHEN (NEW.codigo IS NULL OR NEW.codigo = '')
    EXECUTE FUNCTION control_interno.generar_codigo_evidencia();

-- Comentarios en la tabla
COMMENT ON TABLE control_interno.evidencia_documento IS 'Sistema independiente de gestión de evidencias y documentos vinculados a Hallazgos, Acciones, Planes y Auditorías';
COMMENT ON COLUMN control_interno.evidencia_documento.codigo IS 'Código único generado automáticamente: EVD-YYYY-NNNN';
COMMENT ON COLUMN control_interno.evidencia_documento.estado_validacion IS 'Estado de validación por auditor (US-032): pendiente, aceptado, rechazado, con_observaciones';
COMMENT ON COLUMN control_interno.evidencia_documento.hash_archivo IS 'Hash SHA256 del archivo para verificar integridad';
COMMENT ON COLUMN control_interno.evidencia_documento.version_anterior_id IS 'Referencia a la versión anterior para mantener historial';
