-- ============================================
-- MIGRACIÓN 090: Seed inicial para Tableros Kanban
-- ============================================
-- Este script inserta los tableros iniciales de Auditorías
-- y Planes de Mejoramiento con sus etapas configuradas
-- ============================================

-- Limpiar datos existentes (solo si es necesario re-ejecutar)
DELETE FROM control_interno.etapa_kanban WHERE tablero_kanban_id IN (
    SELECT id FROM control_interno.tablero_kanban WHERE tipo IN ('auditorias', 'planes_mejoramiento')
);
DELETE FROM control_interno.tablero_kanban WHERE tipo IN ('auditorias', 'planes_mejoramiento');

-- ============================================
-- TABLERO 1: AUDITORÍAS
-- ============================================
DO $$
DECLARE
    tablero_auditorias_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO control_interno.tablero_kanban (id, nombre, descripcion, tipo, activo)
    VALUES (
        tablero_auditorias_id,
        'Tablero de Auditorías',
        'Gestión del ciclo completo de auditorías',
        'auditorias',
        true
    );

    -- Etapas del Tablero de Auditorías
    INSERT INTO control_interno.etapa_kanban (
        tablero_kanban_id,
        nombre,
        descripcion,
        orden,
        color,
        tiempo_sla,
        limite_wip,
        visible,
        notificar_vencimiento,
        dias_anticipacion_alerta,
        estado,
        permitir_retroceso
    ) VALUES
    -- Etapa 1: Planificación
    (
        tablero_auditorias_id,
        'Planificación',
        'Definición de alcance y programa de auditoría',
        1,
        '#3B82F6',
        15,
        NULL,
        true,
        true,
        3,
        'inicial',
        false
    ),
    -- Etapa 2: Ejecución
    (
        tablero_auditorias_id,
        'Ejecución',
        'Levantamiento de información y papeles de trabajo',
        2,
        '#10B981',
        30,
        5,
        true,
        true,
        5,
        'intermedia',
        true
    ),
    -- Etapa 3: Comunicación Preliminar
    (
        tablero_auditorias_id,
        'Comunicación Preliminar',
        'Presentación de hallazgos preliminares',
        3,
        '#F59E0B',
        10,
        3,
        true,
        true,
        2,
        'intermedia',
        true
    ),
    -- Etapa 4: Respuesta del Auditado
    (
        tablero_auditorias_id,
        'Respuesta del Auditado',
        'Recepción y análisis de respuestas',
        4,
        '#8B5CF6',
        15,
        NULL,
        true,
        true,
        3,
        'intermedia',
        false
    ),
    -- Etapa 5: Informe Final
    (
        tablero_auditorias_id,
        'Informe Final',
        'Elaboración del informe final de auditoría',
        5,
        '#EC4899',
        10,
        2,
        true,
        true,
        2,
        'intermedia',
        false
    ),
    -- Etapa 6: Finalizada
    (
        tablero_auditorias_id,
        'Finalizada',
        'Auditoría completada y documentada',
        6,
        '#6B7280',
        0,
        NULL,
        true,
        false,
        0,
        'final',
        false
    );
END $$;

-- ============================================
-- TABLERO 2: PLANES DE MEJORAMIENTO
-- ============================================
DO $$
DECLARE
    tablero_planes_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO control_interno.tablero_kanban (id, nombre, descripcion, tipo, activo)
    VALUES (
        tablero_planes_id,
        'Tablero de Planes de Mejoramiento',
        'Seguimiento a acciones correctivas',
        'planes_mejoramiento',
        true
    );

    -- Etapas del Tablero de Planes de Mejoramiento
    INSERT INTO control_interno.etapa_kanban (
        tablero_kanban_id,
        nombre,
        descripcion,
        orden,
        color,
        tiempo_sla,
        limite_wip,
        visible,
        notificar_vencimiento,
        dias_anticipacion_alerta,
        estado,
        permitir_retroceso
    ) VALUES
    -- Etapa 1: Formulación
    (
        tablero_planes_id,
        'Formulación',
        'Diseño del plan de mejoramiento',
        1,
        '#3B82F6',
        10,
        NULL,
        true,
        true,
        2,
        'inicial',
        false
    ),
    -- Etapa 2: Aprobación
    (
        tablero_planes_id,
        'Aprobación',
        'Validación y aprobación del plan',
        2,
        '#F59E0B',
        5,
        3,
        true,
        true,
        1,
        'intermedia',
        true
    ),
    -- Etapa 3: En Ejecución
    (
        tablero_planes_id,
        'En Ejecución',
        'Implementación de acciones correctivas',
        3,
        '#10B981',
        60,
        8,
        true,
        true,
        10,
        'intermedia',
        true
    ),
    -- Etapa 4: En Seguimiento
    (
        tablero_planes_id,
        'En Seguimiento',
        'Verificación de cumplimiento',
        4,
        '#8B5CF6',
        15,
        5,
        true,
        true,
        3,
        'intermedia',
        true
    ),
    -- Etapa 5: Cumplido
    (
        tablero_planes_id,
        'Cumplido',
        'Plan completado exitosamente',
        5,
        '#22C55E',
        0,
        NULL,
        true,
        false,
        0,
        'final',
        false
    );
END $$;

-- Verificar inserción
SELECT 
    t.nombre as tablero,
    t.tipo,
    COUNT(e.id) as total_etapas
FROM control_interno.tablero_kanban t
LEFT JOIN control_interno.etapa_kanban e ON e.tablero_kanban_id = t.id
WHERE t.tipo IN ('auditorias', 'planes_mejoramiento')
GROUP BY t.id, t.nombre, t.tipo
ORDER BY t.tipo;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✓ Tableros Kanban creados exitosamente';
    RAISE NOTICE '  - Tablero de Auditorías: 6 etapas';
    RAISE NOTICE '  - Tablero de Planes de Mejoramiento: 5 etapas';
END $$;
