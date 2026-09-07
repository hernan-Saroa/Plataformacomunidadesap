-- ============================================================================
-- 010 · Certificado de Disponibilidad Presupuestal (CDP)
--
-- Etapa 4 de la matriz de flujo. Son cuatro actividades encadenadas:
--   4.1 Solicitud de CDP           el área solicitante radica la solicitud
--   4.2 Verificar disponibilidad   la Dirección Financiera revisa el rubro
--   4.3 Expedición del CDP         sin CDP no se puede continuar
--   4.4 Adjuntar al expediente     queda para consulta en etapas posteriores
--
-- El CDP certifica que hay recursos y queda afectado al proceso: es el
-- respaldo presupuestal previo a comprometer a la entidad (RF-EST-05).
--
-- Enajenación de bienes por subasta es la única de las once modalidades que la
-- matriz marca NO en las cuatro actividades: ahí la ESAP vende, no compra, así
-- que no hay gasto que respaldar.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.cdp (
  id               uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  proceso_id       uuid          NOT NULL REFERENCES hiring.procesos (id),

  -- El número lo asigna la Dirección Financiera al expedirlo, así que no
  -- existe mientras el CDP está apenas solicitado.
  numero           varchar(60),
  valor            numeric(18, 2),
  rubro            varchar(160),
  fecha_expedicion date,
  -- Vigencia fiscal a la que se imputa. Un CDP no cruza vigencias.
  vigencia_fiscal  int,

  -- SOLICITADO → VERIFICADO → EXPEDIDO
  --           ↘ RECHAZADO (no hay disponibilidad en el rubro)
  -- ANULADO queda fuera del flujo normal: cubre el CDP que se deja sin efecto.
  estado           varchar(20)   NOT NULL DEFAULT 'SOLICITADO'
                   CHECK (estado IN ('SOLICITADO','VERIFICADO','EXPEDIDO','RECHAZADO','ANULADO')),

  -- Por qué la Financiera lo rechazó. Sin esto, el solicitante no sabe si
  -- corregir el rubro, esperar o reducir el alcance.
  observaciones    text,

  solicitado_por   varchar(160),
  solicitado_at    timestamptz   NOT NULL DEFAULT now(),
  expedido_por     varchar(160),

  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),

  -- Un CDP expedido sin número o sin fecha no certifica nada: los datos que lo
  -- hacen oponible se exigen en el momento en que pasa a expedido, no antes.
  CONSTRAINT cdp_expedido_completo CHECK (
    estado <> 'EXPEDIDO'
    OR (numero IS NOT NULL AND valor IS NOT NULL AND fecha_expedicion IS NOT NULL)
  ),
  CONSTRAINT cdp_valor_positivo CHECK (valor IS NULL OR valor > 0),
  CONSTRAINT cdp_rechazo_motivado CHECK (
    estado <> 'RECHAZADO' OR observaciones IS NOT NULL
  )
);

COMMENT ON TABLE hiring.cdp IS
  'Certificado de Disponibilidad Presupuestal del proceso. Requisito previo a la apertura (EFDS-1148).';

-- Un proceso no puede tener dos CDP en curso a la vez: sería ambiguo cuál
-- respalda la apertura. Los anulados y rechazados sí se acumulan, que es el
-- historial de intentos.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdp_vigente_por_proceso
  ON hiring.cdp (proceso_id)
  WHERE estado IN ('SOLICITADO', 'VERIFICADO', 'EXPEDIDO');

CREATE INDEX IF NOT EXISTS idx_cdp_proceso ON hiring.cdp (proceso_id);

-- ---------------------------------------------------------------------------
-- Actividades de la etapa 4
--
-- Se registran en el mismo catálogo que ya usa la etapa 3 para que el riel de
-- actividades del proceso las lea de la misma fuente, en vez de llevar una
-- lista distinta por etapa en el código del microfrontend.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hiring.actividades (
  numeral        varchar(20)  PRIMARY KEY,
  etapa          int          NOT NULL,
  nombre         varchar(200) NOT NULL,
  descripcion    text,
  orden          int          NOT NULL,
  -- False cuando la actividad no aplica a alguna modalidad; el detalle de
  -- cuáles vive en actividades_modalidad.
  activa         boolean      NOT NULL DEFAULT true
);

COMMENT ON TABLE hiring.actividades IS
  'Catálogo de actividades de la matriz de flujo, por etapa y numeral.';

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('4.1', 4, 'Solicitud de CDP',
   'El área solicitante radica la solicitud formal. Requiere enlace con KLIC.', 10),
  ('4.2', 4, 'Verificar disponibilidad presupuestal',
   'La Dirección Financiera verifica la disponibilidad en el rubro.', 20),
  ('4.3', 4, 'Expedición del CDP',
   'Sin CDP no se puede continuar. Certifica recursos disponibles y queda afectado al proceso.', 30),
  ('4.4', 4, 'Adjuntar al expediente',
   'Se carga el CDP para su consulta en las etapas siguientes.', 40)
ON CONFLICT (numeral) DO NOTHING;

-- Excepciones por modalidad. Solo se registran los NO: la ausencia de fila
-- significa que la actividad sí aplica, que es el caso mayoritario.
CREATE TABLE IF NOT EXISTS hiring.actividades_excluidas (
  numeral    varchar(20) NOT NULL REFERENCES hiring.actividades (numeral),
  modalidad  varchar(60) NOT NULL REFERENCES hiring.modalidades (codigo),
  motivo     text,
  PRIMARY KEY (numeral, modalidad)
);

COMMENT ON TABLE hiring.actividades_excluidas IS
  'Celdas marcadas NO en la matriz de flujo: la actividad no aplica a esa modalidad.';

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
SELECT a.numeral, 'ENAJENACION_SUBASTA',
       'La entidad vende y no compra: no hay gasto que respaldar con CDP'
  FROM hiring.actividades a
 WHERE a.etapa = 4
ON CONFLICT DO NOTHING;
