-- Migración para renombrar tablas y columnas del esquema certification a inglés
-- Este script debe ejecutarse en la base de datos existente

-- ============================================
-- RENOMBRAR TABLAS
-- ============================================

-- Renombrar tabla de solicitudes
ALTER TABLE IF EXISTS certification.solicitudes_certificado
  RENAME TO certificate_requests;

-- Renombrar tabla de certificados
ALTER TABLE IF EXISTS certification.certificados
  RENAME TO certificates;

-- Renombrar tabla de validaciones
ALTER TABLE IF EXISTS certification.validaciones_certificado
  RENAME TO certificate_validations;

-- Renombrar tabla de plantillas
ALTER TABLE IF EXISTS certification.plantillas_certificado
  RENAME TO certificate_templates;

-- Renombrar tabla de firmantes
ALTER TABLE IF EXISTS certification.firmantes
  RENAME TO signers;

-- ============================================
-- RENOMBRAR COLUMNAS DE certificate_requests
-- ============================================

ALTER TABLE certification.certificate_requests
  RENAME COLUMN numero_solicitud TO request_number;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN nombre_completo TO full_name;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN cedula TO id_number;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN carrera_categoria TO career_category;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN fecha_vinculacion TO hiring_date;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN categoria_cargo TO position_category;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN ubicacion_cargo TO position_location;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN salario_mensual TO monthly_salary;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN salario_texto TO salary_text;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN dependencia TO department;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN sede TO campus;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN telefono TO phone;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN estado TO status;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN fecha_solicitud TO request_date;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN fecha_aprobacion TO approval_date;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN fecha_generacion TO generation_date;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN aprobado_por_id TO approved_by_id;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN aprobado_por_nombre TO approved_by_name;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN observaciones TO observations;

ALTER TABLE certification.certificate_requests
  RENAME COLUMN motivo_rechazo TO rejection_reason;

-- ============================================
-- RENOMBRAR COLUMNAS DE certificates
-- ============================================

ALTER TABLE certification.certificates
  RENAME COLUMN codigo_verificacion TO verification_code;

ALTER TABLE certification.certificates
  RENAME COLUMN numero_certificado TO certificate_number;

ALTER TABLE certification.certificates
  RENAME COLUMN solicitud_id TO request_id;

ALTER TABLE certification.certificates
  RENAME COLUMN nombre_completo TO full_name;

ALTER TABLE certification.certificates
  RENAME COLUMN cedula TO id_number;

ALTER TABLE certification.certificates
  RENAME COLUMN carrera_categoria TO career_category;

ALTER TABLE certification.certificates
  RENAME COLUMN fecha_vinculacion TO hiring_date;

ALTER TABLE certification.certificates
  RENAME COLUMN categoria_cargo TO position_category;

ALTER TABLE certification.certificates
  RENAME COLUMN ubicacion_cargo TO position_location;

ALTER TABLE certification.certificates
  RENAME COLUMN salario_mensual TO monthly_salary;

ALTER TABLE certification.certificates
  RENAME COLUMN salario_texto TO salary_text;

ALTER TABLE certification.certificates
  RENAME COLUMN dependencia TO department;

ALTER TABLE certification.certificates
  RENAME COLUMN sede TO campus;

ALTER TABLE certification.certificates
  RENAME COLUMN fecha_emision TO issue_date;

ALTER TABLE certification.certificates
  RENAME COLUMN fecha_expedicion TO issuance_timestamp;

ALTER TABLE certification.certificates
  RENAME COLUMN firmante_nombre TO signer_name;

ALTER TABLE certification.certificates
  RENAME COLUMN firmante_cargo TO signer_position;

ALTER TABLE certification.certificates
  RENAME COLUMN firmante_dependencia TO signer_department;

ALTER TABLE certification.certificates
  RENAME COLUMN pdf_url TO pdf_url;

ALTER TABLE certification.certificates
  RENAME COLUMN pdf_nombre TO pdf_filename;

ALTER TABLE certification.certificates
  RENAME COLUMN estado TO status;

ALTER TABLE certification.certificates
  RENAME COLUMN fecha_anulacion TO revocation_date;

ALTER TABLE certification.certificates
  RENAME COLUMN motivo_anulacion TO revocation_reason;

ALTER TABLE certification.certificates
  RENAME COLUMN anulado_por_id TO revoked_by_id;

ALTER TABLE certification.certificates
  RENAME COLUMN veces_validado TO validation_count;

ALTER TABLE certification.certificates
  RENAME COLUMN ultima_validacion TO last_validation;

ALTER TABLE certification.certificates
  RENAME COLUMN valido_hasta TO valid_until;

-- ============================================
-- RENOMBRAR COLUMNAS DE certificate_validations
-- ============================================

ALTER TABLE certification.certificate_validations
  RENAME COLUMN certificado_id TO certificate_id;

ALTER TABLE certification.certificate_validations
  RENAME COLUMN fecha_validacion TO validation_date;

ALTER TABLE certification.certificate_validations
  RENAME COLUMN ip_validacion TO ip_address;

ALTER TABLE certification.certificate_validations
  RENAME COLUMN ubicacion TO location;

ALTER TABLE certification.certificate_validations
  RENAME COLUMN resultado TO result;

-- ============================================
-- RENOMBRAR COLUMNAS DE certificate_templates
-- ============================================

ALTER TABLE certification.certificate_templates
  RENAME COLUMN nombre TO name;

ALTER TABLE certification.certificate_templates
  RENAME COLUMN descripcion TO description;

ALTER TABLE certification.certificate_templates
  RENAME COLUMN contenido_html TO html_content;

ALTER TABLE certification.certificate_templates
  RENAME COLUMN tipo_certificado TO certificate_type;

ALTER TABLE certification.certificate_templates
  RENAME COLUMN activa TO is_active;

ALTER TABLE certification.certificate_templates
  RENAME COLUMN version TO version;

-- ============================================
-- RENOMBRAR COLUMNAS DE signers
-- ============================================

ALTER TABLE certification.signers
  RENAME COLUMN nombre_completo TO full_name;

ALTER TABLE certification.signers
  RENAME COLUMN cargo TO position;

ALTER TABLE certification.signers
  RENAME COLUMN dependencia TO department;

ALTER TABLE certification.signers
  RENAME COLUMN firma_url TO signature_url;

ALTER TABLE certification.signers
  RENAME COLUMN firma_base64 TO signature_base64;

ALTER TABLE certification.signers
  RENAME COLUMN firma_digital_url TO signature_url;

ALTER TABLE certification.signers
  RENAME COLUMN activo TO is_active;

ALTER TABLE certification.signers
  RENAME COLUMN es_principal TO is_primary;

-- ============================================
-- ACTUALIZAR VALORES DE ESTADO
-- ============================================

-- Actualizar estados en certificate_requests
UPDATE certification.certificate_requests
SET status = 'PENDING' WHERE status = 'PENDIENTE';

UPDATE certification.certificate_requests
SET status = 'APPROVED' WHERE status = 'APROBADA';

UPDATE certification.certificate_requests
SET status = 'REJECTED' WHERE status = 'RECHAZADA';

UPDATE certification.certificate_requests
SET status = 'GENERATED' WHERE status = 'GENERADA';

-- Actualizar estados en certificates
UPDATE certification.certificates
SET status = 'VALID' WHERE status = 'VIGENTE';

UPDATE certification.certificates
SET status = 'REVOKED' WHERE status = 'ANULADO' OR status = 'REVOCADO';

UPDATE certification.certificates
SET status = 'EXPIRED' WHERE status = 'VENCIDO';

-- ============================================
-- ACTUALIZAR ÍNDICES
-- ============================================

-- Eliminar índices antiguos
DROP INDEX IF EXISTS certification.idx_solicitudes_estado;
DROP INDEX IF EXISTS certification.idx_solicitudes_person;
DROP INDEX IF EXISTS certification.idx_solicitudes_fecha;
DROP INDEX IF EXISTS certification.idx_solicitudes_cedula;

DROP INDEX IF EXISTS certification.idx_certificados_codigo;
DROP INDEX IF EXISTS certification.idx_certificados_numero;
DROP INDEX IF EXISTS certification.idx_certificados_estado;
DROP INDEX IF EXISTS certification.idx_certificados_solicitud;
DROP INDEX IF EXISTS certification.idx_certificados_cedula;

DROP INDEX IF EXISTS certification.idx_validaciones_certificado;
DROP INDEX IF EXISTS certification.idx_validaciones_fecha;

-- Crear nuevos índices con nombres en inglés
CREATE INDEX IF NOT EXISTS idx_requests_status ON certification.certificate_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_person ON certification.certificate_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_requests_date ON certification.certificate_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_requests_id_number ON certification.certificate_requests(id_number);

CREATE INDEX IF NOT EXISTS idx_certificates_code ON certification.certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certification.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certification.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_request ON certification.certificates(request_id);
CREATE INDEX IF NOT EXISTS idx_certificates_id_number ON certification.certificates(id_number);

CREATE INDEX IF NOT EXISTS idx_validations_certificate ON certification.certificate_validations(certificate_id);
CREATE INDEX IF NOT EXISTS idx_validations_date ON certification.certificate_validations(validation_date);

COMMENT ON TABLE certification.certificate_requests IS 'Solicitudes de certificados laborales realizadas por empleados';
COMMENT ON TABLE certification.certificates IS 'Certificados generados y vigentes con código QR';
COMMENT ON TABLE certification.certificate_validations IS 'Historial de validaciones mediante código QR';
COMMENT ON TABLE certification.certificate_templates IS 'Plantillas HTML para generar certificados en PDF';
COMMENT ON TABLE certification.signers IS 'Personas autorizadas para firmar certificados (Directora de Talento Humano)';
