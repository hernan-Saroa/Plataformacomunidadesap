-- ============================================
-- MIGRACIÓN 088_SEED: Datos iniciales para listas de chequeo
-- ============================================
-- Este script crea datos de ejemplo para listas de chequeo
-- ============================================

-- Insertar listas de chequeo de ejemplo
-- Primero necesitamos obtener los IDs de los tipos de auditoría
DO $$
DECLARE
    tipo_regular_id UUID;
    tipo_territorial_id UUID;
    tipo_especial_id UUID;
    lista_id_1 UUID;
    lista_id_2 UUID;
    lista_id_3 UUID;
BEGIN
    -- Obtener IDs de tipos de auditoría (asumiendo que ya existen)
    SELECT id INTO tipo_regular_id FROM control_interno.tipo_auditoria WHERE codigo = 'AUD-REG' LIMIT 1;
    SELECT id INTO tipo_territorial_id FROM control_interno.tipo_auditoria WHERE codigo = 'AUD-TERR' LIMIT 1;
    SELECT id INTO tipo_especial_id FROM control_interno.tipo_auditoria WHERE codigo = 'AUD-ESP' LIMIT 1;

    -- Si no existen los tipos, crear listas sin tipo asociado (NULL)
    -- Lista de Chequeo 1: Gestión Administrativa (Regular)
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-ADM-001',
        'Lista de Chequeo - Gestión Administrativa',
        'Verificación de procesos administrativos estándar',
        COALESCE(tipo_regular_id, NULL),
        true,
        3
    )
    ON CONFLICT (codigo) DO NOTHING
    RETURNING id INTO lista_id_1;

    -- Lista de Chequeo 2: Control Financiero (Regular)
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-FIN-001',
        'Lista de Chequeo - Control Financiero',
        'Verificación de procesos financieros y presupuestales',
        COALESCE(tipo_regular_id, NULL),
        true,
        2
    )
    ON CONFLICT (codigo) DO NOTHING
    RETURNING id INTO lista_id_2;

    -- Lista de Chequeo 3: Gestión Territorial (Territorial)
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-TERR-001',
        'Lista de Chequeo - Gestión Territorial',
        'Verificación de procesos en sedes territoriales',
        COALESCE(tipo_territorial_id, NULL),
        true,
        1
    )
    ON CONFLICT (codigo) DO NOTHING
    RETURNING id INTO lista_id_3;

    -- Items para Lista 1 (LC-ADM-001)
    IF lista_id_1 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_1, '¿Existe documentación de procesos administrativos?', 'Documentación', true, 0),
            (lista_id_1, '¿Se cumplen los tiempos establecidos en los procesos?', 'Cumplimiento', true, 1),
            (lista_id_1, '¿Hay registro adecuado de actividades y decisiones?', 'Control', false, 2),
            (lista_id_1, '¿Los responsables están identificados y asignados?', 'Organización', true, 3),
            (lista_id_1, '¿Existe sistema de seguimiento y control?', 'Control', true, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Items para Lista 2 (LC-FIN-001)
    IF lista_id_2 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_2, '¿El presupuesto está documentado y actualizado?', 'Presupuesto', true, 0),
            (lista_id_2, '¿Existen controles para el manejo de recursos financieros?', 'Control Financiero', true, 1),
            (lista_id_2, '¿Se realizan conciliaciones periódicas?', 'Contabilidad', true, 2),
            (lista_id_2, '¿Los informes financieros son oportunos y precisos?', 'Reportes', true, 3)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Items para Lista 3 (LC-TERR-001)
    IF lista_id_3 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_3, '¿El personal de la sede territorial está capacitado?', 'Capacitación', true, 0),
            (lista_id_3, '¿Existen evaluaciones periódicas del desempeño?', 'Evaluación', true, 1),
            (lista_id_3, '¿La sede cuenta con recursos suficientes?', 'Recursos', true, 2),
            (lista_id_3, '¿Se mantiene comunicación fluida con la sede central?', 'Comunicación', true, 3),
            (lista_id_3, '¿El sistema de archivo está adecuadamente implementado?', 'Documental', false, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lista 4: Seguridad y Salud en el Trabajo (Regular)
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-SST-001',
        'Lista de Chequeo - Seguridad y Salud en el Trabajo',
        'Verificación de condiciones de seguridad y salud laboral',
        COALESCE(tipo_regular_id, NULL),
        true,
        2
    )
    ON CONFLICT (codigo) DO NOTHING
    RETURNING id INTO lista_id_1;

    IF lista_id_1 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_1, '¿Existe plan de emergencias actualizado?', 'Emergencias', true, 0),
            (lista_id_1, '¿Se realizan simulacros periódicamente?', 'Capacitación', false, 1),
            (lista_id_1, '¿Los equipos de protección personal están disponibles?', 'Equipos', true, 2),
            (lista_id_1, '¿Existen señalizaciones de seguridad adecuadas?', 'Señalización', true, 3)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lista 5: Gestión Documental (Regular)
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-DOC-001',
        'Lista de Chequeo - Gestión Documental',
        'Verificación del sistema de gestión documental',
        COALESCE(tipo_regular_id, NULL),
        true,
        1
    )
    ON CONFLICT (codigo) DO NOTHING
    RETURNING id INTO lista_id_1;

    IF lista_id_1 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_1, '¿El sistema de archivo está organizado y actualizado?', 'Archivo', true, 0),
            (lista_id_1, '¿Existen controles de acceso a documentos confidenciales?', 'Seguridad', true, 1),
            (lista_id_1, '¿Los documentos están clasificados correctamente?', 'Clasificación', true, 2),
            (lista_id_1, '¿Hay políticas de retención y eliminación documental?', 'Políticas', false, 3)
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- Comentarios finales
DO $$
BEGIN
    RAISE NOTICE '✅ Seed de listas de chequeo completado';
    RAISE NOTICE '   Total de listas creadas: Verificar en tabla lista_chequeo';
END $$;
