-- ============================================================================
-- 042 · Reunión y acta de inicio del contrato (actividad 9.1)
--
-- EFDS-1167 (RF-EJE-01): legalizado el contrato y designado su supervisor, las
-- partes se reúnen, socializan alcance, cronograma y entregables, y suscriben
-- el acta que da comienzo formal a la ejecución.
--
-- Número 042 y no 041 como dice la subtarea: la 041 ya la ocupó la declaratoria
-- desierta (EFDS-1160) en la línea de las etapas 6 y 7, que avanzó en paralelo
-- a la etapa 8. Ver la sección «Duplicados históricos» del README: aquí se
-- evita sumar un choque más.
--
-- El acta no se borra, se anula, con el criterio del resto del módulo: un acta
-- suscrita fijó la fecha desde la que corre el plazo del contrato, y si estaba
-- mal hay que poder decir que estaba mal, no hacer como si nunca hubiera
-- existido.
-- ============================================================================

-- ------------------------------------------------- el contrato en ejecución --

-- Sexto estado del ciclo: GENERADO → ACEPTADO → PERFECCIONADO → LEGALIZADO →
-- EJECUCION, con RECHAZADO como salida temprana. Lo deriva el servicio al
-- suscribir el acta; nadie lo declara a mano.
ALTER TABLE hiring.contratos
  DROP CONSTRAINT IF EXISTS ck_contrato_estado;

ALTER TABLE hiring.contratos
  ADD CONSTRAINT ck_contrato_estado CHECK (
    estado IN ('GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO', 'LEGALIZADO', 'EJECUCION')
  );

-- Cuándo empezó a ejecutarse. Columna propia y no derivada del acta vigente
-- porque es la pregunta que hará cada consulta de la etapa 9 —¿este contrato
-- está corriendo?— y resolverla con un join a cada paso es gratuito de evitar.
ALTER TABLE hiring.contratos
  ADD COLUMN IF NOT EXISTS en_ejecucion_at timestamptz;

COMMENT ON COLUMN hiring.contratos.en_ejecucion_at IS
  'Cuándo se suscribió el acta que dio inicio a la ejecución (EFDS-1167).';

-- ---------------------------------------------------------- el acta misma --

CREATE TABLE IF NOT EXISTS hiring.actas_inicio (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id          uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- El acta firmada por las dos partes. Sin ella hubo una reunión, no un
  -- inicio: es el documento el que da comienzo formal a la ejecución.
  acta_documento_id    uuid         NOT NULL REFERENCES hiring.documentos(id),

  -- Cuándo se reunieron. Puede ser anterior a la suscripción del acta: se
  -- reúnen, levantan el acta y la firman, y no siempre el mismo día.
  fecha_reunion        date         NOT NULL,

  -- Desde cuándo corre el plazo del contrato. Es el dato que de verdad importa
  -- de esta actividad, y por eso va aparte de la fecha de la reunión: el acta
  -- puede pactar que la ejecución empiece otro día.
  fecha_inicio         date         NOT NULL,

  -- Quiénes asistieron y qué se socializó. La matriz pide en 9.1 «socialización
  -- de alcance, cronograma y entregables», y eso es lo que el acta prueba.
  asistentes           text,
  compromisos          text,

  suscrita_por         varchar(200),

  estado               varchar(20)  NOT NULL DEFAULT 'VIGENTE',
  created_at           timestamptz  NOT NULL DEFAULT now(),

  anulada_at           timestamptz,
  anulada_por          varchar(200),
  motivo_anulacion     text,

  CONSTRAINT ck_acta_inicio_estado CHECK (estado IN ('VIGENTE', 'ANULADA')),
  -- Un acta anulada dice siempre cuándo y por qué: es lo que explica que un
  -- contrato tenga dos actas y dos fechas de inicio distintas.
  CONSTRAINT ck_acta_inicio_anulada CHECK (
    estado <> 'ANULADA'
    OR (anulada_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  ),
  -- No se ejecuta antes de reunirse. El acta puede diferir el inicio hacia
  -- adelante —«la ejecución comienza el primero del mes entrante»— pero no
  -- hacia atrás de la reunión que la produjo.
  CONSTRAINT ck_acta_inicio_fechas CHECK (fecha_inicio >= fecha_reunion)
);

-- Un acta vigente por contrato, y tantas anuladas como haga falta. Índice
-- parcial y no UNIQUE a secas, con el mismo criterio de las supervisiones
-- (migración 038): rehacer un acta es anular la anterior y suscribir otra, y
-- las dos tienen que quedar en el expediente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_acta_inicio_vigente
  ON hiring.actas_inicio (contrato_id)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_actas_inicio_contrato
  ON hiring.actas_inicio (contrato_id);

COMMENT ON TABLE hiring.actas_inicio IS
  'Reunión y acta que dan comienzo formal a la ejecución del contrato (EFDS-1167).';
