DO $$
DECLARE
    v_module_id UUID;
BEGIN

    SELECT id_module
    INTO v_module_id
    FROM auth.module
    WHERE code = 'pta';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'No existe el módulo PTA en auth.module';
    END IF;

    INSERT INTO auth.permission (
        id_permission,
        code,
        name,
        description,
        id_module,
        is_active
    )
    VALUES
        (gen_random_uuid(), 'pta.backoffice.aprobador_N1', 'Aprobador N1', 'Permiso para aprobar un PTA en nivel 1', v_module_id, true),
        (gen_random_uuid(), 'pta.backoffice.aprobador_N2', 'Aprobador N2', 'Permiso para aprobar un PTA en nivel 2', v_module_id, true),
        (gen_random_uuid(), 'pta.backoffice.aprobador_N3', 'Aprobador N3', 'Permiso para aprobar un PTA en nivel 3', v_module_id, true),
        (gen_random_uuid(), 'pta.backoffice.revisor_N1', 'Revisor N1', 'Permiso para revisar un PTA en nivel 1', v_module_id, true),
        (gen_random_uuid(), 'pta.backoffice.revisor_N2', 'Revisor N2', 'Permiso para revisar un PTA en nivel 2', v_module_id, true),
        (gen_random_uuid(), 'pta.backoffice.revisor_N3', 'Revisor N3', 'Permiso para revisar un PTA en nivel 3', v_module_id, true)
    ON CONFLICT (code) DO NOTHING;

END $$;