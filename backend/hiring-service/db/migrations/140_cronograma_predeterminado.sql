-- ============================================================================
-- 140 · Cronograma predeterminado por modalidad (EFDS-1152)
--
-- Contratación configura, por modalidad, el cronograma con que arranca un
-- proceso: para cada actividad del flujo (o propia que siempre se programa),
-- en qué día empieza y en qué día termina contado desde el día cero, si son
-- días hábiles o calendario, y el aviso por defecto (días antes, a quién, por
-- dónde).
--
-- Día cero es la fecha de inicio que se elige al aplicarlo en la 5.2. Los días
-- hábiles se cuentan con el mismo calendario que el resto del módulo (festivos
-- de Colombia más los días no hábiles registrados), sin contar el día cero.
--
-- No es obligatorio ni se aplica solo: en la 5.2 se carga como propuesta, el
-- abogado la ajusta y la guarda. Nace vacío; Contratación lo llena desde
-- Configuración → Cronograma.
--
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hiring.cronograma_predeterminado (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidad   varchar(60) NOT NULL REFERENCES hiring.modalidades(codigo) ON DELETE CASCADE,
  numeral     varchar(20) REFERENCES hiring.actividades(numeral) ON DELETE CASCADE,
  nombre      varchar(200),
  etapa       smallint,
  dia_inicio  smallint CHECK (dia_inicio IS NULL OR dia_inicio BETWEEN 0 AND 730),
  dia_fin     smallint NOT NULL CHECK (dia_fin BETWEEN 0 AND 730),
  tipo_dias   varchar(10) NOT NULL DEFAULT 'HABILES' CHECK (tipo_dias IN ('HABILES', 'CALENDARIO')),
  dias_antes  smallint CHECK (dias_antes IS NULL OR dias_antes BETWEEN 0 AND 90),
  avisar_a    jsonb NOT NULL DEFAULT '["QUIEN_LA_HACE"]'::jsonb,
  canal       varchar(10) NOT NULL DEFAULT 'CAMPANA' CHECK (canal IN ('CAMPANA', 'CORREO', 'AMBOS')),
  correos     jsonb NOT NULL DEFAULT '[]'::jsonb,
  nota        text,
  updated_by  varchar(200),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_cronograma_predeterminado_origen CHECK (
    (numeral IS NOT NULL AND nombre IS NULL)
    OR (numeral IS NULL AND nombre IS NOT NULL AND etapa IS NOT NULL AND etapa BETWEEN 5 AND 10)
  ),
  CONSTRAINT ck_cronograma_predeterminado_dias CHECK (dia_inicio IS NULL OR dia_inicio <= dia_fin)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cronograma_predeterminado_actividad
  ON hiring.cronograma_predeterminado (modalidad, numeral)
  WHERE numeral IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_cronograma_predeterminado_modalidad
  ON hiring.cronograma_predeterminado (modalidad);

COMMENT ON TABLE hiring.cronograma_predeterminado IS
  'Cronograma predeterminado por modalidad (140): días desde el día cero y aviso por defecto; en la 5.2 se carga como propuesta';
COMMENT ON COLUMN hiring.cronograma_predeterminado.dia_inicio IS
  'Día en que empieza, contado desde el día cero (la fecha de inicio que se elige al aplicarlo); nulo si solo importa el fin';
COMMENT ON COLUMN hiring.cronograma_predeterminado.dia_fin IS
  'Día en que debe estar cumplida, contado desde el día cero';

COMMIT;
