-- ============================================
-- MIGRATION 302: Cleanup duplicate disciplinary permissions (forced clean replace)
-- ============================================

DO $$
DECLARE
    v_module_id uuid;
BEGIN
    SELECT id_module INTO v_module_id 
    FROM auth.module 
    WHERE code = 'control-disciplinario';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module control-disciplinario not found';
    END IF;

    RAISE NOTICE 'Forced deletion of ALL control-disciplinario permissions and role assignments...';

    -- 1. Forced deletion of role assignments first (avoids FK errors)
    DELETE FROM auth.role_permissions 
    WHERE id_permission IN (
        SELECT id_permission FROM auth.permission 
        WHERE code LIKE 'control-disciplinario.%'
    );

    -- 2. Delete all existing disciplinary permissions
    DELETE FROM auth.permission 
    WHERE code LIKE 'control-disciplinario.%';

    RAISE NOTICE 'Inserting clean authorized permission list with name column...';

    -- 3. Insert clean list (including required "name" column)
    INSERT INTO auth.permission (id_module, code, name, description, is_active)
    VALUES
        (v_module_id, 'control-disciplinario.procesos.manage', 'Procesos - Gestionar', 'Permite visualizar el submódulo de procesos', true),
        (v_module_id, 'control-disciplinario.procesos.create', 'Procesos - Crear', 'Permite crear una nueva noticia', true),
        (v_module_id, 'control-disciplinario.procesos.view_all', 'Procesos - Ver Todos', 'Se visualizan todos los procesos activos', true),
        (v_module_id, 'control-disciplinario.procesos.view_mine', 'Procesos - Ver Míos', 'Ve únicamente los procesos asignados al usuario', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.view', 'Noticias - Ver', 'Visualiza únicamente las noticias creadas y sin asignación', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.view_mine', 'Noticias - Ver Mías', 'Ve únicamente las noticias radicadas por el usuario', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.edit', 'Noticias - Editar', 'Puede editar noticias visibles', true),
        (v_module_id, 'control-disciplinario.procesos.edit', 'Procesos - Editar', 'Puede editar procesos visibles', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.asignar', 'Noticias - Asignar', 'Permite asociar una noticia con un proceso', true),
        (v_module_id, 'control-disciplinario.procesos.asociar', 'Procesos - Asociar', 'Permite asociar procesos', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.view_detail', 'Noticias - Ver Detalle', 'Permite visualizar información de la noticia', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.devolver', 'Noticias - Devolver', 'Permite devolver la noticia al radicador', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.view_devueltas', 'Noticias - Ver Devueltas', 'Permite ver todas las noticias devueltas', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.view_mis_devueltas', 'Noticias - Ver Mis Devueltas', 'Permite ver únicamente las noticias propias devueltas', true),
        (v_module_id, 'control-disciplinario.procesos.redimir', 'Procesos - Redimir', 'Permite remitir una noticia a entidad pertinente', true),
        (v_module_id, 'control-disciplinario.procesos.archivar', 'Procesos - Archivar', 'Permite archivar una noticia con confirmación previa', true),
        (v_module_id, 'control-disciplinario.procesos.convertir', 'Procesos - Convertir', 'Permite convertir una noticia en proceso', true),
        (v_module_id, 'control-disciplinario.procesos.expidiente', 'Procesos - Expediente', 'Permite ver documentos en Expediente Electrónico', true),
        (v_module_id, 'control-disciplinario.procesos.view_detail', 'Procesos - Ver Detalle', 'Permite ver detalles del proceso', true),
        (v_module_id, 'control-disciplinario.procesos.view_general', 'Procesos - Ver General', 'Permite ver la información general del proceso', true),
        (v_module_id, 'control-disciplinario.procesos.view_archivos', 'Procesos - Ver Archivos', 'Permite ver todos los archivos del proceso', true),
        (v_module_id, 'control-disciplinario.procesos.archivos.download', 'Procesos - Descargar Archivos', 'Permite descargar los documentos', true),
        (v_module_id, 'control-disciplinario.procesos.autos.create', 'Procesos - Crear Autos', 'Permite generar un nuevo auto', true),
        (v_module_id, 'control-disciplinario.procesos.evidencia.create', 'Procesos - Crear Evidencia', 'Permite cargar una nueva evidencia', true),
        (v_module_id, 'control-disciplinario.procesos.oficio.create', 'Procesos - Crear Oficio', 'Permite generar un nuevo oficio', true),
        (v_module_id, 'control-disciplinario.procesos.acta.create', 'Procesos - Crear Acta', 'Permite generar una nueva acta', true),
        (v_module_id, 'control-disciplinario.procesos.actuaciones.view', 'Procesos - Ver Actuaciones', 'Permite visualizar actuaciones', true),
        (v_module_id, 'control-disciplinario.procesos.actuaciones.create', 'Procesos - Crear Actuación', 'Permite crear una nueva actuación', true),
        (v_module_id, 'control-disciplinario.procesos.tareas.view', 'Procesos - Ver Tareas', 'Permite ver tareas', true),
        (v_module_id, 'control-disciplinario.procesos.tareas.create', 'Procesos - Crear Tarea', 'Permite generar una nueva tarea', true),
        (v_module_id, 'control-disciplinario.procesos.notas.view', 'Procesos - Ver Notas', 'Permite ver el apartado de notas', true),
        (v_module_id, 'control-disciplinario.procesos.notas.create', 'Procesos - Crear Nota', 'Permite crear y guardar una nota', true),
        (v_module_id, 'control-disciplinario.procesos.asociar_procesos', 'Procesos - Asociar Procesos', 'Permite asociar un proceso con otro', true),
        (v_module_id, 'control-disciplinario.procesos.reasignacion', 'Procesos - Reasignación', 'Permite solicitar reasignación de proceso', true),
        (v_module_id, 'control-disciplinario.procesos.reasignacion.approve', 'Procesos - Aprobar Reasignación', 'Permite aprobar solicitudes de reasignación', true),
        (v_module_id, 'control-disciplinario.procesos.kanban.move', 'Procesos - Mover Kanban', 'Permite mover procesos entre etapas', true),
        (v_module_id, 'control-disciplinario.procesos.view_list', 'Procesos - Ver Lista', 'Permite ver procesos y noticias en vista de listado', true),
        (v_module_id, 'control-disciplinario.revision-aprobacion.manage', 'Revisión - Gestionar', 'Permite visualizar el submódulo de revisión', true),
        (v_module_id, 'control-disciplinario.revision-aprobacion.view_docs', 'Revisión - Ver Documentos', 'Permite visualizar documentos pendientes', true),
        (v_module_id, 'control-disciplinario.revision-aprobacion.send_auto', 'Revisión - Enviar Auto', 'Permite enviar auto a revisión', true),
        (v_module_id, 'control-disciplinario.revision-aprobacion.devolver', 'Revisión - Devolver', 'Permite devolver un documento', true),
        (v_module_id, 'control-disciplinario.revision-aprobacion.aprobar', 'Revisión - Aprobar', 'Permite aprobar un documento', true),
        (v_module_id, 'control-disciplinario.expediente-electronico.manage', 'Expediente - Gestionar', 'Permite visualizar expediente electrónico', true),
        (v_module_id, 'control-disciplinario.expediente-electronico.view_all', 'Expediente - Ver Todos', 'Permite visualizar cada uno de los expedientes', true),
        (v_module_id, 'control-disciplinario.expediente-electronico.view_doc', 'Expediente - Ver Documento', 'Permite ver el documento del expediente', true),
        (v_module_id, 'control-disciplinario.expediente-electronico.download_doc', 'Expediente - Descargar', 'Permite descargar el documento', true),
        (v_module_id, 'control-disciplinario.expediente-electronico.download_hoja_control', 'Expediente - Descargar Hoja', 'Permite descargar la hoja de control', true),
        (v_module_id, 'control-disciplinario.expediente-electronico.view_hoja_control', 'Expediente - Ver Hoja', 'Permite evidenciar la hoja de control', true),
        (v_module_id, 'control-disciplinario.terminos.manage', 'Términos - Gestionar', 'Permite visualizar términos y alertas', true),
        (v_module_id, 'control-disciplinario.terminos.view', 'Términos - Ver', 'Permite visualizar cada uno de los términos', true),
        (v_module_id, 'control-disciplinario.terminos.view_mine', 'Términos - Ver Míos', 'Permite ver únicamente los términos asignados', true),
        (v_module_id, 'control-disciplinario.terminos.termino.create', 'Términos - Crear', 'Permite crear el término procesal', true),
        (v_module_id, 'control-disciplinario.terminos.termino.finish', 'Términos - Finalizar', 'Permite marcar términos como cumplidos', true),
        (v_module_id, 'control-disciplinario.terminos.view_history', 'Términos - Historial', 'Permite ver el historial de cambios', true),
        (v_module_id, 'control-disciplinario.terminos.export_excel', 'Términos - Exportar Excel', 'Permite exportar en Excel', true),
        (v_module_id, 'control-disciplinario.terminos.export_pdf', 'Términos - Exportar PDF', 'Permite exportar en PDF', true),
        (v_module_id, 'control-disciplinario.profesionales.manage', 'Profesionales - Gestionar', 'Permite ver el submódulo de profesionales', true),
        (v_module_id, 'control-disciplinario.profesionales.view', 'Profesionales - Ver', 'Permite ver información de profesionales', true),
        (v_module_id, 'control-disciplinario.profesionales.view_procesos', 'Profesionales - Ver Procesos', 'Permite ver los procesos de un profesional', true),
        (v_module_id, 'control-disciplinario.configuraciones.manage', 'Config - Gestionar', 'Permite ver el submódulo de configuración', true),
        (v_module_id, 'control-disciplinario.configuraciones.kanban.edit_dias_alertas', 'Config - Editar Alertas', 'Permite configurar días de vencimiento', true),
        (v_module_id, 'control-disciplinario.configuraciones.kanban.activar_etapa', 'Config - Activar Etapa', 'Permite activar o desactivar etapa', true),
        (v_module_id, 'control-disciplinario.configuraciones.etapa.delete', 'Config - Eliminar Etapa', 'Permite eliminar una etapa', true),
        (v_module_id, 'control-disciplinario.configuraciones.etapa.create', 'Config - Crear Estado', 'Permite crear un nuevo estado', true),
        (v_module_id, 'control-disciplinario.configuraciones.kanban.guardar', 'Config - Guardar Kanban', 'Permite guardar los cambios', true),
        (v_module_id, 'control-disciplinario.configuraciones.cargo.edit', 'Config - Editar Cargo', 'Permite modificar los cargos', true),
        (v_module_id, 'control-disciplinario.configuraciones.cargo.create', 'Config - Crear Cargo', 'Permite agregar un nuevo cargo', true),
        (v_module_id, 'control-disciplinario.configuraciones.cargo.guardar', 'Config - Guardar Cargo', 'Permite guardar los cambios de cargos', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.cambiar_plantilla', 'Config Autos - Cambiar', 'Permite cambiar la plantilla del auto', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.editar', 'Config Autos - Editar', 'Permite editar nombre del auto', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.ver', 'Config Autos - Ver', 'Permite ver la descripción y plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.eliminar', 'Config Autos - Eliminar', 'Permite eliminar el tipo de auto', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.descargar', 'Config Autos - Descargar', 'Permite descargar la plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.activar', 'Config Autos - Activar', 'Permite activar o desactivar el auto', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.plantilla.agregar', 'Config Autos - Agregar', 'Permite agregar una nueva plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.plantilla.activar', 'Config Autos - Activar Plantilla', 'Permite activar o desactivar plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.plantilla.descargar', 'Config Autos - Descargar Plantilla', 'Permite descargar la plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.plantilla.editar', 'Config Autos - Editar Plantilla', 'Permite editar nombre o descripción', true),
        (v_module_id, 'control-disciplinario.configuraciones.autos.plantilla.eliminar', 'Config Autos - Eliminar Plantilla', 'Permite eliminar una plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.cambiar_plantilla', 'Config Oficios - Cambiar', 'Permite cambiar la plantilla del oficio', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.editar', 'Config Oficios - Editar', 'Permite editar nombre del oficio', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.ver', 'Config Oficios - Ver', 'Permite ver la descripción y plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.eliminar', 'Config Oficios - Eliminar', 'Permite eliminar el tipo de oficio', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.descargar', 'Config Oficios - Descargar', 'Permite descargar la plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.activar', 'Config Oficios - Activar', 'Permite activar o desactivar el oficio', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.plantilla.agregar', 'Config Oficios - Agregar', 'Permite agregar una nueva plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.plantilla.activar', 'Config Oficios - Activar Plantilla', 'Permite activar o desactivar plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.plantilla.descargar', 'Config Oficios - Descargar', 'Permite descargar la plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.plantilla.editar', 'Config Oficios - Editar', 'Permite editar nombre o descripción', true),
        (v_module_id, 'control-disciplinario.configuraciones.oficios.plantilla.eliminar', 'Config Oficios - Eliminar', 'Permite eliminar una plantilla', true),
        (v_module_id, 'control-disciplinario.configuraciones.entidades.create', 'Config Entidades - Crear', 'Permite crear una nueva entidad', true),
        (v_module_id, 'control-disciplinario.configuraciones.entidades.activar', 'Config Entidades - Activar', 'Permite activar o desactivar entidad', true),
        (v_module_id, 'control-disciplinario.configuraciones.entidades.edit', 'Config Entidades - Editar', 'Permite editar una entidad', true),
        (v_module_id, 'control-disciplinario.configuraciones.entidades.delete', 'Config Entidades - Eliminar', 'Permite eliminar una entidad', true),
        (v_module_id, 'control-disciplinario.configuraciones.notificaciones.sistema', 'Config Notificaciones - Sistema', 'Permite modificar el periodo', true),
        (v_module_id, 'control-disciplinario.configuraciones.notificaciones.semaforo', 'Config Notificaciones - Semáforo', 'Permite configurar el semáforo', true),
        (v_module_id, 'control-disciplinario.configuraciones.notificaciones.guardar', 'Config Notificaciones - Guardar', 'Permite guardar los cambios', true),
        (v_module_id, 'control-disciplinario.configuraciones.prescripcion.edit', 'Config Prescripción - Editar', 'Permite modificar los años de prescripción', true),
        (v_module_id, 'control-disciplinario.configuraciones.prescripcion.guardar', 'Config Prescripción - Guardar', 'Permite guardar el cambio', true),
        (v_module_id, 'control-disciplinario.procesos.notas.delete', 'Procesos - Eliminar Nota', 'Permite eliminar una nota', true),
        (v_module_id, 'control-disciplinario.procesos.create_pliego', 'Procesos - Crear Pliego', 'Permite generar el pliego de cargos', true),
        (v_module_id, 'control-disciplinario.procesos.files.send_to_review', 'Procesos - Enviar a Revisión', 'Permite enviar documentos a revisión', true),
        (v_module_id, 'control-disciplinario.procesos.send_to_juridica', 'Procesos - Enviar a Jurídica', 'Permite remitir a oficina jurídica', true),
        (v_module_id, 'control-disciplinario.procesos.files.upload', 'Procesos - Subir Archivos', 'Permite cargar archivos generales', true),
        (v_module_id, 'control-disciplinario.procesos.tareas.edit', 'Procesos - Editar Tarea', 'Permite editar información de tareas', true),
        (v_module_id, 'control-disciplinario.procesos.restaurar', 'Procesos - Restaurar', 'Permite restaurar procesos archivados', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.restaurar', 'Noticias - Restaurar', 'Permite restaurar noticias archivadas', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.redimir', 'Noticias - Redimir', 'Permite remitir noticias', true),
        (v_module_id, 'control-disciplinario.noticia-disciplinaria.restaurar_mine', 'Noticias - Restaurar Mías', 'Permite restaurar noticias propias archivadas', true);


    RAISE NOTICE 'Disciplinary permissions cleaned and recreated successfully (130 permissions)';
END $$;