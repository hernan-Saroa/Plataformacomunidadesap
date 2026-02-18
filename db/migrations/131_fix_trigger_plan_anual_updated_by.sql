-- =====================================================
-- FIX: Corregir trigger fn_registrar_cambio_estado_plan_anual
-- Error: record "new" has no field "updated_by"
-- Fecha: 2026-02-18
-- =====================================================

-- El trigger actual intenta usar NEW.updated_by pero la tabla
-- plan_anual_5_roles no tiene esa columna.
-- Solución: Modificar el trigger para usar un valor por defecto.

CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo registrar si cambió el estado
    IF (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO control_interno.historial_plan_anual (
            plan_id,
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
            1, -- Usuario del sistema (el usuario real se registra desde la aplicación)
            'Cambio de estado automático',
            format('Estado cambiado de "%s" a "%s"', OLD.estado, NEW.estado),
            OLD.estado,
            NEW.estado,
            jsonb_build_array(
                jsonb_build_object(
                    'campo', 'estado',
                    'valorAnterior', OLD.estado,
                    'valorNuevo', NEW.estado
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Comentario actualizado
COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual() IS 
'Función trigger que registra automáticamente los cambios de estado en historial_plan_anual. Nota: usuario_id=1 es sistema.';
