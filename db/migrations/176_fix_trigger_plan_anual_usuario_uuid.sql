-- Migration 176: Fix fn_registrar_cambio_estado_plan_anual - usuario_id debe ser UUID no integer
-- El problema: la migración 131 dejó usuario_id = 1 (integer) pero la columna es de tipo UUID
-- Solución: usar NULL cuando no se dispone de un usuario real

CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID := NULL;
BEGIN
    -- Solo registrar si cambió el estado
    IF (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado) THEN

        -- Intentar obtener un usuario "sistema" si existe (opcional)
        BEGIN
            SELECT id_person INTO v_usuario_id
            FROM auth.personas
            WHERE id_tercero = 1
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_usuario_id := NULL;
        END;

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
            v_usuario_id,
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual() IS
'Trigger que registra cambios de estado en historial_plan_anual.
Fix 176: usuario_id ahora es UUID (busca id_person del sistema) o NULL si no encuentra.';

-- Asegurar que usuario_id en historial_plan_anual permita NULL
ALTER TABLE control_interno.historial_plan_anual
    ALTER COLUMN usuario_id DROP NOT NULL;
