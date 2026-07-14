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

    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES
        (gen_random_uuid(), 'control-disciplinario.configuraciones.conductas.create', 'Configuración / Conductas Disciplinarias / Agregar', 'Permite agregar una nueva conducta disciplinaria al catálogo', v_module_id, true),
        (gen_random_uuid(), 'control-disciplinario.configuraciones.conductas.edit', 'Configuración / Conductas Disciplinarias / Editar', 'Permite editar o activar/desactivar una conducta disciplinaria existente', v_module_id, true),
        (gen_random_uuid(), 'control-disciplinario.configuraciones.conductas.delete', 'Configuración / Conductas Disciplinarias / Eliminar', 'Permite eliminar una conducta disciplinaria del catálogo', v_module_id, true)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT v_jefe_role_id, id_permission, true
    FROM auth.permission
    WHERE code = 'control-disciplinario.configuraciones.conductas.create'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Permisos de Conductas Disciplinarias creados; permiso de agregar asignado a JEFE_DE_LA_OCID';
END $$;
