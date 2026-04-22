-- ===========================================================================
-- Migración 191: Seed del Comité Institucional (Ley 648 de 2017)
-- ===========================================================================

-- 1. CREAR ROLES GLOBALES EN LA PLATAFORMA
INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'RECTOR', 'Rector(a)', 'Rectoría Institucional', 'Control Interno', 'user-check', '#059669', 'sistema', true, NOW(), NOW()),
  (gen_random_uuid(), 'SECRETARIO_GENERAL', 'Secretario(a) General', 'Secretaría General', 'Control Interno', 'file-text', '#0891B2', 'sistema', true, NOW(), NOW()),
  (gen_random_uuid(), 'SUBDIRECTOR_ACADEMICO', 'Subdirector(a) Académico', 'Subdirección Académica', 'Control Interno', 'book', '#6366F1', 'sistema', true, NOW(), NOW()),
  (gen_random_uuid(), 'SUBDIRECTOR_PROYECCION', 'Subdirector(a) de Proyección Institucional', 'Subdirección de Proyección Institucional', 'Control Interno', 'globe', '#8B5CF6', 'sistema', true, NOW(), NOW()),
  (gen_random_uuid(), 'SUBDIRECTOR_ALTO_GOBIERNO', 'Subdirector(a) Alto Gobierno', 'Subdirección Alto Gobierno', 'Control Interno', 'briefcase', '#D946EF', 'sistema', true, NOW(), NOW()),
  (gen_random_uuid(), 'JEFE_JURIDICA', 'Jefe Oficina Asesora Jurídica', 'Jefatura Oficina Asesora Jurídica', 'Control Interno', 'shield', '#F43F5E', 'sistema', true, NOW(), NOW()),
  (gen_random_uuid(), 'JEFE_PLANEACION', 'Jefe Oficina Asesora de Planeación', 'Jefatura Oficina Asesora de Planeación', 'Control Interno', 'target', '#F97316', 'sistema', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 2. INSERTAR PERSONAS OFICIALES EN auth.personas
INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email)
VALUES 
  ('d0000001-0000-0000-0000-000000000001', '64800001', 'CC', 'Rectoría Institucional ESAP', 'Rectoría', 'ESAP', '', 'M', 'rector@esap.edu.co'),
  ('d0000002-0000-0000-0000-000000000002', '64800002', 'CC', 'Secretaría General ESAP', 'Secretaría', 'ESAP', '', 'F', 'secretario.general@esap.edu.co'),
  ('d0000003-0000-0000-0000-000000000003', '64800003', 'CC', 'Subdirección Académica', 'Subdirección Académica', 'ESAP', '', 'F', 'subdirector.academico@esap.edu.co'),
  ('d0000004-0000-0000-0000-000000000004', '64800004', 'CC', 'Subdirección Proyección', 'Subdirección Proyección', 'ESAP', '', 'M', 'subdirector.proyeccion@esap.edu.co'),
  ('d0000005-0000-0000-0000-000000000005', '64800005', 'CC', 'Subdirección Alto Gobierno', 'Subdirección Alto Gobierno', 'ESAP', '', 'F', 'subdirector.altogobierno@esap.edu.co'),
  ('d0000006-0000-0000-0000-000000000006', '64800006', 'CC', 'Jefatura Jurídica', 'Jefatura Jurídica', 'ESAP', '', 'M', 'jefe.juridica@esap.edu.co'),
  ('d0000007-0000-0000-0000-000000000007', '64800007', 'CC', 'Jefatura Planeación', 'Jefatura Planeación', 'ESAP', '', 'F', 'jefe.planeacion@esap.edu.co')
ON CONFLICT (id_person) DO UPDATE SET
  nom_largo = EXCLUDED.nom_largo,
  dir_email = EXCLUDED.dir_email,
  nom_tercero = EXCLUDED.nom_tercero,
  pri_apellido = EXCLUDED.pri_apellido;

-- 3. INSERTAR EN auth.user CON CONTRASEÑA "Esap2026*"
-- Postgres no permite ON CONFLICT si id_person no es UNIQUE. Usaremos un bloque DO:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'rector@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000001-0000-0000-0000-000000000001', 'rector@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'secretario.general@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000002-0000-0000-0000-000000000002', 'secretario.general@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'subdirector.academico@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000003-0000-0000-0000-000000000003', 'subdirector.academico@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'subdirector.proyeccion@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000004-0000-0000-0000-000000000004', 'subdirector.proyeccion@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'subdirector.altogobierno@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000005-0000-0000-0000-000000000005', 'subdirector.altogobierno@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'jefe.juridica@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000006-0000-0000-0000-000000000006', 'jefe.juridica@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth."user" WHERE username = 'jefe.planeacion@esap.edu.co') THEN
    INSERT INTO auth."user" (id_user, id_person, username, password_hash, is_active)
    VALUES (gen_random_uuid(), 'd0000007-0000-0000-0000-000000000007', 'jefe.planeacion@esap.edu.co', '$2b$10$hNfxyvu9AiB8I95jfyGSae85fpjFgv8msPkS.Gr0nkV9C/cZUnrva', true);
  END IF;
END $$;

-- Si id_user era clave primaria, el ON CONFLICT ON CONSTRAINT no funciona igual, usamos DO NOTHING con una verificación
-- Postgres 15+ admite NULL en ON CONFLICT si manejamos id_user. Ignoraremos conflicto asumiendo un escenario limpio o:
-- (Se usó gen_random_uuid() así que los conflictos solo ocurren mediante lógica manual, usar un bloque DO es más seguro para evitar duplicates):
DO $$
DECLARE
    r1 UUID; r2 UUID; r3 UUID; r4 UUID; r5 UUID; r6 UUID; r7 UUID;
    u1 UUID; u2 UUID; u3 UUID; u4 UUID; u5 UUID; u6 UUID; u7 UUID;
BEGIN
    SELECT id INTO r1 FROM auth.role WHERE code = 'RECTOR';
    SELECT id INTO r2 FROM auth.role WHERE code = 'SECRETARIO_GENERAL';
    SELECT id INTO r3 FROM auth.role WHERE code = 'SUBDIRECTOR_ACADEMICO';
    SELECT id INTO r4 FROM auth.role WHERE code = 'SUBDIRECTOR_PROYECCION';
    SELECT id INTO r5 FROM auth.role WHERE code = 'SUBDIRECTOR_ALTO_GOBIERNO';
    SELECT id INTO r6 FROM auth.role WHERE code = 'JEFE_JURIDICA';
    SELECT id INTO r7 FROM auth.role WHERE code = 'JEFE_PLANEACION';

    SELECT id_user INTO u1 FROM auth."user" WHERE id_person = 'd0000001-0000-0000-0000-000000000001';
    SELECT id_user INTO u2 FROM auth."user" WHERE id_person = 'd0000002-0000-0000-0000-000000000002';
    SELECT id_user INTO u3 FROM auth."user" WHERE id_person = 'd0000003-0000-0000-0000-000000000003';
    SELECT id_user INTO u4 FROM auth."user" WHERE id_person = 'd0000004-0000-0000-0000-000000000004';
    SELECT id_user INTO u5 FROM auth."user" WHERE id_person = 'd0000005-0000-0000-0000-000000000005';
    SELECT id_user INTO u6 FROM auth."user" WHERE id_person = 'd0000006-0000-0000-0000-000000000006';
    SELECT id_user INTO u7 FROM auth."user" WHERE id_person = 'd0000007-0000-0000-0000-000000000007';

    -- ENLAZAR ROLES:
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u1 AND id_rol = r1) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u1, r1); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u2 AND id_rol = r2) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u2, r2); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u3 AND id_rol = r3) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u3, r3); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u4 AND id_rol = r4) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u4, r4); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u5 AND id_rol = r5) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u5, r5); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u6 AND id_rol = r6) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u6, r6); END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = u7 AND id_rol = r7) THEN INSERT INTO auth.user_roles (id_user, id_rol) VALUES (u7, r7); END IF;
END $$;


-- 4. INSERTAR EN control_interno.configuracion_profesionales_ocig
-- Esto garantiza que aparezcan inmediatamente en el Wizard del Plan Anual
INSERT INTO control_interno.configuracion_profesionales_ocig 
  (id, id_tercero, rol_ocig, especialidades, capacidad_maxima_auditorias, horas_mensuales_disponibles, puede_ser_lider, activo)
VALUES 
  (GEN_RANDOM_UUID(), 'd0000001-0000-0000-0000-000000000001', 'Rector(a)', '{"Comité Institucional"}', 10, 160, false, true),
  (GEN_RANDOM_UUID(), 'd0000002-0000-0000-0000-000000000002', 'Secretario(a) General', '{"Comité Institucional"}', 10, 160, false, true),
  (GEN_RANDOM_UUID(), 'd0000003-0000-0000-0000-000000000003', 'Subdirector(a) Académico', '{"Comité Institucional"}', 10, 160, false, true),
  (GEN_RANDOM_UUID(), 'd0000004-0000-0000-0000-000000000004', 'Subdirector(a) de Proyección Institucional', '{"Comité Institucional"}', 10, 160, false, true),
  (GEN_RANDOM_UUID(), 'd0000005-0000-0000-0000-000000000005', 'Subdirector(a) Alto Gobierno', '{"Comité Institucional"}', 10, 160, false, true),
  (GEN_RANDOM_UUID(), 'd0000006-0000-0000-0000-000000000006', 'Jefe Oficina Asesora Jurídica', '{"Comité Institucional"}', 10, 160, false, true),
  (GEN_RANDOM_UUID(), 'd0000007-0000-0000-0000-000000000007', 'Jefe Oficina Asesora de Planeación', '{"Comité Institucional"}', 10, 160, false, true)
ON CONFLICT (id_tercero) DO UPDATE SET
  rol_ocig = EXCLUDED.rol_ocig;

