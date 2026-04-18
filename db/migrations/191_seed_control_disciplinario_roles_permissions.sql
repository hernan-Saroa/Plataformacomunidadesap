-- ============================================
-- MIGRATION: Roles y Permisos para Control Disciplinario
-- ============================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener ID del módulo
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
  
  IF v_module_id IS NULL THEN
    INSERT INTO auth.module (id_module, code, name, description, icon, color, priority, context, is_active)
    VALUES (gen_random_uuid(), 'control-disciplinario', 'Control Disciplinario', 'Control Disciplinario', 'Scale', '#003DA5', 1, 'backoffice', true)
    ON CONFLICT (code) DO NOTHING;
    
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
  END IF;

  -- 1. Crear Roles
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES 
    (gen_random_uuid(), 'JEFE_DE_LA_OCID', 'Jefe OCID', 'Jefe de la Oficina de Control Disciplinario Interno', 'directivo', 'Shield', '#DC2626', 'sistema', true),
    (gen_random_uuid(), 'SECRETARIA_RADICADOR', 'Radicador Disciplinario', 'Secretaría o Radicador de Procesos Disciplinarios', 'administrativo', 'Inbox', '#2563EB', 'sistema', true),
    (gen_random_uuid(), 'PROFESIONAL', 'Profesional Disciplinario', 'Profesional a cargo de expedientes y procesos', 'administrativo', 'FileCheck', '#10B981', 'sistema', true)
  ON CONFLICT (code) DO NOTHING;

  -- 2. Insertar Permisos
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES 
    (gen_random_uuid(), 'control-disciplinario.procesos.manage', 'Ver Submódulo Procesos', 'Permite visualizar el submódulo de procesos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.create', 'Generar una Nueva Noticia', 'Permite crear una nueva noticia (digitar, subir documentos, guardar)', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.view_all', 'Ver Todos los Procesos', 'Se visualizan todos los procesos activos en el momento', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.view_mine', 'Ver Mis Procesos', 'Ve únicamente los procesos asignados al usuario', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.view', 'Ver Noticias', 'Visualiza únicamente las noticias creadas y sin asignación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.edit', 'Editar Noticias', 'Puede editar noticias visibles, modificar información y guardar cambios', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.edit', 'Editar Procesos', 'Puede editar procesos visibles, modificar información y guardar cambios', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.asignar', 'Asociar Noticia', 'Permite asociar una noticia con un proceso en progreso', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.asociar', 'Asociar Proceso', 'Permite asociar un proceso con otro proceso existente y vigente', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.view_detail', 'Ver Detalle de Noticia', 'Permite visualizar información de la noticia en pestaña ampliada', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.devolver', 'Devolver Noticia', 'Permite devolver la noticia al usuario que la radicó con mensaje de motivo', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.view_devueltas', 'Ver Noticias Devueltas', 'Permite ver todas las noticias devueltas con información del radicador', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.view_mis_devueltas', 'Ver Mis Noticias Devueltas', 'Permite ver únicamente las noticias propias que fueron devueltas por el jefe', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.redimir', 'Remitir por Competencia', 'Permite remitir una noticia a entidad pertinente fuera de control interno disciplinario', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.archivar', 'Archivar', 'Permite archivar una noticia con confirmación previa', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.convertir', 'Convertir', 'Permite convertir una noticia en proceso, relacionando consecutivos y asignando profesional', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.expidiente', 'Ver Expediente Proceso', 'Permite ver documentos redirigiendo al submódulo de Expediente Electrónico', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.view_detail', 'Ver Detalle de Proceso', 'Permite ver detalles y funcionalidades del proceso en la misma pestaña', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.view_general', 'Ver Detalle de Proceso / General', 'Permite ver la información general del proceso asignado', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.view_archivos', 'Ver Detalle de Proceso / Archivos', 'Permite ver todos los archivos subidos en el proceso (autos y evidencias)', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.archivos.download', 'Ver Detalle de Proceso / Archivos / Descargar Documentos', 'Permite descargar los documentos diligenciados', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.autos.create', 'Ver Detalle de Proceso / Archivos / Cargar Nuevo Auto', 'Permite generar un nuevo auto, redactar información y cargar el documento', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.evidencia.create', 'Ver Detalle de Proceso / Archivos / Cargar Evidencias', 'Permite cargar una nueva evidencia con los datos solicitados', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.oficio.create', 'Ver Detalle de Proceso / Archivos / Cargar Nuevo Oficio', 'Permite generar un nuevo oficio y adjuntar documentos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.acta.create', 'Ver Detalle de Proceso / Archivos / Cargar Nueva Acta', 'Permite generar una nueva acta y adjuntar documentos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.actuaciones.view', 'Ver Detalle / Ver Actuaciones', 'Permite visualizar actuaciones generadas automáticamente o creadas manualmente', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.actuaciones.create', 'Ver Detalle / Ver Actuaciones / Crear Nueva Actuación', 'Permite crear una nueva actuación llenando los valores requeridos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.tareas.view', 'Ver Detalle / Ver Tareas', 'Permite ver tareas generadas al profesional asignado o a otro profesional', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.tareas.create', 'Ver Detalle / Ver Tareas / Nueva Tarea', 'Permite generar una nueva tarea asignando automáticamente al profesional del proceso', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.notas.view', 'Ver Detalle / Ver Notas', 'Permite ver el apartado de notas con comentarios sobre el proceso', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.notas.create', 'Ver Detalle / Ver Notas / Guardar Nota', 'Permite crear y guardar una nota visible para todo el equipo', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.asociar_procesos', 'Asociar Procesos a Proceso', 'Permite asociar un proceso con otro proceso activo', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.reasignacion', 'Reasignación', 'Permite solicitar reasignación de proceso indicando prioridad, justificación y nuevo profesional', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.reasignacion.approve', 'Aprobación de Reasignación', 'Permite aprobar solicitudes de reasignación de procesos desde el submódulo de revisión', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.kanban.move', 'Movimiento de Kanban', 'Permite mover procesos entre etapas en la vista Kanban', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.procesos.view_list', 'Ver Vista Lista', 'Permite ver procesos y noticias (según permisos) en vista de listado', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.revision-aprobacion.manage', 'Ver Submódulo Revisión y Aprobación', 'Permite visualizar el submódulo de revisión y aprobación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.revision-aprobacion.view_docs', 'Ver Doc por Aprobación', 'Permite visualizar todos los documentos pendientes de aprobación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.revision-aprobacion.send_auto', 'Envío de Auto a Revisión', 'Permite enviar un auto ya subido a revisión para aprobación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.revision-aprobacion.devolver', 'Devolver', 'Permite devolver un documento para volver a radicarlo con observaciones', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.revision-aprobacion.aprobar', 'Aprobar', 'Permite aprobar un documento, firmar y agregar observación de aprobación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.expediente-electronico.manage', 'Ver Submódulo Expediente Electrónico', 'Permite visualizar el submódulo de expediente electrónico', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.expediente-electronico.view_all', 'Ver Todos los Expedientes', 'Permite visualizar cada uno de los expedientes', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.expediente-electronico.view_doc', 'Ver Documento', 'Permite ver el documento que se encuentra en el expediente', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.expediente-electronico.download_doc', 'Descargar Documento', 'Permite descargar el documento designado', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.expediente-electronico.download_hoja_control', 'Descargar Hoja de Control', 'Permite descargar la hoja de control', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.expediente-electronico.view_hoja_control', 'Ver Hoja de Control', 'Permite evidenciar la hoja de control', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.manage', 'Ver Submódulo de Términos y Alertas', 'Permite visualizar el submódulo de términos y alertas', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.view', 'Ver Términos y Alertas', 'Permite visualizar cada uno de los términos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.view_mine', 'Ver Mis Términos y Alertas', 'Permite ver únicamente los términos asignados al profesional específico', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.termino.create', 'Crear Nuevo Término', 'Permite crear el término procesal asignando al profesional responsable', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.termino.finish', 'Marcar como Cumplido', 'Permite marcar términos como cumplidos; solo el profesional asignado puede hacerlo', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.view_history', 'Ver Términos y Alertas / Historial', 'Permite ver el historial de cambios en los términos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.export_excel', 'Exportar Todos los Términos en Excel', 'Permite exportar en Excel la información de los términos del sistema', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.terminos.export_pdf', 'Exportar Todos los Términos en PDF', 'Permite exportar en PDF la información de los términos del sistema', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.profesionales.manage', 'Ver Submódulo Profesionales', 'Permite ver el submódulo denominado como profesionales', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.profesionales.view', 'Ver los Profesionales', 'Permite ver información de todos los profesionales (cargo, carga de trabajo, etc.)', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.profesionales.view_procesos', 'Ver Procesos (del Profesional)', 'Permite ver los procesos de un profesional específico redirigiendo al submódulo de procesos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.manage', 'Ver Submódulo de Configuración', 'Permite ver el submódulo de configuración del sistema y todas sus vistas', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.kanban.edit_dias_alertas', 'Configuración / Estados Kanban / Modificar Días y Alertas', 'Permite configurar días de vencimiento y frecuencia de alertas por etapa', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.kanban.activar_etapa', 'Configuración / Estados Kanban / Activar Desactivar Etapa', 'Permite activar o desactivar una etapa del Kanban', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.etapa.delete', 'Configuración / Estados Kanban / Eliminar Etapa', 'Permite eliminar una etapa del Kanban', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.etapa.create', 'Configuración / Estados Kanban / Crear Estado', 'Permite crear un nuevo estado en el Kanban', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.kanban.guardar', 'Configuración / Estados Kanban / Guardar Cambios', 'Permite guardar los cambios generados en el Kanban', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.cargo.edit', 'Configuración / Cargos y Capacidad / Modificar Capacidad Cargo', 'Permite modificar los cargos existentes o creados', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.cargo.create', 'Configuración / Cargos y Capacidad / Agregar Cargo', 'Permite agregar un nuevo cargo', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.cargo.guardar', 'Configuración / Cargos y Capacidad / Guardar Cambios', 'Permite guardar los cambios de cargos modificados', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.cambiar_plantilla', 'Configuración / Plantillas de Autos / Cambiar Plantilla', 'Permite cambiar la plantilla del auto a modificar', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.editar', 'Configuración / Plantillas de Autos / Editar', 'Permite editar nombre del auto y su etapa asociada', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.ver', 'Configuración / Plantillas de Autos / Ver', 'Permite ver la descripción y plantilla del auto', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.eliminar', 'Configuración / Plantillas de Autos / Eliminar', 'Permite eliminar el tipo de auto y su plantilla con confirmación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.descargar', 'Configuración / Plantillas de Autos / Descargar', 'Permite descargar la plantilla del auto', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.activar', 'Configuración / Plantillas de Autos / Activar o Desactivar', 'Permite activar o desactivar el auto en la selección', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.plantilla.agregar', 'Configuración / Plantillas de Autos / Cambiar Plantilla / Agregar Plantilla', 'Permite agregar una nueva plantilla al auto', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.plantilla.activar', 'Configuración / Plantillas de Autos / Cambiar Plantilla / Activar', 'Permite activar o desactivar una plantilla del auto', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.plantilla.descargar', 'Configuración / Plantillas de Autos / Cambiar Plantilla / Descargar', 'Permite descargar la plantilla del auto', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.plantilla.editar', 'Configuración / Plantillas de Autos / Cambiar Plantilla / Editar', 'Permite editar nombre o descripción de la plantilla del auto', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.autos.plantilla.eliminar', 'Configuración / Plantillas de Autos / Cambiar Plantilla / Eliminar', 'Permite eliminar una plantilla del auto con confirmación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.cambiar_plantilla', 'Configuración / Plantillas de Oficios / Cambiar Plantilla', 'Permite cambiar la plantilla del oficio a modificar', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.editar', 'Configuración / Plantillas de Oficios / Editar', 'Permite editar nombre del oficio y su categoría', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.ver', 'Configuración / Plantillas de Oficios / Ver', 'Permite ver la descripción y plantilla del oficio', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.eliminar', 'Configuración / Plantillas de Oficios / Eliminar', 'Permite eliminar el tipo de oficio y su plantilla con confirmación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.descargar', 'Configuración / Plantillas de Oficios / Descargar', 'Permite descargar la plantilla del oficio', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.activar', 'Configuración / Plantillas de Oficios / Activar o Desactivar', 'Permite activar o desactivar el oficio en la selección', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.plantilla.agregar', 'Configuración / Plantillas de Oficios / Cambiar Plantilla / Agregar Plantilla', 'Permite agregar una nueva plantilla al oficio', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.plantilla.activar', 'Configuración / Plantillas de Oficios / Cambiar Plantilla / Activar', 'Permite activar o desactivar una plantilla del oficio', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.plantilla.descargar', 'Configuración / Plantillas de Oficios / Cambiar Plantilla / Descargar', 'Permite descargar la plantilla del oficio', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.plantilla.editar', 'Configuración / Plantillas de Oficios / Cambiar Plantilla / Editar', 'Permite editar nombre o descripción de la plantilla del oficio', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.oficios.plantilla.eliminar', 'Configuración / Plantillas de Oficios / Cambiar Plantilla / Eliminar', 'Permite eliminar una plantilla del oficio con confirmación', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.entidades.create', 'Configuración / Entidades de Remisión / Nueva Entidad', 'Permite crear una nueva entidad de remisión', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.entidades.activar', 'Configuración / Entidades de Remisión / Activar', 'Permite activar o desactivar una entidad de remisión', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.entidades.edit', 'Configuración / Entidades de Remisión / Editar', 'Permite editar una entidad de remisión', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.entidades.delete', 'Configuración / Entidades de Remisión / Eliminar', 'Permite eliminar una entidad de remisión', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.notificaciones.sistema', 'Configuración / Notificaciones y Alertas / Notificaciones del Sistema', 'Permite modificar el periodo y casos para mostrar notificaciones', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.notificaciones.semaforo', 'Configuración / Notificaciones y Alertas / Parámetros de Alertas y Semáforo', 'Permite configurar el sistema de semáforo de avance de procesos', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.notificaciones.guardar', 'Configuración / Notificaciones y Alertas / Guardar Cambios', 'Permite guardar los cambios de notificaciones y alertas', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.prescripcion.edit', 'Configuración / Prescripción Disciplinaria', 'Permite modificar los años de prescripción de cada proceso', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.configuraciones.prescripcion.guardar', 'Configuración / Prescripción Disciplinaria / Guardar Cambios', 'Permite guardar el cambio de la prescripción disciplinaria', v_module_id, true)
  ON CONFLICT (code) DO UPDATE 
    SET name = EXCLUDED.name,
        description = EXCLUDED.description;

  -- 3. Asignar Permisos a Roles
  
  -- Asignar JEFE_DE_LA_OCID (Todos excepto los específicos de Profesional y Radicador)
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'JEFE_DE_LA_OCID' 
    AND p.code LIKE 'control-disciplinario.%'
    AND p.code NOT IN (
      'control-disciplinario.procesos.view_mine',
      'control-disciplinario.noticia-disciplinaria.view_mis_devueltas'
    )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- Asignar SECRETARIA_RADICADOR
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'SECRETARIA_RADICADOR' AND p.code IN (
    'control-disciplinario.procesos.manage',
    'control-disciplinario.procesos.create',
    'control-disciplinario.procesos.view_all',
    'control-disciplinario.noticia-disciplinaria.view',
    'control-disciplinario.noticia-disciplinaria.edit',
    'control-disciplinario.procesos.edit',
    'control-disciplinario.noticia-disciplinaria.asignar',
    'control-disciplinario.procesos.asociar',
    'control-disciplinario.noticia-disciplinaria.view_detail',
    'control-disciplinario.noticia-disciplinaria.view_mis_devueltas',
    'control-disciplinario.procesos.redimir',
    'control-disciplinario.procesos.archivar',
    'control-disciplinario.procesos.expidiente',
    'control-disciplinario.procesos.view_detail',
    'control-disciplinario.procesos.view_general',
    'control-disciplinario.procesos.view_archivos',
    'control-disciplinario.procesos.archivos.download',
    'control-disciplinario.procesos.evidencia.create',
    'control-disciplinario.procesos.oficio.create',
    'control-disciplinario.procesos.acta.create',
    'control-disciplinario.procesos.actuaciones.view',
    'control-disciplinario.procesos.actuaciones.create',
    'control-disciplinario.procesos.tareas.view',
    'control-disciplinario.procesos.tareas.create',
    'control-disciplinario.procesos.notas.view',
    'control-disciplinario.procesos.notas.create',
    'control-disciplinario.procesos.asociar_procesos',
    'control-disciplinario.procesos.reasignacion',
    'control-disciplinario.procesos.kanban.move',
    'control-disciplinario.procesos.view_list',
    'control-disciplinario.expediente-electronico.manage',
    'control-disciplinario.expediente-electronico.view_all',
    'control-disciplinario.expediente-electronico.view_doc',
    'control-disciplinario.expediente-electronico.download_doc',
    'control-disciplinario.expediente-electronico.download_hoja_control',
    'control-disciplinario.expediente-electronico.view_hoja_control',
    'control-disciplinario.terminos.manage',
    'control-disciplinario.terminos.view',
    'control-disciplinario.terminos.view_mine',
    'control-disciplinario.terminos.termino.create',
    'control-disciplinario.terminos.termino.finish',
    'control-disciplinario.terminos.view_history',
    'control-disciplinario.terminos.export_excel',
    'control-disciplinario.terminos.export_pdf',
    'control-disciplinario.profesionales.manage',
    'control-disciplinario.profesionales.view',
    'control-disciplinario.profesionales.view_procesos'
  )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- Asignar PROFESIONAL
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'PROFESIONAL' AND p.code IN (
    'control-disciplinario.procesos.manage',
    'control-disciplinario.procesos.view_mine',
    'control-disciplinario.procesos.edit',
    'control-disciplinario.procesos.asociar',
    'control-disciplinario.procesos.expidiente',
    'control-disciplinario.procesos.view_detail',
    'control-disciplinario.procesos.view_general',
    'control-disciplinario.procesos.view_archivos',
    'control-disciplinario.procesos.archivos.download',
    'control-disciplinario.procesos.autos.create',
    'control-disciplinario.procesos.evidencia.create',
    'control-disciplinario.procesos.oficio.create',
    'control-disciplinario.procesos.acta.create',
    'control-disciplinario.procesos.actuaciones.view',
    'control-disciplinario.procesos.actuaciones.create',
    'control-disciplinario.procesos.tareas.view',
    'control-disciplinario.procesos.notas.view',
    'control-disciplinario.procesos.notas.create',
    'control-disciplinario.procesos.asociar_procesos',
    'control-disciplinario.procesos.reasignacion',
    'control-disciplinario.procesos.kanban.move',
    'control-disciplinario.procesos.view_list',
    'control-disciplinario.revision-aprobacion.send_auto',
    'control-disciplinario.expediente-electronico.manage',
    'control-disciplinario.expediente-electronico.view_all',
    'control-disciplinario.expediente-electronico.view_doc',
    'control-disciplinario.expediente-electronico.download_doc',
    'control-disciplinario.expediente-electronico.download_hoja_control',
    'control-disciplinario.expediente-electronico.view_hoja_control',
    'control-disciplinario.terminos.manage',
    'control-disciplinario.terminos.view',
    'control-disciplinario.terminos.view_mine',
    'control-disciplinario.terminos.termino.finish'
  )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- Asignar acceso al backoffice general
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code IN ('JEFE_DE_LA_OCID', 'SECRETARIA_RADICADOR', 'PROFESIONAL')
    AND p.code = 'system.access_backoffice'
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

END $$;
