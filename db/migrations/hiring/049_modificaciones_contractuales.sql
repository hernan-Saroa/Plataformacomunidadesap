-- ============================================================================
-- 049 · Modificaciones contractuales y adición en dinero (actividad 9.5)
--
-- EFDS-1176 (RF-MOD-01 y RF-MOD-05): en ejecución, el contrato puede
-- adicionarse en dinero. La adición aumenta el presupuesto, así que exige un
-- CDP y un RP nuevos antes de aprobarse.
--
-- **Tabla genérica y no una de adiciones.** La matriz lista siete tipos en el
-- bloque de modificaciones contractuales —adición, prórroga, cesión,
-- aclaratorio, suspensión, reanudación y terminación anticipada— y EFDS-1177 y
-- EFDS-1178 vienen por tres de ellos. Una tabla por tipo obligaría a duplicar
-- el acto administrativo, la justificación y la publicación, que son comunes, y
-- a migrar datos cuando llegue la siguiente.
--
-- El numeral 9.5 ya existe en la matriz (migración 030) y está libre: a
-- diferencia de la declaratoria desierta y del cierre definitivo, esta
-- actividad no tiene que inventárselo.
--
-- **Sin integración con SECOP II** (RF-MOD-05), como en todo el módulo: la
-- publicación de la modificación se registra con su evidencia.
-- ============================================================================

-- --------------------------------------------------- el tope de la adición --
/*
 * Fila única y parametrizable, con el criterio de los umbrales de cuantía y de
 * los plazos de publicidad: los números que gobiernan reglas viven en tabla con
 * pantalla propia, no en código.
 *
 * A diferencia de aquellos, este **bloquea** en vez de advertir. Un umbral de
 * cuantía mal puesto produce una modalidad equivocada que alguien corrige; una
 * adición por encima del tope es una decisión contraria a la ley que ya se
 * tomó. La cifra es del parágrafo del artículo 40 de la Ley 80 de 1993.
 */
CREATE TABLE IF NOT EXISTS hiring.tope_adicion (
  id              int          PRIMARY KEY DEFAULT 1,
  porcentaje      numeric(5,2) NOT NULL,
  fundamento      text,
  -- False mientras la Dirección de Contratación no lo ratifique: la cifra sale
  -- de la ley, pero ninguna fuente del proyecto la menciona.
  confirmado      boolean      NOT NULL DEFAULT false,
  actualizado_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_tope_adicion_unico CHECK (id = 1),
  CONSTRAINT ck_tope_adicion_porcentaje CHECK (porcentaje > 0 AND porcentaje <= 100)
);

INSERT INTO hiring.tope_adicion (id, porcentaje, fundamento, confirmado)
VALUES (
  1, 50,
  'Ley 80 de 1993, art. 40, parágrafo — los contratos no podrán adicionarse en más del cincuenta por ciento (50%) de su valor inicial, expresado en SMMLV. Confirmar con la Dirección de Contratación si aplica a todas las tipologías.',
  false
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE hiring.tope_adicion IS
  'Tope legal de la adición como porcentaje del valor inicial del contrato (EFDS-1176).';

-- ------------------------------------------ las modificaciones del contrato --
CREATE TABLE IF NOT EXISTS hiring.modificaciones_contrato (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id          uuid          NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Los siete tipos que lista la matriz. Solo ADICION tiene implementación hoy;
  -- los demás se declaran para que EFDS-1177 y EFDS-1178 no tengan que migrar
  -- el CHECK ni reinventar los códigos.
  tipo                 varchar(30)   NOT NULL,

  -- El consecutivo con el que la entidad la identifica, y cuándo se suscribió.
  numero               varchar(80),
  fecha_suscripcion    date,

  /*
   * Por qué se modifica. Obligatoria y con longitud mínima en el DTO: una
   * modificación sin sustento es lo primero que un ente de control pregunta, y
   * la matriz llama a la 9.5 «mismo trámite del proceso en versión más corta»
   * —más corta, no sin justificar—.
   */
  justificacion        text          NOT NULL,

  -- El acto administrativo o el otrosí firmado. Nulo mientras está en trámite:
  -- se firma cuando se aprueba.
  documento_id         uuid          REFERENCES hiring.documentos(id),

  -- EN_TRAMITE → APROBADA → REVOCADA, o RECHAZADA como salida temprana.
  estado               varchar(20)   NOT NULL DEFAULT 'EN_TRAMITE',

  -- ------------------------------------------------ lo propio de la adición --
  /*
   * Columnas y no jsonb porque llevan llave foránea: un jsonb no puede
   * garantizar que el CDP exista. Nulas para los demás tipos, con un CHECK que
   * las exige solo cuando el tipo es ADICION.
   */
  valor_adicionado     numeric(18,2),
  cdp_id               uuid          REFERENCES hiring.cdp(id),
  rp_id                uuid          REFERENCES hiring.registros_presupuestales(id),

  -- El valor del contrato antes y después, congelado. Con el criterio del resto
  -- del módulo: si mañana entra otra adición, esta sigue diciendo sobre qué
  -- valor se calculó y con qué tope se juzgó.
  valor_contrato_antes numeric(18,2),
  valor_contrato_despues numeric(18,2),
  tope_porcentaje      numeric(5,2),

  solicitada_por       varchar(200),
  created_at           timestamptz   NOT NULL DEFAULT now(),

  aprobada_por         varchar(200),
  aprobada_at          timestamptz,

  revocada_at          timestamptz,
  revocada_por         varchar(200),
  motivo_revocacion    text,

  CONSTRAINT ck_modificacion_tipo CHECK (
    tipo IN (
      'ADICION', 'PRORROGA', 'CESION', 'ACLARATORIO',
      'SUSPENSION', 'REANUDACION', 'TERMINACION_ANTICIPADA'
    )
  ),
  CONSTRAINT ck_modificacion_estado CHECK (
    estado IN ('EN_TRAMITE', 'APROBADA', 'RECHAZADA', 'REVOCADA')
  ),
  -- Una adición sin valor no adiciona nada.
  CONSTRAINT ck_modificacion_adicion CHECK (
    tipo <> 'ADICION' OR (valor_adicionado IS NOT NULL AND valor_adicionado > 0)
  ),
  -- Aprobada dice siempre quién y cuándo, y trae el acto firmado: aprobar sin
  -- documento dejaría al expediente afirmando algo que no puede probar.
  CONSTRAINT ck_modificacion_aprobada CHECK (
    estado <> 'APROBADA'
    OR (aprobada_at IS NOT NULL AND documento_id IS NOT NULL AND fecha_suscripcion IS NOT NULL)
  ),
  -- Revocar dice siempre por qué: el valor del contrato vuelve atrás y eso
  -- tiene consecuencias presupuestales fuera de la plataforma.
  CONSTRAINT ck_modificacion_revocada CHECK (
    estado <> 'REVOCADA' OR (revocada_at IS NOT NULL AND motivo_revocacion IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_modificaciones_contrato
  ON hiring.modificaciones_contrato (contrato_id);
-- Para sumar lo adicionado contra el tope, que es la consulta de cada aprobación.
CREATE INDEX IF NOT EXISTS ix_modificaciones_aprobadas
  ON hiring.modificaciones_contrato (contrato_id, tipo)
  WHERE estado = 'APROBADA';

COMMENT ON TABLE hiring.modificaciones_contrato IS
  'Modificaciones contractuales de la actividad 9.5; hoy solo la adición tiene trámite (EFDS-1176).';

-- ---------------------------------- el CDP y el RP que la adición necesita --
/*
 * El CDP y el RP de la adición son filas normales de sus tablas, con el mismo
 * ciclo solicitar → verificar → expedir de EFDS-1148 y EFDS-1163. La
 * alternativa —transcribir número y valor dentro de la modificación— habría
 * creado un segundo trámite para lo mismo, que es justo lo que la migración 039
 * pidió evitar: «la Financiera no debería aprender dos flujos distintos».
 *
 * `modificacion_id` es lo que los distingue del CDP del proceso y del RP del
 * contrato. Nulo en todos los existentes, que es lo correcto: son los
 * originales.
 */
ALTER TABLE hiring.cdp
  ADD COLUMN IF NOT EXISTS modificacion_id uuid REFERENCES hiring.modificaciones_contrato(id);

ALTER TABLE hiring.registros_presupuestales
  ADD COLUMN IF NOT EXISTS modificacion_id uuid REFERENCES hiring.modificaciones_contrato(id);

/*
 * Los índices únicos pasan a mirar solo los originales.
 *
 * Sin esto, la segunda adición de un contrato chocaría contra la primera —y
 * contra el CDP del proceso— por una restricción que se escribió cuando solo
 * podía haber uno. El original sigue siendo único, que es lo que aquellas
 * historias querían proteger.
 */
DROP INDEX IF EXISTS hiring.idx_cdp_vigente_por_proceso;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdp_vigente_por_proceso
  ON hiring.cdp (proceso_id)
  WHERE estado IN ('SOLICITADO', 'VERIFICADO', 'EXPEDIDO') AND modificacion_id IS NULL;

DROP INDEX IF EXISTS hiring.uq_rp_vigente;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rp_vigente
  ON hiring.registros_presupuestales (contrato_id)
  WHERE estado NOT IN ('RECHAZADO', 'ANULADO') AND modificacion_id IS NULL;

-- Uno en curso por modificación, con el mismo criterio: la adición que se
-- rechaza se corrige y se vuelve a solicitar, y los dos intentos quedan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cdp_vigente_por_modificacion
  ON hiring.cdp (modificacion_id)
  WHERE estado IN ('SOLICITADO', 'VERIFICADO', 'EXPEDIDO') AND modificacion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rp_vigente_por_modificacion
  ON hiring.registros_presupuestales (modificacion_id)
  WHERE estado NOT IN ('RECHAZADO', 'ANULADO') AND modificacion_id IS NOT NULL;

COMMENT ON COLUMN hiring.cdp.modificacion_id IS
  'La adición que este CDP respalda; nulo si es el CDP del proceso (EFDS-1176).';
COMMENT ON COLUMN hiring.registros_presupuestales.modificacion_id IS
  'La adición que este RP compromete; nulo si es el RP del contrato (EFDS-1176).';

-- ------------------------------- la publicación de la modificación (RF-MOD-05) --
CREATE TABLE IF NOT EXISTS hiring.publicaciones_modificacion (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modificacion_id   uuid         NOT NULL REFERENCES hiring.modificaciones_contrato(id) ON DELETE CASCADE,

  fecha_publicacion date         NOT NULL,
  secop_numero      varchar(80),
  secop_url         text,

  -- Obligatoria, como en las demás publicaciones del módulo: sin soporte no hay
  -- publicación registrada, solo la afirmación de que se hizo.
  documento_id      uuid         NOT NULL REFERENCES hiring.documentos(id),

  publicada_por     varchar(200),
  created_at        timestamptz  NOT NULL DEFAULT now(),

  -- Una sola por modificación: registrar dos veces el mismo hecho lo contaría
  -- doble. No se separa por destino como en 8.8 y 10.4 porque RF-MOD-05 nombra
  -- únicamente SECOP II.
  CONSTRAINT uq_publicacion_modificacion UNIQUE (modificacion_id)
);

CREATE INDEX IF NOT EXISTS ix_publicaciones_modificacion
  ON hiring.publicaciones_modificacion (modificacion_id);

COMMENT ON TABLE hiring.publicaciones_modificacion IS
  'Publicación de la modificación en SECOP II, con su evidencia (EFDS-1176, RF-MOD-05).';
