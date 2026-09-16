-- ============================================================================
-- 024 · Recepción de ofertas y cierre del proceso (actividad 6.1)
--
-- EFDS-1155 (RF-PUB-05): vencido el plazo de ofertas, el gestor cierra la
-- recepción y con ello queda publicada la lista de oferentes.
--
-- Primera actividad de la etapa 6. Hasta aquí el módulo llegaba a la apertura
-- (5.7): el proceso quedaba abierto y no había dónde registrar lo que entraba.
--
-- Abierta y cerrada son dos estados y no un booleano de más: mientras la
-- recepción está abierta se agregan oferentes, y el cierre congela la lista.
-- Esa diferencia es la que decide si una oferta todavía puede registrarse, y
-- es también la que da sentido a "publicar la lista": antes del cierre la
-- lista es provisional, después es el registro formal de lo que se recibió.
--
-- El numeral es el primero de la etapa, con el criterio de la migración 016.
-- Si la matriz oficial dice otro, se corrige aquí.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('6.1', 6, 'Recepción de ofertas y cierre del proceso',
   'Registro de las ofertas recibidas dentro del plazo y cierre de la recepción al vencimiento, que publica la lista de oferentes.',
   10)
ON CONFLICT (numeral) DO NOTHING;

-- Las mismas dos exclusiones de la publicación y la apertura (016, 020): sin
-- proceso de selección no hay ofertas que recibir.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('6.1', 'CONTRATACION_DIRECTA',
   'La contratación directa se adjudica sin convocatoria, así que no hay ofertas que recibir ni lista que publicar'),
  ('6.1', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la recepción ordinaria de ofertas')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------ plazo de ofertas por modalidad
-- Parametrizable por la misma razón que los umbrales (009) y los plazos de
-- publicidad (016): el término lo fija la normativa y cambia con ella.
--
-- OJO: este plazo no es el de publicidad del pliego. Aquel corre antes de la
-- apertura, es informativo y no bloquea nada; este corre después de ella y es
-- el que decide si una oferta llegó a tiempo y si el proceso puede cerrarse.
CREATE TABLE IF NOT EXISTS hiring.plazos_ofertas (
  modalidad     varchar(60)  PRIMARY KEY REFERENCES hiring.modalidades (codigo),
  dias_habiles  int          NOT NULL CHECK (dias_habiles > 0),
  -- De dónde sale el número, con el mismo criterio de la 016.
  fundamento    text,
  -- False mientras la Dirección de Contratación no confirme el plazo.
  confirmado    boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.plazos_ofertas IS
  'Días hábiles de recepción de ofertas por modalidad, contados desde la apertura (EFDS-1155).';

-- Ninguno de estos plazos está en los documentos fuente: la historia da por
-- supuesto que el proceso "tiene plazo de ofertas vigente" pero no dice de
-- cuánto ni quién lo fija. Entran como supuesto del equipo, sin confirmar, para
-- que el flujo funcione punta a punta; corregir uno es actualizar una fila.
-- Queda subtarea abierta para que la Dirección de Contratación los ratifique.
INSERT INTO hiring.plazos_ofertas (modalidad, dias_habiles, fundamento, confirmado) VALUES
  ('LICITACION_PUBLICA',        10, 'Supuesto del equipo, sin validar', false),
  ('ABREVIADA_MENOR_CUANTIA',    5, 'Supuesto del equipo, sin validar', false),
  ('ABREVIADA_SUBASTA_INVERSA',  5, 'Supuesto del equipo, sin validar', false),
  ('ABREVIADA_BOLSA_MERCANTIL',  5, 'Supuesto del equipo, sin validar', false),
  ('CONCURSO_MERITOS_ABIERTO',   8, 'Supuesto del equipo, sin validar', false),
  ('CONCURSO_MERITOS_PRECAL',    8, 'Supuesto del equipo, sin validar', false),
  ('MINIMA_CUANTIA',             1, 'Supuesto del equipo, sin validar', false)
ON CONFLICT (modalidad) DO NOTHING;

-- Selección abreviada por TVEC y enajenación por subasta se dejan SIN plazo, con
-- el mismo criterio de la 016: la primera compra por acuerdo marco y la segunda
-- recibe posturas en subasta, y en ninguna la recepción de ofertas es la de un
-- proceso ordinario. Sin fila, la pantalla dice "plazo no parametrizado" en vez
-- de inventarse un número.

-- ------------------------------------------------------ recepción de ofertas
CREATE TABLE IF NOT EXISTS hiring.recepciones_ofertas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- Con hora, a diferencia del resto de fechas del módulo: las ofertas se
  -- reciben "hasta las 10:00 a.m. del día X", y una oferta radicada esa misma
  -- mañana llega a tiempo mientras que la de la tarde no. Guardar solo el día
  -- haría indistinguibles los dos casos, que es justo lo que se discute cuando
  -- un oferente reclama.
  vencimiento           timestamptz NOT NULL,

  -- Se congelan el plazo aplicado y su vencimiento en vez de recalcularlos en
  -- cada consulta, igual que en publicaciones_pliego (016): si mañana se corrige
  -- el plazo de la modalidad, los procesos ya abiertos conservan el suyo.
  -- Nulo cuando la modalidad no tiene plazo parametrizado y la fecha se fijó a
  -- mano en la apertura.
  plazo_dias_habiles    int,

  estado                varchar(20) NOT NULL DEFAULT 'ABIERTA',
  cerrada_at            timestamptz,
  cerrada_por           varchar(200),
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_recepcion_estado CHECK (estado IN ('ABIERTA', 'CERRADA')),
  -- Una recepción cerrada tiene siempre cuándo se cerró: es la fecha con la que
  -- queda publicada la lista, y sin ella no habría cómo probar que el cierre
  -- ocurrió después del vencimiento.
  CONSTRAINT ck_recepcion_cerrada CHECK (
    estado <> 'CERRADA' OR cerrada_at IS NOT NULL
  ),
  -- Un proceso recibe ofertas una sola vez. En la base y no solo en el servicio
  -- porque una segunda recepción dejaría dos listas de oferentes para el mismo
  -- proceso, sin forma de saber cuál es la publicada.
  CONSTRAINT uq_recepcion_proceso UNIQUE (proceso_id)
);

COMMENT ON TABLE hiring.recepciones_ofertas IS
  'Plazo de recepción de ofertas de cada proceso y su cierre (EFDS-1155).';

COMMENT ON COLUMN hiring.recepciones_ofertas.vencimiento IS
  'Fecha y hora hasta la que se reciben ofertas. Se fija en la apertura del proceso.';

-- --------------------------------------------------------------- oferentes
CREATE TABLE IF NOT EXISTS hiring.oferentes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id          uuid        NOT NULL REFERENCES hiring.recepciones_ofertas(id) ON DELETE CASCADE,

  -- Consecutivo dentro de la recepción: la lista publicada numera las ofertas
  -- por orden de llegada, y ese número es relativo al proceso, no global.
  numero                integer     NOT NULL,
  nombre                varchar(200) NOT NULL,
  identificacion        varchar(40)  NOT NULL,

  -- La de radicación, no la del registro. El gestor transcribe lo que recibió,
  -- con su soporte: no hay integración con SECOP II ni está prevista, así que
  -- la plataforma no puede saber por su cuenta cuándo llegó una oferta.
  fecha_radicacion      timestamptz NOT NULL,
  soporte_documento_id  uuid        NOT NULL REFERENCES hiring.documentos(id),
  registrado_por        varchar(200),
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_oferente_numero UNIQUE (recepcion_id, numero),
  -- Un mismo oferente no presenta dos ofertas al mismo proceso. Si se equivocó
  -- y la corrige, se retira la anterior; dos filas con el mismo NIT dejarían la
  -- lista publicada diciendo que concurrieron dos que son el mismo.
  CONSTRAINT uq_oferente_identificacion UNIQUE (recepcion_id, identificacion)
);

CREATE INDEX IF NOT EXISTS ix_oferentes_recepcion
  ON hiring.oferentes (recepcion_id, numero);

COMMENT ON TABLE hiring.oferentes IS
  'Ofertas recibidas dentro del plazo, con su soporte. Al cerrar la recepción componen la lista publicada (EFDS-1155).';

COMMENT ON COLUMN hiring.oferentes.fecha_radicacion IS
  'Fecha y hora en que la oferta se radicó ante la entidad, no la del registro en la plataforma.';
