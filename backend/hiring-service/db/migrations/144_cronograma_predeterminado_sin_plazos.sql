-- ============================================================================
-- 144 · Cronograma predeterminado sin plazos (EFDS-1152)
--
-- Revisión de Juan del 2026-11-17 sobre la 140: en Configuración no se cuadran
-- plazos en días desde un día cero. Allí solo se dice qué etapas y qué
-- actividades salen por defecto en el cronograma de un proceso de cada
-- modalidad; las fechas y el aviso se fijan en la 5.2 de cada proceso.
--
-- · cronograma_predeterminado se queda con qué actividad (del flujo o propia)
--   sale: se quitan los días, el tipo de días y el aviso por defecto.
-- · cronograma_predeterminado_etapas: qué etapas macro salen en el
--   cronograma por etapas.
--
-- La tabla de la 140 nació vacía y nadie la llenó: no hay datos que migrar.
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.cronograma_predeterminado DROP CONSTRAINT IF EXISTS ck_cronograma_predeterminado_dias;
ALTER TABLE hiring.cronograma_predeterminado
  DROP COLUMN IF EXISTS dia_inicio,
  DROP COLUMN IF EXISTS dia_fin,
  DROP COLUMN IF EXISTS tipo_dias,
  DROP COLUMN IF EXISTS dias_antes,
  DROP COLUMN IF EXISTS avisar_a,
  DROP COLUMN IF EXISTS canal,
  DROP COLUMN IF EXISTS correos,
  DROP COLUMN IF EXISTS nota;

COMMENT ON TABLE hiring.cronograma_predeterminado IS
  'Actividades que salen por defecto en el cronograma de la 5.2 según la modalidad (140, sin plazos desde la 144)';

CREATE TABLE IF NOT EXISTS hiring.cronograma_predeterminado_etapas (
  modalidad   varchar(60) NOT NULL REFERENCES hiring.modalidades(codigo) ON DELETE CASCADE,
  etapa       smallint NOT NULL CHECK (etapa BETWEEN 5 AND 10),
  updated_by  varchar(200),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (modalidad, etapa)
);

COMMENT ON TABLE hiring.cronograma_predeterminado_etapas IS
  'Etapas macro que salen por defecto en el cronograma de la 5.2 según la modalidad (144)';

-- Si alguna actividad quedó configurada, su etapa también sale.
INSERT INTO hiring.cronograma_predeterminado_etapas (modalidad, etapa)
SELECT DISTINCT c.modalidad, COALESCE(c.etapa, a.etapa)
  FROM hiring.cronograma_predeterminado c
  LEFT JOIN hiring.actividades a ON a.numeral = c.numeral
 WHERE COALESCE(c.etapa, a.etapa) BETWEEN 5 AND 10
ON CONFLICT DO NOTHING;

COMMIT;
