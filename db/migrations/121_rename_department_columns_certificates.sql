-- Renombrar columnas de dependencia en certificates
ALTER TABLE certification.certificates
  RENAME COLUMN department_parent TO cod_cargo;

ALTER TABLE certification.certificates
  RENAME COLUMN department_son TO cod_grade;
