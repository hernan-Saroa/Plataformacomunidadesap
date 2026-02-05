-- Renombrar columnas de dependencia en certificate_requests
ALTER TABLE certification.certificate_requests
  RENAME COLUMN department_parent TO cod_cargo;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN department_son TO cod_grade;
