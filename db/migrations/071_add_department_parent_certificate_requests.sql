-- Agregar columna de dependencia padre en solicitudes y certificados laborales
ALTER TABLE certification.certificate_requests
ADD COLUMN IF NOT EXISTS department_parent VARCHAR(255) DEFAULT 'Registro padre';

ALTER TABLE certification.certificates
ADD COLUMN IF NOT EXISTS department_parent VARCHAR(255) DEFAULT 'Registro padre';

UPDATE certification.certificate_requests
SET department_parent = 'Registro padre'
WHERE department_parent IS NULL OR TRIM(department_parent) = '';

UPDATE certification.certificates
SET department_parent = 'Registro padre'
WHERE department_parent IS NULL OR TRIM(department_parent) = '';
