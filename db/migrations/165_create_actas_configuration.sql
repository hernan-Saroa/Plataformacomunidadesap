-- Script para crear la tabla de configuración de actas
-- Tabla para almacenar las configuraciones paramétricas de actas en el módulo disciplinario

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.actas_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    estado VARCHAR(50) DEFAULT 'activo',
    codigo VARCHAR(50),
    descripcion TEXT,
    plantilla TEXT,
    nombre_plantilla VARCHAR(255),
    descripcion_plantilla TEXT,
    version_plantilla VARCHAR(50) DEFAULT '1.0',
    estado_plantilla VARCHAR(50) DEFAULT 'activo',
    stage VARCHAR(50),
    orden INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios para documentación
COMMENT ON TABLE internal_disciplinary_control.actas_configuration IS 'Tabla de configuración paramétrica de actas para el módulo disciplinario';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.tipo IS 'Tipo de acta (ej: ACTA_AUDIENCIA, ACTA_VERIFICACION, ACTA_CONSTITUCION)';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.nombre IS 'Nombre descriptivo del tipo de acta';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.estado IS 'Estado de la configuración (activo/inactivo)';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.codigo IS 'Código único del tipo de acta (ej: ACTA-001)';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.descripcion IS 'Descripción del tipo de acta';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.plantilla IS 'URL o contenido de la plantilla asociada';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.nombre_plantilla IS 'Nombre del archivo de plantilla';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.descripcion_plantilla IS 'Descripción de la plantilla';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.version_plantilla IS 'Versión de la plantilla';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.estado_plantilla IS 'Estado de la plantilla (activo/inactivo)';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.stage IS 'Etapa del proceso asociada (RECEPCION, EVALUACION, etc.)';
COMMENT ON COLUMN internal_disciplinary_control.actas_configuration.orden IS 'Orden de visualización en listados';

-- Insertar configuraciones iniciales de ejemplo
INSERT INTO internal_disciplinary_control.actas_configuration (tipo, nombre, codigo, descripcion, estado, orden, stage) VALUES
('ACTA_AUDIENCIA', 'Acta de Audiencia', 'ACTA-001', 'Acta generada después de realizar una audiencia', 'activo', 1, NULL),
('ACTA_VERIFICACION', 'Acta de Verificación', 'ACTA-002', 'Acta de verificación de hechos o documentos', 'activo', 2, NULL),
('ACTA_CONSTITUCION', 'Acta de Constitución', 'ACTA-003', 'Acta de constitución de comités o mesas', 'activo', 3, NULL),
('ACTA_REUNION', 'Acta de Reunión', 'ACTA-004', 'Acta de reuniones de trabajo', 'activo', 4, NULL),
('ACTA_INSPECCION', 'Acta de Inspección', 'ACTA-005', 'Acta de inspección ocular o visita', 'activo', 5, NULL),
('ACTA_ENTREGA', 'Acta de Entrega', 'ACTA-006', 'Acta de entrega de documentos o bienes', 'activo', 6, NULL)
ON CONFLICT (tipo) DO NOTHING;

-- Crear índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_actas_configuration_estado ON internal_disciplinary_control.actas_configuration(estado);
CREATE INDEX IF NOT EXISTS idx_actas_configuration_stage ON internal_disciplinary_control.actas_configuration(stage);
CREATE INDEX IF NOT EXISTS idx_actas_configuration_orden ON internal_disciplinary_control.actas_configuration(orden);
