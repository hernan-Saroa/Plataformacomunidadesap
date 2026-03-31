-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT: Insertar Profesionales OCIG (Control Interno)
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script crea usuarios de prueba con roles de Control Interno
-- para que aparezcan en el módulo de Configuración de Profesionales OCIG
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Primero verificamos que existan los roles de Control Interno
DO $$
DECLARE
    v_rol_jefe_oci UUID;
    v_rol_auditor_lider UUID;
    v_rol_control_interno UUID;
    v_rol_profesional_auditor UUID;
    v_rol_auxiliar_auditoria UUID;
    v_rol_jefe_control_interno UUID;
BEGIN
    -- Obtener IDs de roles existentes
    SELECT id INTO v_rol_jefe_oci FROM auth.role WHERE code = 'JEFE_OCI';
    SELECT id INTO v_rol_auditor_lider FROM auth.role WHERE code = 'AUDITOR_LIDER';
    SELECT id INTO v_rol_control_interno FROM auth.role WHERE code = 'CONTROL_INTERNO';
    SELECT id INTO v_rol_profesional_auditor FROM auth.role WHERE code = 'PROFESIONAL_AUDITOR';
    SELECT id INTO v_rol_auxiliar_auditoria FROM auth.role WHERE code = 'AUXILIAR_AUDITORIA';
    SELECT id INTO v_rol_jefe_control_interno FROM auth.role WHERE code = 'JEFE_CONTROL_INTERNO';
    
    -- Mostrar roles encontrados
    RAISE NOTICE 'Roles encontrados:';
    RAISE NOTICE '  JEFE_OCI: %', v_rol_jefe_oci;
    RAISE NOTICE '  AUDITOR_LIDER: %', v_rol_auditor_lider;
    RAISE NOTICE '  CONTROL_INTERNO: %', v_rol_control_interno;
    RAISE NOTICE '  PROFESIONAL_AUDITOR: %', v_rol_profesional_auditor;
    RAISE NOTICE '  AUXILIAR_AUDITORIA: %', v_rol_auxiliar_auditoria;
    RAISE NOTICE '  JEFE_CONTROL_INTERNO: %', v_rol_jefe_control_interno;
END $$;

-- 2. Crear roles de Control Interno si no existen
INSERT INTO auth.role (id, code, name, description, icon, color, type, is_active, requires_2fa, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'JEFE_OCI', 'Jefe OCI', 'Jefe de la Oficina de Control Interno', 'shield', '#1E40AF', 'INTERNO', true, false, NOW(), NOW()),
    (gen_random_uuid(), 'AUDITOR_LIDER', 'Auditor Líder', 'Auditor líder de auditorías', 'user-check', '#059669', 'INTERNO', true, false, NOW(), NOW()),
    (gen_random_uuid(), 'CONTROL_INTERNO', 'Control Interno', 'Funcionario de Control Interno', 'clipboard-check', '#7C3AED', 'INTERNO', true, false, NOW(), NOW()),
    (gen_random_uuid(), 'PROFESIONAL_AUDITOR', 'Profesional Auditor', 'Profesional especializado en auditoría', 'briefcase', '#0891B2', 'INTERNO', true, false, NOW(), NOW()),
    (gen_random_uuid(), 'AUXILIAR_AUDITORIA', 'Auxiliar Auditoría', 'Auxiliar de apoyo en auditorías', 'file-text', '#6366F1', 'INTERNO', true, false, NOW(), NOW()),
    (gen_random_uuid(), 'JEFE_CONTROL_INTERNO', 'Jefe Control Interno', 'Jefe de Control Interno de Gestión', 'shield-check', '#DC2626', 'INTERNO', true, false, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 3. Insertar personas de prueba para Control Interno
INSERT INTO auth.personas (
    id_tercero, tip_identificacion, num_identificacion, 
    nom_tercero, pri_apellido, seg_apellido, nom_largo,
    dir_email, created_at, updated_at
)
VALUES 
    -- Jefe OCIG
    (900001, 'CC', '79123456', 'MARIO OSWALDO', 'BERNAL', 'RODRIGUEZ', 'MARIO OSWALDO BERNAL RODRIGUEZ', 'mario.bernal@esap.edu.co', NOW(), NOW()),
    -- Auditor Senior
    (900002, 'CC', '52987654', 'ANA MARIA', 'LOPEZ', 'GOMEZ', 'ANA MARIA LOPEZ GOMEZ', 'ana.lopez@esap.edu.co', NOW(), NOW()),
    -- Auditor
    (900003, 'CC', '80456789', 'CARLOS ANDRES', 'MENDOZA', 'SILVA', 'CARLOS ANDRES MENDOZA SILVA', 'carlos.mendoza@esap.edu.co', NOW(), NOW()),
    -- Auditor
    (900004, 'CC', '53654321', 'LAURA PATRICIA', 'RODRIGUEZ', 'PEREZ', 'LAURA PATRICIA RODRIGUEZ PEREZ', 'laura.rodriguez@esap.edu.co', NOW(), NOW()),
    -- Auditor Junior
    (900005, 'CC', '1020304050', 'JUAN PABLO', 'GARCIA', 'MARTINEZ', 'JUAN PABLO GARCIA MARTINEZ', 'juan.garcia@esap.edu.co', NOW(), NOW())
ON CONFLICT (id_tercero) DO UPDATE SET
    nom_largo = EXCLUDED.nom_largo,
    dir_email = EXCLUDED.dir_email,
    updated_at = NOW();

-- 4. Crear usuarios para las personas
INSERT INTO auth."user" (
    id_user, username, password_hash, is_active, id_tercero, created_at, updated_at
)
VALUES 
    (gen_random_uuid(), 'mario.bernal', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', true, 900001, NOW(), NOW()),
    (gen_random_uuid(), 'ana.lopez', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', true, 900002, NOW(), NOW()),
    (gen_random_uuid(), 'carlos.mendoza', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', true, 900003, NOW(), NOW()),
    (gen_random_uuid(), 'laura.rodriguez', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', true, 900004, NOW(), NOW()),
    (gen_random_uuid(), 'juan.garcia', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', true, 900005, NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- 5. Asignar roles de Control Interno a los usuarios
DO $$
DECLARE
    v_user_mario UUID;
    v_user_ana UUID;
    v_user_carlos UUID;
    v_user_laura UUID;
    v_user_juan UUID;
    v_rol_jefe_oci UUID;
    v_rol_auditor_lider UUID;
    v_rol_control_interno UUID;
    v_rol_profesional_auditor UUID;
    v_rol_auxiliar_auditoria UUID;
BEGIN
    -- Obtener IDs de usuarios
    SELECT id_user INTO v_user_mario FROM auth."user" WHERE username = 'mario.bernal';
    SELECT id_user INTO v_user_ana FROM auth."user" WHERE username = 'ana.lopez';
    SELECT id_user INTO v_user_carlos FROM auth."user" WHERE username = 'carlos.mendoza';
    SELECT id_user INTO v_user_laura FROM auth."user" WHERE username = 'laura.rodriguez';
    SELECT id_user INTO v_user_juan FROM auth."user" WHERE username = 'juan.garcia';
    
    -- Obtener IDs de roles
    SELECT id INTO v_rol_jefe_oci FROM auth.role WHERE code = 'JEFE_OCI';
    SELECT id INTO v_rol_auditor_lider FROM auth.role WHERE code = 'AUDITOR_LIDER';
    SELECT id INTO v_rol_control_interno FROM auth.role WHERE code = 'CONTROL_INTERNO';
    SELECT id INTO v_rol_profesional_auditor FROM auth.role WHERE code = 'PROFESIONAL_AUDITOR';
    SELECT id INTO v_rol_auxiliar_auditoria FROM auth.role WHERE code = 'AUXILIAR_AUDITORIA';
    
    -- Si no existe JEFE_OCI, usar JEFE_CONTROL_INTERNO
    IF v_rol_jefe_oci IS NULL THEN
        SELECT id INTO v_rol_jefe_oci FROM auth.role WHERE code = 'JEFE_CONTROL_INTERNO';
    END IF;
    
    -- Asignar roles (si los usuarios y roles existen)
    IF v_user_mario IS NOT NULL AND v_rol_jefe_oci IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_mario, v_rol_jefe_oci, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol JEFE_OCI asignado a mario.bernal';
    END IF;
    
    IF v_user_ana IS NOT NULL AND v_rol_auditor_lider IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_ana, v_rol_auditor_lider, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol AUDITOR_LIDER asignado a ana.lopez';
    END IF;
    
    IF v_user_carlos IS NOT NULL AND v_rol_control_interno IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_carlos, v_rol_control_interno, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol CONTROL_INTERNO asignado a carlos.mendoza';
    ELSIF v_user_carlos IS NOT NULL AND v_rol_auditor_lider IS NOT NULL THEN
        -- Fallback: usar AUDITOR_LIDER si CONTROL_INTERNO no existe
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_carlos, v_rol_auditor_lider, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol AUDITOR_LIDER asignado a carlos.mendoza (fallback)';
    END IF;
    
    IF v_user_laura IS NOT NULL AND v_rol_profesional_auditor IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_laura, v_rol_profesional_auditor, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol PROFESIONAL_AUDITOR asignado a laura.rodriguez';
    ELSIF v_user_laura IS NOT NULL AND v_rol_control_interno IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_laura, v_rol_control_interno, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol CONTROL_INTERNO asignado a laura.rodriguez (fallback)';
    END IF;
    
    IF v_user_juan IS NOT NULL AND v_rol_auxiliar_auditoria IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_juan, v_rol_auxiliar_auditoria, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol AUXILIAR_AUDITORIA asignado a juan.garcia';
    ELSIF v_user_juan IS NOT NULL AND v_rol_control_interno IS NOT NULL THEN
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES (v_user_juan, v_rol_control_interno, true, NOW(), NOW())
        ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true, updated_at = NOW();
        RAISE NOTICE 'Rol CONTROL_INTERNO asignado a juan.garcia (fallback)';
    END IF;
    
    RAISE NOTICE 'Asignación de roles completada';
END $$;

-- 6. Verificar la creación
SELECT 
    p.id_tercero,
    p.nom_largo,
    p.dir_email,
    u.username,
    r.code as rol_code,
    r.name as rol_name
FROM auth.personas p
INNER JOIN auth."user" u ON u.id_tercero = p.id_tercero
INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
INNER JOIN auth.role r ON r.id = ur.id_rol
WHERE r.code IN ('JEFE_OCI', 'JEFE_CONTROL_INTERNO', 'AUDITOR_LIDER', 'CONTROL_INTERNO', 'PROFESIONAL_AUDITOR', 'AUXILIAR_AUDITORIA')
  AND ur.is_active = true
ORDER BY p.nom_largo;

-- ═══════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
-- 5 usuarios con roles de Control Interno que aparecerán en:
-- 1. Configuración Profesionales OCIG
-- 2. Modal de Asignar Auditor en Plan Anual
-- ═══════════════════════════════════════════════════════════════════════════
