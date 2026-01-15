-- =====================================================
-- Migración: Corregir constraint de tipo en comentarios_oc
-- Para permitir valores en mayúsculas enviados por el frontend
-- =====================================================

SET search_path TO legal_management, public;

-- Eliminar constraint existente
ALTER TABLE comentarios_oc DROP CONSTRAINT IF EXISTS comentarios_oc_tipo_check;

-- Recrear constraint permitiendo mayúsculas y nuevos tipos
ALTER TABLE comentarios_oc ADD CONSTRAINT comentarios_oc_tipo_check 
    CHECK (tipo IN (
        -- Valores originales (lowercase)
        'general', 'importante', 'seguimiento', 'interno', 'respuesta', 'actuacion', 'alerta',
        -- Valores nuevos (uppercase - usados por frontend)
        'COMENTARIO', 'ACTUACION', 'ALERTA'
    ));

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 077_fix_comentarios_oc_tipo_check_uppercase.sql ejecutada correctamente';
    RAISE NOTICE '   - Constraint actualizado para permitir COMENTARIO, ACTUACION, ALERTA';
END $$;
