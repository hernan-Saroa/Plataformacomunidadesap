DO $$
DECLARE
    v_module_id uuid;
    v_jefe_role_id uuid;
    v_secretaria_role_id uuid;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
    SELECT id INTO v_jefe_role_id FROM auth.role WHERE code = 'JEFE_DE_LA_OCID';
    SELECT id INTO v_secretaria_role_id FROM auth.role WHERE code = 'SECRETARIA_RADICADOR';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module control-disciplinario not found';
    END IF;

    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES
        (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.delete', 'Noticia Disciplinaria / Eliminar', 'Permite eliminar permanentemente una noticia disciplinaria', v_module_id, true)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT v_jefe_role_id, id_permission, true
    FROM auth.permission
    WHERE code = 'control-disciplinario.noticia-disciplinaria.delete'
    ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

    IF v_secretaria_role_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        SELECT v_secretaria_role_id, id_permission, true
        FROM auth.permission
        WHERE code = 'control-disciplinario.noticia-disciplinaria.delete'
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;

    RAISE NOTICE 'Permiso de eliminar Noticia Disciplinaria creado y asignado a JEFE_DE_LA_OCID y SECRETARIA_RADICADOR';
END $$;
