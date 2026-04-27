-- Fix: cambiar usuario_id de bigint a UUID en historial_plan_anual

-- 1. Quitar FK si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'control_interno'
      AND table_name = 'historial_plan_anual'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%usuario%'
  ) THEN
    EXECUTE 'ALTER TABLE control_interno.historial_plan_anual DROP CONSTRAINT ' || (
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE constraint_schema = 'control_interno'
        AND table_name = 'historial_plan_anual'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%usuario%'
      LIMIT 1
    );
  END IF;
END $$;

-- 2. Cambiar tipo de usuario_id de bigint a UUID
ALTER TABLE control_interno.historial_plan_anual
  ALTER COLUMN usuario_id TYPE UUID USING NULL;

-- 3. Permitir NULL
ALTER TABLE control_interno.historial_plan_anual
  ALTER COLUMN usuario_id DROP NOT NULL;

-- 4. Recrear el trigger corregido
CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID := NULL;
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado) THEN

        BEGIN
            SELECT id_person INTO v_usuario_id
            FROM auth.personas
            WHERE id_tercero = '1'
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

-- 5. Verificar
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='control_interno' AND table_name='historial_plan_anual' AND column_name='usuario_id';
