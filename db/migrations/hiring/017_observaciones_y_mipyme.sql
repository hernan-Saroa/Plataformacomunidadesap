-- ============================================================================
-- 017 · Observaciones al proyecto de pliego y limitación a MIPYME
--
-- EFDS-1151 (RF-PUB-02). Dos cosas distintas que la historia agrupa porque
-- ocurren en la misma ventana: mientras el proyecto de pliego está publicado,
-- los interesados observan y las MIPYME manifiestan interés en participar.
--
-- Igual que en la publicación (016), no hay integración con SECOP II: las
-- observaciones llegan por allá y el gestor las transcribe con su soporte. Se
-- registra y se prueba; no se aparenta que se reciben.
--
-- Lo que sí decide el sistema aquí es poco y a propósito: calcula si se cumplen
-- las condiciones de la limitación y las pone delante de quien decide. La
-- limitación la decide la entidad, no el software.
-- ============================================================================

-- ------------------------------------------- observaciones al pliego (5.3) --
CREATE TABLE IF NOT EXISTS hiring.observaciones_pliego (
  id                  uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  proceso_id          uuid          NOT NULL REFERENCES hiring.procesos (id),

  -- Se ata a la publicación observada y no solo al proceso: si esa publicación
  -- se anula y se registra otra, cada una conserva las observaciones que
  -- recibió. Reasignarlas a la nueva falsearía el expediente.
  publicacion_id      uuid          NOT NULL REFERENCES hiring.publicaciones_pliego (id),

  presentado_por      varchar(200)  NOT NULL,
  -- NIT o cédula. Opcional: una observación anónima sigue siendo una
  -- observación y la entidad igual debe responderla.
  identificacion      varchar(60),

  -- Fecha en que el interesado la presentó, no la del registro: es la que
  -- decide si llegó en término, y el gestor la transcribe días después.
  fecha_presentacion  date          NOT NULL,

  asunto              varchar(300)  NOT NULL,
  contenido           text          NOT NULL,

  -- Se congela al registrar en vez de recalcularse: depende del vencimiento
  -- que tenía la publicación ese día, y ese dato no debe cambiar después.
  --
  -- Llegar tarde NO impide registrarla. Que una observación se presentara
  -- fuera de término es información del expediente; perderla sería peor que
  -- guardarla marcada.
  fuera_de_termino    boolean       NOT NULL DEFAULT false,

  -- Soporte de la observación tal como llegó. Opcional: puede haberse recibido
  -- por un canal que no deja documento.
  documento_id        uuid,
  registrado_por      varchar(160),

  -- ---- respuesta de la entidad
  respuesta           text,
  respondida_por      varchar(160),
  respondida_at       timestamptz,
  -- Si la observación llevó a cambiar el pliego. Es el dato que justifica una
  -- adenda posterior (EFDS-1154) y el que muestra que la observación sirvió.
  modifico_pliego     boolean,

  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  -- Una respuesta a medias no es una respuesta: o están los tres datos o no
  -- está ninguno.
  CONSTRAINT observacion_respuesta_completa CHECK (
    (respuesta IS NULL AND respondida_at IS NULL AND modifico_pliego IS NULL)
    OR (respuesta IS NOT NULL AND respondida_at IS NOT NULL AND modifico_pliego IS NOT NULL)
  )
);

COMMENT ON TABLE hiring.observaciones_pliego IS
  'Observaciones de interesados al proyecto de pliego publicado, con su respuesta (EFDS-1151).';

COMMENT ON COLUMN hiring.observaciones_pliego.fuera_de_termino IS
  'Congelado al registrar: si la fecha de presentación superó el vencimiento de la publicidad.';

CREATE INDEX IF NOT EXISTS idx_observacion_proceso
  ON hiring.observaciones_pliego (proceso_id);

-- Las pendientes son las que el riel tiene que poder contar sin recorrer todo.
CREATE INDEX IF NOT EXISTS idx_observacion_sin_responder
  ON hiring.observaciones_pliego (proceso_id)
  WHERE respondida_at IS NULL;

-- ------------------------------------- manifestaciones de interés MIPYME ----
CREATE TABLE IF NOT EXISTS hiring.manifestaciones_mipyme (
  id                  uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  proceso_id          uuid          NOT NULL REFERENCES hiring.procesos (id),

  nombre              varchar(200)  NOT NULL,
  -- Obligatoria, a diferencia de la observación: de contar cuántas MIPYME
  -- distintas manifestaron interés depende que la convocatoria se limite, y
  -- sin identificación no hay forma de saber si dos son la misma.
  identificacion      varchar(60)   NOT NULL,

  fecha_presentacion  date          NOT NULL,
  documento_id        uuid,
  registrado_por      varchar(160),

  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.manifestaciones_mipyme IS
  'Manifestaciones de interés de MIPYME en participar; su número decide la limitación (EFDS-1151).';

-- Una misma MIPYME no se cuenta dos veces: inflaría el conteo del que depende
-- la decisión de limitar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_manifestacion_unica_por_proceso
  ON hiring.manifestaciones_mipyme (proceso_id, identificacion);

-- ------------------------------------------ decisión de limitación (5.4) ----
CREATE TABLE IF NOT EXISTS hiring.limitaciones_mipyme (
  id                          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  proceso_id                  uuid          NOT NULL UNIQUE REFERENCES hiring.procesos (id),

  -- Lo que la entidad decidió.
  limitado                    boolean       NOT NULL,

  -- Lo que arrojó el cálculo cuando se decidió. Se guarda aparte de `limitado`
  -- porque la entidad puede apartarse del cálculo, y entonces hay que poder
  -- ver ambas cosas.
  condiciones_cumplidas       boolean       NOT NULL,

  -- Se congela todo lo que entró en el cálculo. Si mañana se corrigen los
  -- parámetros, esta decisión debe seguir explicándose con los que regían el
  -- día en que se tomó.
  manifestaciones_contadas    int           NOT NULL,
  valor_proceso               numeric(18, 2),
  tope_valor_aplicado         numeric(18, 2),
  unidad_tope_aplicada        varchar(10),
  minimo_manifestaciones      int,

  -- Obligatorio cuando la decisión se aparta del cálculo: apartarse es
  -- legítimo, hacerlo sin dejar constancia no.
  motivo                      text,

  -- Acto administrativo que sustenta la decisión.
  documento_id                uuid,

  decidido_por                varchar(160),
  decidido_at                 timestamptz   NOT NULL DEFAULT now(),
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT limitacion_discrepancia_motivada CHECK (
    limitado = condiciones_cumplidas OR motivo IS NOT NULL
  ),
  CONSTRAINT limitacion_conteo_no_negativo CHECK (manifestaciones_contadas >= 0)
);

COMMENT ON TABLE hiring.limitaciones_mipyme IS
  'Decisión de limitar o no la convocatoria a MIPYME, con las condiciones que se evaluaron (EFDS-1151).';

COMMENT ON COLUMN hiring.limitaciones_mipyme.condiciones_cumplidas IS
  'Lo que arrojó el cálculo. Puede diferir de `limitado`: la entidad decide, no el sistema.';

-- ------------------------------------------- parámetros de la limitación ----
-- En tabla y no en código por la misma razón que los umbrales y los plazos: son
-- cifras de negocio que cambian con la normativa.
--
-- Clave-valor y no columnas fijas porque cada parámetro lleva su propio
-- fundamento y su propia marca de confirmado: uno puede estar validado y el
-- otro no, y con columnas habría que confirmarlos en bloque.
CREATE TABLE IF NOT EXISTS hiring.parametros_mipyme (
  clave         varchar(40)    PRIMARY KEY,
  valor         numeric(18, 2) NOT NULL CHECK (valor > 0),
  -- SMMLV o PESOS para el tope; nula para el conteo, que no tiene unidad.
  unidad        varchar(10)    CHECK (unidad IS NULL OR unidad IN ('SMMLV', 'PESOS')),
  descripcion   varchar(200)   NOT NULL,
  fundamento    text,
  -- False mientras la Dirección de Contratación no confirme la cifra.
  confirmado    boolean        NOT NULL DEFAULT false,
  created_at    timestamptz    NOT NULL DEFAULT now(),
  updated_at    timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.parametros_mipyme IS
  'Condiciones que habilitan la limitación a MIPYME. Parametrizables (EFDS-1393).';

-- VALORES TENTATIVOS — los dos con confirmado = false.
--
-- La historia marca las reglas de aplicabilidad de MIPYME como supuesto a
-- validar y no trae ninguna cifra. Lo que se siembra aquí no garantiza el
-- número, sino que la cadena funcione punta a punta con datos coherentes.
-- Corregirlos es editar dos filas desde la pantalla de EFDS-1393.
--
-- El tope merece una advertencia aparte: el Decreto 1082 lo expresa en dólares
-- (USD 125.000), y convertirlo exige una tasa que ningún documento fuente fija.
-- Se siembra su equivalente aproximado en SMMLV para que el cálculo pueda
-- correr, pero ese número es una derivación del equipo, no una cifra oficial.
-- Cómo debe hacerse la conversión es justamente parte de EFDS-1391.
INSERT INTO hiring.parametros_mipyme (clave, valor, unidad, descripcion, fundamento, confirmado)
VALUES
  ('TOPE_VALOR', 300, 'SMMLV',
   'Valor máximo del proceso para que proceda la limitación',
   'TENTATIVO: el Decreto 1082 de 2015 (art. 2.2.1.2.4.2.2) expresa el tope en USD 125.000. El equivalente en SMMLV es una derivación del equipo a falta de una tasa de conversión definida. Por confirmar (EFDS-1391).',
   false),
  ('MINIMO_MANIFESTACIONES', 3, NULL,
   'Manifestaciones de interés de MIPYME distintas requeridas',
   'TENTATIVO: Decreto 1082 de 2015, art. 2.2.1.2.4.2.2. Por confirmar con la Dirección de Contratación (EFDS-1391).',
   false)
ON CONFLICT (clave) DO NOTHING;

-- --------------------------------------------------- actividades 5.3 y 5.4 --
-- Los numerales son decisión del equipo: la historia dice "5.x (observaciones)"
-- y no le da numeral propio a la limitación. Se toman los siguientes libres
-- después de la publicación (5.2) y se corrigen si la matriz dice otra cosa.
INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.3', 5, 'Observaciones al proyecto de pliego',
   'Recepción y respuesta de las observaciones que presentan los interesados durante la publicidad del proyecto de pliego.',
   30),
  ('5.4', 5, 'Limitación a MIPYME',
   'Registro de las manifestaciones de interés de MIPYME y decisión de limitar o no la convocatoria.',
   40)
ON CONFLICT (numeral) DO NOTHING;

-- Solo las dos exclusiones que los documentos fuente dejan sin duda, por la
-- misma razón que en 012, 013 y 016: sin proyecto de pliego publicado no hay
-- qué observar ni convocatoria que limitar.
--
-- En qué otras modalidades no aplica la limitación es parte de EFDS-1391: la
-- historia dice "modalidades con etapa de observaciones", que no es lo mismo
-- que "modalidades con pliego", y adivinarlo escondería una actividad que la
-- ley sí exige.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
SELECT a.numeral, m.modalidad, m.motivo
  FROM (VALUES
         ('CONTRATACION_DIRECTA',
          'Sin convocatoria ni proyecto de pliego publicado: no hay observaciones que recibir ni participación que limitar'),
         ('REGIMEN_ESPECIAL_092',
          'El régimen especial del Decreto 092 de 2017 no elabora ni publica los documentos ordinarios del proceso')
       ) AS m(modalidad, motivo)
 CROSS JOIN (VALUES ('5.3'), ('5.4')) AS a(numeral)
ON CONFLICT DO NOTHING;
