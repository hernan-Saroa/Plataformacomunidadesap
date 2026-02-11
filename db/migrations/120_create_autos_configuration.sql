-- ============================================
-- Migración: Crear tabla autos_configuration
-- Fecha: 2026-02-05
-- Descripción: Tabla para parametrizar los autos disciplinarios
-- ============================================

-- Crear tabla autos_configuration
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.autos_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    plantilla TEXT,
    orden INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_autos_configuration_tipo ON internal_disciplinary_control.autos_configuration(tipo);
CREATE INDEX IF NOT EXISTS idx_autos_configuration_estado ON internal_disciplinary_control.autos_configuration(estado);
CREATE INDEX IF NOT EXISTS idx_autos_configuration_orden ON internal_disciplinary_control.autos_configuration(orden);

-- Crear función trigger para actualizar updatedAt
CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_autos_config_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS update_autos_configuration_updated_at ON internal_disciplinary_control.autos_configuration;

-- Crear trigger
CREATE TRIGGER update_autos_configuration_updated_at
    BEFORE UPDATE ON internal_disciplinary_control.autos_configuration
    FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_autos_config_updated_at_column();

-- Insertar configuraciones iniciales (solo si la tabla está vacía)
INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AUTO_NO_PREVISTO', 'Auto No Previsto', 'activo', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration);

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'AUTO_APERTURA', 'Auto de Apertura', 'activo', NULL, 2
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_APERTURA');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', 'AUTO_INDAGACION_PRELIMINAR', 'Auto de Indagación Preliminar', 'activo', NULL, 3
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_INDAGACION_PRELIMINAR');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567893', 'AUTO_APERTURA_INDAGACION', 'Auto de Apertura de Indagación', 'activo', NULL, 4
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_APERTURA_INDAGACION');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567894', 'AUTO_APERTURA_INVESTIGACION', 'Auto de Apertura de Investigación', 'activo', NULL, 5
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_APERTURA_INVESTIGACION');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567895', 'AUTO_FORMULACION_PLIEGO', 'Auto de Formulación de Pliego de Cargos', 'activo', NULL, 6
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_FORMULACION_PLIEGO');


INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567897', 'AUTO_CIERRE', 'Auto de Cierre', 'activo', NULL, 7
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_CIERRE');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567898', 'AUTO_ARCHIVO', 'Auto de Archivo', 'activo', NULL, 8
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_ARCHIVO');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567899', 'FALLO_SANCION', 'Fallo Sancionatorio', 'activo', NULL, 9
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'FALLO_SANCION');

INSERT INTO internal_disciplinary_control.autos_configuration (id, tipo, nombre, estado, plantilla, orden)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567900', 'FALLO_ABSOLUTORIO', 'Fallo Absolutorio', 'activo', NULL, 10
WHERE NOT EXISTS (SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'FALLO_ABSOLUTORIO');

