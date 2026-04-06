-- Migration 165: Hotfix para fn_registrar_cambio_estado_auditoria con UUID
-- El problema: usuario_id es UUID pero el trigger insertaba 1 (integer)
-- Solución: usar NULL temporalmente o buscar un UUID sistema válido

-- 1) FIX CRÍTICO: Reemplazar la función del trigger para usar NULL
CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    estado_anterior_text TEXT;
    estado_nuevo_text    TEXT;
    v_usuario_id         UUID := NULL; -- NULL por defecto
BEGIN
    -- Solo registrar si cambió el estado_kanban
    IF (TG_OP = 'UPDATE' AND OLD.estado_kanban IS DISTINCT FROM NEW.estado_kanban) THEN
        -- Manejar NULL: si estado_anterior es NULL, mostrar "Planeación" (estado inicial por defecto)
        estado_anterior_text := COALESCE(OLD.estado_kanban, 'Planeación');
        estado_nuevo_text    := COALESCE(NEW.estado_kanban, '');

        -- Intentar obtener un usuario "sistema" si existe (opcional)
        BEGIN
            SELECT id_person INTO v_usuario_id
            FROM auth.personas
            WHERE id_tercero = 1 -- Usuario sistema
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_usuario_id := NULL;
        END;

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
            v_usuario_id, -- UUID válido o NULL
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

COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_auditoria IS 
'Trigger que registra cambios de estado_kanban en historial_auditoria. 
Fix 165: usuario_id ahora es UUID (busca id_person) o NULL si no encuentra.';

-- 2) Asegurar que usuario_id en historial_auditoria sea UUID y permita NULL
DO $$
BEGIN
    -- Verificar el tipo actual de usuario_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno'
          AND table_name = 'historial_auditoria'
          AND column_name = 'usuario_id'
          AND data_type != 'uuid'
    ) THEN
        -- Necesita cambiar a UUID
        -- Quitar FK si existe
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_schema = 'control_interno'
              AND table_name = 'historial_auditoria'
              AND constraint_name = 'fk_historial_auditoria_usuario'
        ) THEN
            ALTER TABLE control_interno.historial_auditoria
                DROP CONSTRAINT fk_historial_auditoria_usuario;
        END IF;

        -- Drop y recrear como UUID
        ALTER TABLE control_interno.historial_auditoria
            ALTER COLUMN usuario_id TYPE UUID USING NULL;
    END IF;

    -- Permitir NULL en usuario_id
    ALTER TABLE control_interno.historial_auditoria
        ALTER COLUMN usuario_id DROP NOT NULL;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Info: %', SQLERRM;
END $$;

SELECT 'Migration 165 completada - Trigger corregido para usar UUID' AS status;
