-- ============================================================================
-- 045 · Acta de liquidación del contrato (actividad 10.2)
--
-- EFDS-1172 (RF-LIQ-02, RF-SIS-03): con el informe final a la vista, la entidad
-- y el contratista liquidan de común acuerdo dentro de los cuatro meses
-- siguientes a la terminación. Si no se logra, la entidad puede liquidar
-- unilateralmente en los dos meses adicionales.
--
-- La **ventana de plazos se guarda en el acta** además de poderse calcular. No
-- es redundancia: es la ventana que estaba vigente el día en que se liquidó. Si
-- mañana cambia la norma —o se corrige la fecha de terminación de un contrato—
-- el acta tiene que seguir explicando por qué se liquidó cuando se liquidó, y
-- un cálculo al vuelo diría otra cosa.
--
-- PENDIENTE de la Dirección de Contratación: la matriz anota en la 10.2 un
-- «FILTRO según tipología contractual», y la historia lo repite en sus
-- dependencias —«modalidades/contratos que no requieren liquidación»—. Hoy la
-- tipología no registra ese dato, así que la actividad se ofrece para todos los
-- contratos. Cuando se confirme, lo que falta es el dato en la tipología, no
-- esta tabla.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.actas_liquidacion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id           uuid          NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- De común acuerdo o por acto de la entidad. No es un detalle del acta: son
  -- dos figuras distintas, con requisitos y plazos distintos.
  tipo                  varchar(20)   NOT NULL,

  -- El acta o la resolución firmada, según el tipo.
  acta_documento_id     uuid          NOT NULL REFERENCES hiring.documentos(id),
  fecha_acta            date          NOT NULL,

  /*
   * El balance financiero congelado: contratado, pagado, saldo y lo que quede
   * a favor de una u otra parte. Mismo criterio del informe final: el acta dice
   * lo que era cierto el día en que se firmó.
   */
  balance               jsonb         NOT NULL DEFAULT '{}'::jsonb,

  -- Paz y salvo: si las partes se declaran a paz y salvo y su soporte. El
  -- soporte es aparte del acta porque suele ser un documento propio del
  -- contratista, no una hoja del acta.
  paz_y_salvo           boolean       NOT NULL DEFAULT false,
  paz_y_salvo_documento_id uuid       REFERENCES hiring.documentos(id),
  observaciones         text,

  /*
   * La ventana con la que se liquidó. Fechas y no días: leerlas no obliga a
   * saber desde cuándo se contaban.
   */
  fecha_terminacion     date,
  bilateral_hasta       date,
  unilateral_hasta      date,
  -- En qué momento del plazo se firmó: BILATERAL, UNILATERAL o VENCIDO. Se
  -- guarda resuelto porque es lo que explica que una liquidación tardía se
  -- haya aceptado igual.
  momento_del_plazo     varchar(20),

  estado                varchar(20)   NOT NULL DEFAULT 'VIGENTE',
  liquidado_por         varchar(200),
  created_at            timestamptz   NOT NULL DEFAULT now(),

  anulado_at            timestamptz,
  anulado_por           varchar(200),
  motivo_anulacion      text,

  CONSTRAINT ck_liquidacion_tipo CHECK (tipo IN ('BILATERAL', 'UNILATERAL')),
  CONSTRAINT ck_liquidacion_estado CHECK (estado IN ('VIGENTE', 'ANULADO')),
  CONSTRAINT ck_liquidacion_momento CHECK (
    momento_del_plazo IS NULL
    OR momento_del_plazo IN ('BILATERAL', 'UNILATERAL', 'VENCIDO')
  ),
  CONSTRAINT ck_liquidacion_anulado CHECK (
    estado <> 'ANULADO' OR (anulado_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  ),
  -- El paz y salvo se declara con soporte o no se declara: marcarlo sin el
  -- documento deja al expediente afirmando algo que no puede probar.
  CONSTRAINT ck_liquidacion_paz_y_salvo CHECK (
    paz_y_salvo = false OR paz_y_salvo_documento_id IS NOT NULL
  )
);

-- Un acta vigente por contrato, y tantas anuladas como haga falta. Mismo
-- criterio del resto del módulo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_liquidacion_vigente
  ON hiring.actas_liquidacion (contrato_id)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_actas_liquidacion_contrato
  ON hiring.actas_liquidacion (contrato_id);
-- Para responder «qué contratos están por vencerse el plazo de liquidación»,
-- que es la alerta de RF-SIS-03 cuando exista el motor de notificaciones.
CREATE INDEX IF NOT EXISTS ix_actas_liquidacion_plazo
  ON hiring.actas_liquidacion (bilateral_hasta)
  WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.actas_liquidacion IS
  'Acta de liquidación bilateral o unilateral, con balance financiero y paz y salvo (EFDS-1172).';
