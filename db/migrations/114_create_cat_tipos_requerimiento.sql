-- =====================================================
-- Migración: 114_create_cat_tipos_requerimiento.sql
-- Módulo: Órganos de Control
-- Schema: legal_management
-- Descripción: Crear catálogo dinámico de tipos de requerimiento
-- =====================================================

SET search_path TO legal_management, public;

-- =====================================================
-- TABLA: cat_tipos_requerimiento (Catálogo de tipos)
-- =====================================================
CREATE TABLE IF NOT EXISTS cat_tipos_requerimiento (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales (migrar los valores actuales del CHECK)
INSERT INTO cat_tipos_requerimiento (id, nombre, descripcion, activo, orden) VALUES
('DOCUMENTOS', 'Documentos', 'Requerimientos relacionados con la entrega de documentos', TRUE, 1),
('INFORMES', 'Informes', 'Requerimientos relacionados con la entrega de informes', TRUE, 2),
('CERTIFICADOS', 'Certificados', 'Requerimientos relacionados con la entrega de certificados', TRUE, 3),
('OTROS', 'Otros', 'Otros tipos de requerimientos', TRUE, 4),
-- Mantener los valores legacy para compatibilidad
('SOLICITUD_INFORMACION', 'Solicitud de Información', 'Solicitud formal de información por parte de órgano de control', TRUE, 5),
('APERTURA_AUDITORIA', 'Apertura de Auditoría', 'Notificación de inicio de proceso de auditoría', TRUE, 6),
('NOTIFICACION_HALLAZGO', 'Notificación de Hallazgo', 'Comunicación de hallazgos identificados durante auditoría', TRUE, 7),
('PLAN_MEJORAMIENTO', 'Plan de Mejoramiento', 'Requerimiento de plan de mejoramiento institucional', TRUE, 8),
('OTRO', 'Otro', 'Otro tipo de requerimiento no clasificado', TRUE, 9)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_cat_tipos_req_activo ON cat_tipos_requerimiento(activo);
CREATE INDEX IF NOT EXISTS idx_cat_tipos_req_orden ON cat_tipos_requerimiento(orden);

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 114_create_cat_tipos_requerimiento.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla cat_tipos_requerimiento creada';
    RAISE NOTICE '   - Datos iniciales insertados';
    RAISE NOTICE '   - Índices creados';
END $$;

-- =====================================================
-- MODIFICAR: Remover CHECK constraint de requerimientos_oc
-- Esto permite tipos dinámicos del catálogo
-- =====================================================
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop any CHECK constraint on tipo_requerimiento column
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE n.nspname = 'legal_management' 
        AND t.relname = 'requerimientos_oc'
        AND contype = 'c'
        AND pg_get_constraintdef(c.oid) LIKE '%tipo_requerimiento%'
    LOOP
        EXECUTE 'ALTER TABLE legal_management.requerimientos_oc DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
    
    RAISE NOTICE '✅ CHECK constraint on tipo_requerimiento removed (if existed)';
END $$;
