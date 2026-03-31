-- Migration 164: Fix trigger historial_auditoria.usuario_id
-- 1) Ajusta la función trigger para registrar cambios de estado en historial_auditoria
-- 2) Normaliza la columna usuario_id como BIGINT (FK a auth.personas.id_tercero) y permite NULL

-- 1) Reemplazar la función del trigger
CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    estado_anterior_text TEXT;
    estado_nuevo_text   TEXT;
BEGIN
    -- Solo registrar si cambió el estado_kanban
    IF (TG_OP = 'UPDATE' AND OLD.estado_kanban IS DISTINCT FROM NEW.estado_kanban) THEN
        -- Manejar NULL: si estado_anterior es NULL, mostrar "Planeación" (estado inicial por defecto)
        estado_anterior_text := COALESCE(OLD.estado_kanban, 'Planeación');
        estado_nuevo_text    := COALESCE(NEW.estado_kanban, '');

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
            NULL, -- usuario_id: se deja NULL hasta conectar con el usuario real
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

-- 2) Normalizar tipo y nullability de usuario_id en historial_auditoria
DO $$
BEGIN
    -- Quitar FK si existe para poder tocar la columna
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'control_interno'
          AND table_name = 'historial_auditoria'
          AND constraint_name = 'fk_historial_auditoria_usuario'
    ) THEN
        ALTER TABLE control_interno.historial_auditoria
            DROP CONSTRAINT fk_historial_auditoria_usuario;
    END IF;

    -- Asegurar que usuario_id sea BIGINT y permita NULL.
    -- Si actualmente es UUID u otro tipo, se elimina y se vuelve a crear como BIGINT.
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'control_interno'
          AND table_name   = 'historial_auditoria'
          AND column_name  = 'usuario_id'
    ) THEN
        ALTER TABLE control_interno.historial_auditoria
            DROP COLUMN usuario_id;
    END IF;

    ALTER TABLE control_interno.historial_auditoria
        ADD COLUMN usuario_id BIGINT;

    -- Recrear la FK hacia auth.personas(id_tercero), permitiendo NULL (ON DELETE SET NULL)
    ALTER TABLE control_interno.historial_auditoria
        ADD CONSTRAINT fk_historial_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;
END $$;

