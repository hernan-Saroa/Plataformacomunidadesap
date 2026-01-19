-- ============================================
-- MIGRACIÓN: Crear usuarios de Control Interno
-- ============================================
-- Este script crea dos usuarios para Control Interno de Gestión (OCIG):
-- 1. Jefe de Control Interno (ocig@esap.edu.co) - Rol: JEFE_CONTROL_INTERNO
-- 2. Auditor Líder (auditor.lider@esap.edu.co) - Rol: AUDITOR_LIDER
-- Contraseña para ambos: Esap2026*
-- ============================================

-- Insertar personas
INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
VALUES
  (24, '123456796', 'CC', 'OCIG Control Interno', 'OCIG', 'Control Interno', 'M', 'ocig@esap.edu.co'),
  (25, '123456797', 'CC', 'Auditor Líder', 'Auditor', 'Líder', 'M', 'auditor.lider@esap.edu.co')
ON CONFLICT (id_tercero) DO NOTHING;

-- Insertar usuarios con contraseña Esap2026*
-- Hash bcrypt generado para 'Esap2026*'
INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
VALUES
  ('770e8400-e29b-41d4-a716-446655440009', 'ocig@esap.edu.co', '$2b$10$0hAnE/dXPJvVpIFJ48W0yOHy/s1EdCEb1IT/AScUsKmVuYY7BFfJS', 24),
  ('770e8400-e29b-41d4-a716-446655440010', 'auditor.lider@esap.edu.co', '$2b$10$0hAnE/dXPJvVpIFJ48W0yOHy/s1EdCEb1IT/AScUsKmVuYY7BFfJS', 25)
ON CONFLICT (id_user) DO NOTHING;

-- Asignar rol JEFE_CONTROL_INTERNO al usuario OCIG
INSERT INTO auth.user_roles (id_user, id_rol)
SELECT u.id_user, r.id
FROM auth."user" u
JOIN auth.role r ON r.code = 'JEFE_CONTROL_INTERNO'
WHERE u.username = 'ocig@esap.edu.co'
ON CONFLICT (id_user, id_rol) DO NOTHING;

-- Asignar rol AUDITOR_LIDER al usuario auditor.lider
INSERT INTO auth.user_roles (id_user, id_rol)
SELECT u.id_user, r.id
FROM auth."user" u
JOIN auth.role r ON r.code = 'AUDITOR_LIDER'
WHERE u.username = 'auditor.lider@esap.edu.co'
ON CONFLICT (id_user, id_rol) DO NOTHING;

-- Verificar que los usuarios fueron creados correctamente
SELECT 
  u.id_user,
  u.username,
  p.nom_largo,
  r.code as rol_code,
  r.name as rol_name
FROM auth."user" u
LEFT JOIN auth.personas p ON u.id_tercero = p.id_tercero
LEFT JOIN auth.user_roles ur ON u.id_user = ur.id_user
LEFT JOIN auth.role r ON ur.id_rol = r.id
WHERE u.username IN ('ocig@esap.edu.co', 'auditor.lider@esap.edu.co')
ORDER BY u.username;
