-- Migración 210: Roles granulares para Gestión Legal
-- Roles: JEFE_GESTION_LEGAL, MONITOREO_GESTION_LEGAL, SECRETARIADO_GESTION_LEGAL, RESUELVE_GESTION_LEGAL

DO $$
DECLARE
  v_module_id uuid;

  -- Role IDs
  v_jefe_id       uuid;
  v_monitoreo_id  uuid;
  v_secretariado_id uuid;
  v_resuelve_id   uuid;

  -- Permisos que solo tiene JEFE_GESTION_LEGAL
  v_perms_jefe_only text[] := ARRAY[
    'gestion-legal.defensa-judicial.abogado.reasignar',
    'gestion-legal.defensa-judicial.expediente.actuacion.audiencia.edit',
    'gestion-legal.defensa-judicial.expediente.actuacion.audiencia.delete',
    'gestion-legal.defensa-judicial.expediente.tarea.edit',
    'gestion-legal.reportes.manage',
    'gestion-legal.configuraciones.manage',
    'gestion-legal.configuraciones.create',
    'gestion-legal.configuraciones.edit',
    'gestion-legal.configuraciones.delete'
  ];

  -- NOTA: abogado.reasignar y tarea.edit también se asignan a SECRETARIADO (ver v_perms_secretariado)

  -- Permisos de RESUELVE_GESTION_LEGAL (abogado: todo excepto los de jefe-only que no son configuraciones)
  v_perms_resuelve text[] := ARRAY[
    'gestion-legal.asesoria-juridica.etapa.edit',
    'gestion-legal.asesoria-juridica.comentario.create',
    'gestion-legal.asesoria-juridica.responder',
    'gestion-legal.defensa-judicial.manage',
    'gestion-legal.defensa-judicial.create',
    'gestion-legal.defensa-judicial.expediente.doc.upload',
    'gestion-legal.defensa-judicial.expediente.doc.delete',
    'gestion-legal.defensa-judicial.expediente.actuacion.create',
    'gestion-legal.defensa-judicial.expediente.actuacion.audiencia.create',
    'gestion-legal.defensa-judicial.expediente.tarea.create',
    'gestion-legal.defensa-judicial.expediente.tarea.delete',
    'gestion-legal.defensa-judicial.expediente.tarea.complete',
    'gestion-legal.defensa-judicial.expediente.nota.create',
    'gestion-legal.defensa-judicial.expediente.nota.delete',
    'gestion-legal.defensa-judicial.autos.create',
    'gestion-legal.defensa-judicial.autos.delete',
    'gestion-legal.defensa-judicial.evidencias.create',
    'gestion-legal.defensa-judicial.evidencias.delete',
    'gestion-legal.defensa-judicial.evidencias.admitir',
    'gestion-legal.defensa-judicial.oficios.create',
    'gestion-legal.defensa-judicial.oficios.delete',
    'gestion-legal.defensa-judicial.oficios.atender',
    'gestion-legal.defensa-judicial.actas.create',
    'gestion-legal.defensa-judicial.actas.delete',
    'gestion-legal.defensa-judicial.estados.edit',
    'gestion-legal.defensa-judicial.archivar',
    'gestion-legal.juzgamiento-disciplinario.manage',
    'gestion-legal.juzgamiento-disciplinario.expediente.edit',
    'gestion-legal.juzgamiento-disciplinario.expediente.prueba',
    'gestion-legal.juzgamiento-disciplinario.expediente.decision',
    'gestion-legal.juzgamiento-disciplinario.expediente.excepcion',
    'gestion-legal.juzgamiento-disciplinario.expediente.decision.notificar',
    'gestion-legal.juzgamiento-disciplinario.expediente.doc.upload',
    'gestion-legal.juzgamiento-disciplinario.autos.create',
    'gestion-legal.juzgamiento-disciplinario.autos.delete',
    'gestion-legal.juzgamiento-disciplinario.evidencias.create',
    'gestion-legal.juzgamiento-disciplinario.evidencias.delete',
    'gestion-legal.juzgamiento-disciplinario.evidencias.admitir',
    'gestion-legal.juzgamiento-disciplinario.oficios.create',
    'gestion-legal.juzgamiento-disciplinario.oficios.delete',
    'gestion-legal.juzgamiento-disciplinario.oficios.atender',
    'gestion-legal.juzgamiento-disciplinario.actas.create',
    'gestion-legal.juzgamiento-disciplinario.actas.delete',
    'gestion-legal.juzgamiento-disciplinario.estados.edit',
    'gestion-legal.asesoria-juridica.manage',
    'gestion-legal.asesoria-juridica.create',
    'gestion-legal.asesoria-juridica.delete',
    'gestion-legal.asesoria-juridica.expediente.doc.upload',
    'gestion-legal.asesoria-juridica.expediente.doc.delete',
    'gestion-legal.comunicaciones.manage',
    'gestion-legal.comunicaciones.create',
    'gestion-legal.comunicaciones.leido',
    'gestion-legal.comunicaciones.archivar',
    'gestion-legal.terminos.manage',
    'gestion-legal.organos-control.manage',
    'gestion-legal.organos-control.create',
    'gestion-legal.organos-control.elaborar',
    'gestion-legal.organos-control.delete',
    'gestion-legal.organos-control.doc.upload',
    'gestion-legal.organos-control.respuesta.send',
    'gestion-legal.organos-control.respuesta.erase',
    'gestion-legal.organos-control.solicitar-insumo',
    'gestion-legal.organos-control.abogado.reasignar',
    'gestion-legal.procesos-coactivos.manage',
    'gestion-legal.procesos-coactivos.create',
    'gestion-legal.procesos-coactivos.edit',
    'gestion-legal.procesos-coactivos.delete',
    'gestion-legal.expedientes-electronicos.manage',
    'gestion-legal.expedientes-electronicos.upload',
    'gestion-legal.plan-accion.manage',
    'gestion-legal.plan-accion.create',
    'gestion-legal.riesgos.manage',
    'gestion-legal.riesgos.create',
    'gestion-legal.riesgos.edit',
    'gestion-legal.riesgos.delete',
    'gestion-legal.planes-mejoramiento.manage',
    'gestion-legal.planes-mejoramiento.create'
  ];

  -- Permisos de SECRETARIADO_GESTION_LEGAL
  v_perms_secretariado text[] := ARRAY[
    -- Defensa Judicial
    'gestion-legal.defensa-judicial.manage',
    'gestion-legal.defensa-judicial.create',
    'gestion-legal.defensa-judicial.abogado.reasignar',
    'gestion-legal.defensa-judicial.expediente.tarea.create',
    'gestion-legal.defensa-judicial.expediente.tarea.edit',
    'gestion-legal.defensa-judicial.archivar',
    'gestion-legal.defensa-judicial.estados.edit',
    -- Juzgamiento Disciplinario
    'gestion-legal.juzgamiento-disciplinario.manage',
    -- Asesoría Jurídica (create ya da acceso a restaurar/eliminar archivados)
    'gestion-legal.asesoria-juridica.manage',
    'gestion-legal.asesoria-juridica.create',
    -- Comunicaciones
    'gestion-legal.comunicaciones.manage',
    'gestion-legal.comunicaciones.create',
    'gestion-legal.comunicaciones.leido',
    'gestion-legal.comunicaciones.archivar',
    -- Términos
    'gestion-legal.terminos.manage',
    -- Órganos de Control (delete da acceso a restaurar/eliminar archivados)
    'gestion-legal.organos-control.manage',
    'gestion-legal.organos-control.create',
    'gestion-legal.organos-control.delete',
    'gestion-legal.organos-control.abogado.reasignar',
    -- Procesos Coactivos (edit + delete da acceso a restaurar/eliminar archivados)
    'gestion-legal.procesos-coactivos.manage',
    'gestion-legal.procesos-coactivos.create',
    'gestion-legal.procesos-coactivos.edit',
    'gestion-legal.procesos-coactivos.delete',
    -- Expedientes Electrónicos
    'gestion-legal.expedientes-electronicos.manage',
    -- Plan de Acción
    'gestion-legal.plan-accion.manage',
    -- Riesgos (create/edit + delete da acceso a restaurar/eliminar archivados)
    'gestion-legal.riesgos.manage',
    'gestion-legal.riesgos.create',
    'gestion-legal.riesgos.edit',
    'gestion-legal.riesgos.delete',
    -- Planes de Mejoramiento
    'gestion-legal.planes-mejoramiento.manage'
  ];

  -- Permisos de MONITOREO_GESTION_LEGAL (solo manage = solo lectura + reportes)
  v_perms_monitoreo text[] := ARRAY[
    'gestion-legal.defensa-judicial.manage',
    'gestion-legal.juzgamiento-disciplinario.manage',
    'gestion-legal.asesoria-juridica.manage',
    'gestion-legal.comunicaciones.manage',
    'gestion-legal.terminos.manage',
    'gestion-legal.organos-control.manage',
    'gestion-legal.procesos-coactivos.manage',
    'gestion-legal.expedientes-electronicos.manage',
    'gestion-legal.plan-accion.manage',
    'gestion-legal.riesgos.manage',
    'gestion-legal.planes-mejoramiento.manage',
    'gestion-legal.reportes.manage'
  ];

BEGIN
  -- Obtener módulo gestión-legal
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

  -- ============================================================
  -- PASO 1: Insertar nuevos permisos (solo los de Jefe que no existen)
  -- ============================================================
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES
    (gen_random_uuid(), 'gestion-legal.reportes.manage',
     'Ver Reportes - Gestión Legal', 'Permite acceder al módulo de reportes y analítica legal', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.defensa-judicial.abogado.reasignar',
     'Reasignar Abogado - Defensa Judicial', 'Permite reasignar el abogado sustanciador de un expediente', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.defensa-judicial.expediente.actuacion.audiencia.edit',
     'Editar/Reasignar Audiencia - Defensa Judicial', 'Permite modificar o reasignar audiencias programadas', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.defensa-judicial.expediente.actuacion.audiencia.delete',
     'Eliminar Audiencia - Defensa Judicial', 'Permite eliminar audiencias programadas', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.defensa-judicial.expediente.tarea.edit',
     'Editar Tarea - Defensa Judicial', 'Permite editar tareas ya creadas en un expediente', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.defensa-judicial.expediente.tarea.complete',
     'Completar Tarea - Defensa Judicial', 'Permite marcar tareas como completadas en un expediente', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.defensa-judicial.archivar',
     'Archivar/Restaurar - Defensa Judicial', 'Permite archivar expedientes y restaurar/eliminar desde la vista de archivados', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.asesoria-juridica.etapa.edit',
     'Cambiar Etapa - Asesoría Jurídica', 'Permite cambiar la etapa de un expediente de consulta jurídica', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.asesoria-juridica.comentario.create',
     'Agregar Comentario - Asesoría Jurídica', 'Permite agregar comentarios internos en el expediente de consulta jurídica', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.asesoria-juridica.responder',
     'Redactar/Enviar Respuesta - Asesoría Jurídica', 'Permite redactar, guardar borrador y enviar la respuesta final de una consulta jurídica', v_module_id, true),
    (gen_random_uuid(), 'gestion-legal.organos-control.abogado.reasignar',
     'Reasignar Profesional - Órganos de Control', 'Permite reasignar el profesional responsable de un requerimiento de órgano de control', v_module_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- ============================================================
  -- PASO 2: Crear los 4 roles
  -- ============================================================
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES
    (gen_random_uuid(), 'JEFE_GESTION_LEGAL',        'Jefe Gestión Legal',         'Acceso integral a Gestión Legal. Valida actuaciones, reasigna casos y controla cumplimiento de metas.',       'directivo',      'Scale',   '#003DA5', 'sistema', true),
    (gen_random_uuid(), 'MONITOREO_GESTION_LEGAL',   'Monitoreo Gestión Legal',    'Visualización general del estado de casos, indicadores de gestión y alertas. Reporta novedades directivas.', 'administrativo', 'Eye',     '#0EA5E9', 'sistema', true),
    (gen_random_uuid(), 'SECRETARIADO_GESTION_LEGAL','Secretariado Gestión Legal', 'Registra, clasifica, reparte y asigna asuntos a los responsables correspondientes.',                          'administrativo', 'ClipboardList', '#F59E0B', 'sistema', true),
    (gen_random_uuid(), 'RESUELVE_GESTION_LEGAL',    'Resuelve Gestión Legal',     'Actualiza información, carga actuaciones, registra avances y da trámite a los asuntos asignados.',            'administrativo', 'Briefcase', '#10B981', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;

  -- Capturar IDs de los roles recién creados (o existentes si ya estaban)
  SELECT id INTO v_jefe_id        FROM auth.role WHERE code = 'JEFE_GESTION_LEGAL';
  SELECT id INTO v_monitoreo_id   FROM auth.role WHERE code = 'MONITOREO_GESTION_LEGAL';
  SELECT id INTO v_secretariado_id FROM auth.role WHERE code = 'SECRETARIADO_GESTION_LEGAL';
  SELECT id INTO v_resuelve_id    FROM auth.role WHERE code = 'RESUELVE_GESTION_LEGAL';

  -- ============================================================
  -- PASO 3: Asignar permisos al JEFE (todos: resuelve + jefe-only)
  -- ============================================================
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_jefe_id, p.id_permission
  FROM auth.permission p
  WHERE p.code = ANY(v_perms_resuelve || v_perms_jefe_only)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- ============================================================
  -- PASO 4: Asignar permisos al RESUELVE
  -- ============================================================
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_resuelve_id, p.id_permission
  FROM auth.permission p
  WHERE p.code = ANY(v_perms_resuelve)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- ============================================================
  -- PASO 5: Sincronizar permisos del SECRETARIADO (replace completo)
  -- ============================================================
  -- Primero eliminar todos los permisos actuales del rol para garantizar estado limpio
  DELETE FROM auth.role_permissions
  WHERE id_rol = v_secretariado_id;

  -- Luego insertar exactamente los permisos definidos en v_perms_secretariado
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_secretariado_id, p.id_permission
  FROM auth.permission p
  WHERE p.code = ANY(v_perms_secretariado)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- ============================================================
  -- PASO 6: Asignar permisos al MONITOREO
  -- ============================================================
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_monitoreo_id, p.id_permission
  FROM auth.permission p
  WHERE p.code = ANY(v_perms_monitoreo)
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

END $$;
