-- ============================================
-- MIGRATION 302: Cleanup duplicate and dysfunctional permissions for control-disciplinario
-- ============================================

DO $$
DECLARE
    v_module_id uuid;
    v_permission_record RECORD;
    v_duplicate_count INTEGER := 0;
    v_invalid_assignments_count INTEGER := 0;
    v_obsolete_permissions_count INTEGER := 0;
    v_processed_count INTEGER := 0;
BEGIN
    -- Get the control-disciplinario module ID
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'control-disciplinario';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module control-disciplinario not found';
    END IF;

    RAISE NOTICE 'Starting cleanup of control-disciplinario permissions...';

    -- Step 1: Create table of authorized permissions from migrations 191 and 204
    -- These are the only permissions that should exist for control-disciplinario
    CREATE TEMP TABLE authorized_permissions AS
    VALUES
        ('control-disciplinario.procesos.manage'),
        ('control-disciplinario.procesos.create'),
        ('control-disciplinario.procesos.view_all'),
        ('control-disciplinario.procesos.view_mine'),
        ('control-disciplinario.noticia-disciplinaria.view'),
        ('control-disciplinario.noticia-disciplinaria.edit'),
        ('control-disciplinario.procesos.edit'),
        ('control-disciplinario.noticia-disciplinaria.asignar'),
        ('control-disciplinario.procesos.asociar'),
        ('control-disciplinario.noticia-disciplinaria.view_detail'),
        ('control-disciplinario.noticia-disciplinaria.devolver'),
        ('control-disciplinario.noticia-disciplinaria.view_devueltas'),
        ('control-disciplinario.noticia-disciplinaria.view_mis_devueltas'),
        ('control-disciplinario.procesos.redimir'),
        ('control-disciplinario.procesos.archivar'),
        ('control-disciplinario.procesos.convertir'),
        ('control-disciplinario.procesos.expidiente'),
        ('control-disciplinario.procesos.view_detail'),
        ('control-disciplinario.procesos.view_general'),
        ('control-disciplinario.procesos.view_archivos'),
        ('control-disciplinario.procesos.archivos.download'),
        ('control-disciplinario.procesos.autos.create'),
        ('control-disciplinario.procesos.evidencia.create'),
        ('control-disciplinario.procesos.oficio.create'),
        ('control-disciplinario.procesos.acta.create'),
        ('control-disciplinario.procesos.actuaciones.view'),
        ('control-disciplinario.procesos.actuaciones.create'),
        ('control-disciplinario.procesos.tareas.view'),
        ('control-disciplinario.procesos.tareas.create'),
        ('control-disciplinario.procesos.notas.view'),
        ('control-disciplinario.procesos.notas.create'),
        ('control-disciplinario.procesos.asociar_procesos'),
        ('control-disciplinario.procesos.reasignacion'),
        ('control-disciplinario.procesos.reasignacion.approve'),
        ('control-disciplinario.procesos.kanban.move'),
        ('control-disciplinario.procesos.view_list'),
        ('control-disciplinario.revision-aprobacion.manage'),
        ('control-disciplinario.revision-aprobacion.view_docs'),
        ('control-disciplinario.revision-aprobacion.send_auto'),
        ('control-disciplinario.revision-aprobacion.devolver'),
        ('control-disciplinario.revision-aprobacion.aprobar'),
        ('control-disciplinario.expediente-electronico.manage'),
        ('control-disciplinario.expediente-electronico.view_all'),
        ('control-disciplinario.expediente-electronico.view_doc'),
        ('control-disciplinario.expediente-electronico.download_doc'),
        ('control-disciplinario.expediente-electronico.download_hoja_control'),
        ('control-disciplinario.expediente-electronico.view_hoja_control'),
        ('control-disciplinario.terminos.manage'),
        ('control-disciplinario.terminos.view'),
        ('control-disciplinario.terminos.view_mine'),
        ('control-disciplinario.terminos.termino.create'),
        ('control-disciplinario.terminos.termino.finish'),
        ('control-disciplinario.terminos.view_history'),
        ('control-disciplinario.terminos.export_excel'),
        ('control-disciplinario.terminos.export_pdf'),
        ('control-disciplinario.profesionales.manage'),
        ('control-disciplinario.profesionales.view'),
        ('control-disciplinario.profesionales.view_procesos'),
        ('control-disciplinario.configuraciones.manage'),
        ('control-disciplinario.configuraciones.kanban.edit_dias_alertas'),
        ('control-disciplinario.configuraciones.kanban.activar_etapa'),
        ('control-disciplinario.configuraciones.etapa.delete'),
        ('control-disciplinario.configuraciones.etapa.create'),
        ('control-disciplinario.configuraciones.kanban.guardar'),
        ('control-disciplinario.configuraciones.cargo.edit'),
        ('control-disciplinario.configuraciones.cargo.create'),
        ('control-disciplinario.configuraciones.cargo.guardar'),
        ('control-disciplinario.configuraciones.autos.cambiar_plantilla'),
        ('control-disciplinario.configuraciones.autos.editar'),
        ('control-disciplinario.configuraciones.autos.ver'),
        ('control-disciplinario.configuraciones.autos.eliminar'),
        ('control-disciplinario.configuraciones.autos.descargar'),
        ('control-disciplinario.configuraciones.autos.activar'),
        ('control-disciplinario.configuraciones.autos.plantilla.agregar'),
        ('control-disciplinario.configuraciones.autos.plantilla.activar'),
        ('control-disciplinario.configuraciones.autos.plantilla.descargar'),
        ('control-disciplinario.configuraciones.autos.plantilla.editar'),
        ('control-disciplinario.configuraciones.autos.plantilla.eliminar'),
        ('control-disciplinario.configuraciones.oficios.cambiar_plantilla'),
        ('control-disciplinario.configuraciones.oficios.editar'),
        ('control-disciplinario.configuraciones.oficios.ver'),
        ('control-disciplinario.configuraciones.oficios.eliminar'),
        ('control-disciplinario.configuraciones.oficios.descargar'),
        ('control-disciplinario.configuraciones.oficios.activar'),
        ('control-disciplinario.configuraciones.oficios.plantilla.agregar'),
        ('control-disciplinario.configuraciones.oficios.plantilla.activar'),
        ('control-disciplinario.configuraciones.oficios.plantilla.descargar'),
        ('control-disciplinario.configuraciones.oficios.plantilla.editar'),
        ('control-disciplinario.configuraciones.oficios.plantilla.eliminar'),
        ('control-disciplinario.configuraciones.entidades.create'),
        ('control-disciplinario.configuraciones.entidades.activar'),
        ('control-disciplinario.configuraciones.entidades.edit'),
        ('control-disciplinario.configuraciones.entidades.delete'),
        ('control-disciplinario.configuraciones.notificaciones.sistema'),
        ('control-disciplinario.configuraciones.notificaciones.semaforo'),
        ('control-disciplinario.configuraciones.notificaciones.guardar'),
        ('control-disciplinario.configuraciones.prescripcion.edit'),
        ('control-disciplinario.configuraciones.prescripcion.guardar'),
        ('control-disciplinario.procesos.notas.delete'),
        ('control-disciplinario.procesos.create_pliego'),
        ('control-disciplinario.procesos.files.send_to_review'),
        ('control-disciplinario.procesos.send_to_juridica'),
        ('control-disciplinario.procesos.files.upload'),
        ('control-disciplinario.procesos.tareas.edit'),
        -- Restore permissions from migration 204
        ('control-disciplinario.procesos.restaurar'),
        ('control-disciplinario.noticia-disciplinaria.restaurar'),
        ('control-disciplinario.noticia-disciplinaria.restaurar_mine');

    -- Step 2: Remove duplicate permissions (same code, keep the one with highest ID)
    -- This is SAFE because it only removes exact duplicates of the same permission code
    RAISE NOTICE 'Step 2: Removing duplicate permissions...';

    FOR v_permission_record IN
        SELECT code, COUNT(*) as count, array_agg(id_permission ORDER BY id_permission DESC) as ids
        FROM auth.permission
        WHERE code LIKE 'control-disciplinario.%'
        GROUP BY code
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first ID (highest), delete the rest
        IF array_length(v_permission_record.ids, 1) > 1 THEN
            -- First remove role_permissions for duplicates (keep the primary one)
            DELETE FROM auth.role_permissions
            WHERE id_permission = ANY(v_permission_record.ids[2:]);

            -- Then delete the duplicate permissions
            DELETE FROM auth.permission
            WHERE id_permission = ANY(v_permission_record.ids[2:]);

            v_duplicate_count := v_duplicate_count + (array_length(v_permission_record.ids, 1) - 1);
            RAISE NOTICE 'Removed % duplicates for permission code: %', (array_length(v_permission_record.ids, 1) - 1), v_permission_record.code;
        END IF;
    END LOOP;

    -- Step 3: Remove role assignments for permissions NOT in the authorized list
    -- This ensures only valid permissions are assigned to roles
    RAISE NOTICE 'Step 3: Removing invalid role assignments...';

    DELETE FROM auth.role_permissions
    WHERE id_permission IN (
        SELECT p.id_permission
        FROM auth.permission p
        WHERE p.code LIKE 'control-disciplinario.%'
          AND p.code NOT IN (SELECT column1 FROM authorized_permissions)
    );

    GET DIAGNOSTICS v_invalid_assignments_count = ROW_COUNT;
    RAISE NOTICE 'Removed % invalid role assignments for unauthorized permissions', v_invalid_assignments_count;

    -- Step 4: Remove permissions that are not in the authorized list and have no role assignments
    -- This safely removes obsolete permissions that are no longer used
    RAISE NOTICE 'Step 4: Removing obsolete permissions...';

    DELETE FROM auth.permission
    WHERE code LIKE 'control-disciplinario.%'
      AND code NOT IN (SELECT column1 FROM authorized_permissions)
      AND id_permission NOT IN (
          SELECT DISTINCT rp.id_permission
          FROM auth.role_permissions rp
      );

    GET DIAGNOSTICS v_obsolete_permissions_count = ROW_COUNT;
    RAISE NOTICE 'Removed % obsolete permissions', v_obsolete_permissions_count;

    -- Step 5: Standardize permission descriptions with proper UTF-8 encoding
    -- This ensures descriptions display correctly with accents and ñ
    RAISE NOTICE 'Step 5: Standardizing permission descriptions with UTF-8 encoding...';

    UPDATE auth.permission
    SET description = CASE
        -- Procesos permissions
        WHEN code = 'control-disciplinario.procesos.manage' THEN 'Permite visualizar el submódulo de procesos'
        WHEN code = 'control-disciplinario.procesos.create' THEN 'Permite crear una nueva noticia (digitar, subir documentos, guardar)'
        WHEN code = 'control-disciplinario.procesos.view_all' THEN 'Se visualizan todos los procesos activos en el momento'
        WHEN code = 'control-disciplinario.procesos.view_mine' THEN 'Ve únicamente los procesos asignados al usuario'
        WHEN code = 'control-disciplinario.procesos.edit' THEN 'Puede editar procesos visibles, modificar información y guardar cambios'
        WHEN code = 'control-disciplinario.procesos.convertir' THEN 'Permite convertir una noticia en proceso, relacionando consecutivos y asignando profesional'
        WHEN code = 'control-disciplinario.procesos.archivar' THEN 'Permite archivar una noticia con confirmación previa'
        WHEN code = 'control-disciplinario.procesos.redimir' THEN 'Permite remitir una noticia a entidad pertinente fuera de control interno disciplinario'
        WHEN code = 'control-disciplinario.procesos.expidiente' THEN 'Permite ver documentos redirigiendo al submódulo de Expediente Electrónico'
        WHEN code = 'control-disciplinario.procesos.view_detail' THEN 'Permite ver detalles y funcionalidades del proceso en la misma pestaña'
        WHEN code = 'control-disciplinario.procesos.view_general' THEN 'Permite ver la información general del proceso asignado'
        WHEN code = 'control-disciplinario.procesos.view_archivos' THEN 'Permite ver todos los archivos subidos en el proceso (autos y evidencias)'
        WHEN code = 'control-disciplinario.procesos.archivos.download' THEN 'Permite descargar los documentos diligenciados'
        WHEN code = 'control-disciplinario.procesos.autos.create' THEN 'Permite generar un nuevo auto, redactar información y cargar el documento'
        WHEN code = 'control-disciplinario.procesos.evidencia.create' THEN 'Permite cargar una nueva evidencia con los datos solicitados'
        WHEN code = 'control-disciplinario.procesos.oficio.create' THEN 'Permite generar un nuevo oficio y adjuntar documentos'
        WHEN code = 'control-disciplinario.procesos.acta.create' THEN 'Permite generar una nueva acta y adjuntar documentos'
        WHEN code = 'control-disciplinario.procesos.actuaciones.view' THEN 'Permite visualizar actuaciones generadas automáticamente o creadas manualmente'
        WHEN code = 'control-disciplinario.procesos.actuaciones.create' THEN 'Permite crear una nueva actuación llenando los valores requeridos'
        WHEN code = 'control-disciplinario.procesos.tareas.view' THEN 'Permite ver tareas generadas al profesional asignado o a otro profesional'
        WHEN code = 'control-disciplinario.procesos.tareas.create' THEN 'Permite generar una nueva tarea asignando automáticamente al profesional del proceso'
        WHEN code = 'control-disciplinario.procesos.tareas.edit' THEN 'Permite editar información de las tareas asignadas'
        WHEN code = 'control-disciplinario.procesos.notas.view' THEN 'Permite ver el apartado de notas con comentarios sobre el proceso'
        WHEN code = 'control-disciplinario.procesos.notas.create' THEN 'Permite crear y guardar una nota visible para todo el equipo'
        WHEN code = 'control-disciplinario.procesos.notas.delete' THEN 'Permite eliminar una nota del proceso disciplinario'
        WHEN code = 'control-disciplinario.procesos.asociar_procesos' THEN 'Permite asociar un proceso con otro proceso activo'
        WHEN code = 'control-disciplinario.procesos.reasignacion' THEN 'Permite solicitar reasignación de proceso indicando prioridad, justificación y nuevo profesional'
        WHEN code = 'control-disciplinario.procesos.reasignacion.approve' THEN 'Permite aprobar solicitudes de reasignación de procesos desde el submódulo de revisión'
        WHEN code = 'control-disciplinario.procesos.kanban.move' THEN 'Permite mover procesos entre etapas en la vista Kanban'
        WHEN code = 'control-disciplinario.procesos.view_list' THEN 'Permite ver procesos y noticias (según permisos) en vista de listado'
        WHEN code = 'control-disciplinario.procesos.create_pliego' THEN 'Permite generar el pliego de cargos de un proceso'
        WHEN code = 'control-disciplinario.procesos.files.send_to_review' THEN 'Permite enviar documentos del proceso a revisión por parte del jefe'
        WHEN code = 'control-disciplinario.procesos.send_to_juridica' THEN 'Permite remitir el proceso a la oficina jurídica'
        WHEN code = 'control-disciplinario.procesos.files.upload' THEN 'Permite cargar archivos generales al proceso'

        -- Noticia disciplinaria permissions
        WHEN code = 'control-disciplinario.noticia-disciplinaria.view' THEN 'Visualiza únicamente las noticias creadas y sin asignación'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.edit' THEN 'Puede editar noticias visibles, modificar información y guardar cambios'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.asignar' THEN 'Permite asociar una noticia con un proceso en progreso'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.view_detail' THEN 'Permite visualizar información de la noticia en pestaña ampliada'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.devolver' THEN 'Permite devolver la noticia al usuario que la radicó con mensaje de motivo'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.view_devueltas' THEN 'Permite ver todas las noticias devueltas con información del radicador'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.view_mis_devueltas' THEN 'Permite ver únicamente las noticias propias que fueron devueltas por el jefe'

        -- Revision y Aprobacion permissions
        WHEN code = 'control-disciplinario.revision-aprobacion.manage' THEN 'Permite visualizar el submódulo de revisión y aprobación'
        WHEN code = 'control-disciplinario.revision-aprobacion.view_docs' THEN 'Permite visualizar todos los documentos pendientes de aprobación'
        WHEN code = 'control-disciplinario.revision-aprobacion.send_auto' THEN 'Permite enviar un auto ya subido a revisión para aprobación'
        WHEN code = 'control-disciplinario.revision-aprobacion.devolver' THEN 'Permite devolver un documento para volver a radicarlo con observaciones'
        WHEN code = 'control-disciplinario.revision-aprobacion.aprobar' THEN 'Permite aprobar un documento, firmar y agregar observación de aprobación'

        -- Expediente Electronico permissions
        WHEN code = 'control-disciplinario.expediente-electronico.manage' THEN 'Permite visualizar el submódulo de expediente electrónico'
        WHEN code = 'control-disciplinario.expediente-electronico.view_all' THEN 'Permite visualizar cada uno de los expedientes'
        WHEN code = 'control-disciplinario.expediente-electronico.view_doc' THEN 'Permite ver el documento que se encuentra en el expediente'
        WHEN code = 'control-disciplinario.expediente-electronico.download_doc' THEN 'Permite descargar el documento designado'
        WHEN code = 'control-disciplinario.expediente-electronico.download_hoja_control' THEN 'Permite descargar la hoja de control'
        WHEN code = 'control-disciplinario.expediente-electronico.view_hoja_control' THEN 'Permite evidenciar la hoja de control'

        -- Terminos permissions
        WHEN code = 'control-disciplinario.terminos.manage' THEN 'Permite visualizar el submódulo de términos y alertas'
        WHEN code = 'control-disciplinario.terminos.view' THEN 'Permite visualizar cada uno de los términos'
        WHEN code = 'control-disciplinario.terminos.view_mine' THEN 'Permite ver únicamente los términos asignados al profesional específico'
        WHEN code = 'control-disciplinario.terminos.termino.create' THEN 'Permite crear el término procesal asignando al profesional responsable'
        WHEN code = 'control-disciplinario.terminos.termino.finish' THEN 'Permite marcar términos como cumplidos; solo el profesional asignado puede hacerlo'
        WHEN code = 'control-disciplinario.terminos.view_history' THEN 'Permite ver el historial de cambios en los términos'
        WHEN code = 'control-disciplinario.terminos.export_excel' THEN 'Permite exportar en Excel la información de los términos del sistema'
        WHEN code = 'control-disciplinario.terminos.export_pdf' THEN 'Permite exportar en PDF la información de los términos del sistema'

        -- Profesionales permissions
        WHEN code = 'control-disciplinario.profesionales.manage' THEN 'Permite ver el submódulo denominado como profesionales'
        WHEN code = 'control-disciplinario.profesionales.view' THEN 'Permite ver información de todos los profesionales (cargo, carga de trabajo, etc.)'
        WHEN code = 'control-disciplinario.profesionales.view_procesos' THEN 'Permite ver los procesos de un profesional específico redirigiendo al submódulo de procesos'

        -- Configuraciones permissions
        WHEN code = 'control-disciplinario.configuraciones.manage' THEN 'Permite ver el submódulo de configuración del sistema y todas sus vistas'
        WHEN code = 'control-disciplinario.configuraciones.kanban.edit_dias_alertas' THEN 'Permite configurar días de vencimiento y frecuencia de alertas por etapa'
        WHEN code = 'control-disciplinario.configuraciones.kanban.activar_etapa' THEN 'Permite activar o desactivar una etapa del Kanban'
        WHEN code = 'control-disciplinario.configuraciones.etapa.delete' THEN 'Permite eliminar una etapa del Kanban'
        WHEN code = 'control-disciplinario.configuraciones.etapa.create' THEN 'Permite crear un nuevo estado en el Kanban'
        WHEN code = 'control-disciplinario.configuraciones.kanban.guardar' THEN 'Permite guardar los cambios generados en el Kanban'
        WHEN code = 'control-disciplinario.configuraciones.cargo.edit' THEN 'Permite modificar los cargos existentes o creados'
        WHEN code = 'control-disciplinario.configuraciones.cargo.create' THEN 'Permite agregar un nuevo cargo'
        WHEN code = 'control-disciplinario.configuraciones.cargo.guardar' THEN 'Permite guardar los cambios de cargos modificados'

        -- Configuraciones - Autos templates
        WHEN code = 'control-disciplinario.configuraciones.autos.cambiar_plantilla' THEN 'Permite cambiar la plantilla del auto a modificar'
        WHEN code = 'control-disciplinario.configuraciones.autos.editar' THEN 'Permite editar nombre del auto y su etapa asociada'
        WHEN code = 'control-disciplinario.configuraciones.autos.ver' THEN 'Permite ver la descripción y plantilla del auto'
        WHEN code = 'control-disciplinario.configuraciones.autos.eliminar' THEN 'Permite eliminar el tipo de auto y su plantilla con confirmación'
        WHEN code = 'control-disciplinario.configuraciones.autos.descargar' THEN 'Permite descargar la plantilla del auto'
        WHEN code = 'control-disciplinario.configuraciones.autos.activar' THEN 'Permite activar o desactivar el auto en la selección'
        WHEN code = 'control-disciplinario.configuraciones.autos.plantilla.agregar' THEN 'Permite agregar una nueva plantilla al auto'
        WHEN code = 'control-disciplinario.configuraciones.autos.plantilla.activar' THEN 'Permite activar o desactivar una plantilla del auto'
        WHEN code = 'control-disciplinario.configuraciones.autos.plantilla.descargar' THEN 'Permite descargar la plantilla del auto'
        WHEN code = 'control-disciplinario.configuraciones.autos.plantilla.editar' THEN 'Permite editar nombre o descripción de la plantilla del auto'
        WHEN code = 'control-disciplinario.configuraciones.autos.plantilla.eliminar' THEN 'Permite eliminar una plantilla del auto con confirmación'

        -- Configuraciones - Oficios templates
        WHEN code = 'control-disciplinario.configuraciones.oficios.cambiar_plantilla' THEN 'Permite cambiar la plantilla del oficio a modificar'
        WHEN code = 'control-disciplinario.configuraciones.oficios.editar' THEN 'Permite editar nombre del oficio y su categoría'
        WHEN code = 'control-disciplinario.configuraciones.oficios.ver' THEN 'Permite ver la descripción y plantilla del oficio'
        WHEN code = 'control-disciplinario.configuraciones.oficios.eliminar' THEN 'Permite eliminar el tipo de oficio y su plantilla con confirmación'
        WHEN code = 'control-disciplinario.configuraciones.oficios.descargar' THEN 'Permite descargar la plantilla del oficio'
        WHEN code = 'control-disciplinario.configuraciones.oficios.activar' THEN 'Permite activar o desactivar el oficio en la selección'
        WHEN code = 'control-disciplinario.configuraciones.oficios.plantilla.agregar' THEN 'Permite agregar una nueva plantilla al oficio'
        WHEN code = 'control-disciplinario.configuraciones.oficios.plantilla.activar' THEN 'Permite activar o desactivar una plantilla del oficio'
        WHEN code = 'control-disciplinario.configuraciones.oficios.plantilla.descargar' THEN 'Permite descargar la plantilla del oficio'
        WHEN code = 'control-disciplinario.configuraciones.oficios.plantilla.editar' THEN 'Permite editar nombre o descripción de la plantilla del oficio'
        WHEN code = 'control-disciplinario.configuraciones.oficios.plantilla.eliminar' THEN 'Permite eliminar una plantilla del oficio con confirmación'

        -- Configuraciones - Entidades
        WHEN code = 'control-disciplinario.configuraciones.entidades.create' THEN 'Permite crear una nueva entidad de remisión'
        WHEN code = 'control-disciplinario.configuraciones.entidades.activar' THEN 'Permite activar o desactivar una entidad de remisión'
        WHEN code = 'control-disciplinario.configuraciones.entidades.edit' THEN 'Permite editar una entidad de remisión'
        WHEN code = 'control-disciplinario.configuraciones.entidades.delete' THEN 'Permite eliminar una entidad de remisión'

        -- Configuraciones - Notificaciones
        WHEN code = 'control-disciplinario.configuraciones.notificaciones.sistema' THEN 'Permite modificar el periodo y casos para mostrar notificaciones'
        WHEN code = 'control-disciplinario.configuraciones.notificaciones.semaforo' THEN 'Permite configurar el sistema de semáforo de avance de procesos'
        WHEN code = 'control-disciplinario.configuraciones.notificaciones.guardar' THEN 'Permite guardar los cambios de notificaciones y alertas'

        -- Configuraciones - Prescripcion
        WHEN code = 'control-disciplinario.configuraciones.prescripcion.edit' THEN 'Permite modificar los años de prescripción de cada proceso'
        WHEN code = 'control-disciplinario.configuraciones.prescripcion.guardar' THEN 'Permite guardar el cambio de la prescripción disciplinaria'

        -- Restore permissions from migration 204
        WHEN code = 'control-disciplinario.procesos.restaurar' THEN 'Permite restaurar procesos disciplinarios desde estado archivado'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.restaurar' THEN 'Permite restaurar noticias disciplinarias desde estado archivado'
        WHEN code = 'control-disciplinario.noticia-disciplinaria.restaurar_mine' THEN 'Permite restaurar únicamente las noticias propias que fueron archivadas'

        ELSE description -- Keep existing description if not in the list
    END
    WHERE code LIKE 'control-disciplinario.%'
      AND code IN (SELECT column1 FROM authorized_permissions);

    -- Step 6: Ensure all authorized permissions are active
    UPDATE auth.permission
    SET is_active = true
    WHERE code LIKE 'control-disciplinario.%'
      AND code IN (SELECT column1 FROM authorized_permissions)
      AND is_active = false;

    -- Step 7: Verify role assignments are intact for the three main disciplinary roles
    -- This ensures the roles still have their expected permissions from migration 191
    RAISE NOTICE 'Step 7: Verifying role assignments...';

    -- Count permissions per role to ensure they have reasonable assignments
    FOR v_permission_record IN
        SELECT r.code as role_code, r.name as role_name, COUNT(rp.id_permission) as permission_count
        FROM auth.role r
        LEFT JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active = true
        INNER JOIN auth.permission p ON p.id_permission = rp.id_permission AND p.code LIKE 'control-disciplinario.%'
        WHERE r.code IN ('JEFE_DE_LA_OCID', 'SECRETARIA_RADICADOR', 'PROFESIONAL')
          AND r.is_active = true
        GROUP BY r.id, r.code, r.name
    LOOP
        RAISE NOTICE 'Role % (%) has % active permissions assigned', v_permission_record.role_code, v_permission_record.role_name, v_permission_record.permission_count;

        -- Warn if roles have suspiciously few permissions
        IF v_permission_record.permission_count < 10 THEN
            RAISE WARNING 'Role % has only % permissions - this may indicate missing assignments', v_permission_record.role_code, v_permission_record.permission_count;
        END IF;
    END LOOP;

    -- Get final counts
    SELECT COUNT(*) INTO v_processed_count
    FROM auth.permission
    WHERE code LIKE 'control-disciplinario.%'
      AND code IN (SELECT column1 FROM authorized_permissions);

    RAISE NOTICE 'Cleanup completed successfully!';
    RAISE NOTICE 'Duplicate permissions removed: %', v_duplicate_count;
    RAISE NOTICE 'Invalid role assignments removed: %', v_invalid_assignments_count;
    RAISE NOTICE 'Obsolete permissions removed: %', v_obsolete_permissions_count;
    RAISE NOTICE 'Authorized permissions remaining: %', v_processed_count;
    RAISE NOTICE 'All disciplinary permissions are now active and have consistent UTF-8 descriptions';

    -- Drop temporary table
    DROP TABLE IF EXISTS authorized_permissions;

END $$;