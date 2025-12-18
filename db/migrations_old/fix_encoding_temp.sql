UPDATE certification.certificate_requests
SET full_name = 'Ana María López Rodríguez'
WHERE id_number = '9876543210';

UPDATE certification.certificate_requests
SET full_name = 'Carlos Andrés Martínez',
    career_category = 'Docente Cátedra',
    position_location = 'Medellín',
    campus = 'Sede Medellín'
WHERE id_number = '5555555555';

UPDATE certification.certificates
SET full_name = 'Carlos Andrés Martínez',
    career_category = 'Docente Cátedra',
    position_location = 'Medellín',
    campus = 'Sede Medellín'
WHERE id_number = '5555555555';
