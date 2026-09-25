-- ============================================================
-- Migración 663: el Rol 4 cuenta las auditorías del Programa Anual (EFDS-2133)
-- ============================================================
-- El cumplimiento de la actividad de auditorías del Rol 4 contaba todas las
-- auditorías que empiezan en el año, no las del Programa Anual de la vigencia.
-- Desde EFDS-2132 una auditoría de un programa puede empezar en otro año, así
-- que los dos conjuntos ya no coinciden. Aquí se usa el mismo criterio del
-- Programa Anual y de su Excel (AuditoriasService.findAll con
-- planAnualVigencia): la vigencia del programa y, si la auditoría no la
-- tiene, el año en que empieza. Idempotente: solo CREATE OR REPLACE y DROP
-- TRIGGER IF EXISTS.
-- ============================================================

-- 1. Criterio único: ¿la auditoría pertenece al Programa Anual de ese año?
CREATE OR REPLACE FUNCTION control_interno.fn_auditoria_en_programa_anual(
    p_plan_anual_vigencia INTEGER,
    p_fecha_inicio DATE,
    p_año INTEGER
)
RETURNS BOOLEAN AS $$
    SELECT CASE
        WHEN p_plan_anual_vigencia IS NOT NULL THEN p_plan_anual_vigencia = p_año
        ELSE p_fecha_inicio IS NOT NULL AND EXTRACT(YEAR FROM p_fecha_inicio)::INTEGER = p_año
    END;
$$ LANGUAGE sql IMMUTABLE;

COMMENT ON FUNCTION control_interno.fn_auditoria_en_programa_anual IS
'Pertenencia de una auditoría al Programa Anual de un año: su vigencia de programa o, sin ella, el año de inicio (EFDS-2133)';

-- 2. Cumplimiento: programadas y finalizadas del Programa Anual
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
    SELECT
        COUNT(*)::INTEGER,
        SUM(CASE WHEN estado_kanban = 'Finalizada' THEN 1 ELSE 0 END)::INTEGER
    INTO v_total_programadas, v_total_finalizadas
    FROM control_interno.auditoria
    WHERE activa = true
      AND archivada = false
      AND control_interno.fn_auditoria_en_programa_anual(plan_anual_vigencia, fecha_inicio, p_año);

    SELECT COALESCE(jsonb_object_agg(tipo_grupo, stats), '{}'::jsonb)
    INTO v_desglose
    FROM (
        SELECT
            COALESCE(tipo, 'regular') AS tipo_grupo,
            jsonb_build_object(
                'programadas', COUNT(*)::INTEGER,
                'finalizadas', SUM(CASE WHEN estado_kanban = 'Finalizada' THEN 1 ELSE 0 END)::INTEGER,
                'en_proceso', SUM(CASE WHEN estado_kanban IN ('Planeación', 'Ejecución', 'Comunicación', 'Seguimiento') THEN 1 ELSE 0 END)::INTEGER,
                'pendientes', SUM(CASE WHEN estado_kanban = 'Plan Anual' THEN 1 ELSE 0 END)::INTEGER
            ) AS stats
        FROM control_interno.auditoria
        WHERE activa = true
          AND archivada = false
          AND control_interno.fn_auditoria_en_programa_anual(plan_anual_vigencia, fecha_inicio, p_año)
        GROUP BY COALESCE(tipo, 'regular')
    ) subq;

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

-- 3. Vinculación de las auditorías del programa a la actividad del Rol 4
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
    WHERE activa = true
      AND archivada = false
      AND control_interno.fn_auditoria_en_programa_anual(plan_anual_vigencia, fecha_inicio, p_año);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Configuración automática de la actividad: misma búsqueda de antes, pero
--    vincula con el criterio del programa.
CREATE OR REPLACE FUNCTION control_interno.fn_configurar_actividad_auditorias_plan(
    p_plan_id UUID,
    p_año INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_actividad_id UUID;
    v_count INTEGER;
BEGIN
    SELECT a.id INTO v_actividad_id
    FROM control_interno.actividad_plan_anual_5 a
    INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
    WHERE r.plan_id = p_plan_id
      AND r.rol_numero = 4
      AND (
          LOWER(a.nombre) LIKE '%auditoría%'
          OR LOWER(a.nombre) LIKE '%auditoria%'
          OR LOWER(a.nombre) LIKE '%programa de auditor%'
      )
    ORDER BY a.created_at ASC
    LIMIT 1;

    IF v_actividad_id IS NULL THEN
        SELECT a.id INTO v_actividad_id
        FROM control_interno.actividad_plan_anual_5 a
        INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
        WHERE r.plan_id = p_plan_id
          AND r.rol_numero = 4
        ORDER BY a.created_at ASC
        LIMIT 1;
    END IF;

    IF v_actividad_id IS NOT NULL THEN
        UPDATE control_interno.actividad_plan_anual_5 a
        SET tipo_calculo = 'manual'
        FROM control_interno.rol_plan_anual_5 r
        WHERE a.rol_id = r.id
          AND r.plan_id = p_plan_id
          AND a.tipo_calculo = 'auditorias'
          AND a.id != v_actividad_id;

        UPDATE control_interno.actividad_plan_anual_5
        SET tipo_calculo = 'auditorias'
        WHERE id = v_actividad_id;

        v_count := control_interno.fn_vincular_auditorias_actividad(v_actividad_id, p_año);

        RAISE NOTICE 'Plan % (año %): Actividad % configurada con % auditorías vinculadas',
                     p_plan_id, p_año, v_actividad_id, v_count;

        RETURN v_actividad_id;
    ELSE
        RAISE NOTICE 'Plan % (año %): No se encontró actividad de auditorías en Rol 4',
                     p_plan_id, p_año;
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Recalcular la actividad de auditorías del Rol 4 de un año
CREATE OR REPLACE FUNCTION control_interno.fn_actualizar_cumplimiento_auditorias_vigencia(
    p_año INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_actividad_id UUID;
    v_cumplimiento RECORD;
BEGIN
    IF p_año IS NULL THEN
        RETURN;
    END IF;

    SELECT a.id INTO v_actividad_id
    FROM control_interno.actividad_plan_anual_5 a
    INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
    INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
    WHERE r.rol_numero = 4
      AND a.tipo_calculo = 'auditorias'
      AND p.ano = p_año
    LIMIT 1;

    IF v_actividad_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO v_cumplimiento
    FROM control_interno.fn_calcular_cumplimiento_auditorias(v_actividad_id, p_año);

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
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger: la vigencia del programa decide qué Rol 4 se recalcula. Si la
--    auditoría cambia de programa (o de año de inicio sin programa), se
--    recalculan los dos.
CREATE OR REPLACE FUNCTION control_interno.fn_trigger_actualizar_cumplimiento_auditorias()
RETURNS TRIGGER AS $$
DECLARE
    v_año_anterior INTEGER;
    v_año_nuevo INTEGER;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_año_anterior := COALESCE(OLD.plan_anual_vigencia, EXTRACT(YEAR FROM OLD.fecha_inicio)::INTEGER);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_año_nuevo := COALESCE(NEW.plan_anual_vigencia, EXTRACT(YEAR FROM NEW.fecha_inicio)::INTEGER);
    END IF;

    PERFORM control_interno.fn_actualizar_cumplimiento_auditorias_vigencia(v_año_nuevo);
    IF v_año_anterior IS DISTINCT FROM v_año_nuevo THEN
        PERFORM control_interno.fn_actualizar_cumplimiento_auditorias_vigencia(v_año_anterior);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_cumplimiento_auditorias ON control_interno.auditoria;
CREATE TRIGGER trg_actualizar_cumplimiento_auditorias
AFTER INSERT OR UPDATE OF estado_kanban, activa, archivada, plan_anual_vigencia, fecha_inicio OR DELETE
ON control_interno.auditoria
FOR EACH ROW
EXECUTE FUNCTION control_interno.fn_trigger_actualizar_cumplimiento_auditorias();

-- 7. Poner al día lo ya guardado
DO $$
DECLARE
    v_ano INTEGER;
BEGIN
    FOR v_ano IN SELECT DISTINCT ano FROM control_interno.plan_anual_5_roles WHERE ano > 0 LOOP
        PERFORM control_interno.fn_actualizar_cumplimiento_auditorias_vigencia(v_ano);
    END LOOP;
END $$;
