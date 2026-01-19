-- ============================================
-- MIGRACIÓN: Actualizar contadores de documentos e informes en auditorías
-- ============================================
-- Esta migración crea triggers para actualizar automáticamente
-- total_documentos y total_informes cuando se crean o eliminan documentos
-- Fecha: 2026-01-XX
-- ============================================

SET search_path TO control_interno, public;

-- Verificar que la tabla documento existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'documento'
    ) THEN
        RAISE EXCEPTION 'La tabla control_interno.documento no existe. Ejecute primero las migraciones anteriores.';
    END IF;
END $$;

-- Función para actualizar contadores de documentos e informes
CREATE OR REPLACE FUNCTION control_interno.actualizar_contadores_documentos_informes()
RETURNS TRIGGER AS $$
DECLARE
    v_auditoria_id UUID;
    v_tipo_documento VARCHAR(100);
    v_es_informe BOOLEAN;
    total_docs INTEGER;
    total_inf INTEGER;
BEGIN
    -- Determinar el ID de la auditoría y el tipo de documento
    IF TG_OP = 'DELETE' THEN
        v_auditoria_id := OLD.auditoria_id;
        v_tipo_documento := OLD.tipo_documento;
    ELSE
        v_auditoria_id := NEW.auditoria_id;
        v_tipo_documento := NEW.tipo_documento;
    END IF;

    -- Si no hay auditoría asociada, no hacer nada
    IF v_auditoria_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Determinar si es un informe basado en el tipo de documento
    -- Los informes son: informe_preliminar, informe_final, informe_ejecutivo
    v_es_informe := v_tipo_documento IN ('informe_preliminar', 'informe_final', 'informe_ejecutivo');

    -- Contar documentos totales (excluyendo versiones anteriores, solo contar la versión más reciente)
    SELECT COUNT(DISTINCT COALESCE(d.version_anterior_id, d.id))
    INTO total_docs
    FROM control_interno.documento d
    WHERE d.auditoria_id = v_auditoria_id
      AND d.version_anterior_id IS NULL; -- Solo contar documentos originales, no versiones

    -- Contar informes totales
    SELECT COUNT(DISTINCT COALESCE(d.version_anterior_id, d.id))
    INTO total_inf
    FROM control_interno.documento d
    WHERE d.auditoria_id = v_auditoria_id
      AND d.tipo_documento IN ('informe_preliminar', 'informe_final', 'informe_ejecutivo')
      AND d.version_anterior_id IS NULL; -- Solo contar informes originales, no versiones

    -- Actualizar la auditoría
    UPDATE control_interno.auditoria
    SET 
        total_documentos = COALESCE(total_docs, 0),
        total_informes = COALESCE(total_inf, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_auditoria_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, registrar y continuar
        RAISE WARNING 'Error al actualizar contadores de documentos/informes para auditoría %: %', v_auditoria_id, SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Eliminar triggers existentes si existen (sin mostrar NOTICE)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_actualizar_contadores_documentos' 
        AND tgrelid = 'control_interno.documento'::regclass
    ) THEN
        DROP TRIGGER trigger_actualizar_contadores_documentos ON control_interno.documento;
    END IF;
END $$;

-- Crear trigger para actualizar contadores cuando se inserta, actualiza o elimina un documento
CREATE TRIGGER trigger_actualizar_contadores_documentos
    AFTER INSERT OR UPDATE OF auditoria_id, tipo_documento OR DELETE ON control_interno.documento
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.actualizar_contadores_documentos_informes();

-- Actualizar contadores para todas las auditorías existentes
DO $$
DECLARE
    auditoria_record RECORD;
    total_docs INTEGER;
    total_inf INTEGER;
BEGIN
    FOR auditoria_record IN 
        SELECT id FROM control_interno.auditoria
    LOOP
        -- Contar documentos totales (solo versiones originales)
        SELECT COUNT(DISTINCT COALESCE(d.version_anterior_id, d.id))
        INTO total_docs
        FROM control_interno.documento d
        WHERE d.auditoria_id = auditoria_record.id
          AND d.version_anterior_id IS NULL;

        -- Contar informes totales
        SELECT COUNT(DISTINCT COALESCE(d.version_anterior_id, d.id))
        INTO total_inf
        FROM control_interno.documento d
        WHERE d.auditoria_id = auditoria_record.id
          AND d.tipo_documento IN ('informe_preliminar', 'informe_final', 'informe_ejecutivo')
          AND d.version_anterior_id IS NULL;

        -- Actualizar la auditoría
        UPDATE control_interno.auditoria
        SET 
            total_documentos = COALESCE(total_docs, 0),
            total_informes = COALESCE(total_inf, 0)
        WHERE id = auditoria_record.id;
    END LOOP;
END $$;

-- Comentarios
COMMENT ON FUNCTION control_interno.actualizar_contadores_documentos_informes() IS 
'Actualiza automáticamente total_documentos y total_informes en la tabla auditoria cuando se crean, actualizan o eliminan documentos';

COMMENT ON TRIGGER trigger_actualizar_contadores_documentos ON control_interno.documento IS 
'Trigger que actualiza los contadores de documentos e informes en la auditoría asociada';
