-- =====================================================
-- Limpieza de datos de prueba - Modulo Control Interno
-- =====================================================
--
-- Objetivo:
--   Dejar limpio el modulo control_interno para pruebas desde cero.
--
-- Por defecto elimina datos operativos/transaccionales:
--   - Plan anual 5 roles y borradores
--   - Auditorias, programacion, seguimientos, hallazgos
--   - Planes de mejoramiento y evidencias/documentos
--   - Aprobaciones, notificaciones, sesiones/cache/logs del modulo
--
-- Conserva configuraciones/catalogos base:
--   - Profesionales OCIG configurados
--   - Tipos de auditoria
--   - Tableros/etapas Kanban
--   - Listas de chequeo base
--   - Procesos auditables/universo
--   - Plantillas e informes de ley
--   - Roles Decreto 648/templates
--
-- Uso local:
--   psql -U postgres -d esap_db -f db/cleanup_control_interno_test_data.sql
--
-- Uso Docker DEV:
--   docker cp db/cleanup_control_interno_test_data.sql superapp-db:/tmp/cleanup_control_interno_test_data.sql
--   docker exec -it superapp-db psql -U postgres -d esap_db -f /tmp/cleanup_control_interno_test_data.sql
--
-- Recomendado antes de ejecutar:
--   pg_dump -U postgres -d esap_db -n control_interno > backup_control_interno_$(date +%Y%m%d_%H%M%S).sql
--
-- IMPORTANTE:
--   Este script es destructivo. Ejecutar solo en ambiente local/dev/QA de pruebas.

BEGIN;

DO $$
DECLARE
  tables_to_truncate text[] := ARRAY[
    -- Plan anual 5 roles
    'plan_anual_wizard_borrador',
    'adjunto_actividad_plan_anual_5',
    'historial_plan_anual',
    'actividad_plan_anual_5',
    'rol_plan_anual_5',
    'plan_anual_5_roles',

    -- Plan anual legacy / programa anual
    'auditoria_programada',
    'rol_plan_anual',
    'cronograma_auditoria',
    'plan_anual',
    'plan_individual',

    -- Auditorias y expedientes/documentos
    'tareas_auditoria',
    'evidencia_documento',
    'documento',
    'lista_aplicada',
    'reunion_apertura',
    'reunion_cierre',
    'objetivo_auditoria',
    'criterio_auditoria',
    'equipo_auditor',
    'nota_auditoria',
    'historial_auditoria',
    'auditoria_especial_info',
    'auditoria_territorial_info',
    'ampliacion_plazo',
    'actividad_proceso_auditoria',
    'cronograma_fase_auditoria',
    'auditoria_gestion',
    'auditoria',

    -- Hallazgos y planes de mejoramiento
    'documento_plan_mejoramiento',
    'eventos_timeline',
    'registro_seguimiento',
    'seguimiento_trimestral',
    'seguimiento_plan_mejoramiento',
    'accion_correctiva',
    'accion_mejora',
    'plan_mejoramiento',
    'hallazgo',

    -- Aprobaciones y notificaciones
    'documento_aprobacion',
    'aprobacion',
    'notificacion',
    'preferencia_notificacion',

    -- Informes/generados operativos
    'entrega_informe_ley',
    'historial_generacion_informe',
    'workflow_aprobacion_informe',
    'paso_workflow_informe',

    -- Sesiones/cache/logs del modulo
    'sesiones_esap',
    'logs_auditoria_esap',
    'cache_esap',

    -- Configuración
    'proceso_auditable',
    'configuracion_profesionales_ocig'
  ];
  existing_tables text;
BEGIN
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY c.relname)
    INTO existing_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'control_interno'
    AND c.relkind = 'r'
    AND c.relname = ANY(tables_to_truncate);

  IF existing_tables IS NULL THEN
    RAISE NOTICE 'No se encontraron tablas operativas para limpiar en control_interno.';
  ELSE
    RAISE NOTICE 'Limpiando tablas operativas: %', existing_tables;
    EXECUTE 'TRUNCATE TABLE ' || existing_tables || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- OPCIONAL: limpieza de configuracion/catalogos
-- =====================================================
-- Si necesitas empezar absolutamente desde cero, incluso sin configuraciones,
-- ejecuta el bloque siguiente manualmente quitando los comentarios.
--
-- BEGIN;
-- DO $$
-- DECLARE
--   config_tables text[] := ARRAY[
--     'configuracion_profesionales_ocig',
--     'tipo_auditoria',
--     'tablero_kanban',
--     'etapa_kanban',
--     'lista_chequeo',
--     'version_lista_chequeo',
--     'seccion_lista_chequeo',
--     'item_lista_chequeo',
--     'evaluacion_proceso',
--     'auditor_perfil',
--     'informe_ley',
--     'plantilla_informe_ley',
--     'datos_automaticos_informe',
--     'plantilla_email',
--     'plantilla_reporte',
--     'plantillas_documentos_esap',
--     'parametro_sistema',
--     'configuracion_esap',
--     'integraciones_esap',
--     'usuarios_esap',
--     'rol_decreto_648',
--     'rol_decreto_648_template',
--     'actividad_rol',
--     'actividad_etapa_auditoria',
--     'etapa_auditoria',
--     'normatividad_aplicable'
--   ];
--   existing_config_tables text;
-- BEGIN
--   SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY c.relname)
--     INTO existing_config_tables
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'control_interno'
--     AND c.relkind = 'r'
--     AND c.relname = ANY(config_tables);
--
--   IF existing_config_tables IS NULL THEN
--     RAISE NOTICE 'No se encontraron tablas de configuracion/catalogo para limpiar.';
--   ELSE
--     RAISE NOTICE 'Limpiando configuracion/catalogos: %', existing_config_tables;
--     EXECUTE 'TRUNCATE TABLE ' || existing_config_tables || ' RESTART IDENTITY CASCADE';
--   END IF;
-- END $$;
-- COMMIT;
