-- ============================================================
-- Migración 149: ACTIVAR Vinculación Automática de Auditorías
-- ============================================================
-- 
-- PROPÓSITO:
-- Configurar automáticamente las actividades de auditorías del Rol 4
-- para todos los planes anuales existentes y futuros.
--
-- LÓGICA:
-- 1. Buscar en cada plan anual la primera actividad del Rol 4 
--    cuyo nombre contenga "auditoría" o "auditoria"
-- 2. Marcarla con tipo_calculo = 'auditorias'
-- 3. Vincular todas las auditorías del mismo año a esa actividad
-- 4. Calcular el cumplimiento inicial
--
-- ============================================================

-- 1. Función para configurar automáticamente la actividad de auditorías de un plan
CREATE OR REPLACE FUNCTION control_interno.fn_configurar_actividad_auditorias_plan(
    p_plan_id UUID,
    p_año INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_actividad_id UUID;
    v_count INTEGER;
BEGIN
    -- Buscar la actividad de auditorías en el Rol 4
    -- (primera actividad cuyo nombre contenga "auditoría" o "auditoria")
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

    -- Si no encuentra, intentar buscar la primera actividad del Rol 4
    IF v_actividad_id IS NULL THEN
        SELECT a.id INTO v_actividad_id
        FROM control_interno.actividad_plan_anual_5 a
        INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
        WHERE r.plan_id = p_plan_id
          AND r.rol_numero = 4
        ORDER BY a.created_at ASC
        LIMIT 1;
    END IF;

    -- Si encontramos una actividad, configurarla
    IF v_actividad_id IS NOT NULL THEN
        -- Resetear cualquier otra actividad de auditorías del mismo plan
        UPDATE control_interno.actividad_plan_anual_5 a
        SET tipo_calculo = 'manual'
        FROM control_interno.rol_plan_anual_5 r
        WHERE a.rol_id = r.id
          AND r.plan_id = p_plan_id
          AND a.tipo_calculo = 'auditorias'
          AND a.id != v_actividad_id;

        -- Configurar esta actividad como "auditorías"
        UPDATE control_interno.actividad_plan_anual_5
        SET tipo_calculo = 'auditorias'
        WHERE id = v_actividad_id;

        -- Vincular todas las auditorías del año a esta actividad
        UPDATE control_interno.auditoria
        SET actividad_plan_anual_id = v_actividad_id
        WHERE EXTRACT(YEAR FROM fecha_inicio) = p_año
          AND activa = true
          AND archivada = false;

        GET DIAGNOSTICS v_count = ROW_COUNT;

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

-- 2. Función para configurar todos los planes existentes
CREATE OR REPLACE FUNCTION control_interno.fn_configurar_todos_planes_auditorias()
RETURNS TABLE(plan_id UUID, año INTEGER, actividad_configurada UUID, auditorias_vinculadas INTEGER) AS $$
DECLARE
    v_plan RECORD;
    v_actividad_id UUID;
    v_count INTEGER;
BEGIN
    -- Iterar sobre todos los planes anuales
    FOR v_plan IN 
        SELECT id, ano 
        FROM control_interno.plan_anual_5_roles 
        ORDER BY ano DESC
    LOOP
        -- Configurar la actividad de auditorías para este plan
        v_actividad_id := control_interno.fn_configurar_actividad_auditorias_plan(v_plan.id, v_plan.ano::INTEGER);
        
        -- Contar auditorías vinculadas
        SELECT COUNT(*) INTO v_count
        FROM control_interno.auditoria
        WHERE actividad_plan_anual_id = v_actividad_id;

        -- Retornar resultado
        plan_id := v_plan.id;
        año := v_plan.ano;
        actividad_configurada := v_actividad_id;
        auditorias_vinculadas := COALESCE(v_count, 0);
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para configurar automáticamente cuando se crea un nuevo plan
CREATE OR REPLACE FUNCTION control_interno.fn_trigger_configurar_plan_nuevo()
RETURNS TRIGGER AS $$
BEGIN
    -- Esperar un poco para que se creen las actividades
    -- (esto se manejará mejor desde el backend)
    PERFORM pg_sleep(0.1);
    
    -- Intentar configurar la actividad de auditorías
    PERFORM control_interno.fn_configurar_actividad_auditorias_plan(NEW.id, NEW.ano::INTEGER);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (deshabilitado por defecto, se activa desde backend)
-- DROP TRIGGER IF EXISTS trg_configurar_plan_nuevo ON control_interno.plan_anual_5_roles;
-- CREATE TRIGGER trg_configurar_plan_nuevo
-- AFTER INSERT ON control_interno.plan_anual_5_roles
-- FOR EACH ROW
-- EXECUTE FUNCTION control_interno.fn_trigger_configurar_plan_nuevo();

-- 4. ═══════════════════════════════════════════════════════════════════════════
-- EJECUTAR CONFIGURACIÓN PARA TODOS LOS PLANES EXISTENTES
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_resultado RECORD;
    v_total_planes INTEGER := 0;
    v_total_auditorias INTEGER := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'INICIANDO CONFIGURACIÓN DE AUDITORÍAS PARA TODOS LOS PLANES';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    
    FOR v_resultado IN SELECT * FROM control_interno.fn_configurar_todos_planes_auditorias()
    LOOP
        v_total_planes := v_total_planes + 1;
        IF v_resultado.actividad_configurada IS NOT NULL THEN
            v_total_auditorias := v_total_auditorias + v_resultado.auditorias_vinculadas;
            RAISE NOTICE 'Plan año %: ✅ Configurado (% auditorías)', 
                         v_resultado.año, v_resultado.auditorias_vinculadas;
        ELSE
            RAISE NOTICE 'Plan año %: ⚠️ Sin actividad de auditorías', v_resultado.año;
        END IF;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'RESUMEN: % planes procesados, % auditorías vinculadas total', 
                 v_total_planes, v_total_auditorias;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END;
$$;

-- 5. Recalcular cumplimiento para todas las actividades configuradas
DO $$
DECLARE
    v_actividad RECORD;
    v_cumplimiento RECORD;
BEGIN
    RAISE NOTICE 'Recalculando cumplimiento para actividades configuradas...';
    
    FOR v_actividad IN 
        SELECT a.id, p.ano
        FROM control_interno.actividad_plan_anual_5 a
        INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
        INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
        WHERE a.tipo_calculo = 'auditorias'
    LOOP
        -- Calcular cumplimiento usando la función existente
        SELECT * INTO v_cumplimiento 
        FROM control_interno.fn_calcular_cumplimiento_auditorias(v_actividad.id, v_actividad.ano);
        
        -- Actualizar la actividad
        UPDATE control_interno.actividad_plan_anual_5
        SET 
            total_auditorias_programadas = COALESCE(v_cumplimiento.total_programadas, 0),
            total_auditorias_finalizadas = COALESCE(v_cumplimiento.total_finalizadas, 0),
            porcentaje_avance = COALESCE(v_cumplimiento.porcentaje_cumplimiento, 0),
            auditorias_por_tipo = COALESCE(v_cumplimiento.desglose_por_tipo, '{}'),
            estado = CASE 
                WHEN COALESCE(v_cumplimiento.porcentaje_cumplimiento, 0) >= 100 THEN 'completada'
                WHEN COALESCE(v_cumplimiento.porcentaje_cumplimiento, 0) > 0 THEN 'en-progreso'
                ELSE 'pendiente'
            END,
            updated_at = NOW()
        WHERE id = v_actividad.id;
        
        RAISE NOTICE 'Actividad % (año %): %% cumplimiento (%/% auditorías)', 
                     v_actividad.id, v_actividad.ano,
                     COALESCE(v_cumplimiento.porcentaje_cumplimiento, 0),
                     COALESCE(v_cumplimiento.total_finalizadas, 0),
                     COALESCE(v_cumplimiento.total_programadas, 0);
    END LOOP;
END;
$$;

-- 6. Vista para verificar el estado de la configuración
CREATE OR REPLACE VIEW control_interno.v_estado_vinculacion_auditorias AS
SELECT 
    p.id as plan_id,
    p.ano as año,
    a.id as actividad_id,
    a.nombre as actividad_nombre,
    a.tipo_calculo,
    a.total_auditorias_programadas,
    a.total_auditorias_finalizadas,
    a.porcentaje_avance,
    (SELECT COUNT(*) 
     FROM control_interno.auditoria au 
     WHERE au.actividad_plan_anual_id = a.id) as auditorias_vinculadas_real,
    (SELECT COUNT(*) 
     FROM control_interno.auditoria au 
     WHERE EXTRACT(YEAR FROM au.fecha_inicio) = p.ano 
       AND au.activa = true 
       AND au.archivada = false) as total_auditorias_año
FROM control_interno.plan_anual_5_roles p
LEFT JOIN control_interno.rol_plan_anual_5 r ON r.plan_id = p.id AND r.rol_numero = 4
LEFT JOIN control_interno.actividad_plan_anual_5 a ON a.rol_id = r.id AND a.tipo_calculo = 'auditorias'
ORDER BY p.ano DESC;

COMMENT ON VIEW control_interno.v_estado_vinculacion_auditorias IS 
'Vista para verificar el estado de la vinculación de auditorías al Rol 4. 
Muestra qué planes tienen actividad configurada y cuántas auditorías están vinculadas.';

-- ============================================================
-- FIN DE MIGRACIÓN 149
-- ============================================================

-- ════════════════════════════════════════════════════════════════════════════
-- CONSULTA PARA VERIFICAR RESULTADOS (ejecutar manualmente después):
-- ════════════════════════════════════════════════════════════════════════════
-- SELECT * FROM control_interno.v_estado_vinculacion_auditorias;
-- ════════════════════════════════════════════════════════════════════════════
