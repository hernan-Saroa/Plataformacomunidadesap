-- ============================================================================
-- 037 · Traslado del informe de evaluación y subsanaciones (actividades 6.4 a 6.6)
--
-- EFDS-1158 (RF-PUB-08): evaluadas las ofertas, la entidad publica el informe,
-- lo traslada a los oferentes y abre el término para que subsanen y observen.
-- Es el debido proceso previo a la adjudicación: sin traslado, el oferente se
-- entera de que quedó fuera cuando ya no puede hacer nada.
--
-- Las actividades 6.4, 6.5 y 6.6 NO se insertan aquí: ya las trae la matriz
-- oficial desde la 030, con su nombre y su aplicabilidad por modalidad. La 036
-- dejó escrito que de la 6.4 en adelante manda la matriz, y esta migración se
-- atiene a eso. El "informe de evaluación preliminar" que la matriz numera 6.3
-- se elabora dentro de la 6.4, porque ese numeral lo ocupa la evaluación.
--
-- La decisión que gobierna el modelo: **el informe congela su resultado**. La
-- consolidación de EFDS-1442 se calcula al consultarla, y así debe ser mientras
-- se evalúa —corregir un juicio tiene que reflejarse solo—. Pero lo que se
-- traslada es una pieza notificada: si mañana un evaluador corrige algo, el
-- informe que recibió el oferente no puede cambiar detrás de él. Se guarda tal
-- como estaba el día del traslado, y lo que se mueve es la consolidación viva.
-- ============================================================================

-- ------------------------------------------- plazo de traslado por modalidad --
-- Parametrizable por la misma razón que los umbrales (010), los plazos de
-- publicidad (016) y los de ofertas (024): el término lo fija la normativa y
-- cambia con ella.

CREATE TABLE IF NOT EXISTS hiring.plazos_traslado (
  modalidad     varchar(60)  PRIMARY KEY REFERENCES hiring.modalidades (codigo),
  dias_habiles  int          NOT NULL CHECK (dias_habiles > 0),
  fundamento    text,
  -- False mientras la Dirección de Contratación no confirme el plazo.
  confirmado    boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.plazos_traslado IS
  'Días hábiles de traslado del informe de evaluación por modalidad, contados desde su publicación (EFDS-1158).';

-- NINGUNO de estos plazos sale de los documentos fuente. RF-PUB-08 dice
-- "traslado con plazos por modalidad" y no cifra ninguno; la matriz de flujo
-- describe la actividad sin términos. Entran como supuesto del equipo, sin
-- confirmar, para que el flujo funcione punta a punta. Corregir uno es
-- actualizar una fila; queda EFDS-1467 abierta para que Contratación los
-- ratifique.
INSERT INTO hiring.plazos_traslado (modalidad, dias_habiles, fundamento, confirmado) VALUES
  ('LICITACION_PUBLICA',        5, 'Supuesto del equipo, sin validar', false),
  ('ABREVIADA_MENOR_CUANTIA',   3, 'Supuesto del equipo, sin validar', false),
  ('ABREVIADA_SUBASTA_INVERSA', 3, 'Supuesto del equipo, sin validar', false),
  ('ABREVIADA_BOLSA_MERCANTIL', 3, 'Supuesto del equipo, sin validar', false),
  ('CONCURSO_MERITOS_ABIERTO',  3, 'Supuesto del equipo, sin validar', false),
  ('CONCURSO_MERITOS_PRECAL',   3, 'Supuesto del equipo, sin validar', false),
  ('MINIMA_CUANTIA',            1, 'Supuesto del equipo, sin validar', false)
ON CONFLICT (modalidad) DO NOTHING;

-- TVEC y enajenación por subasta se dejan sin fila, con el mismo criterio de la
-- 024: la primera compra por catálogo del acuerdo marco y la segunda adjudica
-- en subasta, y en ninguna hay informe de evaluación que trasladar como en un
-- proceso ordinario. Sin fila, la pantalla dice "plazo no parametrizado" en vez
-- de inventar un término.

-- ------------------------------------------------ informe de evaluación ------

CREATE TABLE IF NOT EXISTS hiring.informes_evaluacion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- Consecutivo dentro del proceso: si un informe se anula y se traslada otro,
  -- los dos quedan en el expediente y se distinguen por su número.
  numero                int         NOT NULL,

  -- El consolidado tal como estaba al generarlo: qué ofertas quedaron
  -- habilitadas, cuáles no y por qué criterio, y el puntaje de cada una.
  --
  -- En jsonb y no en tablas normalizadas a propósito. Esto no es un dato vivo
  -- que se consulte y se cruce, sino la fotografía de lo que se notificó: si
  -- mañana cambia la forma del consolidado, o se retira un criterio del
  -- catálogo, el informe trasladado tiene que seguir leyéndose igual. Con
  -- claves foráneas a los criterios, retirar uno rompería el expediente.
  resultado             jsonb       NOT NULL,

  -- Cuántas ofertas quedaron habilitadas al generarlo. Sale del resultado, pero
  -- se guarda aparte porque es la pregunta que decide si el proceso sigue o se
  -- declara desierto (EFDS-1160), y no se responde escarbando un jsonb.
  ofertas_habilitadas   int         NOT NULL DEFAULT 0,

  estado                varchar(20) NOT NULL DEFAULT 'BORRADOR',

  informe_documento_id  uuid        REFERENCES hiring.documentos(id),
  -- Evidencia de la publicación, como en publicaciones_pliego (016): no hay
  -- integración con SECOP II, así que lo que prueba la publicación es el
  -- soporte que carga el gestor.
  evidencia_documento_id uuid       REFERENCES hiring.documentos(id),

  generado_por          varchar(120),
  generado_at           timestamptz NOT NULL DEFAULT now(),

  trasladado_por        varchar(120),
  trasladado_at         timestamptz,

  -- Se congelan el plazo aplicado y su vencimiento en vez de recalcularlos en
  -- cada consulta, igual que en las recepciones de ofertas (024): si mañana se
  -- corrige el plazo de la modalidad, los traslados en curso conservan el suyo.
  plazo_dias_habiles    int,
  -- Solo día, sin hora, a diferencia del plazo de ofertas: el término de
  -- traslado se cuenta en días hábiles y vence al final del día.
  vence_el              date,

  cerrado_por           varchar(120),
  cerrado_at            timestamptz,

  anulado_at            timestamptz,
  motivo_anulacion      text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_informe_numero UNIQUE (proceso_id, numero),
  CONSTRAINT ck_informe_estado CHECK (
    estado IN ('BORRADOR', 'TRASLADADO', 'CERRADO', 'ANULADO')
  ),
  -- Un informe trasladado sin fecha ni vencimiento sería un traslado que no se
  -- puede probar ni contar.
  CONSTRAINT ck_informe_traslado CHECK (
    estado NOT IN ('TRASLADADO', 'CERRADO')
    OR (trasladado_at IS NOT NULL AND vence_el IS NOT NULL)
  ),
  CONSTRAINT ck_informe_anulacion CHECK (
    estado <> 'ANULADO' OR (anulado_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  )
);

COMMENT ON TABLE hiring.informes_evaluacion IS
  'Informe de evaluación del proceso, con el consolidado congelado al momento de trasladarlo (EFDS-1158).';

-- Un solo informe en juego por proceso. Los anulados no cuentan: son los que
-- explican por qué hubo que rehacerlo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_informe_vigente
  ON hiring.informes_evaluacion (proceso_id)
  WHERE estado <> 'ANULADO';

-- ------------------------------------- subsanaciones y observaciones ---------

CREATE TABLE IF NOT EXISTS hiring.subsanaciones (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id            uuid        NOT NULL REFERENCES hiring.informes_evaluacion(id) ON DELETE CASCADE,

  -- Cuelga del informe y del oferente: del informe porque se presenta contra
  -- un traslado concreto, y del oferente porque es lo que permite reevaluar su
  -- oferta con lo aportado.
  oferente_id           uuid        NOT NULL REFERENCES hiring.oferentes(id) ON DELETE CASCADE,

  -- SUBSANACION aporta lo que faltaba y puede cambiar la habilitación;
  -- OBSERVACION cuestiona la evaluación, propia o de otro. No son lo mismo y no
  -- se responden igual: guardarlas en una sola etiqueta obligaría a adivinar.
  tipo                  varchar(20) NOT NULL,

  presentado_por        varchar(200) NOT NULL,
  identificacion        varchar(60),

  -- La fecha en que el oferente lo presentó, no la del registro: es la que
  -- decide si llegó en término, y el gestor puede transcribirlo días después.
  fecha_presentacion    date        NOT NULL,

  -- Se guarda resuelto y no se calcula al consultar, por la misma razón que el
  -- vencimiento se congela: si el plazo del informe se corrige, lo que ya se
  -- calificó de extemporáneo no puede cambiar de estado solo.
  --
  -- Extemporáneo NO significa rechazado: la entidad decide si lo acepta, y el
  -- sistema no puede borrar el hecho de que el oferente sí presentó algo.
  extemporanea          boolean     NOT NULL DEFAULT false,

  asunto                varchar(300) NOT NULL,
  contenido             text        NOT NULL,
  soporte_documento_id  uuid        NOT NULL REFERENCES hiring.documentos(id),

  -- La respuesta de la entidad. La matriz pide documento por dimensión
  -- —jurídico, financiero y técnico—, así que la respuesta puede traer el suyo.
  respuesta             text,
  respuesta_documento_id uuid       REFERENCES hiring.documentos(id),
  -- Nulo mientras no se responde. True: se aceptó, y el comité puede corregir
  -- su juicio con lo aportado.
  aceptada              boolean,
  respondida_por        varchar(120),
  respondida_at         timestamptz,

  registrado_por        varchar(120),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_subsanacion_tipo CHECK (tipo IN ('SUBSANACION', 'OBSERVACION')),
  -- Responder es decir qué se decidió y dejarlo firmado: media respuesta no
  -- sirve para sustentar el informe definitivo.
  CONSTRAINT ck_subsanacion_respuesta CHECK (
    (aceptada IS NULL AND respondida_at IS NULL)
    OR (aceptada IS NOT NULL AND respondida_at IS NOT NULL AND respuesta IS NOT NULL)
  )
);

COMMENT ON TABLE hiring.subsanaciones IS
  'Subsanaciones y observaciones que presentan los oferentes durante el traslado del informe (EFDS-1158).';

CREATE INDEX IF NOT EXISTS ix_subsanaciones_informe
  ON hiring.subsanaciones (informe_id, oferente_id);
