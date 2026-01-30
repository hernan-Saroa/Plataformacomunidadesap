-- ============================================
-- MIGRACIÓN 088_SEED: Datos iniciales para listas de chequeo
-- ============================================
-- Este script crea datos de ejemplo para listas de chequeo
-- NOTA: Ejecutar después de 088_create_lista_chequeo.sql
-- ============================================

-- Primero, limpiar datos existentes si es necesario
DO $$
BEGIN
    RAISE NOTICE '🧹 Limpiando datos existentes de listas de chequeo...';
    DELETE FROM control_interno.item_lista_chequeo;
    DELETE FROM control_interno.lista_chequeo;
    RAISE NOTICE '✅ Limpieza completada';
END $$;

-- Insertar listas de chequeo de ejemplo
DO $$
DECLARE
    tipo_regular_id UUID;
    tipo_territorial_id UUID;
    tipo_especial_id UUID;
    lista_id_1 UUID;
    lista_id_2 UUID;
    lista_id_3 UUID;
BEGIN
    RAISE NOTICE '📋 Iniciando inserción de listas de chequeo...';

    -- Obtener IDs de tipos de auditoría (asumiendo que ya existen)
    SELECT id INTO tipo_regular_id FROM control_interno.tipo_auditoria WHERE codigo = 'AUD-REG' LIMIT 1;
    SELECT id INTO tipo_territorial_id FROM control_interno.tipo_auditoria WHERE codigo = 'AUD-TERR' LIMIT 1;
    SELECT id INTO tipo_especial_id FROM control_interno.tipo_auditoria WHERE codigo = 'AUD-ESP' LIMIT 1;

    -- ========================================
    -- LISTAS DE TIPO: PLANEACION
    -- ========================================
    RAISE NOTICE '  📝 Creando listas de tipo PLANEACION...';

    -- Lista 1: Gestión Administrativa - PLANEACION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-PLAN-001',
        'Lista de Chequeo - Planeación Administrativa',
        'Verificación de procesos de planeación administrativa',
        'planeacion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_1;

    IF lista_id_1 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_1, '¿Existe plan estratégico documentado?', 'Planeación', true, 0),
            (lista_id_1, '¿Los objetivos están definidos y alineados?', 'Objetivos', true, 1),
            (lista_id_1, '¿Se han identificado los riesgos del proceso?', 'Riesgos', true, 2),
            (lista_id_1, '¿Hay indicadores de gestión definidos?', 'Indicadores', true, 3),
            (lista_id_1, '¿El presupuesto está asignado?', 'Presupuesto', false, 4);
        RAISE NOTICE '    ✓ Lista LC-PLAN-001 creada con % items', 5;
    END IF;

    -- Lista 2: Planeación Financiera - PLANEACION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-PLAN-002',
        'Lista de Chequeo - Planeación Financiera',
        'Verificación de procesos de planeación financiera',
        'planeacion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_2;

    IF lista_id_2 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_2, '¿Existe presupuesto aprobado para el periodo?', 'Presupuesto', true, 0),
            (lista_id_2, '¿Se han proyectado los ingresos esperados?', 'Proyección', true, 1),
            (lista_id_2, '¿Están definidos los rubros presupuestales?', 'Rubros', true, 2),
            (lista_id_2, '¿Hay plan de contingencia financiera?', 'Contingencia', false, 3);
        RAISE NOTICE '    ✓ Lista LC-PLAN-002 creada con % items', 4;
    END IF;

    -- ========================================
    -- LISTAS DE TIPO: EJECUCION
    -- ========================================
    RAISE NOTICE '  ⚙️ Creando listas de tipo EJECUCION...';

    -- Lista 3: Control Financiero - EJECUCION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-EJEC-001',
        'Lista de Chequeo - Ejecución Financiera',
        'Verificación de procesos de ejecución financiera',
        'ejecucion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_1;

    IF lista_id_1 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_1, '¿Se están ejecutando los recursos según lo presupuestado?', 'Ejecución', true, 0),
            (lista_id_1, '¿Existen soportes de todas las transacciones?', 'Documentación', true, 1),
            (lista_id_1, '¿Se realizan conciliaciones periódicas?', 'Control', true, 2),
            (lista_id_1, '¿Los informes están actualizados?', 'Reportes', true, 3),
            (lista_id_1, '¿Se cumplen los procedimientos establecidos?', 'Procedimientos', true, 4);
        RAISE NOTICE '    ✓ Lista LC-EJEC-001 creada con % items', 5;
    END IF;

    -- Lista 4: Gestión Administrativa - EJECUCION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-EJEC-002',
        'Lista de Chequeo - Ejecución Administrativa',
        'Verificación de procesos administrativos en ejecución',
        'ejecucion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_2;

    IF lista_id_2 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_2, '¿Se cumplen los tiempos establecidos en los procesos?', 'Tiempos', true, 0),
            (lista_id_2, '¿Hay registro de actividades y decisiones?', 'Registro', true, 1),
            (lista_id_2, '¿Los responsables están ejecutando sus funciones?', 'Responsabilidades', true, 2),
            (lista_id_2, '¿Existe seguimiento a las actividades?', 'Seguimiento', true, 3);
        RAISE NOTICE '    ✓ Lista LC-EJEC-002 creada con % items', 4;
    END IF;

    -- Lista 5: Seguridad y Salud en el Trabajo - EJECUCION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-EJEC-003',
        'Lista de Chequeo - SST en Ejecución',
        'Verificación de seguridad y salud durante la ejecución',
        'ejecucion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_3;

    IF lista_id_3 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_3, '¿Existe plan de emergencias vigente?', 'Emergencias', true, 0),
            (lista_id_3, '¿Se realizan inspecciones de seguridad?', 'Inspecciones', true, 1),
            (lista_id_3, '¿Los equipos de protección están disponibles?', 'EPP', true, 2),
            (lista_id_3, '¿Hay señalización adecuada?', 'Señalización', true, 3);
        RAISE NOTICE '    ✓ Lista LC-EJEC-003 creada con % items', 4;
    END IF;

    -- ========================================
    -- LISTAS DE TIPO: COMUNICACION
    -- ========================================
    RAISE NOTICE '  📢 Creando listas de tipo COMUNICACION...';

    -- Lista 6: Comunicación de Resultados - COMUNICACION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-COMU-001',
        'Lista de Chequeo - Comunicación de Resultados',
        'Verificación de procesos de comunicación de resultados',
        'comunicacion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_1;

    IF lista_id_1 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_1, '¿Los informes están completos y claros?', 'Informes', true, 0),
            (lista_id_1, '¿Se han comunicado los hallazgos a los responsables?', 'Hallazgos', true, 1),
            (lista_id_1, '¿Existen actas de las reuniones realizadas?', 'Actas', true, 2),
            (lista_id_1, '¿Se han documentado las recomendaciones?', 'Recomendaciones', true, 3),
            (lista_id_1, '¿Hay plan de seguimiento definido?', 'Seguimiento', true, 4);
        RAISE NOTICE '    ✓ Lista LC-COMU-001 creada con % items', 5;
    END IF;

    -- Lista 7: Gestión Documental - COMUNICACION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-COMU-002',
        'Lista de Chequeo - Comunicación Documental',
        'Verificación de comunicación y gestión documental',
        'comunicacion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_regular_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_2;

    IF lista_id_2 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_2, '¿Los documentos están disponibles para consulta?', 'Disponibilidad', true, 0),
            (lista_id_2, '¿Hay registro de entrega de documentos?', 'Registro', true, 1),
            (lista_id_2, '¿Se notificaron las decisiones a los interesados?', 'Notificaciones', true, 2),
            (lista_id_2, '¿Los canales de comunicación están activos?', 'Canales', false, 3);
        RAISE NOTICE '    ✓ Lista LC-COMU-002 creada con % items', 4;
    END IF;

    -- Lista 8: Gestión Territorial - COMUNICACION
    INSERT INTO control_interno.lista_chequeo (
        codigo, nombre, descripcion, tipo, tipo_auditoria_id, activa, usos_programados
    ) VALUES (
        'LC-COMU-003',
        'Lista de Chequeo - Comunicación Territorial',
        'Verificación de comunicación con sedes territoriales',
        'comunicacion'::control_interno.tipo_lista_chequeo_enum,
        COALESCE(tipo_territorial_id, NULL),
        true,
        0
    )
    RETURNING id INTO lista_id_3;

    IF lista_id_3 IS NOT NULL THEN
        INSERT INTO control_interno.item_lista_chequeo (
            lista_chequeo_id, texto, categoria, obligatorio, orden
        ) VALUES
            (lista_id_3, '¿Se mantiene comunicación fluida con la sede central?', 'Comunicación', true, 0),
            (lista_id_3, '¿Los reportes se envían en los tiempos establecidos?', 'Reportes', true, 1),
            (lista_id_3, '¿Hay retroalimentación documentada?', 'Retroalimentación', true, 2),
            (lista_id_3, '¿Se utilizan los canales oficiales de comunicación?', 'Canales', true, 3);
        RAISE NOTICE '    ✓ Lista LC-COMU-003 creada con % items', 4;
    END IF;

END $$;

-- Comentarios finales
DO $$
DECLARE
    total_listas INTEGER;
    total_items INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_listas FROM control_interno.lista_chequeo WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO total_items FROM control_interno.item_lista_chequeo;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Seed de listas de chequeo completado';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Estadísticas:';
    RAISE NOTICE '   • Total de listas creadas: %', total_listas;
    RAISE NOTICE '   • Total de items creados: %', total_items;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Distribución por tipo:';
    RAISE NOTICE '   • PLANEACION: % listas', (SELECT COUNT(*) FROM control_interno.lista_chequeo WHERE tipo = 'planeacion' AND deleted_at IS NULL);
    RAISE NOTICE '   • EJECUCION: % listas', (SELECT COUNT(*) FROM control_interno.lista_chequeo WHERE tipo = 'ejecucion' AND deleted_at IS NULL);
    RAISE NOTICE '   • COMUNICACION: % listas', (SELECT COUNT(*) FROM control_interno.lista_chequeo WHERE tipo = 'comunicacion' AND deleted_at IS NULL);
    RAISE NOTICE '========================================';
END $$;
