-- ============================================================================
-- 046 · Cierre financiero del contrato (actividad 10.3)
--
-- EFDS-1173 (RF-LIQ-03): liquidado el contrato, la Dirección Financiera
-- registra el pago final y libera el saldo del RP que no se llegó a
-- comprometer, para que vuelva al presupuesto de la entidad.
--
-- **Sin integración con KLIC** (RF-SIS-07, misma decisión de alcance que Click
-- en EFDS-1170): aquí se registra que el saldo se liberó y con qué soporte; el
-- movimiento presupuestal se hace por fuera. Cuando KLIC entre, lo que cambia
-- es de dónde sale la confirmación, no esta tabla.
--
-- NO se le suma un estado al RP. La tabla `registros_presupuestales` es de
-- EFDS-1163 y su dueño sigue trabajando en ella; tocar su `CHECK` de estados es
-- justo lo que produce un conflicto de fusión como el que ya costó
-- `ETAPAS_ENTREGADAS`. La liberación vive aquí, y responder «¿este RP ya se
-- liberó?» es buscar el cierre vigente del contrato. Si más adelante se
-- prefiere unificarlo, es una migración de una línea.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.cierres_financieros (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id           uuid          NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,
  -- El RP cuyo saldo se libera. Sin él no hay nada que liberar.
  rp_id                 uuid          NOT NULL REFERENCES hiring.registros_presupuestales(id),

  -- El pago final: con qué referencia salió y cuándo.
  referencia_pago_final varchar(120)  NOT NULL,
  fecha_pago_final      date          NOT NULL,
  -- El soporte del cierre. Mientras no exista KLIC, es la única prueba de que
  -- la liberación se tramitó.
  soporte_documento_id  uuid          REFERENCES hiring.documentos(id),

  /*
   * El cuadre congelado, con el criterio del informe final y del acta de
   * liquidación: dice lo que era cierto el día en que se cerró.
   *
   * `valor_liberado` se guarda calculado y no derivado porque es la cifra que
   * la entidad reintegró al presupuesto: si mañana entra un pago rezagado, lo
   * que se liberó ese día no cambia.
   */
  valor_rp              numeric(18,2) NOT NULL,
  valor_pagado          numeric(18,2) NOT NULL,
  valor_liberado        numeric(18,2) NOT NULL,

  observaciones         text,

  estado                varchar(20)   NOT NULL DEFAULT 'VIGENTE',
  cerrado_por           varchar(200),
  created_at            timestamptz   NOT NULL DEFAULT now(),

  revertido_at          timestamptz,
  revertido_por         varchar(200),
  motivo_reversion      text,

  CONSTRAINT ck_cierre_estado CHECK (estado IN ('VIGENTE', 'REVERTIDO')),
  -- Revertir un cierre dice siempre por qué: el saldo pudo haberse reintegrado
  -- al presupuesto, y deshacerlo tiene consecuencias fuera de la plataforma.
  CONSTRAINT ck_cierre_revertido CHECK (
    estado <> 'REVERTIDO' OR (revertido_at IS NOT NULL AND motivo_reversion IS NOT NULL)
  ),
  -- No se libera plata que no existe. Un liberado negativo significaría que se
  -- pagó por encima del RP, y eso se avisa pero no se guarda como liberación.
  CONSTRAINT ck_cierre_liberado CHECK (valor_liberado >= 0)
);

-- Un cierre vigente por contrato, y tantos revertidos como haga falta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cierre_vigente
  ON hiring.cierres_financieros (contrato_id)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_cierres_contrato
  ON hiring.cierres_financieros (contrato_id);
-- Para responder «cuánto saldo se ha liberado en la vigencia», que es la
-- pregunta que hará la Dirección Financiera al cerrar el año.
CREATE INDEX IF NOT EXISTS ix_cierres_rp
  ON hiring.cierres_financieros (rp_id)
  WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.cierres_financieros IS
  'Pago final y liberación del saldo no comprometido del RP (EFDS-1173).';
