-- Datos de prueba para certificados laborales
-- Basado en docentes existentes en auth.person

-- ============================================
-- FIRMANTE PRINCIPAL
-- ============================================
INSERT INTO certification.signers (id, full_name, position, department, is_active, is_primary, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'ALBA LUCÍA MARÍN ZULUAGA', 'DIRECTORA TÉCNICA DE TALENTO HUMANO', 'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SOLICITUDES DE CERTIFICADOS
-- ============================================

-- Solicitud 1: Docente Planta (Alfonso Cárdenas Duarte)
INSERT INTO certification.certificate_requests (
  id,
  request_number,
  person_id,
  full_name,
  id_number,
  career_category,
  hiring_date,
  position_category,
  position_location,
  monthly_salary,
  salary_text,
  department_parent,
  department,
  campus,
  email,
  phone,
  status,
  request_date,
  created_at,
  updated_at
) VALUES (
  '01111111-1111-1111-1111-111111111111',
  'ESAP-CERT-2025-0EA9F',
  '44444444-4444-4444-4444-444444444444',
  'Alfonso Cárdenas Duarte',
  '4001234567',
  'Carrera Administrativa',
  '2024-07-08',
  'Docente TITULAR',
  'Bogotá D.C.',
  7413445.00,
  'siete millones cuatrocientos trece mil cuatrocientos cuarenta y cinco pesos m/cte',
  'Registro padre',
  'Dirección Territorial Bogotá',
  'Sede principal',
  'alfonso.cardenas@esap.edu.co',
  '3001234567',
  'ACTIVO',
  '2025-01-08 12:00:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Solicitud 2: Docente Tiempo Completo (Alberto José García López)
INSERT INTO certification.certificate_requests (
  id,
  request_number,
  person_id,
  full_name,
  id_number,
  career_category,
  hiring_date,
  position_category,
  position_location,
  monthly_salary,
  salary_text,
  department_parent,
  department,
  campus,
  email,
  phone,
  status,
  request_date,
  created_at,
  updated_at
) VALUES (
  '02222222-2222-2222-2222-222222222222',
  'ESAP-CERT-2025-0EA10',
  '55555555-5555-5555-5555-555555555555',
  'Alberto José García López',
  '2001234567',
  'Carrera Administrativa',
  '2023-03-15',
  'Docente TIEMPO COMPLETO',
  'Bogotá D.C.',
  6850000.00,
  'seis millones ochocientos cincuenta mil pesos m/cte',
  'Registro padre',
  'Dirección Territorial Bogotá',
  'Sede principal',
  'alberto.garcia@esap.edu.co',
  '3101234568',
  'ACTIVO',
  '2025-01-09 12:00:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CERTIFICADOS GENERADOS
-- ============================================

-- Certificado 1: Para Alfonso Cárdenas Duarte
INSERT INTO certification.certificates (
  id,
  verification_code,
  certificate_number,
  request_id,
  full_name,
  id_number,
  career_category,
  hiring_date,
  position_category,
  position_location,
  monthly_salary,
  salary_text,
  department_parent,
  department,
  campus,
  issue_date,
  issuance_timestamp,
  signer_name,
  signer_position,
  signer_department,
  status,
  created_at,
  updated_at
) VALUES (
  '91111111-1111-1111-1111-111111111111',
  'QR-CERT-2025-0EA9F-' || substr(md5(random()::text), 1, 8),
  '12_620_700_20_CD 001',
  '01111111-1111-1111-1111-111111111111',
  'Alfonso Cárdenas Duarte',
  '4001234567',
  'Carrera Administrativa',
  '2024-07-08',
  'Docente TITULAR',
  'Bogotá D.C.',
  7413445.00,
  'siete millones cuatrocientos trece mil cuatrocientos cuarenta y cinco pesos m/cte',
  'Registro padre',
  'Dirección Territorial Bogotá',
  'Sede principal',
  '2025-01-08',
  NOW(),
  'ALBA LUCÍA MARÍN ZULUAGA',
  'DIRECTORA TÉCNICA DE TALENTO HUMANO',
  'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP',
  'VALID',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Certificado 2: Para Alberto José García López
INSERT INTO certification.certificates (
  id,
  verification_code,
  certificate_number,
  request_id,
  full_name,
  id_number,
  career_category,
  hiring_date,
  position_category,
  position_location,
  monthly_salary,
  salary_text,
  department_parent,
  department,
  campus,
  issue_date,
  issuance_timestamp,
  signer_name,
  signer_position,
  signer_department,
  status,
  created_at,
  updated_at
) VALUES (
  '92222222-2222-2222-2222-222222222222',
  'QR-CERT-2025-0EA10-' || substr(md5(random()::text), 1, 8),
  '12_620_700_20_CD 002',
  '02222222-2222-2222-2222-222222222222',
  'Alberto José García López',
  '2001234567',
  'Carrera Administrativa',
  '2023-03-15',
  'Docente TIEMPO COMPLETO',
  'Bogotá D.C.',
  6850000.00,
  'seis millones ochocientos cincuenta mil pesos m/cte',
  'Registro padre',
  'Dirección Territorial Bogotá',
  'Sede principal',
  '2025-01-09',
  NOW(),
  'ALBA LUCÍA MARÍN ZULUAGA',
  'DIRECTORA TÉCNICA DE TALENTO HUMANO',
  'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP',
  'VALID',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PLANTILLA HTML DEL CERTIFICADO
-- ============================================
INSERT INTO certification.certificate_templates (
  id,
  name,
  description,
  html_content,
  certificate_type,
  is_active,
  version,
  created_at,
  updated_at
) VALUES (
  '81111111-1111-1111-1111-111111111111',
  'Certificado Laboral Docente - Oficial',
  'Plantilla oficial para certificados laborales de docentes ESAP',
  '<html><body>
<div style="font-family: Arial; padding: 40px;">
  <img src="logo_esap.png" style="width: 150px;"/>
  <p style="text-align: right;">{{REQUEST_NUMBER}}</p>
  <h3 style="text-align: center; margin-top: 80px;">LA DIRECTORA TÉCNICA DE TALENTO HUMANO DE LA<br/>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP</h3>
  <h2 style="text-align: center; margin-top: 80px;">HACE CONSTAR</h2>
  <p style="margin-top: 40px; line-height: 1.8;">
    Que <b>{{FULL_NAME}}</b>, identificado(a) con cédula de ciudadanía No. <b>{{ID_NUMBER}}</b>,
    se encuentra vinculado(a) con la Escuela Superior de Administración Pública - ESAP mediante
    nombramiento Docente <b>{{CAREER_CATEGORY}}</b>, desde el <b>{{HIRING_DATE}}</b>, en la
    categoría <b>{{POSITION_CATEGORY}}</b> ubicado en <b>{{POSITION_LOCATION}}</b>.
  </p>
  <p style="margin-top: 30px; line-height: 1.8;">
    Que {{FULL_NAME}} percibe mensualmente una asignación salarial de <b>{{MONTHLY_SALARY}}</b>
    ({{SALARY_TEXT}}).
  </p>
  <p style="margin-top: 30px; line-height: 1.8;">
    Se expide en la ciudad de Bogotá D.C., a solicitud del interesado(a) a los <b>{{ISSUE_DATE}}</b>.
  </p>
  <p style="margin-top: 80px; text-align: center;">
    <b>{{SIGNER_NAME}}</b><br/>
    {{SIGNER_POSITION}}
  </p>
</div>
</body></html>',
  'LABOR_TEACHER',
  true,
  1,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
