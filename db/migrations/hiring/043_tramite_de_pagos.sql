-- ============================================================================
-- 043 · Trámite de pagos del contrato (actividad 9.4)
--
-- EFDS-1170 (RF-EJE-04): en ejecución el contrato, el contratista presenta su
-- cuenta de cobro con factura e informe de actividades, el supervisor la avala
-- y la Dirección Financiera tramita el pago.
--
-- **La integración con Click queda fuera** (RF-SIS-07, decisión del equipo con
-- la ESAP): por ahora los soportes se cargan a mano. Eso es exactamente la
-- «carga triple» que la historia quería evitar —factura, seguridad social y
-- RUT—, así que se modela para que exista y se vea, no para esconderla. Cuando
-- Click entre, lo que cambia es de dónde salen esos soportes, no esta tabla.
--
-- Un pago no se borra: se devuelve o se anula. Una cuenta de cobro radicada
-- comprometió un periodo y unos documentos, y el expediente tiene que explicar
-- por qué se pagó dos veces menos de lo que se radicó.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.pagos_contrato (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id           uuid          NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Consecutivo dentro del contrato: «el pago 3 de 8». Lo lleva el servicio,
  -- que es quien sabe cuántos hay; una secuencia global no diría nada útil.
  numero                int           NOT NULL,

  -- Periodo que se cobra. Va como rango y no como un mes suelto porque los
  -- contratos de obra cobran por avance y los de prestación por periodo.
  periodo_desde         date          NOT NULL,
  periodo_hasta         date          NOT NULL,

  valor                 numeric(18,2) NOT NULL,

  -- Los dos que el criterio de la historia exige. Sin ellos no hay cuenta de
  -- cobro que avalar: son la prestación y su prueba.
  factura_documento_id  uuid          NOT NULL REFERENCES hiring.documentos(id),
  informe_documento_id  uuid          NOT NULL REFERENCES hiring.documentos(id),

  estado                varchar(20)   NOT NULL DEFAULT 'RADICADO',

  radicado_at           timestamptz   NOT NULL DEFAULT now(),
  radicado_por          varchar(200),

  -- El aval del supervisor. Se guarda quién lo dio y no solo que se dio: es su
  -- responsabilidad la que respalda el pago.
  avalado_at            timestamptz,
  avalado_por           varchar(200),
  observacion_aval      text,

  devuelto_at           timestamptz,
  devuelto_por          varchar(200),
  motivo_devolucion     text,

  -- Con qué referencia lo tramitó la Dirección Financiera. Es el número que
  -- permite encontrar el pago fuera de la plataforma.
  tramitado_at          timestamptz,
  tramitado_por         varchar(200),
  referencia_pago       varchar(120),

  anulado_at            timestamptz,
  anulado_por           varchar(200),
  motivo_anulacion      text,

  created_at            timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT uq_pago_numero UNIQUE (contrato_id, numero),
  CONSTRAINT ck_pago_estado CHECK (
    estado IN ('RADICADO', 'AVALADO', 'DEVUELTO', 'TRAMITADO', 'ANULADO')
  ),
  -- El periodo no puede ir al revés. Un rango invertido no falla en ninguna
  -- consulta: simplemente no cuadra ningún cobro contra él.
  CONSTRAINT ck_pago_periodo CHECK (periodo_hasta >= periodo_desde),
  CONSTRAINT ck_pago_valor CHECK (valor > 0),
  -- Un cobro devuelto dice siempre por qué: es lo que el contratista tiene que
  -- corregir, y sin el motivo la devolución no le sirve de nada.
  CONSTRAINT ck_pago_devuelto CHECK (
    estado <> 'DEVUELTO' OR (devuelto_at IS NOT NULL AND motivo_devolucion IS NOT NULL)
  ),
  CONSTRAINT ck_pago_anulado CHECK (
    estado <> 'ANULADO' OR (anulado_at IS NOT NULL AND motivo_anulacion IS NOT NULL)
  ),
  -- No se tramita lo que nadie avaló. La regla vive también en el servicio,
  -- pero aquí impide que un UPDATE suelto se salte el aval del supervisor.
  CONSTRAINT ck_pago_tramitado CHECK (
    estado <> 'TRAMITADO' OR (tramitado_at IS NOT NULL AND avalado_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_pagos_contrato ON hiring.pagos_contrato (contrato_id);
-- Para «cuánto se le lleva pagado a este contrato», que es la pregunta que hace
-- cada radicación para avisar si se pasa del valor.
CREATE INDEX IF NOT EXISTS ix_pagos_estado ON hiring.pagos_contrato (contrato_id, estado);

COMMENT ON TABLE hiring.pagos_contrato IS
  'Cuentas de cobro del contrato, su aval y su trámite (EFDS-1170).';

-- ------------------------------------------------------------- soportes --
--
-- Tabla aparte y no columnas del pago porque llegan de a uno y su lista cambia:
-- un contrato de persona natural trae seguridad social, uno de persona jurídica
-- no, y siempre aparece algún anexo que nadie previó. Con columnas fijas cada
-- documento nuevo sería una migración.

CREATE TABLE IF NOT EXISTS hiring.soportes_pago (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id         uuid         NOT NULL REFERENCES hiring.pagos_contrato(id) ON DELETE CASCADE,
  documento_id    uuid         NOT NULL REFERENCES hiring.documentos(id),

  -- Qué es lo que se adjunta. Los dos primeros son los que Click evitaría
  -- pedir; mientras no exista, se piden y quedan registrados como lo que son.
  tipo            varchar(30)  NOT NULL,
  descripcion     varchar(300),

  cargado_por     varchar(200),
  created_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_soporte_pago_tipo CHECK (
    tipo IN ('SEGURIDAD_SOCIAL', 'RUT', 'CERTIFICACION_BANCARIA', 'OTRO')
  )
);

CREATE INDEX IF NOT EXISTS ix_soportes_pago ON hiring.soportes_pago (pago_id);

COMMENT ON TABLE hiring.soportes_pago IS
  'Documentos que acompañan la cuenta de cobro. Se cargan a mano mientras no exista la integración con Click (EFDS-1170).';
