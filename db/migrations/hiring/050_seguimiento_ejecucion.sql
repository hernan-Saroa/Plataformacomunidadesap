-- ============================================================================
-- 050 · Seguimiento de la ejecución del contrato (actividad 9.2)
--
-- EFDS-1168 (RF-EJE-02, RF-SIS-04): iniciada la ejecución, el supervisor carga
-- informes, actas y soportes en el expediente, y cualquiera con acceso puede
-- consultar el estado del contrato y sus responsables.
--
-- Los soportes se modelan aparte de `documentos` y no como adjuntos sueltos
-- porque el seguimiento tiene forma propia: cada uno cubre un periodo y es de
-- un tipo. Guardarlos solo como archivos del expediente dejaría una pila sin
-- orden en la que no se puede ver si falta el informe de un mes ni desde
-- cuándo no se reporta nada.
--
-- La actividad 9.2 se llama en la matriz «Ejecución y supervisión del
-- contrato», y su descripción es solo «Ejecución y supervisión»: no fija qué
-- soportes se exigen ni con qué frecuencia. Por eso el tipo es una lista corta
-- y abierta, y el periodo es opcional —un acta de suspensión no cubre un mes,
-- ocurre un día—.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.seguimientos_contrato (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id        uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Qué clase de soporte es. INFORME y ACTA son los que nombra la historia;
  -- SOPORTE recoge el resto —una certificación, una comunicación— sin obligar
  -- a inventar una categoría por cada documento que aparezca.
  tipo               varchar(20)  NOT NULL,

  -- Qué acredita. Se pide siempre: un archivo sin explicación obliga a
  -- abrirlo para saber si es el que se busca.
  descripcion        text         NOT NULL,

  -- Qué periodo de la ejecución cubre. Nulo cuando el soporte no cubre un
  -- lapso sino un hecho puntual.
  periodo_desde      date,
  periodo_hasta      date,

  -- La fecha del soporte, no la del registro: un informe de enero se puede
  -- cargar en febrero y sigue siendo de enero.
  fecha_soporte      date         NOT NULL,

  -- Sin archivo no hay soporte, solo la afirmación de que existe.
  documento_id       uuid         NOT NULL REFERENCES hiring.documentos(id),

  -- Quién lo cargó y en calidad de qué: el supervisor de entonces puede no ser
  -- el de ahora, y el expediente tiene que decir quién respondía ese día.
  registrado_por     varchar(200),
  supervision_id     uuid         REFERENCES hiring.supervisiones_contrato(id),

  created_at         timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_seguimiento_tipo CHECK (tipo IN ('INFORME', 'ACTA', 'SOPORTE')),
  CONSTRAINT ck_seguimiento_descripcion CHECK (length(trim(descripcion)) >= 5),
  -- El periodo va entero o no va: una fecha suelta no dice qué cubre.
  CONSTRAINT ck_seguimiento_periodo_completo CHECK (
    (periodo_desde IS NULL) = (periodo_hasta IS NULL)
  ),
  CONSTRAINT ck_seguimiento_periodo_orden CHECK (
    periodo_desde IS NULL OR periodo_desde <= periodo_hasta
  )
);

CREATE INDEX IF NOT EXISTS ix_seguimientos_contrato
  ON hiring.seguimientos_contrato (contrato_id, fecha_soporte DESC);

COMMENT ON TABLE hiring.seguimientos_contrato IS
  'Informes, actas y soportes de la ejecución del contrato (EFDS-1168, actividad 9.2).';
