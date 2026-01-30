-- =====================================================
-- DATOS DE PRUEBA - SISTEMA DE CERTIFICADOS DE GRADUADOS
-- Esquema: academic_registration
-- =====================================================

-- ============================================
-- 1. FIRMANTE PRINCIPAL
-- ============================================
INSERT INTO academic_registration.signers (
  id,
  full_name,
  position,
  department,
  email,
  is_active,
  is_primary,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'DIRECTOR DE REGISTRO ACADÉMICO',
  'Director(a) de Registro Académico',
  'Registro Académico',
  'registro.academico@esap.edu.co',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. GRADUADOS DE PRUEBA
-- ============================================

-- Graduado 1: Pregrado - Administración Pública
INSERT INTO academic_registration.graduates (
  id,
  person_id,
  full_name,
  id_number,
  id_issue_date,
  email,
  phone,
  program_id,
  program_name,
  program_type,
  enrollment_date,
  graduation_date,
  ceremony_date,
  degree_title,
  diploma_number,
  acta_number,
  resolution_number,
  status,
  is_verified,
  campus,
  created_at,
  updated_at,
  created_by
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444', -- FK a auth.persons (puedes usar un ID existente)
  'MARÍA FERNANDA RODRÍGUEZ GÓMEZ',
  '1012345678',
  '2010-05-15', -- Fecha de expedición de la cédula
  'maria.rodriguez@example.com',
  '3101234567',
  '11111111-1111-1111-1111-111111111111', -- FK a auth.programas_academicos
  'Administración Pública Territorial',
  'Pregrado',
  '2020-01-15',
  '2024-06-15',
  '2024-07-20',
  'Administrador(a) Público(a) Territorial',
  'DIPL-2024-001234',
  'ACTA-2024-06-001',
  'RES-2024-123',
  'ACTIVE',
  true,
  'Sede Principal Bogotá',
  NOW(),
  NOW(),
  'SYSTEM'
)
ON CONFLICT (id) DO NOTHING;

-- Graduado 2: Especialización - Gestión Pública
INSERT INTO academic_registration.graduates (
  id,
  person_id,
  full_name,
  id_number,
  id_issue_date,
  email,
  phone,
  program_id,
  program_name,
  program_type,
  enrollment_date,
  graduation_date,
  ceremony_date,
  degree_title,
  diploma_number,
  acta_number,
  resolution_number,
  status,
  is_verified,
  campus,
  created_at,
  updated_at,
  created_by
) VALUES (
  '34343434-3434-3434-3434-343434343434',
  '45454545-4545-4545-4545-454545454545',
  'CARLOS ALBERTO RAMÍREZ PÉREZ',
  '79123456',
  '1995-08-22', -- Fecha de expedición de la cédula
  'carlos.ramirez@example.com',
  '3201234568',
  '12121212-1212-1212-1212-121212121212',
  'Especialización en Gestión Pública',
  'Especialización',
  '2022-07-01',
  '2023-12-10',
  '2024-01-25',
  'Especialista en Gestión Pública',
  'DIPL-2023-005678',
  'ACTA-2023-12-015',
  'RES-2023-456',
  'ACTIVE',
  true,
  'Sede Territorial Antioquia',
  NOW(),
  NOW(),
  'SYSTEM'
)
ON CONFLICT (id) DO NOTHING;

-- Graduado 3: Maestría - Alta Dirección del Estado
INSERT INTO academic_registration.graduates (
  id,
  person_id,
  full_name,
  id_number,
  id_issue_date,
  email,
  phone,
  program_id,
  program_name,
  program_type,
  enrollment_date,
  graduation_date,
  ceremony_date,
  degree_title,
  diploma_number,
  acta_number,
  resolution_number,
  status,
  is_verified,
  campus,
  created_at,
  updated_at,
  created_by
) VALUES (
  '35353535-3535-3535-3535-353535353535',
  '46464646-4646-4646-4646-464646464646',
  'DIANA PATRICIA TORRES LÓPEZ',
  '52987654',
  '1998-03-10', -- Fecha de expedición de la cédula
  'diana.torres@example.com',
  '3151234569',
  '13131313-1313-1313-1313-131313131313',
  'Maestría en Alta Dirección del Estado',
  'Maestría',
  '2021-01-10',
  '2023-06-20',
  '2023-08-15',
  'Magíster en Alta Dirección del Estado',
  'DIPL-2023-009876',
  'ACTA-2023-06-025',
  'RES-2023-789',
  'ACTIVE',
  true,
  'Sede Principal Bogotá',
  NOW(),
  NOW(),
  'SYSTEM'
)
ON CONFLICT (id) DO NOTHING;

-- Graduado 4: Pregrado - Caso para solicitud de empresa
INSERT INTO academic_registration.graduates (
  id,
  person_id,
  full_name,
  id_number,
  id_issue_date,
  email,
  phone,
  program_id,
  program_name,
  program_type,
  enrollment_date,
  graduation_date,
  ceremony_date,
  degree_title,
  diploma_number,
  acta_number,
  resolution_number,
  status,
  is_verified,
  campus,
  created_at,
  updated_at,
  created_by
) VALUES (
  '36363636-3636-3636-3636-363636363636',
  '47474747-4747-4747-4747-474747474747',
  'JORGE LUIS MARTÍNEZ SÁNCHEZ',
  '1023456789',
  '2008-11-18', -- Fecha de expedición de la cédula
  'jorge.martinez@example.com',
  '3181234570',
  '11111111-1111-1111-1111-111111111111',
  'Administración Pública Territorial',
  'Pregrado',
  '2019-08-01',
  '2023-11-30',
  '2023-12-15',
  'Administrador(a) Público(a) Territorial',
  'DIPL-2023-011234',
  'ACTA-2023-11-030',
  'RES-2023-890',
  'ACTIVE',
  true,
  'Sede Territorial Valle',
  NOW(),
  NOW(),
  'SYSTEM'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. SOLICITUDES DE CERTIFICADOS
-- ============================================

-- Solicitud 1: Graduado solicita certificado (COMPLETADA)
INSERT INTO academic_registration.graduation_certificate_requests (
  id,
  request_number,
  requester_type,
  graduate_id,
  id_number,
  full_name,
  program_name,
  graduation_date,
  requester_name,
  requester_email,
  requester_phone,
  certificate_type,
  validation_code,
  validation_expires_at,
  is_validated,
  status,
  request_date,
  validation_date,
  completion_date,
  created_at,
  updated_at
) VALUES (
  '41414141-4141-4141-4141-414141414141',
  'GC-2025-0001',
  'GRADUATE',
  '33333333-3333-3333-3333-333333333333',
  '1012345678',
  'MARÍA FERNANDA RODRÍGUEZ GÓMEZ',
  'Administración Pública Territorial',
  '2024-06-15',
  'MARÍA FERNANDA RODRÍGUEZ GÓMEZ',
  'maria.rodriguez@example.com',
  '3101234567',
  'STANDARD',
  '123456',
  NOW() + INTERVAL '1 hour',
  true,
  'COMPLETED',
  '2025-01-15 10:30:00',
  '2025-01-15 10:35:00',
  '2025-01-15 10:40:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Solicitud 2: Graduado solicita certificado oficial (PROCESSING)
INSERT INTO academic_registration.graduation_certificate_requests (
  id,
  request_number,
  requester_type,
  graduate_id,
  id_number,
  full_name,
  program_name,
  graduation_date,
  requester_name,
  requester_email,
  requester_phone,
  certificate_type,
  validation_code,
  validation_expires_at,
  is_validated,
  status,
  request_date,
  validation_date,
  created_at,
  updated_at
) VALUES (
  '42424242-4242-4242-4242-424242424242',
  'GC-2025-0002',
  'GRADUATE',
  '34343434-3434-3434-3434-343434343434',
  '79123456',
  'CARLOS ALBERTO RAMÍREZ PÉREZ',
  'Especialización en Gestión Pública',
  '2023-12-10',
  'CARLOS ALBERTO RAMÍREZ PÉREZ',
  'carlos.ramirez@example.com',
  '3201234568',
  'OFFICIAL',
  '789012',
  NOW() + INTERVAL '1 hour',
  true,
  'PROCESSING',
  '2025-01-16 14:20:00',
  '2025-01-16 14:25:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Solicitud 3: Empresa solicita certificado (PENDING - requiere aprobación)
INSERT INTO academic_registration.graduation_certificate_requests (
  id,
  request_number,
  requester_type,
  graduate_id,
  id_number,
  full_name,
  program_name,
  graduation_date,
  requester_name,
  requester_email,
  requester_phone,
  company_name,
  certificate_type,
  is_validated,
  status,
  observations,
  request_date,
  created_at,
  updated_at
) VALUES (
  '43434343-4343-4343-4343-434343434343',
  'GC-2025-0003',
  'COMPANY',
  '36363636-3636-3636-3636-363636363636',
  '1023456789',
  'JORGE LUIS MARTÍNEZ SÁNCHEZ',
  'Administración Pública Territorial',
  '2023-11-30',
  'Ana María Gómez - Jefe de Recursos Humanos',
  'rrhh@empresaejemplo.com.co',
  '3009876543',
  'EMPRESA EJEMPLO S.A.S',
  'STANDARD',
  false,
  'PENDING',
  'Solicitado para proceso de contratación',
  '2025-01-17 09:15:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Solicitud 4: Graduado PENDING (aún no validada)
INSERT INTO academic_registration.graduation_certificate_requests (
  id,
  request_number,
  requester_type,
  graduate_id,
  id_number,
  full_name,
  program_name,
  graduation_date,
  requester_name,
  requester_email,
  requester_phone,
  certificate_type,
  validation_code,
  validation_expires_at,
  is_validated,
  status,
  request_date,
  created_at,
  updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'GC-2025-0004',
  'GRADUATE',
  '35353535-3535-3535-3535-353535353535',
  '52987654',
  'DIANA PATRICIA TORRES LÓPEZ',
  'Maestría en Alta Dirección del Estado',
  '2023-06-20',
  'DIANA PATRICIA TORRES LÓPEZ',
  'diana.torres@example.com',
  '3151234569',
  'INTERNATIONAL',
  '345678',
  NOW() + INTERVAL '30 minutes',
  false,
  'PENDING',
  '2025-01-18 11:00:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. CERTIFICADOS GENERADOS
-- ============================================

-- Certificado 1: Para María Fernanda Rodríguez
INSERT INTO academic_registration.graduation_certificates (
  id,
  request_id,
  graduate_id,
  certificate_number,
  verification_code,
  full_name,
  id_number,
  program_name,
  program_type,
  degree_title,
  graduation_date,
  diploma_number,
  acta_number,
  campus,
  signer_name,
  signer_position,
  issue_date,
  status,
  created_at,
  updated_at,
  created_by
) VALUES (
  '51515151-5151-5151-5151-515151515151',
  '41414141-4141-4141-4141-414141414141',
  '33333333-3333-3333-3333-333333333333',
  'CERT-GR-2025-0001',
  'QR-GR-2025-0001-' || substr(md5(random()::text), 1, 10),
  'MARÍA FERNANDA RODRÍGUEZ GÓMEZ',
  '1012345678',
  'Administración Pública Territorial',
  'Pregrado',
  'Administrador(a) Público(a) Territorial',
  '2024-06-15',
  'DIPL-2024-001234',
  'ACTA-2024-06-001',
  'Sede Principal Bogotá',
  'DIRECTOR DE REGISTRO ACADÉMICO',
  'Director(a) de Registro Académico',
  '2025-01-15',
  'VALID',
  NOW(),
  NOW(),
  'SYSTEM'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. VALIDACIONES DE CERTIFICADOS
-- ============================================

-- Validación 1: Alguien validó el certificado de María Fernanda
INSERT INTO academic_registration.certificate_validations (
  id,
  certificate_id,
  validation_date,
  ip_address,
  user_agent,
  location,
  result,
  created_at
) VALUES (
  '61616161-6161-6161-6161-616161616161',
  '51515151-5151-5151-5151-515151515151',
  '2025-01-16 15:30:00',
  '190.145.234.56',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Bogotá, Colombia',
  'VALID',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Validación 2: Segunda validación del mismo certificado
INSERT INTO academic_registration.certificate_validations (
  id,
  certificate_id,
  validation_date,
  ip_address,
  user_agent,
  location,
  result,
  created_at
) VALUES (
  '62626262-6262-6262-6262-626262626262',
  '51515151-5151-5151-5151-515151515151',
  '2025-01-17 10:15:00',
  '181.55.123.78',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  'Medellín, Colombia',
  'VALID',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. PLANTILLA DE CERTIFICADO
-- ============================================

-- Plantilla publicada para certificados de grado
INSERT INTO academic_registration.certificate_template_config (
  id,
  signer_id,
  typography_font,
  certificate_content_html,
  status,
  is_active,
  created_by,
  version,
  created_at,
  updated_at
) VALUES (
  1,
  '22222222-2222-2222-2222-222222222222',
  'Arial Narrow, Arial, sans-serif',
  '<p style="text-align: justify; line-height: 1.8;">
    El suscrito <strong>Director de Registro Académico</strong> de la <strong>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</strong>
  </p>
  <h2 style="text-align: center; margin: 40px 0; font-size: 18pt; font-weight: bold;">CERTIFICA QUE:</h2>
  <p style="text-align: justify; line-height: 1.8;">
    <span class="variable-token">[NOMBRE_COMPLETO]</span> identificado(a) con cédula de ciudadanía No. <span class="variable-token">[DOCUMENTO]</span>,
    se graduó de la Escuela Superior de Administración Pública - ESAP, el día <span class="variable-token">[FECHA_GRADO]</span>,
    obteniendo el título de <span class="variable-token">[TITULO]</span> en el programa de <span class="variable-token">[PROGRAMA]</span>,
    según consta en el Acta de Grado No. <span class="variable-token">[ACTA]</span> y Diploma No. <span class="variable-token">[DIPLOMA]</span>.
  </p>
  <p style="text-align: justify; line-height: 1.8; margin-top: 30px;">
    El presente certificado se expide en la ciudad de Bogotá D.C., a los <span class="variable-token">[FECHA_EXPEDICION]</span>.
  </p>',
  'published',
  true,
  'SYSTEM',
  '1.0.0',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. HISTORIAL DE CAMBIOS EN PLANTILLA
-- ============================================

-- Cambio 1: Creación de la plantilla
INSERT INTO academic_registration.template_config_changes (
  id,
  template_config_id,
  change_type,
  field_changed,
  new_value,
  changed_by,
  change_date,
  observations
) VALUES (
  '71717171-7171-7171-7171-717171717171',
  1,
  'CREATED',
  'certificate_content_html',
  'Plantilla inicial creada',
  'SYSTEM',
  NOW(),
  'Creación de plantilla base para certificados de graduados'
)
ON CONFLICT (id) DO NOTHING;

-- Cambio 2: Publicación de la plantilla
INSERT INTO academic_registration.template_config_changes (
  id,
  template_config_id,
  change_type,
  field_changed,
  old_value,
  new_value,
  changed_by,
  change_date,
  observations
) VALUES (
  '72727272-7272-7272-7272-727272727272',
  1,
  'PUBLISHED',
  'status',
  'draft',
  'published',
  'SYSTEM',
  NOW(),
  'Plantilla publicada para uso en producción'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON TABLE academic_registration.graduates IS 'Graduados de prueba con diferentes tipos de programas';
COMMENT ON TABLE academic_registration.graduation_certificate_requests IS 'Solicitudes en diferentes estados del flujo';
COMMENT ON TABLE academic_registration.graduation_certificates IS 'Certificados emitidos con códigos QR válidos';
COMMENT ON TABLE academic_registration.certificate_validations IS 'Historial de validaciones públicas de certificados';

-- Verificación de datos insertados
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'DATOS DE PRUEBA INSERTADOS';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Graduados: %', (SELECT COUNT(*) FROM academic_registration.graduates);
  RAISE NOTICE 'Solicitudes: %', (SELECT COUNT(*) FROM academic_registration.graduation_certificate_requests);
  RAISE NOTICE 'Certificados: %', (SELECT COUNT(*) FROM academic_registration.graduation_certificates);
  RAISE NOTICE 'Validaciones: %', (SELECT COUNT(*) FROM academic_registration.certificate_validations);
  RAISE NOTICE 'Firmantes: %', (SELECT COUNT(*) FROM academic_registration.signers);
  RAISE NOTICE 'Plantillas: %', (SELECT COUNT(*) FROM academic_registration.certificate_template_config);
  RAISE NOTICE '====================================';
END $$;
