-- Script SQL para seedear los 2 usuarios obligatorios por rol en OCI
-- Corrección: id_person en lugar de id_tercero para auth.personas

-- 1. Insertar en auth.personas las 10 personas requeridas
INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email)
VALUES 
  -- 2 Jefes OCI
  ('a0000000-0000-0000-0000-000000000000', '52345200', 'CC', 'Mario Oswaldo Bernal Cárdenas', 'Mario Oswaldo', 'Bernal', 'Cárdenas', 'M', 'jefe.oci1@esap.edu.co'),
  ('a0000001-0000-0000-0000-000000000001', '52345201', 'CC', 'Ana María Torres Ruiz', 'Ana María', 'Torres', 'Ruiz', 'F', 'jefe.oci2@esap.edu.co'),
  
  -- 2 Auditores Sénior
  ('a0000002-0000-0000-0000-000000000002', '52345202', 'CC', 'Carlos Andrés Ramírez López', 'Carlos Andrés', 'Ramírez', 'López', 'M', 'auditor.senior1@esap.edu.co'),
  ('a0000003-0000-0000-0000-000000000003', '52345203', 'CC', 'Lucía Fernanda Gómez', 'Lucía Fernanda', 'Gómez', '', 'F', 'auditor.senior2@esap.edu.co'),

  -- 2 Auditores
  ('a0000004-0000-0000-0000-000000000004', '52345204', 'CC', 'Pedro Pablo Medina', 'Pedro Pablo', 'Medina', '', 'M', 'auditor1@esap.edu.co'),
  ('a0000005-0000-0000-0000-000000000005', '52345205', 'CC', 'Sofía Alejandra Castro', 'Sofía Alejandra', 'Castro', '', 'F', 'auditor2@esap.edu.co'),

  -- 2 Auditores Júnior
  ('a0000006-0000-0000-0000-000000000006', '52345206', 'CC', 'Diego Fernando Herrera', 'Diego Fernando', 'Herrera', '', 'M', 'auditor.jr1@esap.edu.co'),
  ('a0000007-0000-0000-0000-000000000007', '52345207', 'CC', 'Camila Andrea Vega', 'Camila Andrea', 'Vega', '', 'F', 'auditor.jr2@esap.edu.co'),

  -- 2 Apoyos Técnicos
  ('a0000008-0000-0000-0000-000000000008', '52345208', 'CC', 'Juan Carlos Mora', 'Juan Carlos', 'Mora', '', 'M', 'apoyo.tecnico1@esap.edu.co'),
  ('a0000009-0000-0000-0000-000000000009', '52345209', 'CC', 'Valentina Silva', 'Valentina', 'Silva', '', 'F', 'apoyo.tecnico2@esap.edu.co')
ON CONFLICT (id_person) DO UPDATE SET
  nom_largo = EXCLUDED.nom_largo,
  dir_email = EXCLUDED.dir_email;


-- 2. Insertar en schema de control_interno (configuracion_profesionales_ocig)
DELETE FROM control_interno.configuracion_profesionales_ocig 
WHERE id_tercero IN (
  'a0000000-0000-0000-0000-000000000000',
  'a0000001-0000-0000-0000-000000000001',
  'a0000002-0000-0000-0000-000000000002',
  'a0000003-0000-0000-0000-000000000003',
  'a0000004-0000-0000-0000-000000000004',
  'a0000005-0000-0000-0000-000000000005',
  'a0000006-0000-0000-0000-000000000006',
  'a0000007-0000-0000-0000-000000000007',
  'a0000008-0000-0000-0000-000000000008',
  'a0000009-0000-0000-0000-000000000009'
);

INSERT INTO control_interno.configuracion_profesionales_ocig 
  (id, id_tercero, rol_ocig, especialidades, capacidad_maxima_auditorias, horas_mensuales_disponibles, puede_ser_lider, activo)
VALUES 
  (GEN_RANDOM_UUID(), 'a0000000-0000-0000-0000-000000000000', 'Jefe OCI', '{"Liderazgo Institucional"}', 10, 160, true, true),
  (GEN_RANDOM_UUID(), 'a0000001-0000-0000-0000-000000000001', 'Jefe OCI', '{"Coordinación Estratégica"}', 10, 160, true, true),
  
  (GEN_RANDOM_UUID(), 'a0000002-0000-0000-0000-000000000002', 'Auditor Sénior', '{"Financiero", "Legal"}', 4, 150, true, true),
  (GEN_RANDOM_UUID(), 'a0000003-0000-0000-0000-000000000003', 'Auditor Sénior', '{"Contratación", "Proyectos"}', 4, 150, true, true),

  (GEN_RANDOM_UUID(), 'a0000004-0000-0000-0000-000000000004', 'Auditor', '{"Talento Humano", "Control"}', 3, 140, true, true),
  (GEN_RANDOM_UUID(), 'a0000005-0000-0000-0000-000000000005', 'Auditor', '{"Calidad", "Sistemas"}', 3, 140, true, true),

  (GEN_RANDOM_UUID(), 'a0000006-0000-0000-0000-000000000006', 'Auditor Júnior', '{"Apoyo Operativo"}', 2, 120, false, true),
  (GEN_RANDOM_UUID(), 'a0000007-0000-0000-0000-000000000007', 'Auditor Júnior', '{"Revisión de Evidencias"}', 2, 120, false, true),

  (GEN_RANDOM_UUID(), 'a0000008-0000-0000-0000-000000000008', 'Apoyo Técnico', '{"Soporte Sistemas"}', 5, 160, false, true),
  (GEN_RANDOM_UUID(), 'a0000009-0000-0000-0000-000000000009', 'Apoyo Técnico', '{"Soporte Administrativo"}', 5, 160, false, true);
