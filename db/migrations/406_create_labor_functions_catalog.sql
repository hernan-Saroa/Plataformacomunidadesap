-- Catálogo normalizado de funciones laborales por código de cargo, grado y ubicación.
-- La tabla hija conserva una función por fila y su orden institucional.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS certification.labor_function_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_code VARCHAR(20) NOT NULL,
  grade_code VARCHAR(20),
  combined_code VARCHAR(40) NOT NULL,
  match_key VARCHAR(500) NOT NULL,
  hierarchical_level VARCHAR(100),
  position_name VARCHAR(255) NOT NULL,
  department_name VARCHAR(500),
  department_key VARCHAR(500),
  internal_group VARCHAR(500),
  internal_group_key VARCHAR(500),
  cost_center VARCHAR(255),
  source_sheet VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_labor_function_profiles_match_key UNIQUE (match_key)
);

CREATE INDEX IF NOT EXISTS idx_labor_function_profiles_combined_code
  ON certification.labor_function_profiles (combined_code);
CREATE INDEX IF NOT EXISTS idx_labor_function_profiles_position_grade
  ON certification.labor_function_profiles (position_code, grade_code);

CREATE TABLE IF NOT EXISTS certification.labor_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL
    REFERENCES certification.labor_function_profiles(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_labor_functions_profile_ordinal UNIQUE (profile_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_labor_functions_profile_id
  ON certification.labor_functions (profile_id);

ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS include_functions BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS functions_snapshot JSONB;

-- Campos equivalentes provenientes de la fuente laboral. Son aditivos y no
-- alteran los datos existentes; permiten exigir coincidencia exacta con la matriz.
ALTER TABLE certification.certificate_requests
  ADD COLUMN IF NOT EXISTS base_position_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hierarchical_level VARCHAR(100),
  ADD COLUMN IF NOT EXISTS position_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS organization_department VARCHAR(500),
  ADD COLUMN IF NOT EXISTS internal_group VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cost_center VARCHAR(255);

-- Backfill solo de las nuevas columnas equivalentes. No se modifica ninguna
-- columna histórica del contrato ni del certificado.
UPDATE certification.certificate_requests
SET base_position_code = COALESCE(
      base_position_code,
      CASE
        WHEN regexp_replace(COALESCE(position_code, ''), '[^0-9]', '', 'g') <> ''
         AND regexp_replace(COALESCE(grade_code, ''), '[^0-9]', '', 'g') <> ''
         AND regexp_replace(position_code, '[^0-9]', '', 'g') LIKE
             '%' || regexp_replace(grade_code, '[^0-9]', '', 'g')
         AND length(regexp_replace(position_code, '[^0-9]', '', 'g')) > 4
          THEN lpad(
            left(
              regexp_replace(position_code, '[^0-9]', '', 'g'),
              length(regexp_replace(position_code, '[^0-9]', '', 'g')) -
              length(regexp_replace(grade_code, '[^0-9]', '', 'g'))
            ),
            4,
            '0'
          )
        WHEN regexp_replace(COALESCE(position_code, ''), '[^0-9]', '', 'g') <> ''
          THEN lpad(regexp_replace(position_code, '[^0-9]', '', 'g'), 4, '0')
        ELSE NULL
      END
    ),
    position_name = COALESCE(
      position_name,
      NULLIF(trim(regexp_replace(career_category, '\s+Grado\s+\d+\s*$', '', 'i')), '')
    ),
    organization_department = COALESCE(
      organization_department,
      NULLIF(trim(department), ''),
      NULLIF(trim(position_location), '')
    ),
    internal_group = COALESCE(
      internal_group,
      CASE
        WHEN NULLIF(trim(position_location), '') IS NOT NULL
         AND NULLIF(trim(department), '') IS NOT NULL
         AND lower(trim(position_location)) <> lower(trim(department))
          THEN NULLIF(trim(position_location), '')
        ELSE NULL
      END
    ),
    hierarchical_level = COALESCE(
      hierarchical_level,
      CASE
        WHEN upper(career_category) ~ '(DIRECTOR|DIRECTIVO|JEFE DE OFICINA)' THEN 'Directivo'
        WHEN upper(career_category) ~ 'ASESOR' THEN 'Asesor'
        WHEN upper(career_category) ~ 'PROFESIONAL' THEN 'Profesional'
        WHEN upper(career_category) ~ 'T[EÉ]CNICO' THEN 'Técnico'
        WHEN upper(career_category) ~ '(ASISTENCIAL|SECRETARI|CONDUCTOR|AUXILIAR|OPERARIO)' THEN 'Asistencial'
        ELSE NULL
      END
    );

COMMENT ON TABLE certification.labor_function_profiles IS
  'Position profiles imported from Matriz Funciones ESAP and used to associate employees by normalized codes and organizational context';
COMMENT ON TABLE certification.labor_functions IS
  'Normalized, ordered labor functions belonging to a position profile';
COMMENT ON COLUMN certification.labor_function_profiles.combined_code IS
  'Normalized cargo key (base position code plus grade when applicable)';
COMMENT ON COLUMN certification.labor_function_profiles.match_key IS
  'Unique normalized fingerprint combining codes, level, position name, department, internal group and cost center';
COMMENT ON COLUMN certification.certificates.include_functions IS
  'Whether the requester selected the option to include labor functions';
COMMENT ON COLUMN certification.certificates.functions_snapshot IS
  'Immutable snapshot of the matched profile and ordered functions at issuance time';

-- Permiso granular. Los usuarios que ya administran configuración conservan
-- acceso por compatibilidad en el frontend.
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
      'certificados-laborales.functions.manage',
      'Gestionar funciones laborales',
      'Crear, editar y cargar masivamente la matriz de funciones laborales',
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
    WHERE code = 'certificados-laborales.functions.manage';

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
    ON CONFLICT (id_rol, id_permission) DO UPDATE SET
      is_active = TRUE,
      updated_at = NOW();
  END IF;
END $$;

COMMIT;
