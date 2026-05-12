-- Tabla para gestionar plantillas de parrafo de Prima Tecnica
-- por categoria (Directivos / Coordinadores)
-- Los placeholders soportados son: {porcentaje}, {valor_letras}, {valor_numerico}

CREATE TABLE IF NOT EXISTS certification.technical_bonus_templates (
  id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
  category character varying(20) NOT NULL,
  template_text text NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_by character varying(255),
  CONSTRAINT pk_technical_bonus_templates PRIMARY KEY (id),
  CONSTRAINT uq_technical_bonus_template_category UNIQUE (category),
  CONSTRAINT chk_technical_bonus_template_category
    CHECK (category IN ('DIRECTIVOS', 'COORDINADORES'))
);

-- Plantillas por defecto
INSERT INTO certification.technical_bonus_templates (category, template_text)
VALUES
  (
    'DIRECTIVOS',
    'Percibe una prima técnica en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.'
  ),
  (
    'COORDINADORES',
    'Percibe una prima de coordinación en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.'
  )
ON CONFLICT (category) DO NOTHING;

COMMENT ON TABLE certification.technical_bonus_templates IS
  'Plantillas de parrafo para la seccion de Prima Tecnica en certificados laborales.';

COMMENT ON COLUMN certification.technical_bonus_templates.template_text IS
  'Texto del parrafo con placeholders: {porcentaje}, {valor_letras}, {valor_numerico}.';
