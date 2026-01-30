-- ============================================
-- MIGRACIÓN CONSOLIDADA: Sistema Plan Anual 5 Roles Completo
-- ============================================
-- Fecha: 2026-01-09
-- Descripción: Consolidación de migraciones 066, 070
--              Actualiza plan_anual_5_roles y crea historial
-- ============================================

-- ===========================================
-- SECCIÓN 1: ACTUALIZAR CONSTRAINT ESTADO
-- ===========================================

ALTER TABLE control_interno.plan_anual_5_roles
DROP CONSTRAINT IF EXISTS plan_anual_5_roles_estado_check;

ALTER TABLE control_interno.plan_anual_5_roles
ADD CONSTRAINT plan_anual_5_roles_estado_check 
CHECK (estado IN ('borrador', 'en-revision', 'aprobado', 'en-ejecucion', 'completado'));

-- Comentario
COMMENT ON COLUMN control_interno.plan_anual_5_roles.estado IS 
'Estado del plan anual: borrador, en-revision, aprobado, en-ejecucion, completado';

-- ===========================================
-- SECCIÓN 2: CREAR HISTORIAL PLAN ANUAL
-- ===========================================

CREATE TABLE IF NOT EXISTS control_interno.historial_plan_anual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
        'creacion', 'actualizacion', 'aprobacion', 
        'actividad_creada', 'actividad_actualizada', 'actividad_eliminada',
        'cambio_estado'
    )),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    usuario_id BIGINT NOT NULL,
    accion VARCHAR(255) NOT NULL,
    descripcion TEXT,
    observaciones TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    cambios JSONB DEFAULT '[]'::jsonb,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_plan_anual FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_anual_5_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_plan_usuario FOREIGN KEY (usuario_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT
);

-- ===========================================
-- SECCIÓN 3: ÍNDICES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_plan ON control_interno.historial_plan_anual(plan_id);
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_usuario ON control_interno.historial_plan_anual(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_tipo ON control_interno.historial_plan_anual(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_fecha ON control_interno.historial_plan_anual(fecha, hora);
CREATE INDEX IF NOT EXISTS idx_historial_plan_cambios_gin ON control_interno.historial_plan_anual USING GIN (cambios);

-- ===========================================
-- SECCIÓN 4: TRIGGER AUTOMÁTICO DE AUDITORÍA
-- ===========================================

-- Función para registrar cambios de estado automáticamente
CREATE OR REPLACE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual()
RETURNS TRIGGER AS $$
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
            COALESCE(NEW.updated_by, 1), -- Usuario que hizo el cambio (ajustar según tu lógica)
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

-- Trigger para ejecutar la función
DROP TRIGGER IF EXISTS trg_registrar_cambio_estado_plan_anual ON control_interno.plan_anual_5_roles;
CREATE TRIGGER trg_registrar_cambio_estado_plan_anual
    AFTER UPDATE ON control_interno.plan_anual_5_roles
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual();

-- ===========================================
-- SECCIÓN 5: COMENTARIOS
-- ===========================================

COMMENT ON TABLE control_interno.historial_plan_anual IS 
'Historial de cambios y auditoría del Plan Anual 5 Roles. Registra todas las operaciones CRUD para trazabilidad y compliance.';

COMMENT ON COLUMN control_interno.historial_plan_anual.tipo_evento IS 
'Tipo de evento: creacion, actualizacion, aprobacion, actividad_creada, actividad_actualizada, actividad_eliminada, cambio_estado';

COMMENT ON COLUMN control_interno.historial_plan_anual.cambios IS 
'Array JSONB con formato [{campo: string, valorAnterior: string, valorNuevo: string}]';

COMMENT ON COLUMN control_interno.historial_plan_anual.usuario_id IS 
'FK a auth.personas(id_tercero) - Usuario que realizó la acción';

COMMENT ON COLUMN control_interno.historial_plan_anual.ip_address IS 
'Dirección IP del usuario que realizó la acción';

COMMENT ON COLUMN control_interno.historial_plan_anual.user_agent IS 
'User agent del navegador del usuario';

COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual IS 
'Función trigger que registra automáticamente los cambios de estado en historial_plan_anual';
