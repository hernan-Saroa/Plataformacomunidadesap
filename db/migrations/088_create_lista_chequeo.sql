-- Eliminar tablas si existen para recrearlas

-- MIGRACIÓN 088: Recrear tablas lista_chequeo e item_lista_chequeo
-- ============================================
-- Este script elimina y recrea las tablas con la estructura correcta
-- para el módulo de configuración de listas de chequeo


-- Eliminar tipo ENUM si existe para recrearlo
DROP TYPE IF EXISTS control_interno.tipo_lista_chequeo_enum CASCADE;

-- Crear tipo ENUM para tipo de lista de chequeo
CREATE TYPE control_interno.tipo_lista_chequeo_enum AS ENUM ('planeacion', 'ejecucion', 'comunicacion');

-- ============================================
-- Tabla: lista_chequeo
-- ============================================
CREATE TABLE control_interno.lista_chequeo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100),
    tipo control_interno.tipo_lista_chequeo_enum NOT NULL DEFAULT 'ejecucion',
    tipo_auditoria_id UUID REFERENCES control_interno.tipo_auditoria(id) ON DELETE SET NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    usos_programados INTEGER NOT NULL DEFAULT 0 CHECK (usos_programados >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- ============================================
-- Tabla: item_lista_chequeo
-- ============================================
CREATE TABLE control_interno.item_lista_chequeo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_chequeo_id UUID NOT NULL REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Índices para mejorar rendimiento
-- ============================================
CREATE INDEX idx_lista_chequeo_codigo ON control_interno.lista_chequeo(codigo);
CREATE INDEX idx_lista_chequeo_activa ON control_interno.lista_chequeo(activa);
CREATE INDEX idx_lista_chequeo_tipo_auditoria ON control_interno.lista_chequeo(tipo_auditoria_id);
CREATE INDEX idx_lista_chequeo_deleted_at ON control_interno.lista_chequeo(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_lista_chequeo_tipo ON control_interno.lista_chequeo(tipo);
CREATE INDEX idx_item_lista_chequeo_lista ON control_interno.item_lista_chequeo(lista_chequeo_id, orden);

-- ============================================
-- Comentarios
-- ============================================
COMMENT ON TABLE control_interno.lista_chequeo IS 'Listas de chequeo configurables para auditorías';
COMMENT ON COLUMN control_interno.lista_chequeo.codigo IS 'Código único de la lista (ej: LC-ADM-001)';
COMMENT ON COLUMN control_interno.lista_chequeo.nombre IS 'Nombre descriptivo de la lista de chequeo';
COMMENT ON COLUMN control_interno.lista_chequeo.descripcion IS 'Descripción de la lista de chequeo';
COMMENT ON COLUMN control_interno.lista_chequeo.categoria IS 'Categoría de la lista de chequeo (obligatoria)';
COMMENT ON COLUMN control_interno.lista_chequeo.tipo IS 'Tipo de lista de chequeo: planeacion, ejecucion o comunicacion';
COMMENT ON COLUMN control_interno.lista_chequeo.tipo_auditoria_id IS 'Tipo de auditoría asociado (opcional)';
COMMENT ON COLUMN control_interno.lista_chequeo.activa IS 'Indica si la lista está activa y disponible';
COMMENT ON COLUMN control_interno.lista_chequeo.usos_programados IS 'Contador de usos programados con esta lista';
COMMENT ON COLUMN control_interno.lista_chequeo.deleted_at IS 'Fecha de eliminación (soft delete)';

COMMENT ON TABLE control_interno.item_lista_chequeo IS 'Items individuales de una lista de chequeo';
COMMENT ON COLUMN control_interno.item_lista_chequeo.texto IS 'Texto del item de verificación';
COMMENT ON COLUMN control_interno.item_lista_chequeo.categoria IS 'Categoría del item (opcional)';
COMMENT ON COLUMN control_interno.item_lista_chequeo.obligatorio IS 'Indica si el item es obligatorio';
COMMENT ON COLUMN control_interno.item_lista_chequeo.orden IS 'Orden de visualización del item';

-- ============================================
-- Trigger para actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION control_interno.update_lista_chequeo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lista_chequeo_updated_at ON control_interno.lista_chequeo;
CREATE TRIGGER trigger_update_lista_chequeo_updated_at
    BEFORE UPDATE ON control_interno.lista_chequeo
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.update_lista_chequeo_updated_at();

DROP TRIGGER IF EXISTS trigger_update_item_lista_chequeo_updated_at ON control_interno.item_lista_chequeo;
CREATE TRIGGER trigger_update_item_lista_chequeo_updated_at
    BEFORE UPDATE ON control_interno.item_lista_chequeo
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.update_lista_chequeo_updated_at();

-- ============================================
-- Datos de ejemplo (seed)
-- ============================================
INSERT INTO control_interno.lista_chequeo (codigo, nombre, descripcion, categoria, tipo, activa, usos_programados) VALUES
('LC-PLAN-001', 'Lista de Planeación General', 'Verificación de documentos y requisitos previos a la auditoría', 'General', 'planeacion', true, 0),
('LC-PLAN-002', 'Lista de Verificación de Recursos', 'Verificación de recursos humanos y materiales para la auditoría', 'Recursos', 'planeacion', true, 0),
('LC-EJEC-001', 'Lista de Ejecución Procesos Administrativos', 'Verificación de procesos administrativos durante la auditoría', 'Administrativos', 'ejecucion', true, 0),
('LC-EJEC-002', 'Lista de Ejecución Control Interno', 'Verificación de controles internos durante la auditoría', 'Control Interno', 'ejecucion', true, 0),
('LC-COM-001', 'Lista de Comunicación de Resultados', 'Verificación de comunicación y entrega de informes', 'Resultados', 'comunicacion', true, 0);

-- Items para Lista de Planeación General
INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se ha definido el alcance de la auditoría?', 'Alcance', true, 1
FROM control_interno.lista_chequeo WHERE codigo = 'LC-PLAN-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se han identificado los objetivos de la auditoría?', 'Objetivos', true, 2
FROM control_interno.lista_chequeo WHERE codigo = 'LC-PLAN-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se ha definido el cronograma de actividades?', 'Cronograma', true, 3
FROM control_interno.lista_chequeo WHERE codigo = 'LC-PLAN-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se ha notificado al área auditada?', 'Comunicación', true, 4
FROM control_interno.lista_chequeo WHERE codigo = 'LC-PLAN-001';

-- Items para Lista de Ejecución Procesos Administrativos
INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Existe documentación de procesos actualizada?', 'Documentación', true, 1
FROM control_interno.lista_chequeo WHERE codigo = 'LC-EJEC-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se cumplen los procedimientos establecidos?', 'Cumplimiento', true, 2
FROM control_interno.lista_chequeo WHERE codigo = 'LC-EJEC-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Existen controles de calidad implementados?', 'Control', true, 3
FROM control_interno.lista_chequeo WHERE codigo = 'LC-EJEC-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se mantienen registros de las actividades?', 'Registros', false, 4
FROM control_interno.lista_chequeo WHERE codigo = 'LC-EJEC-001';

-- Items para Lista de Comunicación de Resultados
INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se ha elaborado el informe preliminar?', 'Informes', true, 1
FROM control_interno.lista_chequeo WHERE codigo = 'LC-COM-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se ha socializado con el área auditada?', 'Socialización', true, 2
FROM control_interno.lista_chequeo WHERE codigo = 'LC-COM-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se han documentado las observaciones del área?', 'Observaciones', true, 3
FROM control_interno.lista_chequeo WHERE codigo = 'LC-COM-001';

INSERT INTO control_interno.item_lista_chequeo (lista_chequeo_id, texto, categoria, obligatorio, orden)
SELECT id, '¿Se ha emitido el informe final?', 'Informes', true, 4
FROM control_interno.lista_chequeo WHERE codigo = 'LC-COM-001';

-- Verificación
SELECT 'Listas de chequeo creadas:' as mensaje, COUNT(*) as total FROM control_interno.lista_chequeo;
SELECT 'Items de lista creados:' as mensaje, COUNT(*) as total FROM control_interno.item_lista_chequeo;
