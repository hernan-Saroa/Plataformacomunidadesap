-- Persistir el tipo de documento del autoservicio de certificados laborales
ALTER TABLE certification.certificate_requests
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(10);

ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(10);

COMMENT ON COLUMN certification.certificate_requests.document_type IS
  'Tipo de documento informado por el usuario en autoservicio laboral (CC, CE, PP)';

COMMENT ON COLUMN certification.certificates.document_type IS
  'Tipo de documento persistido junto al certificado laboral generado (CC, CE, PP)';
