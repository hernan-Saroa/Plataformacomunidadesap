-- ============================================================================
-- 023 · Adendas del proceso (actividad 5.6)
--
-- EFDS-1154 (RF-DOC-06): el gestor emite adendas a requisitos de fondo y a
-- cronograma, las registra en el expediente y las publica. Al publicarse, una
-- adenda de cronograma mueve las fechas del proceso.
--
-- Emitida y publicada son dos estados distintos y no un booleano de más: la
-- historia dice que el sistema "la registra, la asocia al proceso y permite su
-- publicación". Una adenda emitida ya existe —tiene consecutivo y documento
-- firmado— pero todavía no produce efectos, y esa diferencia es la que decide
-- cuándo se mueve el cronograma.
--
-- El numeral es el siguiente disponible de la etapa, con el criterio de la
-- migración 016. Si la matriz oficial dice otro, se corrige aquí.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.6', 5, 'Adendas del proceso',
   'Modificaciones al pliego publicado: adendas a requisitos de fondo y adendas de cronograma. Cada una se emite con su documento firmado y se publica con su evidencia.',
   60)
ON CONFLICT (numeral) DO NOTHING;

-- Mismas exclusiones que la publicación (016): sin pliego publicado no hay nada
-- que adendar.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('5.6', 'CONTRATACION_DIRECTA',
   'La contratación directa no publica pliego, así que no hay documento público que modificar por adenda'),
  ('5.6', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la publicación ordinaria ni sus adendas')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Las adendas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hiring.adendas (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id              uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  -- Consecutivo dentro del proceso: las adendas se citan por su número
  -- ("adenda 2"), y ese número es relativo al proceso, no global.
  numero                  integer     NOT NULL,
  tipo                    varchar(20) NOT NULL,
  objeto                  text        NOT NULL,
  documento_id            uuid        NOT NULL REFERENCES hiring.documentos(id),
  estado                  varchar(20) NOT NULL DEFAULT 'EMITIDA',
  emitida_por             varchar(200),
  created_at              timestamptz NOT NULL DEFAULT now(),

  -- Publicación
  fecha_publicacion       date,
  evidencia_documento_id  uuid REFERENCES hiring.documentos(id),
  publicada_por           varchar(200),

  -- Solo en las de cronograma: de qué fecha a qué fecha se movió el plazo. Se
  -- guardan las dos para que el expediente muestre el cambio, no solo el
  -- resultado; con la nueva sola no habría forma de saber qué se prorrogó.
  vencimiento_anterior    date,
  vencimiento_nuevo       date,

  anulada_at              timestamptz,
  anulada_por             varchar(200),
  motivo_anulacion        text,

  CONSTRAINT ck_adenda_tipo CHECK (tipo IN ('FONDO', 'CRONOGRAMA')),
  CONSTRAINT ck_adenda_estado CHECK (estado IN ('EMITIDA', 'PUBLICADA', 'ANULADA')),
  -- Una adenda publicada tiene siempre fecha y evidencia: sin soporte no hay
  -- prueba de que la publicación ocurrió, igual que en la actividad 5.2.
  CONSTRAINT ck_adenda_publicada CHECK (
    estado <> 'PUBLICADA'
    OR (fecha_publicacion IS NOT NULL AND evidencia_documento_id IS NOT NULL)
  ),
  -- Y una de cronograma publicada tiene siempre la fecha nueva que aplicó.
  CONSTRAINT ck_adenda_cronograma CHECK (
    NOT (tipo = 'CRONOGRAMA' AND estado = 'PUBLICADA') OR vencimiento_nuevo IS NOT NULL
  ),
  CONSTRAINT uq_adenda_numero UNIQUE (proceso_id, numero)
);

CREATE INDEX IF NOT EXISTS ix_adendas_proceso ON hiring.adendas (proceso_id, numero);

COMMENT ON TABLE hiring.adendas IS
  'Adendas de fondo y de cronograma del proceso, con su emisión y su publicación (EFDS-1154).';

COMMENT ON COLUMN hiring.adendas.vencimiento_anterior IS
  'Vencimiento del plazo de publicidad antes de aplicar la adenda de cronograma.';
