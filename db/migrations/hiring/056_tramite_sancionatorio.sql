-- ============================================================================
-- 056 · Trámite sancionatorio y caducidad
--
-- EFDS-1181 (RF-INC-02): el área jurídica tramita las resoluciones y las
-- audiencias sancionatorias del presunto incumplimiento, y la caducidad se
-- registra como causal contractual.
--
-- Sigue a EFDS-1180, que abre el caso: aquí el caso deja de estar solo
-- reportado y empieza a instruirse. Las dos piezas del trámite son las que
-- nombra el requerimiento —«resoluciones y audiencias sancionatorias»— y por
-- eso son dos tablas y no una lista de actuaciones genéricas: una audiencia se
-- cita para una fecha y se celebra o no; una resolución se expide, se notifica
-- y queda en firme. Meterlas juntas obligaría a dejar en nulo la mitad de las
-- columnas en cada fila.
--
-- **El flujo detallado del procedimiento no está en las fuentes.** La historia
-- lo dice en su línea de dependencias: «flujo detallado del procedimiento
-- sancionatorio» queda por validar. Lo que se modela es lo que el requerimiento
-- sí afirma —resoluciones, audiencias, su resultado y la caducidad como causal—
-- sin inventar términos ni contar días: ningún plazo del trámite se calcula
-- aquí, porque ninguna fuente del proyecto los da.
--
-- **Los recursos no entran.** Ni el requerimiento ni la historia los nombran, y
-- modelarlos exigiría decidir por cuenta propia cuáles proceden y en qué
-- término. Si el recurso prospera, el camino es revocar la resolución, que sí
-- está: revocar devuelve el contrato y el caso a donde estaban.
-- ============================================================================

-- --------------------------------------------- el caso pasa a instruirse --
/*
 * EFDS-1180 dejó el caso con un solo estado, REPORTADO, y dijo por qué:
 * admitir «en trámite» sin trámite construido prometía un flujo que no
 * existía. Ya existe.
 *
 * Dos desenlaces y no uno: un caso que se archiva no es lo mismo que uno que se
 * decide, y el expediente tiene que poder distinguir el incumplimiento que se
 * declaró del que se examinó y no prosperó.
 */
ALTER TABLE hiring.casos_incumplimiento
  DROP CONSTRAINT IF EXISTS ck_incumplimiento_estado;

ALTER TABLE hiring.casos_incumplimiento
  ADD CONSTRAINT ck_incumplimiento_estado CHECK (
    estado IN ('REPORTADO', 'EN_TRAMITE', 'DECIDIDO', 'ARCHIVADO')
  );

COMMENT ON COLUMN hiring.casos_incumplimiento.estado IS
  'REPORTADO lo abre el supervisor (EFDS-1180); EN_TRAMITE, DECIDIDO y ARCHIVADO los mueve el trámite sancionatorio (EFDS-1181).';

-- ------------------------------------------------------------ audiencias --
/*
 * La audiencia se cita para una fecha y una hora, y esa fecha **sí puede ser
 * futura**: es lo único del módulo que mira hacia adelante. Todo lo demás
 * transcribe hechos ya ocurridos —la publicación, el pago, el acta—, pero una
 * citación que no pudiera ser futura no serviría para citar a nadie.
 *
 * Se guarda con hora (`timestamptz`) por lo mismo que el plazo de ofertas: a
 * una audiencia se comparece a una hora concreta.
 */
CREATE TABLE IF NOT EXISTS hiring.audiencias_sancionatorias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id               uuid         NOT NULL REFERENCES hiring.casos_incumplimiento(id) ON DELETE CASCADE,

  citada_para           timestamptz  NOT NULL,
  -- El acto que cita es obligatorio: a una audiencia sancionatoria se convoca
  -- por escrito, y sin el documento el expediente no podría probar que el
  -- contratista fue llamado a ejercer su defensa.
  citacion_documento_id uuid         NOT NULL REFERENCES hiring.documentos(id),
  objeto                text,

  estado                varchar(20)  NOT NULL DEFAULT 'CITADA',

  -- Lo que pasó el día de la audiencia.
  celebrada_el          date,
  acta_documento_id     uuid         REFERENCES hiring.documentos(id),
  resumen               text,

  -- Por qué no se celebró, cuando no se celebró.
  motivo                text,

  citada_por            varchar(200),
  registrada_por        varchar(200),
  created_at            timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_audiencia_estado CHECK (
    estado IN ('CITADA', 'CELEBRADA', 'SUSPENDIDA', 'CANCELADA')
  ),

  -- Una audiencia celebrada tiene acta y dice qué pasó: es la prueba de que el
  -- contratista fue oído, que es de lo que se trata el debido proceso.
  CONSTRAINT ck_audiencia_celebrada CHECK (
    estado <> 'CELEBRADA'
    OR (celebrada_el IS NOT NULL AND acta_documento_id IS NOT NULL AND length(trim(resumen)) >= 10)
  ),

  -- La que no se celebró dice por qué. Una audiencia suspendida sin motivo es
  -- exactamente lo que un ente de control pregunta.
  CONSTRAINT ck_audiencia_no_celebrada CHECK (
    estado NOT IN ('SUSPENDIDA', 'CANCELADA')
    OR length(trim(motivo)) >= 10
  )
);

CREATE INDEX IF NOT EXISTS ix_audiencias_sancionatorias_caso
  ON hiring.audiencias_sancionatorias (caso_id, citada_para DESC);

COMMENT ON TABLE hiring.audiencias_sancionatorias IS
  'Audiencias del trámite sancionatorio (EFDS-1181, RF-INC-02). La citación mira al futuro; el acta, al hecho ya ocurrido.';

-- ---------------------------------------------------------- resoluciones --
/*
 * Los actos administrativos del trámite: el que lo abre y el que lo decide.
 *
 * El documento es obligatorio en las dos, y no por prolijidad: una resolución
 * es el documento. Registrarla sin él dejaría al expediente afirmando que la
 * entidad resolvió algo que no puede mostrar.
 */
CREATE TABLE IF NOT EXISTS hiring.resoluciones_sancionatorias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id               uuid         NOT NULL REFERENCES hiring.casos_incumplimiento(id) ON DELETE CASCADE,

  tipo                  varchar(20)  NOT NULL,
  numero                varchar(80)  NOT NULL,
  fecha_expedicion      date         NOT NULL,
  documento_id          uuid         NOT NULL REFERENCES hiring.documentos(id),

  -- Qué resolvió. Solo la decisión lo trae: la de apertura no resuelve nada,
  -- abre el trámite.
  sentido               varchar(30),

  -- La multa o la cláusula penal, cuando la decisión las impone. Opcional
  -- porque un incumplimiento puede declararse sin sanción pecuniaria.
  valor_sancion         numeric(18,2),

  -- A dónde vuelve el contrato si la resolución se revoca. Mismo criterio que
  -- la terminación anticipada (053): revocar devuelve lo guardado y no lo
  -- deducido.
  estado_contrato_antes varchar(20),

  -- Hechos posteriores a la expedición. No se calculan términos con ellos:
  -- ninguna fuente del proyecto dice cuántos días corren.
  notificada_el         date,
  firme_el              date,

  expedida_por          varchar(200),
  created_at            timestamptz  NOT NULL DEFAULT now(),

  revocada_at           timestamptz,
  revocada_por          varchar(200),
  motivo_revocacion     text,

  CONSTRAINT ck_resolucion_tipo CHECK (tipo IN ('APERTURA', 'DECISION')),

  -- La decisión dice qué resolvió; la apertura no puede decirlo.
  CONSTRAINT ck_resolucion_sentido CHECK (
    (tipo = 'DECISION' AND sentido IN ('DECLARA_INCUMPLIMIENTO', 'DECLARA_CADUCIDAD', 'ARCHIVA'))
    OR (tipo = 'APERTURA' AND sentido IS NULL)
  ),

  -- Archivar es no sancionar: una sanción pecuniaria con el caso archivado
  -- sería una contradicción en el mismo acto.
  CONSTRAINT ck_resolucion_sancion CHECK (
    valor_sancion IS NULL
    OR (sentido IN ('DECLARA_INCUMPLIMIENTO', 'DECLARA_CADUCIDAD') AND valor_sancion > 0)
  ),

  -- No se está en firme antes de notificar.
  CONSTRAINT ck_resolucion_firmeza CHECK (
    firme_el IS NULL
    OR (notificada_el IS NOT NULL AND firme_el >= notificada_el)
  )
);

/*
 * Un caso se abre una vez y se decide una vez.
 *
 * Parciales sobre las que no están revocadas, con el criterio de la 052 y la
 * 053: revocar la decisión devuelve el caso al trámite, y entonces tiene que
 * poder decidirse otra vez.
 */
CREATE UNIQUE INDEX IF NOT EXISTS uq_resolucion_por_tipo_y_caso
  ON hiring.resoluciones_sancionatorias (caso_id, tipo)
  WHERE revocada_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_resoluciones_sancionatorias_caso
  ON hiring.resoluciones_sancionatorias (caso_id, fecha_expedicion DESC);

COMMENT ON TABLE hiring.resoluciones_sancionatorias IS
  'Actos administrativos del trámite sancionatorio (EFDS-1181, RF-INC-02): el que lo abre y el que lo decide, incluida la caducidad.';

COMMENT ON COLUMN hiring.resoluciones_sancionatorias.sentido IS
  'DECLARA_CADUCIDAD termina el contrato: es la caducidad como causal contractual que pide el bloque de Presunto Incumplimiento.';
