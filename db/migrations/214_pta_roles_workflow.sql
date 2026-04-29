-- Migración 214: Roles de flujo de aprobación PTA
-- Crea en auth: JEFATURA_TERRITORIAL, DECANO, GESTION_PROFESORAL
-- Crea módulo 'pta' si no existe y asigna permisos correspondientes.
-- Inserta también en academic_work_plan."Rol" si no existen.

DO $$
DECLARE
  v_module_id uuid;
  v_jefatura_id uuid;
  v_decano_id   uuid;
  v_gp_id       uuid;

  -- Permisos de Jefatura Territorial: aprueba/devuelve en N1
  v_perms_jefatura text[] := ARRAY[
    'pta.backoffice.ver_gestion',
    'pta.backoffice.ver_detalle',
    'pta.backoffice.aprobar',
    'pta.backoffice.rechazar',
    'pta.backoffice.arbitrar',
    'pta.backoffice.gestionar_estados',
    'pta.backoffice.tablero_control',
    'pta.backoffice.workflow',
    'pta.backoffice.gestion_territorial',
    'pta.backoffice.alertas'
  ];

  -- Permisos de Decanatura: aprueba/devuelve en N2
  v_perms_decano text[] := ARRAY[
    'pta.backoffice.ver_gestion',
    'pta.backoffice.ver_detalle',
    'pta.backoffice.aprobar',
    'pta.backoffice.rechazar',
    'pta.backoffice.arbitrar',
    'pta.backoffice.gestionar_estados',
    'pta.backoffice.tablero_control',
    'pta.backoffice.dashboard_directivo',
    'pta.backoffice.workflow',
    'pta.backoffice.alertas',
    'pta.backoffice.comparativo'
  ];

  -- Permisos de Gestión Profesoral: aprobación final + seguimiento
  v_perms_gp text[] := ARRAY[
    'pta.backoffice.ver_gestion',
    'pta.backoffice.ver_detalle',
    'pta.backoffice.crear',
    'pta.backoffice.editar',
    'pta.backoffice.aprobar',
    'pta.backoffice.rechazar',
    'pta.backoffice.arbitrar',
    'pta.backoffice.aprobacion_masiva',
    'pta.backoffice.gestionar_estados',
    'pta.backoffice.tablero_control',
    'pta.backoffice.dashboard_directivo',
    'pta.backoffice.kanban',
    'pta.backoffice.workflow',
    'pta.backoffice.gestion_territorial',
    'pta.backoffice.mapa_territorial',
    'pta.backoffice.seguimiento',
    'pta.backoffice.comparativo',
    'pta.backoffice.programacion',
    'pta.backoffice.programacion_institucional',
    'pta.backoffice.carga_masiva',
    'pta.backoffice.simulador_carga',
    'pta.backoffice.asignador_automatico',
    'pta.backoffice.alertas',
    'pta.backoffice.gestion_conflictos',
    'pta.backoffice.comite_evaluacion',
    'pta.backoffice.calendario',
    'pta.backoffice.panel_sna',
    'pta.backoffice.firma_digital',
    'pta.backoffice.enviar_propuesta',
    'pta.backoffice.concertar'
  ];

BEGIN
  -- ============================================================
  -- PASO 1: Asegurar módulo 'pta' en auth
  -- ============================================================
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
  IF v_module_id IS NULL THEN
    INSERT INTO auth.module (id_module, code, name, description, icon, color, is_active)
    VALUES (gen_random_uuid(), 'pta', 'Plan de Trabajo Académico', 'Gestión del Plan de Trabajo Académico docente', 'BookOpen', '#003DA5', true)
    ON CONFLICT (code) DO NOTHING;
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
  END IF;

  -- ============================================================
  -- PASO 2: Insertar permisos PTA en auth (si no existen)
  -- ============================================================
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES
    (gen_random_uuid(), 'pta.backoffice.ver_gestion',              'Ver Gestión PTA',               'Lista y consulta PTAs del módulo backoffice',                        v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.ver_detalle',              'Ver Detalle PTA',               'Accede al detalle completo de un PTA',                               v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.crear',                    'Crear PTA',                     'Crea un nuevo PTA en backoffice',                                    v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.editar',                   'Editar PTA',                    'Edita un PTA existente en backoffice',                               v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.aprobar',                  'Aprobar PTA',                   'Aprueba o avanza el estado de un PTA',                               v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.aprobacion_masiva',        'Aprobación Masiva PTA',         'Aprueba múltiples PTAs en lote',                                     v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.rechazar',                 'Rechazar PTA',                  'Rechaza definitivamente un PTA',                                     v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.arbitrar',                 'Arbitrar PTA',                  'Devuelve un PTA para corrección del docente',                        v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.concertar',                'Concertar PTA',                 'Inicia proceso de concertación con el docente',                      v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.firma_digital',            'Firma Digital PTA',             'Firma digitalmente el PTA aprobado',                                 v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.enviar_propuesta',         'Enviar Propuesta PTA',          'Envía propuesta de PTA al docente',                                  v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.gestionar_estados',        'Gestionar Estados PTA',         'Cambia manualmente el estado de un PTA',                             v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.tablero_control',          'Tablero de Control PTA',        'Accede al tablero de control y métricas globales',                   v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.dashboard_directivo',      'Dashboard Directivo PTA',       'Vista ejecutiva con indicadores de cumplimiento',                    v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.kanban',                   'Kanban PTA',                    'Vista kanban del flujo de estados de PTAs',                          v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.workflow',                 'Workflow PTA',                  'Configuración y visualización del flujo de aprobación',              v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.gestion_territorial',      'Gestión Territorial PTA',       'Filtra y gestiona PTAs por territorial',                             v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.mapa_territorial',         'Mapa Territorial PTA',          'Visualiza distribución territorial de docentes y PTAs',              v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.seguimiento',              'Seguimiento PTA',               'Accede al módulo de seguimiento post-aprobación',                    v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.comparativo',              'Comparativo PTA',               'Compara PTAs entre periodos o territoriales',                        v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.panel_sna',                'Panel SNA PTA',                 'Panel de la Sede Nacional de Aprendizaje',                           v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.programacion',             'Programación PTA',              'Gestiona la programación académica vinculada al PTA',                v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.programacion_institucional','Programación Institucional PTA','Vista consolidada de programación institucional',                   v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.carga_masiva',             'Carga Masiva PTA',              'Importa PTAs o docentes masivamente via Excel',                      v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.simulador_carga',          'Simulador de Carga PTA',        'Simula distribución de carga académica',                             v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.asignador_automatico',     'Asignador Automático PTA',      'Asigna automáticamente carga a docentes disponibles',                v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.alertas',                  'Alertas PTA',                   'Recibe alertas de vencimientos y estados críticos',                  v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.gestion_conflictos',       'Gestión de Conflictos PTA',     'Resuelve conflictos de solapamiento o incompatibilidad de carga',    v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.comite_evaluacion',        'Comité de Evaluación PTA',      'Accede al módulo de comité de evaluación docente',                   v_module_id, true),
    (gen_random_uuid(), 'pta.backoffice.calendario',               'Calendario PTA',                'Vista calendario de actividades y vencimientos del PTA',             v_module_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- ============================================================
  -- PASO 3: Crear roles en auth (si no existen)
  -- ============================================================
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES
    (gen_random_uuid(), 'JEFATURA_TERRITORIAL', 'Jefatura Territorial',  'Revisa y aprueba PTAs en el primer nivel del flujo (N1). Cubre jefaturas de zona y sedes territoriales.', 'directivo',      'MapPin',     '#0EA5E9', 'sistema', true),
    (gen_random_uuid(), 'DECANO',               'Decano',                'Revisa y aprueba PTAs en el segundo nivel del flujo (N2). Rol de Decanatura de Facultad.',                 'directivo',      'Award',      '#8B5CF6', 'sistema', true),
    (gen_random_uuid(), 'GESTION_PROFESORAL',   'Gestión Profesoral',    'Aprobación final de PTAs (N3) y acceso completo al módulo de seguimiento post-aprobación.',               'administrativo', 'UserCheck',  '#10B981', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_jefatura_id FROM auth.role WHERE code = 'JEFATURA_TERRITORIAL';
  SELECT id INTO v_decano_id   FROM auth.role WHERE code = 'DECANO';
  SELECT id INTO v_gp_id       FROM auth.role WHERE code = 'GESTION_PROFESORAL';

  -- ============================================================
  -- PASO 4: Asignar permisos (replace completo para garantizar estado limpio)
  -- ============================================================
  DELETE FROM auth.role_permissions WHERE id_rol IN (v_jefatura_id, v_decano_id, v_gp_id)
    AND id_permission IN (SELECT id_permission FROM auth.permission WHERE code LIKE 'pta.%');

  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_jefatura_id, p.id_permission FROM auth.permission p WHERE p.code = ANY(v_perms_jefatura)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_decano_id, p.id_permission FROM auth.permission p WHERE p.code = ANY(v_perms_decano)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_gp_id, p.id_permission FROM auth.permission p WHERE p.code = ANY(v_perms_gp)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- ============================================================
  -- PASO 5: Insertar en academic_work_plan."Rol" si no existen
  -- ============================================================
  INSERT INTO academic_work_plan."Rol" (id, nombre, descripcion, "isSystem", estado, "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), 'Jefatura Territorial', 'Rol para Jefatura de Zona / Sede Territorial. Primer nivel de aprobación PTA.', true, 'ACTIVO', NOW(), NOW()),
    (gen_random_uuid(), 'Decano',               'Rol para Decano de Facultad. Segundo nivel de aprobación PTA.',                  true, 'ACTIVO', NOW(), NOW()),
    (gen_random_uuid(), 'Gestión Profesoral',   'Rol para Administración de Gestión Profesoral. Aprobación final PTA.',           true, 'ACTIVO', NOW(), NOW())
  ON CONFLICT (nombre) DO NOTHING;

END $$;
