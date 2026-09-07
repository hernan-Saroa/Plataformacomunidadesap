-- ============================================
-- MIGRATION 419: Restringir "Enviar a Jurídica" al rol Jefe de la OCID (EFDS-1544)
-- ============================================
-- El permiso control-disciplinario.procesos.send_to_juridica debe pertenecer
-- únicamente al Jefe de la OCID. La migración 313 lo asigna también a PROFESIONAL;
-- aquí se revoca de PROFESIONAL y SECRETARIA_RADICADOR y se garantiza para JEFE.
-- Nota: si la migración 313 se llegara a re-ejecutar después de esta, volvería a
-- asignarlo a PROFESIONAL. El endpoint backend PATCH /disciplinary-autos/:id/send-juridica
-- ya está restringido por @Roles a JEFE_DE_LA_OCID como salvaguarda.

DO $$
DECLARE
    v_permission_id uuid;
    v_jefe_role_id uuid;
BEGIN
    SELECT id_permission INTO v_permission_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.procesos.send_to_juridica';

    SELECT id INTO v_jefe_role_id FROM auth.role WHERE code = 'JEFE_DE_LA_OCID';

    IF v_permission_id IS NULL THEN
        RAISE NOTICE 'Permiso control-disciplinario.procesos.send_to_juridica no existe; nada que hacer';
        RETURN;
    END IF;

    -- Revocar de todos los roles EXCEPTO Jefe de la OCID (y super/admin globales)
    DELETE FROM auth.role_permissions rp
    USING auth.role r
    WHERE rp.id_permission = v_permission_id
      AND rp.id_rol = r.id
      AND r.code NOT IN ('JEFE_DE_LA_OCID', 'SUPER_ADMIN', 'ADMIN');

    -- Garantizar que el Jefe de la OCID sí lo tenga
    IF v_jefe_role_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        VALUES (v_jefe_role_id, v_permission_id, true)
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;

    RAISE NOTICE 'Permiso send_to_juridica restringido al rol JEFE_DE_LA_OCID';
END $$;
