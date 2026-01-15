-- ============================================
-- MIGRACIÓN 088: Agregar columnas necesarias a lista_chequeo e item_lista_chequeo
-- ============================================
-- Este script agrega las columnas necesarias para el módulo de configuración
-- de listas de chequeo a las tablas existentes
-- ============================================

-- Agregar columnas faltantes a lista_chequeo
DO $$
BEGIN
    -- Agregar tipo_auditoria_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'lista_chequeo' 
        AND column_name = 'tipo_auditoria_id'
    ) THEN
        ALTER TABLE control_interno.lista_chequeo 
        ADD COLUMN tipo_auditoria_id UUID REFERENCES control_interno.tipo_auditoria(id) ON DELETE SET NULL;
    END IF;

    -- Agregar activa si no existe (mapear desde estado si existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'lista_chequeo' 
        AND column_name = 'activa'
    ) THEN
        ALTER TABLE control_interno.lista_chequeo 
        ADD COLUMN activa BOOLEAN NOT NULL DEFAULT TRUE;
        
        -- Si existe columna estado, mapear valores
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'control_interno' 
            AND table_name = 'lista_chequeo' 
            AND column_name = 'estado'
        ) THEN
            UPDATE control_interno.lista_chequeo 
            SET activa = (estado = 'activa');
        END IF;
    END IF;

    -- Agregar usos_programados si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'lista_chequeo' 
        AND column_name = 'usos_programados'
    ) THEN
        ALTER TABLE control_interno.lista_chequeo 
        ADD COLUMN usos_programados INTEGER NOT NULL DEFAULT 0 CHECK (usos_programados >= 0);
    END IF;

    -- Agregar deleted_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'lista_chequeo' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE control_interno.lista_chequeo 
        ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;

-- Agregar columnas faltantes a item_lista_chequeo
DO $$
BEGIN
    -- Agregar texto si no existe (usar pregunta como base)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'item_lista_chequeo' 
        AND column_name = 'texto'
    ) THEN
        ALTER TABLE control_interno.item_lista_chequeo 
        ADD COLUMN texto TEXT;
        
        -- Si existe pregunta, copiar valores
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'control_interno' 
            AND table_name = 'item_lista_chequeo' 
            AND column_name = 'pregunta'
        ) THEN
            UPDATE control_interno.item_lista_chequeo 
            SET texto = pregunta;
        END IF;
        
        -- Hacer NOT NULL después de copiar datos
        ALTER TABLE control_interno.item_lista_chequeo 
        ALTER COLUMN texto SET NOT NULL;
    END IF;

    -- Agregar categoria si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'item_lista_chequeo' 
        AND column_name = 'categoria'
    ) THEN
        ALTER TABLE control_interno.item_lista_chequeo 
        ADD COLUMN categoria VARCHAR(100);
    END IF;

    -- Agregar orden si no existe (usar numero como base)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'item_lista_chequeo' 
        AND column_name = 'orden'
    ) THEN
        ALTER TABLE control_interno.item_lista_chequeo 
        ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;
        
        -- Si existe numero, copiar valores
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'control_interno' 
            AND table_name = 'item_lista_chequeo' 
            AND column_name = 'numero'
        ) THEN
            UPDATE control_interno.item_lista_chequeo 
            SET orden = numero;
        END IF;
    END IF;

    -- Verificar que obligatorio existe, si no agregarlo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'item_lista_chequeo' 
        AND column_name = 'obligatorio'
    ) THEN
        ALTER TABLE control_interno.item_lista_chequeo 
        ADD COLUMN obligatorio BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_codigo ON control_interno.lista_chequeo(codigo);
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_activa ON control_interno.lista_chequeo(activa);
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_tipo_auditoria ON control_interno.lista_chequeo(tipo_auditoria_id);
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_deleted_at ON control_interno.lista_chequeo(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_lista_chequeo_lista ON control_interno.item_lista_chequeo(lista_chequeo_id, orden);

-- Comentarios
COMMENT ON TABLE control_interno.lista_chequeo IS 'Listas de chequeo configurables para auditorías';
COMMENT ON COLUMN control_interno.lista_chequeo.codigo IS 'Código único de la lista (ej: LC-ADM-001)';
COMMENT ON COLUMN control_interno.lista_chequeo.nombre IS 'Nombre descriptivo de la lista de chequeo';
COMMENT ON COLUMN control_interno.lista_chequeo.descripcion IS 'Descripción de la lista de chequeo';
COMMENT ON COLUMN control_interno.lista_chequeo.tipo_auditoria_id IS 'Tipo de auditoría asociado (opcional)';
COMMENT ON COLUMN control_interno.lista_chequeo.activa IS 'Indica si la lista está activa y disponible';
COMMENT ON COLUMN control_interno.lista_chequeo.usos_programados IS 'Contador de usos programados con esta lista';
COMMENT ON COLUMN control_interno.lista_chequeo.deleted_at IS 'Fecha de eliminación (soft delete)';

COMMENT ON TABLE control_interno.item_lista_chequeo IS 'Items individuales de una lista de chequeo';
COMMENT ON COLUMN control_interno.item_lista_chequeo.texto IS 'Texto del item de verificación';
COMMENT ON COLUMN control_interno.item_lista_chequeo.categoria IS 'Categoría del item (opcional)';
COMMENT ON COLUMN control_interno.item_lista_chequeo.obligatorio IS 'Indica si el item es obligatorio';
COMMENT ON COLUMN control_interno.item_lista_chequeo.orden IS 'Orden de visualización del item';

-- Trigger para actualizar updated_at automáticamente
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
