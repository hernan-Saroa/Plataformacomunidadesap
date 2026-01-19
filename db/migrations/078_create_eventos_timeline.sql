-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 069: Crear tabla de eventos del timeline para planes de mejoramiento
-- ═══════════════════════════════════════════════════════════════════════════
-- Descripción: Registra todos los eventos importantes de un plan de mejoramiento
--              para mantener un historial completo y detallado de actividades
-- Fecha: 2026-01-11
-- ═══════════════════════════════════════════════════════════════════════════

-- Crear tipo enum para los tipos de eventos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_evento_timeline') THEN
        CREATE TYPE control_interno.tipo_evento_timeline AS ENUM (
            'CREACION',           -- Plan o acción creada
            'ACTUALIZACION',      -- Plan o acción actualizada
            'APROBACION',         -- Plan aprobado
            'COMPLETADA',         -- Acción completada
            'EVIDENCIA',          -- Evidencia cargada
            'COMENTARIO',         -- Comentario agregado
            'PROGRESO',           -- Actualización de progreso
            'ESTADO',             -- Cambio de estado
            'HALLAZGO_COMPLETADO' -- Hallazgo completado
        );
    END IF;
END $$;

-- Crear tabla de eventos del timeline
CREATE TABLE IF NOT EXISTS control_interno.eventos_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_mejoramiento_id UUID NOT NULL,
    tipo control_interno.tipo_evento_timeline NOT NULL,
    descripcion TEXT NOT NULL,
    usuario_id UUID,
    usuario_nombre VARCHAR(255),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Metadata adicional en formato JSON para flexibilidad
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key hacia plan de mejoramiento
    CONSTRAINT fk_evento_plan_mejoramiento 
        FOREIGN KEY (plan_mejoramiento_id) 
        REFERENCES control_interno.plan_mejoramiento(id) 
        ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_eventos_timeline_plan_id 
    ON control_interno.eventos_timeline(plan_mejoramiento_id);

CREATE INDEX IF NOT EXISTS idx_eventos_timeline_fecha 
    ON control_interno.eventos_timeline(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_timeline_tipo 
    ON control_interno.eventos_timeline(tipo);

CREATE INDEX IF NOT EXISTS idx_eventos_timeline_usuario 
    ON control_interno.eventos_timeline(usuario_id);

-- Índice GIN para búsquedas en metadata JSON
CREATE INDEX IF NOT EXISTS idx_eventos_timeline_metadata 
    ON control_interno.eventos_timeline USING GIN (metadata);

-- Comentarios en la tabla y columnas
COMMENT ON TABLE control_interno.eventos_timeline IS 
'Registro histórico de todos los eventos importantes relacionados con planes de mejoramiento';

COMMENT ON COLUMN control_interno.eventos_timeline.plan_mejoramiento_id IS 
'ID del plan de mejoramiento al que pertenece el evento';

COMMENT ON COLUMN control_interno.eventos_timeline.tipo IS 
'Tipo de evento registrado (creación, actualización, evidencia, etc.)';

COMMENT ON COLUMN control_interno.eventos_timeline.descripcion IS 
'Descripción legible del evento para mostrar en el timeline';

COMMENT ON COLUMN control_interno.eventos_timeline.usuario_id IS 
'ID del usuario que generó el evento';

COMMENT ON COLUMN control_interno.eventos_timeline.usuario_nombre IS 
'Nombre del usuario que generó el evento (desnormalizado para histórico)';

COMMENT ON COLUMN control_interno.eventos_timeline.fecha IS 
'Fecha y hora en que ocurrió el evento';

COMMENT ON COLUMN control_interno.eventos_timeline.metadata IS 
'Información adicional del evento en formato JSON (IDs relacionados, valores anteriores/nuevos, etc.)';

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIÓN AUXILIAR: Registrar evento automáticamente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION control_interno.registrar_evento_timeline(
    p_plan_id UUID,
    p_tipo control_interno.tipo_evento_timeline,
    p_descripcion TEXT,
    p_usuario_id UUID DEFAULT NULL,
    p_usuario_nombre VARCHAR(255) DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_evento_id UUID;
BEGIN
    INSERT INTO control_interno.eventos_timeline (
        plan_mejoramiento_id,
        tipo,
        descripcion,
        usuario_id,
        usuario_nombre,
        metadata
    ) VALUES (
        p_plan_id,
        p_tipo,
        p_descripcion,
        p_usuario_id,
        p_usuario_nombre,
        p_metadata
    ) RETURNING id INTO v_evento_id;
    
    RETURN v_evento_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION control_interno.registrar_evento_timeline IS 
'Función auxiliar para registrar eventos en el timeline de forma consistente';

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Registrar creación de plan automáticamente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION control_interno.trigger_evento_creacion_plan()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM control_interno.registrar_evento_timeline(
        NEW.id,
        'CREACION'::control_interno.tipo_evento_timeline,
        'Plan de mejoramiento creado',
        NULL,  -- responsable_id no existe en plan_mejoramiento
        NEW.responsable_implementacion,  -- usar responsable_implementacion
        jsonb_build_object(
            'estado_inicial', NEW.estado,
            'fecha_limite', NEW.fecha_limite,
            'area_responsable', NEW.area_responsable
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evento_creacion_plan ON control_interno.plan_mejoramiento;

CREATE TRIGGER trg_evento_creacion_plan
    AFTER INSERT ON control_interno.plan_mejoramiento
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.trigger_evento_creacion_plan();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Registrar actualización de estado del plan
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION control_interno.trigger_evento_actualizacion_plan()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si cambió el estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        PERFORM control_interno.registrar_evento_timeline(
            NEW.id,
            CASE 
                WHEN NEW.estado = 'aprobado' THEN 'APROBACION'::control_interno.tipo_evento_timeline
                ELSE 'ESTADO'::control_interno.tipo_evento_timeline
            END,
            CASE 
                WHEN NEW.estado = 'aprobado' THEN 'Plan de mejoramiento aprobado'
                ELSE 'Estado del plan actualizado: ' || OLD.estado || ' → ' || NEW.estado
            END,
            NULL,  -- responsable_id no existe en plan_mejoramiento
            COALESCE(NEW.aprobado_por, NEW.responsable_implementacion),  -- usar aprobado_por si es aprobación, sino responsable_implementacion
            jsonb_build_object(
                'estado_anterior', OLD.estado,
                'estado_nuevo', NEW.estado,
                'fecha_cambio', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evento_actualizacion_plan ON control_interno.plan_mejoramiento;

CREATE TRIGGER trg_evento_actualizacion_plan
    AFTER UPDATE ON control_interno.plan_mejoramiento
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION control_interno.trigger_evento_actualizacion_plan();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Registrar creación de acción correctiva
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION control_interno.trigger_evento_creacion_accion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM control_interno.registrar_evento_timeline(
        NEW.plan_id,
        'CREACION'::control_interno.tipo_evento_timeline,
        'Nueva acción creada: ' || SUBSTRING(NEW.descripcion, 1, 100) || 
        CASE WHEN LENGTH(NEW.descripcion) > 100 THEN '...' ELSE '' END,
        NULL,  -- responsable_id no existe en accion_correctiva
        NEW.responsable,  -- usar el campo responsable que es varchar
        jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id,
            'estado', NEW.estado,
            'progreso', NEW.porcentaje_avance
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evento_creacion_accion ON control_interno.accion_correctiva;

CREATE TRIGGER trg_evento_creacion_accion
    AFTER INSERT ON control_interno.accion_correctiva
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.trigger_evento_creacion_accion();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Registrar actualización de acción correctiva
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION control_interno.trigger_evento_actualizacion_accion()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo control_interno.tipo_evento_timeline;
    v_descripcion TEXT;
    v_metadata JSONB;
BEGIN
    -- Determinar el tipo de evento según lo que cambió
    IF OLD.porcentaje_avance IS DISTINCT FROM NEW.porcentaje_avance THEN
        v_tipo := 'PROGRESO'::control_interno.tipo_evento_timeline;
        v_descripcion := 'Progreso actualizado: ' || OLD.porcentaje_avance || '% → ' || NEW.porcentaje_avance || '%';
        v_metadata := jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id,
            'progreso_anterior', OLD.porcentaje_avance,
            'progreso_nuevo', NEW.porcentaje_avance
        );
        
        -- Si llegó a 100%, es una completación
        IF NEW.porcentaje_avance = 100 AND OLD.porcentaje_avance < 100 THEN
            v_tipo := 'COMPLETADA'::control_interno.tipo_evento_timeline;
            v_descripcion := 'Acción completada: ' || SUBSTRING(NEW.descripcion, 1, 100) ||
                           CASE WHEN LENGTH(NEW.descripcion) > 100 THEN '...' ELSE '' END;
        END IF;
        
    ELSIF OLD.estado IS DISTINCT FROM NEW.estado THEN
        v_tipo := 'ESTADO'::control_interno.tipo_evento_timeline;
        v_descripcion := 'Estado de acción actualizado: ' || OLD.estado || ' → ' || NEW.estado;
        v_metadata := jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id,
            'estado_anterior', OLD.estado,
            'estado_nuevo', NEW.estado
        );
        
    ELSE
        v_tipo := 'ACTUALIZACION'::control_interno.tipo_evento_timeline;
        v_descripcion := 'Acción actualizada: ' || SUBSTRING(NEW.descripcion, 1, 100) ||
                       CASE WHEN LENGTH(NEW.descripcion) > 100 THEN '...' ELSE '' END;
        v_metadata := jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id
        );
    END IF;
    
    PERFORM control_interno.registrar_evento_timeline(
        NEW.plan_id,
        v_tipo,
        v_descripcion,
        NULL,  -- responsable_id no existe en accion_correctiva
        NEW.responsable,  -- usar el campo responsable que es varchar
        v_metadata
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evento_actualizacion_accion ON control_interno.accion_correctiva;

CREATE TRIGGER trg_evento_actualizacion_accion
    AFTER UPDATE ON control_interno.accion_correctiva
    FOR EACH ROW
    WHEN (
        OLD.porcentaje_avance IS DISTINCT FROM NEW.porcentaje_avance OR
        OLD.estado IS DISTINCT FROM NEW.estado OR
        OLD.descripcion IS DISTINCT FROM NEW.descripcion
    )
    EXECUTE FUNCTION control_interno.trigger_evento_actualizacion_accion();

-- ═══════════════════════════════════════════════════════════════════════════
-- Permisos
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajustar permisos según los roles de tu sistema
-- GRANT SELECT, INSERT ON control_interno.eventos_timeline TO role_usuario;
-- GRANT ALL ON control_interno.eventos_timeline TO role_admin;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
