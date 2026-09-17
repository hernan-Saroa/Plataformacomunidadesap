-- ============================================================================
-- Migration: Seed auth.module for Gestión de Infraestructura
-- Description: Registrar y activar el módulo de Gestión de Infraestructura en auth.module y auth.permission para visualización en el Sidebar
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_admin_role_id UUID;
    v_perm_view UUID := gen_random_uuid();
    v_perm_create UUID := gen_random_uuid();
    v_perm_edit UUID := gen_random_uuid();
    v_perm_delete UUID := gen_random_uuid();
    v_perm_mantenimiento UUID := gen_random_uuid();
BEGIN
    -- 1. Insertar o actualizar módulo en auth.module
    IF NOT EXISTS (SELECT 1 FROM auth.module WHERE code = 'gestion-infraestructura') THEN
        v_module_id := gen_random_uuid();
        INSERT INTO auth.module (
            id_module,
            code,
            name,
            description,
            icon,
            color,
            display_order,
            category,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_module_id,
            'gestion-infraestructura',
            'Gestión de Infraestructura',
            'Administración de sedes, espacios físicos, mantenimiento e infraestructura institucional ESAP',
            'Building',
            '#003DA5',
            24,
            'backoffice',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Módulo gestion-infraestructura registrado exitosamente en auth.module';
    ELSE
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-infraestructura';
        UPDATE auth.module 
        SET is_active = true,
            name = 'Gestión de Infraestructura',
            description = 'Administración de sedes, espacios físicos, mantenimiento e infraestructura institucional ESAP',
            icon = 'Building',
            updated_at = NOW()
        WHERE id_module = v_module_id;
        RAISE NOTICE 'Módulo gestion-infraestructura actualizado a is_active = true';
    END IF;

    -- 2. Insertar permisos en auth.permission si no existen
    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.view') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (v_perm_view, 'infraestructura.view', 'Ver Infraestructura', 'Permiso para visualizar sedes, espacios y mantenimientos', v_module_id, true, NOW(), NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.create') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (v_perm_create, 'infraestructura.create', 'Crear Infraestructura', 'Permiso para crear sedes y espacios físicos', v_module_id, true, NOW(), NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.edit') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (v_perm_edit, 'infraestructura.edit', 'Editar Infraestructura', 'Permiso para actualizar sedes, espacios físicos y sus estados', v_module_id, true, NOW(), NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.delete') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (v_perm_delete, 'infraestructura.delete', 'Eliminar Infraestructura', 'Permiso para eliminar o desactivar sedes y espacios', v_module_id, true, NOW(), NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.mantenimiento') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (v_perm_mantenimiento, 'infraestructura.mantenimiento', 'Gestionar Mantenimientos', 'Permiso para crear y actualizar solicitudes de mantenimiento', v_module_id, true, NOW(), NOW());
    END IF;

    -- 3. Asignar todos los permisos al rol Administrador del Sistema si existe
    FOR v_admin_role_id IN (
        SELECT id FROM auth.role 
        WHERE code IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRADOR', 'DIRECTOR_INFRAESTRUCTURA', 'ADMIN_SISTEMA') 
           OR name ILIKE '%admin%'
    ) LOOP
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT v_admin_role_id, p.id_permission
        FROM auth.permission p
        WHERE p.code LIKE 'infraestructura.%'
        ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Permisos de infraestructura sembrados y asignados exitosamente';
END $$;
