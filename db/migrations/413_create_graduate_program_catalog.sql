-- Catálogo administrable de programas para Gestión de Graduados.
-- Contiene únicamente programas creados explícitamente desde el administrador;
-- los programas de graduados existentes se consultan dinámicamente.

CREATE TABLE IF NOT EXISTS academic_registration.graduate_program_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT graduate_program_catalog_normalized_name_key UNIQUE (normalized_name),
  CONSTRAINT graduate_program_catalog_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT graduate_program_catalog_normalized_name_not_blank CHECK (btrim(normalized_name) <> '')
);

COMMENT ON TABLE academic_registration.graduate_program_catalog IS
  'Catálogo central de programas usado por la gestión y revisión de graduados.';
