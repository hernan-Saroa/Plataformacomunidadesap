-- ============================================================================
-- 044 · Informe final de ejecución (actividad 10.1)
--
-- EFDS-1171 (RF-LIQ-01): próximo a terminar el contrato, el supervisor elabora
-- el informe final con el consolidado de entregables. Es lo que soporta la
-- liquidación que viene después (EFDS-1172).
--
-- El balance de la ejecución se **congela** en el informe en vez de calcularse
-- cada vez que se consulta. Es el mismo criterio del informe de evaluación
-- (EFDS-1158) y por la misma razón: el informe dice lo que era cierto el día en
-- que se firmó. Si mañana entra un pago rezagado, el informe no puede cambiar
-- solo —lo que hay que hacer es anularlo y elaborar otro, y que las dos
-- versiones queden—.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.informes_finales (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- El informe firmado por el supervisor. Sin él hay un balance, no un informe.
  informe_documento_id uuid        NOT NULL REFERENCES hiring.documentos(id),

  -- La del informe, no la del registro.
  fecha_elaboracion   date         NOT NULL,

  -- Lo que el supervisor concluye sobre la ejecución. Va aparte del documento
  -- porque es lo que la liquidación lee sin abrir el PDF.
  conclusion          text         NOT NULL,

  /*
   * El balance congelado: valor del contrato, lo tramitado, el saldo, cuántas
   * cuentas hubo y sobre qué periodo corrió la ejecución.
   *
   * jsonb y no columnas sueltas porque es una fotografía, no un dato que se
   * consulte por partes: se guarda entero y se lee entero. Con columnas, cada
   * cifra nueva que la liquidación quisiera ver sería una migración.
   */
  balance             jsonb        NOT NULL DEFAULT '{}'::jsonb,

  estado              varchar(20)  NOT NULL DEFAULT 'VIGENTE',
  elaborado_por       varchar(200),
  created_at          timestamptz  NOT NULL DEFAULT now(),

  anulado_at          timestamptz,
  anulado_por         varchar(200),
  motivo_anulacion    text,

  CONSTRAINT ck_informe_final_estado CHECK (estado IN ('VIGENTE', 'ANULADO')),
  CONSTRAINT ck_informe_final_anulado CHECK (
    estado <> 'ANULADO' OR (anulado_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  )
);

-- Un informe vigente por contrato, y tantos anulados como haga falta. Índice
-- parcial con el criterio del resto del módulo: rehacer el informe es anular el
-- anterior y elaborar otro, y los dos quedan en el expediente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_informe_final_vigente
  ON hiring.informes_finales (contrato_id)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_informes_finales_contrato
  ON hiring.informes_finales (contrato_id);

COMMENT ON TABLE hiring.informes_finales IS
  'Informe final del supervisor con el balance congelado de la ejecución (EFDS-1171).';

-- --------------------------------------------------------- entregables --
--
-- El «consolidado de entregables» que pide el criterio. Tabla propia y no una
-- lista dentro del jsonb del balance: los entregables se van sumando de a uno
-- mientras se arma el informe, y cada uno puede traer su propio soporte.

CREATE TABLE IF NOT EXISTS hiring.entregables_informe (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id      uuid         NOT NULL REFERENCES hiring.informes_finales(id) ON DELETE CASCADE,

  descripcion     varchar(500) NOT NULL,
  -- Cuándo se recibió. Nula cuando el entregable se pactó y no se cumplió: el
  -- informe final también sirve para decir qué faltó.
  fecha_entrega   date,
  observacion     text,

  -- El soporte del entregable, si lo tiene. Opcional a propósito: muchos
  -- entregables ya están en el expediente por otra actividad.
  documento_id    uuid         REFERENCES hiring.documentos(id),

  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_entregables_informe
  ON hiring.entregables_informe (informe_id);

COMMENT ON TABLE hiring.entregables_informe IS
  'Consolidado de entregables del informe final (EFDS-1171).';
