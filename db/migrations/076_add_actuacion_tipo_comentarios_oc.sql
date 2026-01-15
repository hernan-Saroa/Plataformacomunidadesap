-- =====================================================
-- Migración: Agregar tipo 'actuacion' a comentarios_oc
-- Para permitir logging de cambios de etapa
-- =====================================================

SET search_path TO legal_management, public;

-- Eliminar constraint existente y recrear con nuevo valor
ALTER TABLE comentarios_oc DROP CONSTRAINT IF EXISTS comentarios_oc_tipo_check;

ALTER TABLE comentarios_oc ADD CONSTRAINT comentarios_oc_tipo_check 
    CHECK (tipo IN ('general', 'importante', 'seguimiento', 'interno', 'respuesta', 'actuacion'));

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 076_add_actuacion_tipo_comentarios_oc.sql ejecutada correctamente';
    RAISE NOTICE '   - Tipo "actuacion" agregado a comentarios_oc';
END $$;
