DO $$
DECLARE
    v_module_id uuid;
    v_jefe_role_id uuid;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
    SELECT id INTO v_jefe_role_id FROM auth.role WHERE code = 'JEFE_DE_LA_OCID';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module control-disciplinario not found';
    END IF;

    INSERT INTO auth.permission (code, name, description, id_module, is_active)
    VALUES (
        'control-disciplinario.procesos.reasignacion.inmediata',
        'Reasignar profesional de forma inmediata',
        'Permite al Jefe OCID reasignar el profesional de un proceso de forma inmediata sin solicitud previa',
        v_module_id,
        true
    )
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT v_jefe_role_id, id_permission, true
    FROM auth.permission
    WHERE code = 'control-disciplinario.procesos.reasignacion.inmediata'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Permiso reasignacion inmediata creado y asignado a JEFE_DE_LA_OCID';
END $$;
