DO $$
DECLARE
    r1 UUID; r2 UUID; r3 UUID; r4 UUID; r5 UUID; r6 UUID; r7 UUID;
    p_view UUID; p_approve UUID;
BEGIN
    SELECT id INTO r1 FROM auth.role WHERE code = 'RECTOR';
    SELECT id INTO r2 FROM auth.role WHERE code = 'SECRETARIO_GENERAL';
    SELECT id INTO r3 FROM auth.role WHERE code = 'SUBDIRECTOR_ACADEMICO';
    SELECT id INTO r4 FROM auth.role WHERE code = 'SUBDIRECTOR_PROYECCION';
    SELECT id INTO r5 FROM auth.role WHERE code = 'SUBDIRECTOR_ALTO_GOBIERNO';
    SELECT id INTO r6 FROM auth.role WHERE code = 'JEFE_JURIDICA';
    SELECT id INTO r7 FROM auth.role WHERE code = 'JEFE_PLANEACION';

    SELECT id_permission INTO p_view FROM auth.permission WHERE code = 'control-interno.plan-anual.view';
    SELECT id_permission INTO p_approve FROM auth.permission WHERE code = 'control-interno.plan-anual.approve';

    -- RECTOR
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r1 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r1, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r1 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r1, p_approve); END IF;

    -- SECRETARIO_GENERAL
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r2 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r2, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r2 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r2, p_approve); END IF;

    -- SUBDIRECTORES Y JEFES
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r3 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r3, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r3 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r3, p_approve); END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r4 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r4, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r4 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r4, p_approve); END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r5 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r5, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r5 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r5, p_approve); END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r6 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r6, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r6 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r6, p_approve); END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r7 AND id_permission = p_view) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r7, p_view); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = r7 AND id_permission = p_approve) THEN INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r7, p_approve); END IF;
END $$;
