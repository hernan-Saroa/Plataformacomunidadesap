-- ============================================================================
-- 040 · Adjudicación del proceso (etapa 7, actividades 7.1 a 7.4)
--
-- EFDS-1159 (RF-ADJ-01): cerrado el traslado, la entidad celebra la audiencia
-- —donde en obra pública se abre el sobre económico—, produce el informe de
-- evaluación definitivo y adjudica por acto administrativo del Ordenador del
-- Gasto. Es el desenlace del proceso: lo que sigue es contrato.
--
-- Las actividades 7.1, 7.2, 7.3 y 7.4 NO se insertan aquí: ya las trae la
-- matriz oficial desde la 030, con su nombre y su aplicabilidad por modalidad.
-- La 036 dejó escrito que de la 6.4 en adelante manda la matriz, y esta
-- migración se atiene a eso. A diferencia de las etapas 5 y 6, cuyos numerales
-- eligió el equipo, los de la etapa 7 salen de la matriz.
--
-- Dos decisiones gobiernan el modelo:
--
-- 1. **El informe definitivo congela su resultado**, igual que el preliminar
--    (039). Pero toma el resultado *vigente* del comité y no el que se congeló
--    al trasladar: si el comité rectificó a raíz de una subsanación aceptada,
--    adjudicar sobre la foto vieja sería adjudicar contra lo que la propia
--    entidad aceptó. Cada informe fotografía lo que era cierto el día en que
--    se notificó, y son días distintos.
--
-- 2. **El adjudicatario es una oferta del proceso**, con clave foránea a
--    `hiring.oferentes`. Un nombre escrito a mano en el acto de adjudicación es
--    exactamente el error que no se puede cometer aquí.
--
-- Lo que NO entra: declarar desierto el proceso. Es el otro desenlace posible y
-- va en EFDS-1160. El modelo se cuida de no obligar a que todo proceso termine
-- adjudicado —nada exige que exista un acto—, para que aquella historia no
-- tenga que deshacer nada.
-- ============================================================================

-- ------------------------------------------- audiencia de adjudicación (7.1) --
-- La matriz la describe como "cargue de observaciones y respuestas, acta y
-- grabaciones": es un acto presencial cuyo rastro son documentos.

CREATE TABLE IF NOT EXISTS hiring.audiencias_adjudicacion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- Con hora, como el plazo de ofertas y a diferencia de los términos en días
  -- hábiles: una audiencia se celebra a una hora concreta y así consta en el
  -- acta.
  celebrada_at          timestamptz NOT NULL,

  -- Quién la presidió, tal como firma el acta. Texto y no una llave a usuarios:
  -- puede presidirla alguien que no tenga cuenta en la plataforma, y lo que
  -- importa es lo que dice el acta.
  presidida_por         varchar(200) NOT NULL,

  -- El acta es obligatoria: una audiencia sin acta no se puede probar, y sobre
  -- ella se adjudica. Mismo criterio del memorando del comité (025) y del
  -- informe del comité (038).
  acta_documento_id     uuid        NOT NULL REFERENCES hiring.documentos(id),

  -- Lo que la entidad quiera dejar dicho del desarrollo de la audiencia.
  resumen               text,

  estado                varchar(20) NOT NULL DEFAULT 'CELEBRADA',
  registrada_por        varchar(200),
  registrada_at         timestamptz NOT NULL DEFAULT now(),

  anulada_at            timestamptz,
  motivo_anulacion      text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_audiencia_estado CHECK (estado IN ('CELEBRADA', 'ANULADA')),
  CONSTRAINT ck_audiencia_anulacion CHECK (
    estado <> 'ANULADA' OR (anulada_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  )
);

COMMENT ON TABLE hiring.audiencias_adjudicacion IS
  'Audiencia de adjudicación del proceso, con su acta y lo que en ella se resolvió (EFDS-1159).';

-- Una sola audiencia en juego por proceso. Las anuladas no cuentan: son las que
-- explican por qué hubo que repetirla. Mismo criterio del informe (039).
CREATE UNIQUE INDEX IF NOT EXISTS uq_audiencia_vigente
  ON hiring.audiencias_adjudicacion (proceso_id)
  WHERE estado <> 'ANULADA';

-- Las piezas que la matriz pide cargar. Tabla aparte y no columnas del acta
-- porque son varias, llegan en momentos distintos y cada una es de su tipo: una
-- grabación no se lee como una respuesta a una observación.
CREATE TABLE IF NOT EXISTS hiring.piezas_audiencia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id  uuid         NOT NULL REFERENCES hiring.audiencias_adjudicacion(id) ON DELETE CASCADE,
  documento_id  uuid         NOT NULL REFERENCES hiring.documentos(id),

  -- GRABACION es el registro audiovisual; OBSERVACION, lo que se planteó en la
  -- audiencia y su respuesta; ANEXO, todo lo demás que la entidad quiera dejar.
  tipo          varchar(20)  NOT NULL,
  descripcion   varchar(300) NOT NULL,
  cargada_por   varchar(200),
  created_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_pieza_tipo CHECK (tipo IN ('GRABACION', 'OBSERVACION', 'ANEXO'))
);

CREATE INDEX IF NOT EXISTS ix_piezas_audiencia
  ON hiring.piezas_audiencia (audiencia_id);

COMMENT ON TABLE hiring.piezas_audiencia IS
  'Acta, grabaciones, observaciones y anexos que documentan la audiencia de adjudicación (EFDS-1159).';

-- ----------------------------------- apertura del sobre económico (7.2) ------
-- La matriz deja esta actividad para la licitación de obra pública: allí la
-- oferta económica llega en sobre cerrado y se abre en la audiencia, delante de
-- todos. Dónde aplica se lee de `actividades_excluidas`, no de una lista en el
-- código.

CREATE TABLE IF NOT EXISTS hiring.sobres_economicos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id          uuid        NOT NULL REFERENCES hiring.audiencias_adjudicacion(id) ON DELETE CASCADE,

  -- La oferta cuyo sobre se abre. Con FK: no se abre el sobre de alguien que no
  -- presentó oferta.
  oferente_id           uuid        NOT NULL REFERENCES hiring.oferentes(id) ON DELETE CASCADE,

  -- Lo que traía el sobre. Se guarda aquí y no se pisa `oferentes.valor_ofertado`
  -- porque son dos hechos distintos: lo que el oferente declaró al presentarse y
  -- lo que resultó al abrir el sobre en audiencia. Que coincidan es lo normal;
  -- que no coincidan es justamente lo que hay que poder ver.
  valor_ofertado        numeric(18, 2) NOT NULL CHECK (valor_ofertado > 0),

  -- Evidencia de la apertura: no hay integración con SECOP II.
  evidencia_documento_id uuid       REFERENCES hiring.documentos(id),

  observacion           text,
  abierto_por           varchar(200),
  abierto_at            timestamptz NOT NULL DEFAULT now(),

  created_at            timestamptz NOT NULL DEFAULT now(),

  -- El sobre de una oferta se abre una sola vez en la misma audiencia.
  CONSTRAINT uq_sobre_oferta UNIQUE (audiencia_id, oferente_id)
);

COMMENT ON TABLE hiring.sobres_economicos IS
  'Apertura del sobre económico en la audiencia de adjudicación, donde la modalidad lo exige (EFDS-1159).';

-- ------------------------------- informe de evaluación definitivo (7.3) ------
-- El que se produce después de la audiencia y sobre el que se adjudica.
--
-- Tabla aparte y no una fila más en `informes_evaluacion` a propósito. Aquel
-- lleva plazo, traslado y subsanaciones colgando, y su índice parcial garantiza
-- que solo haya uno en juego; este no tiene término que correr y su pregunta es
-- otra: qué cambió desde el preliminar. Meterlos en la misma tabla obligaría a
-- que la mitad de las columnas de cada uno estuvieran siempre en nulo.

CREATE TABLE IF NOT EXISTS hiring.informes_definitivos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- El informe preliminar que este viene a reemplazar. Con FK: el definitivo no
  -- existe suelto, es el desenlace de un traslado concreto.
  informe_preliminar_id uuid        NOT NULL REFERENCES hiring.informes_evaluacion(id),

  -- El resultado del comité que se está congelando. Es el **vigente**, no el que
  -- se congeló al trasladar: si el comité rectificó a raíz de una subsanación
  -- aceptada, es esa rectificación la que se adjudica.
  resultado_id          uuid        NOT NULL REFERENCES hiring.resultados_evaluacion(id),
  resultado             jsonb       NOT NULL,

  -- Qué cambió respecto del preliminar: qué se aceptó y si el comité rectificó.
  -- Se guarda resuelto y no se deduce comparando dos jsonb a mano, porque es la
  -- pregunta que el expediente tiene que responder solo.
  cambios               jsonb       NOT NULL DEFAULT '{}'::jsonb,

  ofertas_recibidas     int         NOT NULL DEFAULT 0,

  estado                varchar(20) NOT NULL DEFAULT 'BORRADOR',

  informe_documento_id  uuid        REFERENCES hiring.documentos(id),
  evidencia_documento_id uuid       REFERENCES hiring.documentos(id),

  generado_por          varchar(200),
  generado_at           timestamptz NOT NULL DEFAULT now(),

  publicado_por         varchar(200),
  publicado_at          timestamptz,

  anulado_at            timestamptz,
  motivo_anulacion      text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_definitivo_estado CHECK (estado IN ('BORRADOR', 'PUBLICADO', 'ANULADO')),
  -- Publicado sin fecha ni documento sería una publicación que no se puede
  -- probar, y sobre este informe se firma la adjudicación.
  CONSTRAINT ck_definitivo_publicacion CHECK (
    estado <> 'PUBLICADO' OR (publicado_at IS NOT NULL AND informe_documento_id IS NOT NULL)
  ),
  CONSTRAINT ck_definitivo_anulacion CHECK (
    estado <> 'ANULADO' OR (anulado_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  )
);

COMMENT ON TABLE hiring.informes_definitivos IS
  'Informe de evaluación definitivo, con el resultado congelado y lo que cambió desde el preliminar (EFDS-1159).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_definitivo_vigente
  ON hiring.informes_definitivos (proceso_id)
  WHERE estado <> 'ANULADO';

-- ---------------------------------------- acto de adjudicación (7.4) ---------
-- La resolución del Ordenador del Gasto. Aquí termina el proceso de selección.

CREATE TABLE IF NOT EXISTS hiring.actos_adjudicacion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- El informe sobre el que se adjudica. Adjudicar sin él sería firmar sobre
  -- una evaluación que todavía se podía mover.
  informe_definitivo_id uuid        NOT NULL REFERENCES hiring.informes_definitivos(id),

  -- A quién se le adjudica. Con FK a las ofertas del proceso: un nombre escrito
  -- a mano en un acto de adjudicación es el error que no se puede cometer aquí.
  oferente_id           uuid        NOT NULL REFERENCES hiring.oferentes(id),

  -- Número y fecha de la resolución, como los trae el acto firmado.
  numero_acto           varchar(60) NOT NULL,
  fecha_acto            date        NOT NULL,

  -- Por cuánto se adjudica. Puede no ser el valor ofertado ni el evaluado: el
  -- acto puede adjudicar por un valor ajustado, y lo que obliga a la entidad es
  -- lo que dice el acto.
  valor_adjudicado      numeric(18, 2) NOT NULL CHECK (valor_adjudicado > 0),

  -- La resolución firmada. Obligatoria por lo mismo que el acta y el informe.
  acto_documento_id     uuid        NOT NULL REFERENCES hiring.documentos(id),

  -- Notificación y publicación, cada una con su evidencia: la matriz dice
  -- "se notifica y publica en SECOP 2" y no hay integración con SECOP II.
  notificado_at         timestamptz,
  publicado_at          timestamptz,
  evidencia_documento_id uuid       REFERENCES hiring.documentos(id),

  estado                varchar(20) NOT NULL DEFAULT 'VIGENTE',
  emitido_por           varchar(200),
  emitido_at            timestamptz NOT NULL DEFAULT now(),

  -- Revocar no borra: el acto pudo notificarse y publicarse, y hay terceros que
  -- lo conocieron. Mismo criterio del resultado rectificado (038).
  revocado_at           timestamptz,
  revocado_por          varchar(200),
  motivo_revocacion     text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_acto_estado CHECK (estado IN ('VIGENTE', 'REVOCADO')),
  CONSTRAINT ck_acto_revocacion CHECK (
    estado <> 'REVOCADO' OR (revocado_at IS NOT NULL AND motivo_revocacion IS NOT NULL)
  ),
  -- Publicar es un hecho posterior a emitir; sin evidencia no se puede probar.
  CONSTRAINT ck_acto_publicacion CHECK (
    publicado_at IS NULL OR evidencia_documento_id IS NOT NULL
  )
);

COMMENT ON TABLE hiring.actos_adjudicacion IS
  'Acto administrativo de adjudicación del Ordenador del Gasto, con su notificación y publicación (EFDS-1159).';

-- Un solo acto vigente por proceso, tantos revocados como haga falta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_acto_vigente
  ON hiring.actos_adjudicacion (proceso_id)
  WHERE estado = 'VIGENTE';
