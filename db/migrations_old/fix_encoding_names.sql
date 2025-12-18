-- Arreglar encoding de nombres con tildes
-- Ejecutar este script manualmente en tu cliente de base de datos (pgAdmin, DBeaver, etc.)

-- Ana María López Rodríguez
UPDATE certification.certificate_requests
SET full_name = 'Ana María López Rodríguez'
WHERE id_number = '9876543210';

-- Carlos Andrés Martínez (en solicitudes)
UPDATE certification.certificate_requests
SET full_name = 'Carlos Andrés Martínez',
    career_category = 'Docente Cátedra',
    position_location = 'Medellín',
    campus = 'Sede Medellín'
WHERE id_number = '5555555555';

-- Carlos Andrés Martínez (en certificados)
UPDATE certification.certificates
SET full_name = 'Carlos Andrés Martínez',
    career_category = 'Docente Cátedra',
    position_location = 'Medellín',
    campus = 'Sede Medellín'
WHERE id_number = '5555555555';

-- Verificar los cambios
SELECT id_number, full_name, career_category, position_location, campus
FROM certification.certificate_requests
WHERE id_number IN ('9876543210', '5555555555');

SELECT id_number, full_name, career_category, position_location, campus
FROM certification.certificates
WHERE id_number = '5555555555';
