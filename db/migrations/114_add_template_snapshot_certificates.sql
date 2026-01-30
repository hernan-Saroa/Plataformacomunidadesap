-- Agregar snapshot de plantilla y metadata a certificados laborales
ALTER TABLE certification.certificates
ADD COLUMN IF NOT EXISTS template_snapshot JSONB,
ADD COLUMN IF NOT EXISTS template_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS template_version VARCHAR(20);

COMMENT ON COLUMN certification.certificates.template_snapshot IS 'Snapshot de la plantilla usada al emitir el certificado';
COMMENT ON COLUMN certification.certificates.template_type IS 'Tipo de plantilla aplicada (docente/administrador)';
COMMENT ON COLUMN certification.certificates.template_version IS 'Version de la plantilla aplicada';
