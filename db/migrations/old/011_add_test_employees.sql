-- Agregar 5 empleados de prueba para demostración
-- Ejecutar este script en tu cliente de PostgreSQL

-- 1. Laura Patricia Gómez - Docente Tiempo Completo (Bogotá)
INSERT INTO certification.certificate_requests (
    id,
    request_number,
    full_name,
    id_number,
    email,
    career_category,
    hiring_date,
    position_category,
    position_location,
    monthly_salary,
    salary_text,
    department,
    campus,
    request_date,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'REQ-DEMO-001',
    'Laura Patricia Gómez Herrera',
    '1234567890',
    'laura.gomez@esap.edu.co',
    'Docente Tiempo Completo',
    '2019-02-01',
    'Docente',
    'Bogotá D.C.',
    7500000,
    'SIETE MILLONES QUINIENTOS MIL PESOS M/CTE',
    'Facultad de Pregrado',
    'Sede Bogotá',
    CURRENT_TIMESTAMP,
    'PENDING',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (request_number) DO NOTHING;

-- 2. Juan Carlos Rodríguez - Administrativo (Medellín)
INSERT INTO certification.certificate_requests (
    id,
    request_number,
    full_name,
    id_number,
    email,
    career_category,
    hiring_date,
    position_category,
    position_location,
    monthly_salary,
    salary_text,
    department,
    campus,
    request_date,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'REQ-DEMO-002',
    'Juan Carlos Rodríguez Pérez',
    '2345678901',
    'juan.rodriguez@esap.edu.co',
    'Coordinador Regional',
    '2017-08-15',
    'Administrativo',
    'Medellín',
    6200000,
    'SEIS MILLONES DOSCIENTOS MIL PESOS M/CTE',
    'Dirección Regional Antioquia',
    'Sede Medellín',
    CURRENT_TIMESTAMP,
    'PENDING',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (request_number) DO NOTHING;

-- 3. María Fernanda Díaz - Docente Cátedra (Cali)
INSERT INTO certification.certificate_requests (
    id,
    request_number,
    full_name,
    id_number,
    email,
    career_category,
    hiring_date,
    position_category,
    position_location,
    monthly_salary,
    salary_text,
    department,
    campus,
    request_date,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'REQ-DEMO-003',
    'María Fernanda Díaz Sánchez',
    '3456789012',
    'maria.diaz@esap.edu.co',
    'Docente Cátedra',
    '2020-03-10',
    'Docente',
    'Cali',
    3800000,
    'TRES MILLONES OCHOCIENTOS MIL PESOS M/CTE',
    'Facultad de Posgrados',
    'Sede Cali',
    CURRENT_TIMESTAMP,
    'PENDING',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (request_number) DO NOTHING;

-- 4. Roberto Andrés Morales - Administrativo Profesional (Bogotá)
INSERT INTO certification.certificate_requests (
    id,
    request_number,
    full_name,
    id_number,
    email,
    career_category,
    hiring_date,
    position_category,
    position_location,
    monthly_salary,
    salary_text,
    department,
    campus,
    request_date,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'REQ-DEMO-004',
    'Roberto Andrés Morales Castro',
    '4567890123',
    'roberto.morales@esap.edu.co',
    'Profesional Especializado',
    '2016-05-20',
    'Administrativo',
    'Bogotá D.C.',
    5900000,
    'CINCO MILLONES NOVECIENTOS MIL PESOS M/CTE',
    'Dirección de Investigaciones',
    'Sede Bogotá',
    CURRENT_TIMESTAMP,
    'PENDING',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (request_number) DO NOTHING;

-- 5. Sandra Milena Valencia - Docente Medio Tiempo (Barranquilla)
INSERT INTO certification.certificate_requests (
    id,
    request_number,
    full_name,
    id_number,
    email,
    career_category,
    hiring_date,
    position_category,
    position_location,
    monthly_salary,
    salary_text,
    department,
    campus,
    request_date,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'REQ-DEMO-005',
    'Sandra Milena Valencia Torres',
    '5678901234',
    'sandra.valencia@esap.edu.co',
    'Docente Medio Tiempo',
    '2021-01-25',
    'Docente',
    'Barranquilla',
    4500000,
    'CUATRO MILLONES QUINIENTOS MIL PESOS M/CTE',
    'Facultad de Pregrado',
    'Sede Barranquilla',
    CURRENT_TIMESTAMP,
    'PENDING',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (request_number) DO NOTHING;

-- Admin 1
INSERT INTO certification.certificate_requests (
  id, request_number, person_id, full_name, id_number, career_category,
  hiring_date, position_category, position_location, monthly_salary,
  salary_text, department, campus, email, phone, status, request_date,
  created_at, updated_at
) VALUES (
  '03333333-3333-3333-3333-333333333333',
  'ESAP-CERT-2025-0EA11',
  '66666666-6666-6666-6666-666666666666',
  'María Fernanda López Ruiz',
  '1032456789',
  'Carrera Administrativa',
  '2021-02-10',
  'Profesional Universitario',
  'Bogotá D.C.',
  5200000.00,
  'cinco millones doscientos mil pesos m/cte',
  'Dirección Nacional de Talento Humano',
  'Sede principal',
  'maria.lopez@esap.edu.co',
  '3004567891',
  'ACTIVO',
  '2025-01-10 09:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Admin 2
INSERT INTO certification.certificate_requests VALUES (
  '04444444-4444-4444-4444-444444444444',
  'ESAP-CERT-2025-0EA12',
  '77777777-7777-7777-7777-777777777777',
  'Carlos Andrés Mejía Torres',
  '8045678912',
  'Carrera Administrativa',
  '2019-08-01',
  'Técnico Administrativo',
  'Medellín',
  3800000.00,
  'tres millones ochocientos mil pesos m/cte',
  'Dirección Territorial Antioquia',
  'Sede Medellín',
  'carlos.mejia@esap.edu.co',
  '3114567892',
  'ACTIVO',
  '2025-01-10 10:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Admin 3
INSERT INTO certification.certificate_requests VALUES (
  '05555555-5555-5555-5555-555555555555',
  'ESAP-CERT-2025-0EA13',
  '88888888-8888-8888-8888-888888888888',
  'Liliana Gómez Pardo',
  '5234567890',
  'Carrera Administrativa',
  '2018-01-15',
  'Auxiliar Administrativo',
  'Cali',
  2900000.00,
  'dos millones novecientos mil pesos m/cte',
  'Dirección Territorial Valle',
  'Sede Cali',
  'liliana.gomez@esap.edu.co',
  '3124567893',
  'ACTIVO',
  '2025-01-10 11:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Profesional 1
INSERT INTO certification.certificate_requests VALUES (
  '06666666-6666-6666-6666-666666666666',
  'ESAP-CERT-2025-0EA14',
  '99999999-9999-9999-9999-999999999999',
  'Javier Mauricio Rojas',
  '1012345678',
  'Libre Nombramiento',
  '2022-05-20',
  'Profesional Especializado',
  'Bogotá D.C.',
  6100000.00,
  'seis millones cien mil pesos m/cte',
  'Oficina TIC',
  'Sede principal',
  'javier.rojas@esap.edu.co',
  '3134567894',
  'ACTIVO',
  '2025-01-10 12:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Profesional 2
INSERT INTO certification.certificate_requests VALUES (
  '07777777-7777-7777-7777-777777777777',
  'ESAP-CERT-2025-0EA15',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Paola Andrea Castro Nieto',
  '1122334455',
  'Carrera Administrativa',
  '2020-09-03',
  'Profesional Universitario',
  'Bucaramanga',
  4900000.00,
  'cuatro millones novecientos mil pesos m/cte',
  'Dirección Territorial Santander',
  'Sede Bucaramanga',
  'paola.castro@esap.edu.co',
  '3144567895',
  'ACTIVO',
  '2025-01-10 13:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Profesional 3
INSERT INTO certification.certificate_requests VALUES (
  '08888888-8888-8888-8888-888888888888',
  'ESAP-CERT-2025-0EA16',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Diego Fernando Salazar',
  '9988776655',
  'Libre Nombramiento',
  '2023-01-12',
  'Asesor',
  'Bogotá D.C.',
  7200000.00,
  'siete millones doscientos mil pesos m/cte',
  'Secretaría General',
  'Sede principal',
  'diego.salazar@esap.edu.co',
  '3154567896',
  'ACTIVO',
  '2025-01-10 14:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Profesional 4
INSERT INTO certification.certificate_requests VALUES (
  '09999999-9999-9999-9999-999999999999',
  'ESAP-CERT-2025-0EA17',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Sandra Milena Vélez',
  '6677889900',
  'Carrera Administrativa',
  '2017-11-01',
  'Profesional Especializado',
  'Pereira',
  6400000.00,
  'seis millones cuatrocientos mil pesos m/cte',
  'Dirección Territorial Risaralda',
  'Sede Pereira',
  'sandra.velez@esap.edu.co',
  '3164567897',
  'ACTIVO',
  '2025-01-10 15:00:00',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT
    id_number,
    full_name,
    career_category,
    position_location,
    campus,
    TO_CHAR(monthly_salary, 'FM$999,999,999') as salario,
    email
FROM certification.certificate_requests
WHERE id_number IN ('1234567890', '2345678901', '3456789012', '4567890123', '5678901234')
ORDER BY id_number;

-- Script de resumen
SELECT
    '✅ Script ejecutado - se insertaron solo los registros nuevos' as mensaje,
    COUNT(*) as total_en_bd
FROM certification.certificate_requests
WHERE id_number IN ('1234567890', '2345678901', '3456789012', '4567890123', '5678901234');