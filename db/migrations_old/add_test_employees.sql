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
);

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
);

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
);

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
);

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
);

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
    '✅ 5 empleados de prueba creados exitosamente' as mensaje,
    COUNT(*) as total_insertados
FROM certification.certificate_requests
WHERE id_number IN ('1234567890', '2345678901', '3456789012', '4567890123', '5678901234');
