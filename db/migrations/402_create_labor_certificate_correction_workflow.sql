-- Flujo de solicitudes de correccion de certificados laborales.
-- Conserva una copia del certificado original, evidencias y trazabilidad de la resolucion.

BEGIN;

ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_corrected_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS certification.certificate_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) NOT NULL UNIQUE,
  certificate_id UUID NOT NULL
    REFERENCES certification.certificates(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  description TEXT NOT NULL
    CHECK (char_length(btrim(description)) BETWEEN 20 AND 2000),
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  submitted_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  certificate_snapshot JSONB NOT NULL,
  due_date DATE NOT NULL,
  reviewed_by_id UUID NULL,
  reviewed_by_name VARCHAR(255) NULL,
  reviewed_by_email VARCHAR(255) NULL,
  review_started_at TIMESTAMP NULL,
  resolution_description TEXT NULL,
  resolution_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrected_data JSONB NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificate_corrections_status_created
  ON certification.certificate_correction_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificate_corrections_certificate
  ON certification.certificate_correction_requests (certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificate_corrections_due_date
  ON certification.certificate_correction_requests (due_date)
  WHERE status IN ('PENDING', 'IN_REVIEW');
CREATE UNIQUE INDEX IF NOT EXISTS uq_certificate_corrections_open_case
  ON certification.certificate_correction_requests (certificate_id)
  WHERE status IN ('PENDING', 'IN_REVIEW');

COMMENT ON TABLE certification.certificate_correction_requests IS
  'Employee correction requests and coordinator resolutions for labor certificates';
COMMENT ON COLUMN certification.certificate_correction_requests.certificate_snapshot IS
  'Immutable snapshot of the certificate when the correction was submitted';
COMMENT ON COLUMN certification.certificate_correction_requests.due_date IS
  'Maximum response date calculated as fifteen business days after submission';
COMMENT ON COLUMN certification.certificates.is_corrected IS
  'Makes corrected certificate values take precedence over the original HR request snapshot';

DO $$
DECLARE
  v_module_id UUID;
  v_permission_id UUID;
BEGIN
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'certificados-laborales';

  IF v_module_id IS NOT NULL THEN
    INSERT INTO auth.permission (
      id_permission, code, name, description, id_module,
      is_active, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      'certificados-laborales.correction.manage',
      'Gestionar correcciones',
      'Revisar, aprobar o rechazar solicitudes de correccion de certificados laborales',
      v_module_id,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      id_module = EXCLUDED.id_module,
      is_active = TRUE,
      updated_at = NOW();

    SELECT id_permission INTO v_permission_id
    FROM auth.permission
    WHERE code = 'certificados-laborales.correction.manage';

    INSERT INTO auth.role_permissions (
      id_rol, id_permission, is_active, created_at, updated_at
    )
    SELECT role.id, v_permission_id, TRUE, NOW(), NOW()
    FROM auth.role role
    WHERE role.code IN (
      'COORDINADOR_CERT_LABORAL',
      'ADMIN_CERTIFICADOS_LABORALES',
      'SUPER_ADMIN',
      'ADMIN'
    )
       OR upper(role.name) IN (
         'COORDINADOR CERTIFICADOS LABORALES',
         'ADMIN CERTIFICADOS LABORALES'
       )
    ON CONFLICT (id_rol, id_permission) DO UPDATE SET
      is_active = TRUE,
      updated_at = NOW();
  END IF;
END $$;

COMMIT;
