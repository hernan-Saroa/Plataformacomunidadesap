-- Certification Schema for Labor Certificates
-- Based on the official ESAP certification model

CREATE SCHEMA IF NOT EXISTS certification;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: certificate_requests
-- Labor certificate requests
-- ============================================
CREATE TABLE IF NOT EXISTS certification.certificate_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL, -- Ex: 12_620_700_20_CD 001

  -- Relationship with person (auth.person)
  person_id UUID, -- Optional reference to auth.person

  -- DATA1: Full name of the employee
  full_name VARCHAR(255) NOT NULL,

  -- DATA2: ID number
  id_number VARCHAR(50) NOT NULL,

  -- Document type used in autoservicio (CC, CE, PP)
  document_type VARCHAR(10),

  -- DATA3: Career/Category (Administrative Career, Free Appointment, etc.)
  career_category VARCHAR(100) NOT NULL,

  -- DATA4: Hiring date (contract start)
  hiring_date DATE NOT NULL,

  -- DATA5: Position category (TITULAR Teacher, OCCASIONAL Teacher, etc.)
  position_category VARCHAR(100) NOT NULL,

  -- DATA6: Position location (city)
  position_location VARCHAR(150),

  -- DATA7: Monthly salary (number)
  monthly_salary DECIMAL(12, 2) NOT NULL,

  -- DATA8: Salary in text (forty forty-five pesos m/cte)
  salary_text VARCHAR(255),

  -- Additional employment data
  department_parent VARCHAR(255) DEFAULT 'Registro padre',
  department VARCHAR(255), -- Territorial Directorate Bogotá, etc.
  campus VARCHAR(100), -- Main campus, Bogotá D.C., etc.
  email VARCHAR(100),
  phone VARCHAR(20),

  -- Request status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, GENERATED
  request_date TIMESTAMP NOT NULL DEFAULT NOW(),
  approval_date TIMESTAMP,
  generation_date TIMESTAMP,

  -- User who approved
  approved_by_id UUID,
  approved_by_name VARCHAR(255),

  -- Observations
  observations TEXT,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE: certificates
-- Generated and issued certificates
-- ============================================
CREATE TABLE IF NOT EXISTS certification.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Unique identifiers
  verification_code VARCHAR(100) UNIQUE NOT NULL, -- Unique QR code for validation
  certificate_number VARCHAR(50) UNIQUE NOT NULL, -- Official certificate number

  -- Relationship with request
  request_id UUID NOT NULL REFERENCES certification.certificate_requests(id),

  -- Employee data (denormalized for historical purposes)
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  document_type VARCHAR(10),
  career_category VARCHAR(100) NOT NULL,
  hiring_date DATE NOT NULL,
  position_category VARCHAR(100) NOT NULL,
  position_location VARCHAR(150),
  monthly_salary DECIMAL(12, 2) NOT NULL,
  technical_bonus DECIMAL(12, 2) DEFAULT 0,
  include_salary BOOLEAN DEFAULT TRUE,
  include_technical_bonus BOOLEAN DEFAULT FALSE,
  salary_text VARCHAR(255),
  department_parent VARCHAR(255) DEFAULT 'Registro padre',
  department VARCHAR(255),
  campus VARCHAR(100),

  -- Certificate dates
  issue_date DATE NOT NULL, -- Date when the certificate is issued
  issuance_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until DATE, -- Optional

  -- Certificate signer
  signer_name VARCHAR(255), -- ALBA LUCÍA MARÍN ZULUAGA
  signer_position VARCHAR(255), -- TECHNICAL DIRECTOR OF HUMAN TALENT
  signer_department VARCHAR(255),

  -- PDF file
  pdf_url VARCHAR(500), -- Path or URL of the generated PDF
  pdf_filename VARCHAR(255), -- File name

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'VALID', -- VALID, REVOKED, EXPIRED
  revocation_date TIMESTAMP,
  revocation_reason TEXT,
  revoked_by_id UUID,

  -- Validations
  validation_count INTEGER DEFAULT 0,
  last_validation TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE: certificate_validations
-- History of QR code validations
-- ============================================
CREATE TABLE IF NOT EXISTS certification.certificate_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES certification.certificates(id),

  -- Validation data
  validation_date TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(50),
  user_agent TEXT,
  location VARCHAR(255), -- City/country from where it was validated

  -- Result
  result VARCHAR(50) NOT NULL, -- VALID, INVALID, REVOKED, EXPIRED

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE: certificate_templates
-- HTML templates for generating certificates
-- ============================================
CREATE TABLE IF NOT EXISTS certification.certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template content
  html_content TEXT NOT NULL, -- HTML with placeholders {{NAME}}, {{ID_NUMBER}}, etc.

  -- Type
  certificate_type VARCHAR(100) DEFAULT 'LABOR_TEACHER',

  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE: signers
-- Authorized persons to sign certificates
-- ============================================
CREATE TABLE IF NOT EXISTS certification.signers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Signer data
  full_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  department VARCHAR(255),

  -- Digital signature (image)
  signature_url VARCHAR(500),
  signature_base64 TEXT, -- Signature in base64 to include in PDF

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Primary/default signer

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES for better performance
-- ============================================
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

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE certification.certificate_requests IS 'Labor certificate requests made by employees';
COMMENT ON TABLE certification.certificates IS 'Generated and valid certificates with QR code';
COMMENT ON TABLE certification.certificate_validations IS 'History of QR code validations';
COMMENT ON TABLE certification.certificate_templates IS 'HTML templates for generating PDF certificates';
COMMENT ON TABLE certification.signers IS 'Authorized persons to sign certificates (Human Talent Director)';

COMMENT ON COLUMN certification.certificate_requests.request_number IS 'Unique request number format: 12_620_700_20_CD 001';
COMMENT ON COLUMN certification.certificate_requests.career_category IS 'DATA3: Administrative Career, Free Appointment, etc.';
COMMENT ON COLUMN certification.certificate_requests.position_category IS 'DATA5: TITULAR Teacher, OCCASIONAL, CHAIR';
COMMENT ON COLUMN certification.certificate_requests.monthly_salary IS 'DATA7: Monthly salary in number';
COMMENT ON COLUMN certification.certificate_requests.salary_text IS 'DATA8: Salary in text (forty forty-five pesos m/cte)';
