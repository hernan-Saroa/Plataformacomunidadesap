-- ============================================
-- Migración: Crear tabla oficios_configuration
-- Fecha: 2026-03-04
-- Descripción: Tabla para parametrizar los tipos de oficios disciplinarios
-- ============================================

-- Crear tabla oficios_configuration
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.oficios_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(50),
    descripcion TEXT,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    plantilla TEXT,
    nombre_plantilla VARCHAR(255),
    descripcion_plantilla TEXT,
    version_plantilla VARCHAR(50) DEFAULT '1.0',
    estado_plantilla VARCHAR(50) DEFAULT 'activo',
    stage VARCHAR(50),
    orden INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_oficios_configuration_tipo ON internal_disciplinary_control.oficios_configuration(tipo);
CREATE INDEX IF NOT EXISTS idx_oficios_configuration_estado ON internal_disciplinary_control.oficios_configuration(estado);
CREATE INDEX IF NOT EXISTS idx_oficios_configuration_orden ON internal_disciplinary_control.oficios_configuration(orden);

-- Crear función trigger para actualizar updatedAt
CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_oficios_config_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS update_oficios_configuration_updated_at ON internal_disciplinary_control.oficios_configuration;

-- Crear trigger
CREATE TRIGGER update_oficios_configuration_updated_at
    BEFORE UPDATE ON internal_disciplinary_control.oficios_configuration
    FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_oficios_config_updated_at_column();

-- Insertar configuraciones iniciales de oficios
INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', 'OFICIO_SOLICITUD_INFORMACION', 'Oficio de Solicitud de Información', 'OFIC-001', 'Oficio para solicitar información a entidades externas', 'activo', 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_SOLICITUD_INFORMACION');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567891', 'OFICIO_CITACION', 'Oficio de Citación', 'OFIC-002', 'Oficio para citar a las partes a audiencias o diligencias', 'activo', 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_CITACION');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567892', 'OFICIO_NOTIFICACION', 'Oficio de Notificación', 'OFIC-003', 'Oficio para notificar decisiones o actuaciones procesales', 'activo', 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_NOTIFICACION');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567893', 'OFICIO_INFORME_FINAL', 'Oficio de Informe Final', 'OFIC-004', 'Oficio para remitir el informe final de investigación', 'activo', 4, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_INFORME_FINAL');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567894', 'OFICIO_REMITIR_EXPEDIENTE', 'Oficio para Remitir Expediente', 'OFIC-005', 'Oficio para remitir expediente a otras entidades', 'activo', 5, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_REMITIR_EXPEDIENTE');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567895', 'OFICIO_RESPUESTA', 'Oficio de Respuesta', 'OFIC-006', 'Oficio para responder solicitudes o consultas', 'activo', 6, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_RESPUESTA');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567896', 'OFICIO_ARCHIVO', 'Oficio de Archivo', 'OFIC-007', 'Oficio para comunicar archivo de investigación', 'activo', 7, NULL
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_ARCHIVO');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567897', 'OFICIO_APERTURA_INVESTIGACION', 'Oficio de Apertura de Investigación', 'OFIC-008', 'Oficio para comunicar apertura de investigación disciplinaria', 'activo', 8, 'INDAGACION_PREVIA'
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_APERTURA_INVESTIGACION');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567898', 'OFICIO_CIERRE_INVESTIGACION', 'Oficio de Cierre de Investigación', 'OFIC-009', 'Oficio para comunicar cierre de investigación', 'activo', 9, 'INVESTIGACION'
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_CIERRE_INVESTIGACION');

INSERT INTO internal_disciplinary_control.oficios_configuration (id, tipo, nombre, codigo, descripcion, estado, orden, stage)
SELECT 'b1c2d3e4-f5a6-7890-abcd-ef1234567899', 'OFICIO_CARGO', 'Oficio de Cargos', 'OFIC-010', 'Oficio para formular pliego de cargos', 'activo', 10, 'JUZGAMIENTO'
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.oficios_configuration WHERE tipo = 'OFICIO_CARGO');
