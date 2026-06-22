-- Relación estable entre las sedes históricas de auth y el catálogo académico.
-- Permite activar CETAP por periodo sin cambiar ni eliminar las sedes existentes.

CREATE TABLE IF NOT EXISTS auth.sede_cetap_mapping (
  id_sede BIGINT PRIMARY KEY,
  id_cetap BIGINT NOT NULL,
  origen VARCHAR(20) NOT NULL DEFAULT 'official',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sede_cetap_mapping_sede
    FOREIGN KEY (id_sede)
    REFERENCES auth.sedes(id_sede)
    ON DELETE CASCADE,
  CONSTRAINT fk_sede_cetap_mapping_cetap
    FOREIGN KEY (id_cetap)
    REFERENCES academic_work_plan.cetap(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_sede_cetap_mapping_origen
    CHECK (origen IN ('official', 'legacy'))
);

CREATE INDEX IF NOT EXISTS idx_sede_cetap_mapping_cetap
  ON auth.sede_cetap_mapping(id_cetap);

COMMENT ON TABLE auth.sede_cetap_mapping IS
  'Relaciona una sede histórica con el CETAP académico usado para activación por periodo.';
