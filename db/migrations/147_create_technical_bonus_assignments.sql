-- Tabla para gestionar porcentajes de Prima Tecnica
-- por categoria (Directivos / Coordinadores)

CREATE TABLE IF NOT EXISTS certification.technical_bonus_assignments (
  id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
  request_id uuid,
  category character varying(20) NOT NULL,
  full_name character varying(255) NOT NULL,
  id_number character varying(50) NOT NULL,
  percentage numeric(5,2) NOT NULL,
  created_by character varying(255),
  updated_by character varying(255),
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  CONSTRAINT pk_technical_bonus_assignments PRIMARY KEY (id),
  CONSTRAINT fk_technical_bonus_request
    FOREIGN KEY (request_id)
    REFERENCES certification.certificate_requests(id)
    ON DELETE SET NULL,
  CONSTRAINT chk_technical_bonus_category
    CHECK (category IN ('DIRECTIVOS', 'COORDINADORES')),
  CONSTRAINT chk_technical_bonus_percentage
    CHECK (percentage > 0 AND percentage <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_technical_bonus_category_id_number
  ON certification.technical_bonus_assignments (category, id_number);

CREATE INDEX IF NOT EXISTS idx_technical_bonus_category
  ON certification.technical_bonus_assignments (category);

CREATE INDEX IF NOT EXISTS idx_technical_bonus_request_id
  ON certification.technical_bonus_assignments (request_id);

CREATE INDEX IF NOT EXISTS idx_technical_bonus_updated_at
  ON certification.technical_bonus_assignments (updated_at DESC);

COMMENT ON TABLE certification.technical_bonus_assignments IS
  'Asignacion de porcentaje de Prima Tecnica para empleados por categoria.';

COMMENT ON COLUMN certification.technical_bonus_assignments.category IS
  'Categoria del porcentaje: DIRECTIVOS o COORDINADORES.';

COMMENT ON COLUMN certification.technical_bonus_assignments.id_number IS
  'Numero de identificacion normalizado (sin separadores).';

COMMENT ON COLUMN certification.technical_bonus_assignments.percentage IS
  'Porcentaje de Prima Tecnica (0 < percentage <= 100).';
