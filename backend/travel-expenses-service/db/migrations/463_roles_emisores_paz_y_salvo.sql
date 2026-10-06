-- EFDS-1311. Patrón de 003_seed_travel_expenses_permissions.sql:
-- resolver módulo, crear rol si falta, resolver permiso y asociar si falta.
-- Revisión previa 29/09/2026: COORDIN/FINANC/ADMINISTRATIV sin candidatos en auth.role.
-- Nunca asigna usuarios ni concede alcance nacional.
DO $$
DECLARE
    v_module_id UUID;
    v_role_id UUID;
    v_permission_id UUID;
    v_role RECORD;
    v_code TEXT;
    v_candidates UUID[];
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';
    IF v_module_id IS NULL THEN RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module'; END IF;

    FOR v_role IN SELECT * FROM (VALUES
      ('COORDINADOR_COMISIONES_VIATICOS', 'Coordinadora del Grupo de Comisiones y Viáticos', 'central'),
      ('COORDINADOR_ADMINISTRATIVO_FINANCIERO', 'Coordinador Administrativo y Financiero', 'territorial')
    ) AS r(code, name, tipo)
    LOOP
      SELECT id INTO v_role_id FROM auth.role WHERE code = v_role.code;
      IF v_role_id IS NULL THEN
        -- Si otro entorno tiene un candidato, parar para revisar equivalencia:
        -- una coincidencia de palabras no autoriza reutilizar un cargo distinto.
        SELECT array_agg(id) INTO v_candidates FROM auth.role
        WHERE (code || ' ' || name) ~* '(COORDIN|ADMINISTRATIV|FINANC)'
          AND code NOT IN ('COORDINADOR_COMISIONES_VIATICOS', 'COORDINADOR_ADMINISTRATIVO_FINANCIERO');
        IF cardinality(v_candidates) > 0 THEN
          RAISE EXCEPTION 'Revisar roles equivalentes antes de crear %: %', v_role.code, v_candidates;
        END IF;
        INSERT INTO auth.role (id, code, name, description, icon, color, type, sistema_destino, category, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_role.code, v_role.name,
          'Emite paz y salvo exclusivamente para comisionados de su propia territorial.',
          'UserCheck', '#003DA5', 'sistema', 'backoffice', 'backoffice', TRUE, NOW(), NOW())
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Rol % creado', v_role.code;
      END IF;

      FOREACH v_code IN ARRAY ARRAY['travel_expenses:paz_y_salvo.manage', 'travel_expenses:paz_y_salvo.' || v_role.tipo]
      LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = v_code) THEN
          INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), v_code, 'Paz y salvo: ' || v_role.tipo,
            'Emisión restringida por la territorial de la persona; no concede alcance nacional.', v_module_id, TRUE, NOW(), NOW());
        END IF;
        SELECT id_permission INTO v_permission_id FROM auth.permission WHERE code = v_code;
        IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_id) THEN
          INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (v_role_id, v_permission_id);
          RAISE NOTICE 'Permiso % asignado a %', v_code, v_role.code;
        END IF;
      END LOOP;
    END LOOP;
END $$;
