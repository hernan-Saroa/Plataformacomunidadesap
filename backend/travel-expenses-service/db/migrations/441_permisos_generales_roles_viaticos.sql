SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 441_permisos_generales_roles_viaticos.sql
-- Objetivo: Crear permisos generales inmutables (travel_expenses.general.es_*)
--           para identificar de forma estable los roles funcionales en viáticos
--           y asociarlos a los roles en auth.role_permissions.
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_enlace UUID;
    v_perm_secretario UUID;
    v_perm_analista UUID;
    v_perm_control UUID;
    v_perm_subdireccion UUID;
    v_perm_direccion UUID;
    v_perm_presupuesto UUID;
    v_perm_tesoreria UUID;
    v_perm_sst UUID;
    v_perm_tiquetes UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- 2. Asegurar la existencia de los permisos generales en auth.permission
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 2.1 Es Enlace de Dependencia
        SELECT id_permission INTO v_perm_enlace FROM auth.permission WHERE code = 'travel_expenses.general.es_enlace_dependencia';
        IF v_perm_enlace IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_enlace_dependencia',
                'Es Enlace de Dependencia',
                'Identifica a los usuarios con función de enlace de dependencia para radicación y gestión inicial de comisiones',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_enlace;
        END IF;

        -- 2.2 Es Secretario de Viáticos
        SELECT id_permission INTO v_perm_secretario FROM auth.permission WHERE code = 'travel_expenses.general.es_secretario_viaticos';
        IF v_perm_secretario IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_secretario_viaticos',
                'Es Secretario de Viáticos',
                'Identifica a los usuarios con función de secretaría del grupo de viáticos (bandeja de entrada, priorización y asignación)',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_secretario;
        END IF;

        -- 2.3 Es Analista de Viáticos
        SELECT id_permission INTO v_perm_analista FROM auth.permission WHERE code = 'travel_expenses.general.es_analista_viaticos';
        IF v_perm_analista IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_analista_viaticos',
                'Es Analista de Viáticos',
                'Identifica a los analistas responsables de la verificación técnica y documental de comisiones',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_analista;
        END IF;

        -- 2.4 Es Control de Viáticos / Revisor
        SELECT id_permission INTO v_perm_control FROM auth.permission WHERE code = 'travel_expenses.general.es_control_viaticos';
        IF v_perm_control IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_control_viaticos',
                'Es Control de Viáticos / Revisor',
                'Identifica a los revisores de control técnico cruzado y segunda revisión técnica de comisiones',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_control;
        END IF;

        -- 2.5 Es Subdirección de Gestión Corporativa (Ordenador del Gasto)
        SELECT id_permission INTO v_perm_subdireccion FROM auth.permission WHERE code = 'travel_expenses.general.es_subdireccion_corporativa';
        IF v_perm_subdireccion IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_subdireccion_corporativa',
                'Es Subdirección de Gestión Corporativa (Ordenador)',
                'Identifica a los ordenadores del gasto para autorización formal de comisiones y viáticos',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_subdireccion;
        END IF;

        -- 2.6 Es Dirección Nacional
        SELECT id_permission INTO v_perm_direccion FROM auth.permission WHERE code = 'travel_expenses.general.es_direccion_nacional';
        IF v_perm_direccion IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_direccion_nacional',
                'Es Dirección Nacional',
                'Identifica a la Dirección Nacional para autorización de comisiones extemporáneas o internacionales',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_direccion;
        END IF;

        -- 2.7 Es Presupuesto
        SELECT id_permission INTO v_perm_presupuesto FROM auth.permission WHERE code = 'travel_expenses.general.es_presupuesto';
        IF v_perm_presupuesto IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_presupuesto',
                'Es Presupuesto',
                'Identifica a los usuarios del Grupo de Presupuesto para expedición de Registro Presupuestal (RP)',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_presupuesto;
        END IF;

        -- 2.8 Es Tesorería / Pagador
        SELECT id_permission INTO v_perm_tesoreria FROM auth.permission WHERE code = 'travel_expenses.general.es_tesoreria';
        IF v_perm_tesoreria IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_tesoreria',
                'Es Tesorería / Pagador',
                'Identifica a los usuarios de Tesorería responsables del desembolso y pago de comisiones',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_tesoreria;
        END IF;

        -- 2.9 Es Seguridad y Salud en el Trabajo (SST)
        SELECT id_permission INTO v_perm_sst FROM auth.permission WHERE code = 'travel_expenses.general.es_sst';
        IF v_perm_sst IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_sst',
                'Es Seguridad y Salud en el Trabajo',
                'Identifica a los usuarios de SST para monitoreo de desplazamientos y cobertura de ARL',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_sst;
        END IF;

        -- 2.10 Es Responsable de Tiquetes
        SELECT id_permission INTO v_perm_tiquetes FROM auth.permission WHERE code = 'travel_expenses.general.es_responsable_tiquetes';
        IF v_perm_tiquetes IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_responsable_tiquetes',
                'Es Responsable de Tiquetes',
                'Identifica a los responsables de la reserva y emisión de tiquetes aéreos/terrestres',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_tiquetes;
        END IF;

        -- 3. Vincular permisos a roles en auth.role_permissions según roles existentes
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN

            -- 3.1 Enlace de Dependencia
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_enlace
            FROM auth.role r
            WHERE UPPER(r.code) IN ('ENLACE', 'ENLACE_DEPENDENCIA', 'ENLACE_VIATICOS', 'SOLICITANTE', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%enlace%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.2 Secretario de Viáticos
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_secretario
            FROM auth.role r
            WHERE UPPER(r.code) IN ('SECRETARIO', 'SECRETARIO_VIATICOS', 'SECRETARIA_GENERAL', 'SECRETARIO_TECNICO', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%secretari%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.3 Analista de Viáticos
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_analista
            FROM auth.role r
            WHERE UPPER(r.code) IN ('ANALISTA', 'ANALISTA_VIATICOS', 'AUDITOR_VIATICOS', 'SUPER_ADMIN')
               OR (UPPER(r.name) ILIKE '%analista%' AND UPPER(r.name) ILIKE '%viatico%')
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.4 Control de Viáticos / Revisor
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_control
            FROM auth.role r
            WHERE UPPER(r.code) IN ('CONTROL_VIATICOS', 'ROL_CONTROL_VIATICOS', 'REVISOR', 'REVISOR_VIATICOS', 'SEGUNDA_REVISION', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%control%viatico%'
               OR UPPER(r.name) ILIKE '%segunda%revisi%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.5 Subdirección de Gestión Corporativa
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_subdireccion
            FROM auth.role r
            WHERE UPPER(r.code) IN ('SUBDIRECCION_GESTION_CORPORATIVA', 'SUBDIRECCION_CORPORATIVA', 'ORDENADOR_GASTO', 'ORDENADOR_DEL_GASTO', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%subdirecci%gesti%corporativa%'
               OR UPPER(r.name) ILIKE '%ordenador%gasto%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.6 Dirección Nacional
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_direccion
            FROM auth.role r
            WHERE UPPER(r.code) IN ('DIRECCION_NACIONAL', 'DIRECTOR_NACIONAL', 'DIRECCION_GENERAL', 'DIRECTOR_GENERAL', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%direcci%nacional%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.7 Presupuesto
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_presupuesto
            FROM auth.role r
            WHERE UPPER(r.code) IN ('PRESUPUESTO', 'GRUPO_PRESUPUESTO', 'ANALISTA_PRESUPUESTO', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%presupuesto%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.8 Tesorería / Pagador
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_tesoreria
            FROM auth.role r
            WHERE UPPER(r.code) IN ('TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'PAGADOR', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%tesorer%'
               OR UPPER(r.name) ILIKE '%pagador%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.9 Seguridad y Salud en el Trabajo (SST)
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_sst
            FROM auth.role r
            WHERE UPPER(r.code) IN ('SST', 'SEGURIDAD_SALUD_TRABAJO', 'SEGURIDAD_Y_SALUD_EN_EL_TRABAJO', 'GRUPO_SST', 'ANALISTA_SST', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%seguridad%salud%trabajo%'
               OR UPPER(r.name) ILIKE '%sst%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.10 Responsable de Tiquetes
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_perm_tiquetes
            FROM auth.role r
            WHERE UPPER(r.code) IN ('RESPONSABLE_TIQUETES', 'TIQUETES', 'GESTION_TIQUETES', 'SUPER_ADMIN')
               OR UPPER(r.name) ILIKE '%tiquete%'
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

        END IF;

    END IF;

    RAISE NOTICE 'Permisos generales inmutables creados y asociados exitosamente en viáticos.';
END $$;
