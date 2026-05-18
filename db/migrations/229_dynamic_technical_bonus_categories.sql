-- Permite crear primas dinamicas para certificados laborales.
-- La tabla technical_bonus_templates funciona como catalogo de primas y
-- conserva la plantilla de parrafo de cada una.

ALTER TABLE certification.technical_bonus_assignments
  DROP CONSTRAINT IF EXISTS chk_technical_bonus_category;

ALTER TABLE certification.technical_bonus_assignments
  ALTER COLUMN category TYPE VARCHAR(80);

ALTER TABLE certification.technical_bonus_templates
  DROP CONSTRAINT IF EXISTS chk_technical_bonus_template_category;

ALTER TABLE certification.technical_bonus_templates
  ALTER COLUMN category TYPE VARCHAR(80);

ALTER TABLE certification.technical_bonus_templates
  ADD COLUMN IF NOT EXISTS label VARCHAR(120),
  ADD COLUMN IF NOT EXISTS description VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL;

UPDATE certification.technical_bonus_templates
SET
  label = COALESCE(label, 'Directivos'),
  description = COALESCE(description, 'Gestion de porcentajes para directivos.'),
  display_order = CASE WHEN display_order = 0 THEN 10 ELSE display_order END,
  is_system = TRUE,
  is_active = TRUE
WHERE category = 'DIRECTIVOS';

UPDATE certification.technical_bonus_templates
SET
  label = COALESCE(label, 'Coordinadores'),
  description = COALESCE(description, 'Gestion de porcentajes para coordinadores.'),
  display_order = CASE WHEN display_order = 0 THEN 20 ELSE display_order END,
  is_system = TRUE,
  is_active = TRUE
WHERE category = 'COORDINADORES';

INSERT INTO certification.technical_bonus_templates (
  category,
  label,
  description,
  template_text,
  display_order,
  is_system,
  is_active
)
VALUES
  (
    'DIRECTIVOS',
    'Directivos',
    'Gestion de porcentajes para directivos.',
    'Percibe una prima técnica en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
    10,
    TRUE,
    TRUE
  ),
  (
    'COORDINADORES',
    'Coordinadores',
    'Gestion de porcentajes para coordinadores.',
    'Percibe una prima de coordinación en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
    20,
    TRUE,
    TRUE
  )
ON CONFLICT (category) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS ux_technical_bonus_id_number
  ON certification.technical_bonus_assignments (id_number);

ALTER TABLE certification.certificates
  DROP CONSTRAINT IF EXISTS chk_certificates_technical_bonus_category;

ALTER TABLE certification.certificates
  ALTER COLUMN technical_bonus_category TYPE VARCHAR(80);

COMMENT ON TABLE certification.technical_bonus_templates IS
  'Catalogo dinamico de primas para certificados laborales y plantilla de parrafo asociada.';

COMMENT ON COLUMN certification.technical_bonus_templates.category IS
  'Codigo estable de la prima. Las categorias base son DIRECTIVOS y COORDINADORES; se permiten codigos dinamicos.';

COMMENT ON COLUMN certification.technical_bonus_templates.template_text IS
  'Texto del parrafo con placeholders: {porcentaje}, {valor_letras}, {valor_numerico}.';

COMMENT ON INDEX certification.ux_technical_bonus_id_number IS
  'Impide que un documento tenga prima asignada en mas de una categoria.';

COMMENT ON COLUMN certification.certificates.technical_bonus_category IS
  'Codigo de la prima persistida para renderizar el texto del certificado laboral.';
