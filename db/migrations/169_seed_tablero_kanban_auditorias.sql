-- 169_seed_tablero_kanban_auditorias.sql
-- Seed para cargar las etapas por defecto en el kanban de auditorias

DO $$
DECLARE
    tablero_id UUID;
BEGIN
    -- Validar si ya existe el tablero
    SELECT id INTO tablero_id FROM control_interno.tablero_kanban WHERE tipo = 'auditorias' LIMIT 1;
    
    IF tablero_id IS NULL THEN
        -- Generar ID
        tablero_id := gen_random_uuid();
        
        -- 1. Insertar el Tablero
        INSERT INTO control_interno.tablero_kanban (
            id, nombre, descripcion, tipo, activo
        ) VALUES (
            tablero_id, 
            'Tablero Kanban - Auditorías', 
            'Configuración de etapas para el proceso de auditorías', 
            'auditorias', 
            true
        );

        -- 2. Insertar las etapas
        -- Etapa 1: Programa Anual (Inicial)
        INSERT INTO control_interno.etapa_kanban (
            id, tablero_kanban_id, nombre, descripcion, orden, color,
            tiempo_sla, limite_wip, visible, notificar_vencimiento,
            dias_anticipacion_alerta, estado, permitir_retroceso
        ) VALUES (
            gen_random_uuid(), tablero_id, 'Programa Anual', 
            'Auditorías registradas en el PAA', 1, '#9CA3AF', 
            15, NULL, true, false, 0, 'inicial', false
        );

        -- Etapa 2: Planeación (Intermedia)
        INSERT INTO control_interno.etapa_kanban (
            id, tablero_kanban_id, nombre, descripcion, orden, color,
            tiempo_sla, limite_wip, visible, notificar_vencimiento,
            dias_anticipacion_alerta, estado, permitir_retroceso
        ) VALUES (
            gen_random_uuid(), tablero_id, 'Planeación', 
            'Elaboración del memorando, plan de auditoría y listas de chequeo', 2, '#3B82F6', 
            30, 5, true, true, 5, 'intermedia', true
        );

        -- Etapa 3: Ejecución (Intermedia)
        INSERT INTO control_interno.etapa_kanban (
            id, tablero_kanban_id, nombre, descripcion, orden, color,
            tiempo_sla, limite_wip, visible, notificar_vencimiento,
            dias_anticipacion_alerta, estado, permitir_retroceso
        ) VALUES (
            gen_random_uuid(), tablero_id, 'Ejecución', 
            'Trabajo de campo, recolección de evidencias y papeles de trabajo', 3, '#F59E0B', 
            60, 5, true, true, 10, 'intermedia', true
        );

        -- Etapa 4: Comunicación (Intermedia)
        INSERT INTO control_interno.etapa_kanban (
            id, tablero_kanban_id, nombre, descripcion, orden, color,
            tiempo_sla, limite_wip, visible, notificar_vencimiento,
            dias_anticipacion_alerta, estado, permitir_retroceso
        ) VALUES (
            gen_random_uuid(), tablero_id, 'Comunicación', 
            'Mesas de trabajo, presentación y socialización del informe', 4, '#8B5CF6', 
            15, null, true, true, 3, 'intermedia', true
        );

        -- Etapa 5: Seguimiento (Intermedia)
        INSERT INTO control_interno.etapa_kanban (
            id, tablero_kanban_id, nombre, descripcion, orden, color,
            tiempo_sla, limite_wip, visible, notificar_vencimiento,
            dias_anticipacion_alerta, estado, permitir_retroceso
        ) VALUES (
            gen_random_uuid(), tablero_id, 'Seguimiento', 
            'Seguimiento a planes de mejoramiento u observaciones', 5, '#10B981', 
            30, null, true, true, 5, 'intermedia', true
        );

        -- Etapa 6: Finalizada (Final)
        INSERT INTO control_interno.etapa_kanban (
            id, tablero_kanban_id, nombre, descripcion, orden, color,
            tiempo_sla, limite_wip, visible, notificar_vencimiento,
            dias_anticipacion_alerta, estado, permitir_retroceso
        ) VALUES (
            gen_random_uuid(), tablero_id, 'Finalizada', 
            'Auditoría completamente cerrada y documento finalizado', 6, '#059669', 
            0, null, true, false, 0, 'final', false
        );
    END IF;
END $$;
