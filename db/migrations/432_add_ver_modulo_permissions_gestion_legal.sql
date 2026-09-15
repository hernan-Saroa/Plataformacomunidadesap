-- Migración 432: Permisos "Ver Módulo" por submódulo de Gestión Legal + nuevo rol de consulta
--
-- Contexto (EFDS): no existía un rol que diera acceso únicamente a un subconjunto
-- de submódulos de Gestión Legal (p.ej. solo Términos e Informes, Plan de Acción,
-- Gestión de Riesgos y Planes de Mejoramiento). El acceso a cada submódulo del
-- menú SIGL dependía únicamente del permiso `gestion-legal.<submodulo>.manage`,
-- que además de dar acceso al menú se usa/usaba como si fuera de "gestión", sin
-- una alternativa de solo lectura del propio submódulo.
--
-- Esta migración parametriza el control de acceso al menú de Gestión Legal:
-- agrega, para cada uno de los 12 submódulos del SIGL, un permiso dedicado
-- `gestion-legal.<submodulo>.ver` ("Ver Módulo <Nombre>") cuyo único propósito
-- es habilitar la entrada de ese submódulo en el menú. Cualquier rol que
-- combine uno o varios de estos 12 permisos "ver" obtiene acceso únicamente a
-- esos submódulos (frontend: GestionLegalFull.tsx → VISTA_PERMISOS).
--
-- Compatibilidad: se conserva el comportamiento de `*.manage` como puerta de
-- acceso alterna (el frontend acepta MANAGE u VER), y a cada rol que ya tenga
-- el permiso `*.manage` de un submódulo se le otorga automáticamente el nuevo
-- `*.ver` equivalente, para no quitar acceso a JEFE/SECRETARIADO/MONITOREO/
-- RESUELVE_GESTION_LEGAL.
--
-- Además crea el rol solicitado: CONSULTA_SEGUIMIENTO_GESTION_LEGAL, con acceso
-- de solo consulta a Términos e Informes, Plan de Acción, Gestión de Riesgos y
-- Planes de Mejoramiento (los 4 submódulos pedidos originalmente).

DO $$
DECLARE
  v_module_id uuid;
  v_consulta_id uuid;

  -- Pares (permiso .manage existente -> nuevo permiso .ver) para los 12 submódulos del SIGL
  v_pares text[][] := ARRAY[
    ARRAY['gestion-legal.defensa-judicial.manage',        'gestion-legal.defensa-judicial.ver',        'Ver Módulo Defensa Judicial',            'Permite ver y entrar al submódulo de Defensa Judicial'],
    ARRAY['gestion-legal.juzgamiento-disciplinario.manage','gestion-legal.juzgamiento-disciplinario.ver','Ver Módulo Juzgamiento Disciplinario',   'Permite ver y entrar al submódulo de Juzgamiento Disciplinario'],
    ARRAY['gestion-legal.asesoria-juridica.manage',        'gestion-legal.asesoria-juridica.ver',        'Ver Módulo Asesoría Jurídica',           'Permite ver y entrar al submódulo de Asesoría Jurídica'],
    ARRAY['gestion-legal.comunicaciones.manage',           'gestion-legal.comunicaciones.ver',           'Ver Módulo Centro de Comunicaciones',    'Permite ver y entrar al submódulo de Centro de Comunicaciones'],
    ARRAY['gestion-legal.terminos.manage',                 'gestion-legal.terminos.ver',                 'Ver Módulo Términos e Informes',         'Permite ver y entrar al submódulo de Términos e Informes'],
    ARRAY['gestion-legal.organos-control.manage',          'gestion-legal.organos-control.ver',          'Ver Módulo Órganos de Control',          'Permite ver y entrar al submódulo de Órganos de Control'],
    ARRAY['gestion-legal.procesos-coactivos.manage',       'gestion-legal.procesos-coactivos.ver',       'Ver Módulo Procesos Coactivos',          'Permite ver y entrar al submódulo de Procesos Coactivos'],
    ARRAY['gestion-legal.expedientes-electronicos.manage', 'gestion-legal.expedientes-electronicos.ver', 'Ver Módulo Expedientes Electrónicos',    'Permite ver y entrar al submódulo de Expedientes Electrónicos'],
    ARRAY['gestion-legal.plan-accion.manage',               'gestion-legal.plan-accion.ver',              'Ver Módulo Plan de Acción',              'Permite ver y entrar al submódulo de Plan de Acción'],
    ARRAY['gestion-legal.riesgos.manage',                   'gestion-legal.riesgos.ver',                  'Ver Módulo Gestión de Riesgos',          'Permite ver y entrar al submódulo de Gestión de Riesgos'],
    ARRAY['gestion-legal.planes-mejoramiento.manage',       'gestion-legal.planes-mejoramiento.ver',      'Ver Módulo Planes de Mejoramiento',      'Permite ver y entrar al submódulo de Planes de Mejoramiento'],
    ARRAY['gestion-legal.configuraciones.manage',           'gestion-legal.configuraciones.ver',          'Ver Módulo Configuraciones',             'Permite ver y entrar al submódulo de Configuraciones']
  ];

  v_par text[];
  v_manage_code text;
  v_ver_code text;
  v_ver_name text;
  v_ver_desc text;

  -- Los 4 submódulos de la solicitud original, para el rol de consulta
  v_perms_consulta text[] := ARRAY[
    'gestion-legal.terminos.ver',
    'gestion-legal.plan-accion.ver',
    'gestion-legal.riesgos.ver',
    'gestion-legal.planes-mejoramiento.ver'
  ];
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

  -- ============================================================
  -- PASO 1: Crear el permiso "ver" de cada submódulo y otorgarlo
  -- automáticamente a los roles que ya tengan el "manage" equivalente.
  -- ============================================================
  FOREACH v_par SLICE 1 IN ARRAY v_pares LOOP
    v_manage_code := v_par[1];
    v_ver_code    := v_par[2];
    v_ver_name    := v_par[3];
    v_ver_desc    := v_par[4];

    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES (gen_random_uuid(), v_ver_code, v_ver_name, v_ver_desc, v_module_id, true)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO auth.role_permissions (id_rol, id_permission)
    SELECT rp.id_rol, verp.id_permission
    FROM auth.role_permissions rp
    JOIN auth.permission managep ON managep.id_permission = rp.id_permission AND managep.code = v_manage_code
    JOIN auth.permission verp ON verp.code = v_ver_code
    ON CONFLICT (id_rol, id_permission) DO NOTHING;
  END LOOP;

  -- ============================================================
  -- PASO 2: Crear el rol CONSULTA_SEGUIMIENTO_GESTION_LEGAL
  -- Acceso exclusivo de consulta a: Términos e Informes, Plan de Acción,
  -- Gestión de Riesgos y Planes de Mejoramiento.
  -- ============================================================
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES (
    gen_random_uuid(),
    'CONSULTA_SEGUIMIENTO_GESTION_LEGAL',
    'Consulta de Seguimiento Gestión Legal',
    'Acceso exclusivo de consulta a Términos e Informes, Plan de Acción, Gestión de Riesgos y Planes de Mejoramiento del SIGL.',
    'administrativo',
    'Eye',
    '#0D9488',
    'sistema',
    true
  )
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_consulta_id FROM auth.role WHERE code = 'CONSULTA_SEGUIMIENTO_GESTION_LEGAL';

  -- Sincronización completa: el rol queda exactamente con estos 4 permisos "ver"
  DELETE FROM auth.role_permissions WHERE id_rol = v_consulta_id;

  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_consulta_id, p.id_permission
  FROM auth.permission p
  WHERE p.code = ANY(v_perms_consulta)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

END $$;
