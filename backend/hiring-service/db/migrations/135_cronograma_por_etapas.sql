-- ============================================================================
-- 135 · Cronograma del proceso por etapas macro, con alertas de vencimiento
-- ============================================================================
-- Pedido del 2026-10-29: en la elaboración del cronograma (5.2) se fija, para
-- cada etapa macro que falta (5 a 10), hasta cuándo debería estar cumplida.
-- No es obligatorio: la 5.2 se sigue cumpliendo con el soporte del cronograma,
-- y un proceso sin fechas por etapa no alerta nada.
--
-- No guarda si la etapa se cumplió: se deriva. Una etapa se da por cumplida
-- cuando el proceso ya aprobó alguna actividad de una etapa posterior, o
-- cuando el proceso terminó (desierto, negado, cancelado, contrato liquidado o
-- cerrado). Guardarlo obligaría a alguien a acordarse de marcarlo, y una
-- marca olvidada es una alerta que no sale.
--
-- `anticipacion_cronograma` en `parametros_alerta`: cuántos días antes del fin
-- de una etapa empieza a alertar. Cinco, como supuesto del equipo.
--
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hiring.cronograma_etapas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id      uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  etapa           smallint NOT NULL CHECK (etapa BETWEEN 1 AND 10),
  fecha_inicio    date,
  fecha_fin       date NOT NULL,
  nota            text,
  updated_by      varchar(200),
  updated_by_id   varchar(100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cronograma_etapa UNIQUE (proceso_id, etapa),
  CONSTRAINT ck_cronograma_fechas CHECK (fecha_inicio IS NULL OR fecha_inicio <= fecha_fin)
);

COMMENT ON TABLE hiring.cronograma_etapas IS
  'Fechas del cronograma del proceso por etapa macro (5.2); opcional, alimenta la alerta CRONOGRAMA_ETAPA';

INSERT INTO hiring.parametros_alerta (clave, valor, minimo, maximo, descripcion)
VALUES ('anticipacion_cronograma', 5, 1, 60,
        'Días antes del fin de una etapa del cronograma en que se empieza a alertar')
ON CONFLICT (clave) DO NOTHING;

COMMIT;
