-- ============================================================================
-- 040 · Publicación del contrato (actividad 8.8)
--
-- EFDS-1166 (RF-LEG-05): perfeccionado y legalizado el contrato, la entidad lo
-- publica dentro del plazo legal.
--
-- Hay una discrepancia entre las fuentes que conviene dejar dicha: la historia
-- habla de publicar «en SECOP II», mientras que la matriz llama a la actividad
-- 8.8 «Publicación en página web ESAP». Son dos sitios distintos, y la
-- descripción de la matriz es solo el número «150», sin unidad ni contexto.
--
-- Se modela una publicación con su destino, porque es lo que reconcilia las dos
-- lecturas sin decidir por Contratación: si resultan ser dos publicaciones
-- distintas, cada una queda registrada con su sitio; si es una sola, sobra una
-- columna. Lo contrario —elegir un sitio y descartar el otro— obligaría a
-- migrar datos cuando se aclare.
--
-- El plazo se parametriza como los de publicidad (migración 016) y por la misma
-- razón: la cifra legal se confirma con la Dirección de Contratación, y hasta
-- entonces se marca como no confirmada en vez de darla por buena.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.plazo_publicacion_contrato (
  id             int          PRIMARY KEY DEFAULT 1,
  dias_habiles   int          NOT NULL,
  fundamento     text,
  -- False mientras la Dirección de Contratación no valide el número: un plazo
  -- sin confirmar se muestra advertido, no como si fuera cierto.
  confirmado     boolean      NOT NULL DEFAULT false,
  actualizado_at timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_plazo_contrato_unico CHECK (id = 1),
  CONSTRAINT ck_plazo_contrato_dias CHECK (dias_habiles > 0)
);

-- VALOR TENTATIVO. El artículo 2.2.1.1.1.7.1 del Decreto 1082 de 2015 da tres
-- días hábiles desde la expedición del documento para publicar en el SECOP. La
-- matriz dice «150» sin unidad, que no encaja con ningún plazo conocido, así
-- que se siembra el legal y queda sin confirmar hasta que Contratación lo diga.
INSERT INTO hiring.plazo_publicacion_contrato (id, dias_habiles, fundamento, confirmado)
VALUES (
  1, 3,
  'Decreto 1082 de 2015, art. 2.2.1.1.1.7.1 — tentativo: la matriz indica «150» sin unidad y debe confirmarse con la Dirección de Contratación.',
  false
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE hiring.plazo_publicacion_contrato IS
  'Plazo para publicar el contrato, parametrizable y marcado si está sin confirmar (EFDS-1166).';

-- ------------------------------------------------------ la publicación --
CREATE TABLE IF NOT EXISTS hiring.publicaciones_contrato (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Dónde se publicó. La historia dice SECOP II y la matriz dice la página web
  -- de la ESAP: se registra el sitio en vez de suponer cuál de las dos manda.
  destino             varchar(20)  NOT NULL,

  -- Fecha real de la publicación, no la del registro: es la que cuenta para el
  -- plazo. Alguien puede registrar el lunes lo que publicó el viernes.
  fecha_publicacion   date         NOT NULL,

  -- Plazo vigente el día del registro, congelado. Si mañana cambia el
  -- parámetro, esta publicación se siguió juzgando con el de su momento.
  plazo_dias_habiles  int,
  fecha_limite        date,

  secop_numero        varchar(80),
  secop_url           text,

  -- La evidencia es obligatoria: sin soporte no hay publicación registrada,
  -- solo la afirmación de que se hizo.
  documento_id        uuid         NOT NULL REFERENCES hiring.documentos(id),

  publicado_por       varchar(200),
  created_at          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_publicacion_contrato_destino CHECK (destino IN ('SECOP_II', 'WEB_ESAP')),
  -- El plazo y su fecha límite van juntos o no van: uno sin el otro dejaría el
  -- control a medias.
  CONSTRAINT ck_publicacion_contrato_plazo CHECK (
    (plazo_dias_habiles IS NULL) = (fecha_limite IS NULL)
  ),
  -- Una sola publicación por destino: registrar dos veces el mismo sitio sería
  -- contar dos veces el mismo hecho.
  CONSTRAINT uq_publicacion_contrato_destino UNIQUE (contrato_id, destino)
);

CREATE INDEX IF NOT EXISTS ix_publicaciones_contrato
  ON hiring.publicaciones_contrato (contrato_id);

COMMENT ON TABLE hiring.publicaciones_contrato IS
  'Publicaciones del contrato con su destino, evidencia y control de plazo (EFDS-1166).';
