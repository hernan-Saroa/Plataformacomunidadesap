-- ============================================================================
-- 039 · Registro Presupuestal del contrato (actividad 8.3)
--
-- EFDS-1163 (RF-LEG-02): suscrito el contrato, la Dirección Financiera expide
-- el RP. La matriz lo define como «compromiso firme de recursos» y añade que
-- «el RP sustituye al CDP en la etapa contractual».
--
-- La diferencia con el CDP no es de forma sino de fondo: el CDP aparta la
-- partida —«hay presupuesto para esto»— y el RP la compromete —«esta plata es
-- de este contrato»—. Por eso el CDP se exige antes de abrir el proceso y el RP
-- solo después de firmarlo: no se puede comprometer un gasto con alguien que
-- todavía no ha firmado.
--
-- Mismo ciclo que el CDP (migración 010) porque es el mismo trámite en otro
-- momento, y la Financiera no debería aprender dos flujos distintos para lo
-- mismo. La integración con KLIC (RF-SIS-07) queda para cuando se defina, igual
-- que en el CDP: hoy el número se registra a mano.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.registros_presupuestales (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id       uuid          NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- El número lo asigna la Financiera al expedirlo, así que no existe mientras
  -- el RP está apenas solicitado. Mismo criterio que el CDP.
  numero            varchar(60),
  valor             numeric(18, 2),
  rubro             varchar(160),
  fecha_expedicion  date,
  -- Vigencia fiscal a la que se imputa. Un RP no cruza vigencias.
  vigencia_fiscal   int,

  -- SOLICITADO → VERIFICADO → EXPEDIDO
  --           ↘ RECHAZADO (no hay disponibilidad para comprometer)
  -- ANULADO cubre el RP que se deja sin efecto después de expedido.
  estado            varchar(20)   NOT NULL DEFAULT 'SOLICITADO',

  -- Por qué la Financiera lo rechazó. Sin esto, quien solicita no sabe si
  -- corregir el rubro, esperar o revisar el valor.
  observaciones     text,

  -- Soporte del RP expedido. Nullable porque al solicitar todavía no existe.
  documento_id      uuid          REFERENCES hiring.documentos(id),

  solicitado_por    varchar(200),
  solicitado_at     timestamptz   NOT NULL DEFAULT now(),
  expedido_por      varchar(200),

  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT ck_rp_estado CHECK (
    estado IN ('SOLICITADO', 'VERIFICADO', 'EXPEDIDO', 'RECHAZADO', 'ANULADO')
  ),
  -- Un RP expedido sin número o sin fecha no compromete nada: los datos que lo
  -- hacen verificable son parte de estar expedido, no un adorno.
  CONSTRAINT ck_rp_expedido CHECK (
    estado <> 'EXPEDIDO'
    OR (numero IS NOT NULL AND fecha_expedicion IS NOT NULL AND valor IS NOT NULL)
  ),
  -- Rechazar sin decir por qué deja al solicitante sin saber qué corregir.
  CONSTRAINT ck_rp_rechazado CHECK (
    estado <> 'RECHAZADO' OR observaciones IS NOT NULL
  ),
  CONSTRAINT ck_rp_valor CHECK (valor IS NULL OR valor > 0)
);

-- Un solo RP en curso por contrato, pero tantos rechazados o anulados como haga
-- falta. Índice parcial con el mismo criterio que el contrato y las garantías:
-- si la Financiera rechaza, se corrige y se vuelve a solicitar, y las dos
-- solicitudes tienen que quedar en el expediente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rp_vigente
  ON hiring.registros_presupuestales (contrato_id)
  WHERE estado NOT IN ('RECHAZADO', 'ANULADO');

CREATE INDEX IF NOT EXISTS ix_rp_contrato
  ON hiring.registros_presupuestales (contrato_id);

COMMENT ON TABLE hiring.registros_presupuestales IS
  'Registros presupuestales que comprometen los recursos del contrato (EFDS-1163).';
