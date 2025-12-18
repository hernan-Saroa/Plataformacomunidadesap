-- Datos iniciales para auth-service
-- Ejecutar después de crear el schema

-- TRUNCATE TABLE "auth"."PERSONAS", "auth"."PERMISSION", "auth"."ROLE", "auth"."USER", "auth"."ROLE_PERMISSIONS", "auth"."USER_ROLES" RESTART IDENTITY CASCADE;

-- Insertar personas de prueba
INSERT INTO "auth"."PERSONAS" ("ID_TERCERO", "NUM_IDENTIFICACION", "TIP_IDENTIFICACION", "NOM_LARGO", "NOM_TERCERO", "PRI_APELLIDO", "GEN_TERCERO", "DIR_EMAIL") VALUES
(1, '123456789', 'CC', 'Admin Sistema', 'Admin', 'Sistema', 'M', 'admin@esap.edu.co'),
(2, '123456790', 'CC', 'Estudiante Prueba', 'Estudiante', 'Prueba', 'M', 'estudiante@esap.edu.co'),
(3, '123456791', 'CC', 'Docente Planta', 'Docente', 'Planta', 'F', 'planta@esap.edu.co'),
(4, '123456792', 'CC', 'Docente Cátedra', 'Docente', 'Cátedra', 'M', 'catedra@esap.edu.co'),
(5, '123456793', 'CC', 'Gestor Certificados', 'Gestor', 'Certificados', 'F', 'cerlaboral@esap.edu.co')
ON CONFLICT ("ID_TERCERO") DO NOTHING;

-- Insertar permisos
INSERT INTO "auth"."PERMISSION" ("ID_PERMISSION", "NAME", "DESCRIPTION") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'users.create', 'Crear usuarios'),
('550e8400-e29b-41d4-a716-446655440002', 'users.read', 'Ver usuarios'),
('550e8400-e29b-41d4-a716-446655440003', 'users.update', 'Actualizar usuarios'),
('550e8400-e29b-41d4-a716-446655440004', 'users.delete', 'Eliminar usuarios'),
('550e8400-e29b-41d4-a716-446655440005', 'roles.manage', 'Gestionar roles'),
('550e8400-e29b-41d4-a716-446655440006', 'permissions.manage', 'Gestionar permisos')
ON CONFLICT ("NAME") DO NOTHING;

-- Insertar roles
INSERT INTO "auth"."ROLE" ("ID_ROL", "NAME", "DESCRIPTION") VALUES
('660e8400-e29b-41d4-a716-446655440001', 'ADMIN', 'Administrador del sistema'),
('660e8400-e29b-41d4-a716-446655440002', 'USER', 'Usuario regular')
ON CONFLICT ("NAME") DO NOTHING;

-- Insertar usuarios de prueba (password: 123456)
-- Hash generado con bcrypt (salt rounds: 10)
INSERT INTO "auth"."USER" ("ID_USER", "USERNAME", "PASSWORD", "ID_TERCERO") VALUES
('770e8400-e29b-41d4-a716-446655440001', 'admin@esap.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('770e8400-e29b-41d4-a716-446655440002', 'estudiante@esap.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2),
('770e8400-e29b-41d4-a716-446655440003', 'planta@esap.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3),
('770e8400-e29b-41d4-a716-446655440004', 'catedra@esap.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4),
('770e8400-e29b-41d4-a716-446655440005', 'cerlaboral@esap.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 5);

-- Asignar permisos al rol ADMIN
INSERT INTO "auth"."ROLE_PERMISSIONS" ("ID_ROL", "ID_PERMISSION")
SELECT r."ID_ROL", p."ID_PERMISSION"
FROM "auth"."ROLE" r
CROSS JOIN "auth"."PERMISSION" p
WHERE r."NAME" = 'ADMIN'
ON CONFLICT ("ID_ROL", "ID_PERMISSION") DO NOTHING;

-- Asignar roles a los usuarios
INSERT INTO "auth"."USER_ROLES" ("ID_USER", "ID_ROL")
SELECT u."ID_USER", r."ID_ROL"
FROM "auth"."USER" u
CROSS JOIN "auth"."ROLE" r
WHERE (u."USERNAME" = 'admin' AND r."NAME" = 'ADMIN')
   OR (u."USERNAME" IN ('estudiante', 'planta', 'catedra', 'cerlaboral') AND r."NAME" = 'USER')
ON CONFLICT ("ID_USER", "ID_ROL") DO NOTHING;