-- ============================================================
-- Migración 148: Vinculación Automática de Auditorías al Rol 4
-- (Evaluación y Seguimiento)
-- ============================================================
-- 
-- PROPÓSITO:
-- Todas las auditorías (regulares, territoriales, especiales, seguimiento)
-- se vinculan automáticamente a la actividad "Efectuar auditorías" del Rol 4
-- para calcular el cumplimiento del programa de auditorías.
--
-- ============================================================

-- 1. Agregar campo de vinculación a la tabla auditoria
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS actividad_plan_anual_id UUID REFERENCES control_interno.actividad_plan_anual_5(id) ON DELETE SET NULL;

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_auditoria_actividad_plan_anual 
ON control_interno.auditoria(actividad_plan_anual_id);

-- 2. Agregar campo para marcar si una actividad es de tipo "auditorías" (auto-calculable)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS tipo_calculo VARCHAR(50) DEFAULT 'manual';

-- Valores posibles: 'manual', 'auditorias', 'planes_mejoramiento'
COMMENT ON COLUMN control_interno.actividad_plan_anual_5.tipo_calculo IS 
'Tipo de cálculo de cumplimiento: manual (usuario), auditorias (automático), planes_mejoramiento (automático)';

-- 3. Agregar campos de métricas para actividades de auditorías
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS total_auditorias_programadas INTEGER DEFAULT 0;

ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS total_auditorias_finalizadas INTEGER DEFAULT 0;

ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS auditorias_por_tipo JSONB DEFAULT '{}';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.auditorias_por_tipo IS 
'Desglose de auditorías por tipo: {"regular": {"programadas": 5, "finalizadas": 3}, "territorial": {...}, "especial": {...}}';

-- 4. Crear vista para obtener el resumen de auditorías por año
CREATE OR REPLACE VIEW control_interno.v_resumen_auditorias_por_año AS
SELECT 
    EXTRACT(YEAR FROM fecha_inicio)::INTEGER AS año,
    tipo,
    estado_kanban,
    COUNT(*) as total,
    SUM(CASE WHEN estado_kanban = 'Finalizada' THEN 1 ELSE 0 END) as finalizadas,
    SUM(CASE WHEN estado_kanban IN ('Planeación', 'Ejecución', 'Comunicación', 'Seguimiento') THEN 1 ELSE 0 END) as en_proceso,
    SUM(CASE WHEN estado_kanban = 'Plan Anual' THEN 1 ELSE 0 END) as pendientes
FROM control_interno.auditoria
WHERE activa = true AND archivada = false
GROUP BY EXTRACT(YEAR FROM fecha_inicio), tipo, estado_kanban;

-- 5. Crear función para calcular el cumplimiento de auditorías
CREATE OR REPLACE FUNCTION control_interno.fn_calcular_cumplimiento_auditorias(
    p_actividad_id UUID,
    p_año INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
    total_programadas INTEGER,
    total_finalizadas INTEGER,
    porcentaje_cumplimiento INTEGER,
    desglose_por_tipo JSONB
) AS $$
DECLARE
    v_total_programadas INTEGER := 0;
    v_total_finalizadas INTEGER := 0;
    v_desglose JSONB := '{}';
BEGIN
    -- Contar auditorías por tipo y estado
    SELECT 
        COUNT(*),
        SUM(CASE WHEN estado_kanban = 'Finalizada' THEN 1 ELSE 0 END),
        jsonb_object_agg(
            COALESCE(tipo, 'regular'),
            jsonb_build_object(
                'programadas', COUNT(*),
                'finalizadas', SUM(CASE WHEN estado_kanban = 'Finalizada' THEN 1 ELSE 0 END),
                'en_proceso', SUM(CASE WHEN estado_kanban IN ('Planeación', 'Ejecución', 'Comunicación', 'Seguimiento') THEN 1 ELSE 0 END),
                'pendientes', SUM(CASE WHEN estado_kanban = 'Plan Anual' THEN 1 ELSE 0 END)
            )
        )
    INTO v_total_programadas, v_total_finalizadas, v_desglose
    FROM control_interno.auditoria
    WHERE activa = true 
      AND archivada = false
      AND EXTRACT(YEAR FROM fecha_inicio) = p_año
    GROUP BY COALESCE(tipo, 'regular');

    -- Calcular totales consolidados
    SELECT 
        COUNT(*),
        SUM(CASE WHEN estado_kanban = 'Finalizada' THEN 1 ELSE 0 END)
    INTO v_total_programadas, v_total_finalizadas
    FROM control_interno.auditoria
    WHERE activa = true 
      AND archivada = false
      AND EXTRACT(YEAR FROM fecha_inicio) = p_año;

    RETURN QUERY SELECT 
        COALESCE(v_total_programadas, 0),
        COALESCE(v_total_finalizadas, 0),
        CASE 
            WHEN COALESCE(v_total_programadas, 0) > 0 
            THEN ROUND((COALESCE(v_total_finalizadas, 0)::NUMERIC / v_total_programadas) * 100)::INTEGER
            ELSE 0 
        END,
        COALESCE(v_desglose, '{}');
END;
$$ LANGUAGE plpgsql;

-- 6. Crear función trigger para actualizar cumplimiento cuando cambia una auditoría
CREATE OR REPLACE FUNCTION control_interno.fn_trigger_actualizar_cumplimiento_auditorias()
RETURNS TRIGGER AS $$
DECLARE
    v_año INTEGER;
    v_plan_id UUID;
    v_actividad_id UUID;
    v_cumplimiento RECORD;
BEGIN
    -- Obtener el año de la auditoría
    IF TG_OP = 'DELETE' THEN
        v_año := EXTRACT(YEAR FROM OLD.fecha_inicio)::INTEGER;
    ELSE
        v_año := EXTRACT(YEAR FROM NEW.fecha_inicio)::INTEGER;
    END IF;

    -- Buscar la actividad de auditorías del Rol 4 para ese año
    SELECT a.id INTO v_actividad_id
    FROM control_interno.actividad_plan_anual_5 a
    INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
    INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
    WHERE r.numero_rol = 4 
      AND a.tipo_calculo = 'auditorias'
      AND p.año = v_año
    LIMIT 1;

    -- Si existe una actividad de auditorías, actualizarla
    IF v_actividad_id IS NOT NULL THEN
        -- Calcular cumplimiento
        SELECT * INTO v_cumplimiento 
        FROM control_interno.fn_calcular_cumplimiento_auditorias(v_actividad_id, v_año);

        -- Actualizar la actividad
        UPDATE control_interno.actividad_plan_anual_5
        SET 
            total_auditorias_programadas = v_cumplimiento.total_programadas,
            total_auditorias_finalizadas = v_cumplimiento.total_finalizadas,
            porcentaje_avance = v_cumplimiento.porcentaje_cumplimiento,
            auditorias_por_tipo = v_cumplimiento.desglose_por_tipo,
            estado = CASE 
                WHEN v_cumplimiento.porcentaje_cumplimiento >= 100 THEN 'completada'
                WHEN v_cumplimiento.porcentaje_cumplimiento > 0 THEN 'en-progreso'
                ELSE 'pendiente'
            END,
            updated_at = NOW()
        WHERE id = v_actividad_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Crear el trigger en la tabla auditoria
DROP TRIGGER IF EXISTS trg_actualizar_cumplimiento_auditorias ON control_interno.auditoria;
CREATE TRIGGER trg_actualizar_cumplimiento_auditorias
AFTER INSERT OR UPDATE OF estado_kanban, activa, archivada OR DELETE
ON control_interno.auditoria
FOR EACH ROW
EXECUTE FUNCTION control_interno.fn_trigger_actualizar_cumplimiento_auditorias();

-- 8. Función para vincular todas las auditorías del año a una actividad
CREATE OR REPLACE FUNCTION control_interno.fn_vincular_auditorias_actividad(
    p_actividad_id UUID,
    p_año INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE control_interno.auditoria
    SET actividad_plan_anual_id = p_actividad_id
    WHERE EXTRACT(YEAR FROM fecha_inicio) = p_año
      AND activa = true
      AND archivada = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Comentarios
COMMENT ON FUNCTION control_interno.fn_calcular_cumplimiento_auditorias IS 
'Calcula el cumplimiento del programa de auditorías: (finalizadas/programadas)*100';

COMMENT ON FUNCTION control_interno.fn_vincular_auditorias_actividad IS 
'Vincula todas las auditorías de un año a una actividad del plan anual';

COMMENT ON TRIGGER trg_actualizar_cumplimiento_auditorias ON control_interno.auditoria IS 
'Actualiza automáticamente el cumplimiento de la actividad del Rol 4 cuando cambia el estado de una auditoría';

-- ============================================================
-- FIN DE MIGRACIÓN 148
-- ============================================================
