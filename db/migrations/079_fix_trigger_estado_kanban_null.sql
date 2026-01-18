-- ============================================
-- Migración 079: Fix trigger estado_kanban NULL
-- Fecha: 2025-01-XX
-- Descripción: Corrige el trigger de cambio de estado para mostrar "Planeación" 
--              cuando estado_anterior es NULL en lugar de cadena vacía
-- ============================================

-- Actualizar función del trigger para manejar NULL correctamente
CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    estado_anterior_text TEXT;
    estado_nuevo_text TEXT;
BEGIN
    -- Solo registrar si cambió el estado_kanban
    IF (TG_OP = 'UPDATE' AND OLD.estado_kanban IS DISTINCT FROM NEW.estado_kanban) THEN
        -- Manejar NULL: si estado_anterior es NULL, mostrar "Planeación" (estado inicial por defecto)
        estado_anterior_text := COALESCE(OLD.estado_kanban, 'Planeación');
        estado_nuevo_text := COALESCE(NEW.estado_kanban, '');
        
        INSERT INTO control_interno.historial_auditoria (
            auditoria_id,
            tipo_evento,
            fecha,
            hora,
            usuario_id,
            accion,
            descripcion,
            estado_anterior,
            estado_nuevo,
            cambios
        ) VALUES (
            NEW.id,
            'cambio_estado',
            CURRENT_DATE,
            CURRENT_TIME,
            1, -- Usuario sistema (ajustar si tienes campo updated_by en auditoria)
            'Cambio de estado automático',
            format('Estado cambiado de "%s" a "%s"', estado_anterior_text, estado_nuevo_text),
            estado_anterior_text,
            estado_nuevo_text,
            jsonb_build_array(
                jsonb_build_object(
                    'campo', 'estado_kanban',
                    'valorAnterior', estado_anterior_text,
                    'valorNuevo', estado_nuevo_text
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actualizar auditorías existentes que tengan estado_kanban NULL a 'Planeación'
-- Solo si la fase es 'planeacion' para mantener consistencia
UPDATE control_interno.auditoria
SET estado_kanban = 'Planeación'
WHERE estado_kanban IS NULL 
  AND fase = 'planeacion';

COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_auditoria IS 
'Función trigger que registra automáticamente los cambios de estado en historial_auditoria. 
Muestra "Planeación" cuando estado_anterior es NULL para reflejar el estado inicial por defecto.';
