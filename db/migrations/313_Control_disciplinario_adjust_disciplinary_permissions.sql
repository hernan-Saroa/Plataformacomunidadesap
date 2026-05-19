-- ============================================
-- MIGRATION 303: Update disciplinary permissions to match documentation
-- ============================================

DO $$
DECLARE
    v_module_id uuid;
    v_jefe_role_id uuid;
    v_secretaria_role_id uuid;
    v_profesional_role_id uuid;
BEGIN
    -- Get module and role IDs
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
    SELECT id INTO v_jefe_role_id FROM auth.role WHERE code = 'JEFE_DE_LA_OCID';
    SELECT id INTO v_secretaria_role_id FROM auth.role WHERE code = 'SECRETARIA_RADICADOR';
    SELECT id INTO v_profesional_role_id FROM auth.role WHERE code = 'PROFESIONAL';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module control-disciplinario not found';
    END IF;

    RAISE NOTICE 'Updating disciplinary permissions to match current documentation...';

    -- Clear existing role_permissions for disciplinary module to start fresh
    DELETE FROM auth.role_permissions
    WHERE id_permission IN (
        SELECT id_permission FROM auth.permission WHERE code LIKE 'control-disciplinario.%'
    );

    -- Assign permissions to JEFE_DE_LA_OCID (all except specific restrictions)
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT v_jefe_role_id, id_permission, true
    FROM auth.permission
    WHERE code LIKE 'control-disciplinario.%'
      AND code NOT IN (
        'control-disciplinario.procesos.view_mine',
        'control-disciplinario.noticia-disciplinaria.view_mis_devueltas',
        'control-disciplinario.terminos.view_mine',
        'control-disciplinario.noticia-disciplinaria.restaurar_mine'
      );

    -- Assign permissions to SECRETARIA_RADICADOR
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT v_secretaria_role_id, p.id_permission, true
    FROM auth.permission p
    WHERE p.code IN (
        -- Procesos
        'control-disciplinario.procesos.manage',
        'control-disciplinario.procesos.create',
        'control-disciplinario.procesos.view_all',
        'control-disciplinario.procesos.edit',
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
        'control-disciplinario.procesos.tareas.edit',
        'control-disciplinario.procesos.notas.view',
        'control-disciplinario.procesos.notas.create',
        'control-disciplinario.procesos.notas.delete',
        'control-disciplinario.procesos.asociar_procesos',
        'control-disciplinario.procesos.reasignacion',
        'control-disciplinario.procesos.view_list',
        'control-disciplinario.procesos.files.upload',
        -- Noticias
        'control-disciplinario.noticia-disciplinaria.view_mine',
        'control-disciplinario.noticia-disciplinaria.edit',
        'control-disciplinario.noticia-disciplinaria.asignar',
        'control-disciplinario.noticia-disciplinaria.view_detail',
        'control-disciplinario.noticia-disciplinaria.view_mis_devueltas',
        -- Expediente
        'control-disciplinario.expediente-electronico.manage',
        'control-disciplinario.expediente-electronico.view_all',
        'control-disciplinario.expediente-electronico.view_doc',
        'control-disciplinario.expediente-electronico.download_doc',
        'control-disciplinario.expediente-electronico.download_hoja_control',
        'control-disciplinario.expediente-electronico.view_hoja_control',
        -- Términos
        'control-disciplinario.terminos.manage',
        'control-disciplinario.terminos.view',
        'control-disciplinario.terminos.termino.create',
        'control-disciplinario.terminos.termino.finish',
        'control-disciplinario.terminos.view_history',
        'control-disciplinario.terminos.export_excel',
        'control-disciplinario.terminos.export_pdf',
        -- Profesionales
        'control-disciplinario.profesionales.manage',
        'control-disciplinario.profesionales.view',
        'control-disciplinario.profesionales.view_procesos',
        -- Restauración
        'control-disciplinario.noticia-disciplinaria.restaurar_mine'
    );

    -- Assign permissions to PROFESIONAL
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT v_profesional_role_id, p.id_permission, true
    FROM auth.permission p
    WHERE p.code IN (
        -- Procesos
        'control-disciplinario.procesos.manage',
        'control-disciplinario.procesos.view_mine',
        'control-disciplinario.procesos.edit',
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
        'control-disciplinario.procesos.tareas.create',
        'control-disciplinario.procesos.tareas.edit',
        'control-disciplinario.procesos.notas.view',
        'control-disciplinario.procesos.notas.create',
        'control-disciplinario.procesos.notas.delete',
        'control-disciplinario.procesos.asociar_procesos',
        'control-disciplinario.procesos.reasignacion',
        'control-disciplinario.procesos.kanban.move',
        'control-disciplinario.procesos.view_list',
        'control-disciplinario.procesos.create_pliego',
        'control-disciplinario.procesos.files.send_to_review',
        'control-disciplinario.procesos.send_to_juridica',
        'control-disciplinario.procesos.files.upload',
        -- Revisión
        'control-disciplinario.revision-aprobacion.send_auto',
        -- Expediente
        'control-disciplinario.expediente-electronico.manage',
        'control-disciplinario.expediente-electronico.view_all',
        'control-disciplinario.expediente-electronico.view_doc',
        'control-disciplinario.expediente-electronico.download_doc',
        'control-disciplinario.expediente-electronico.download_hoja_control',
        'control-disciplinario.expediente-electronico.view_hoja_control',
        -- Términos
        'control-disciplinario.terminos.manage',
        'control-disciplinario.terminos.view_mine',
        'control-disciplinario.terminos.termino.finish'
    );

    RAISE NOTICE 'Disciplinary permissions updated successfully to match documentation';

END $$;