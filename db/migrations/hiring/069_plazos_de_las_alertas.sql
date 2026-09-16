-- ============================================================================
-- 069 · Los plazos de las alertas se configuran
--
-- EFDS-1183. Hasta aquí los plazos de las alertas eran constantes en el código:
-- 30 días para todo vencimiento, 2 días de tolerancia para un proceso sin
-- abogado y el aviso diario a las 7:00.
--
-- `parametros_alerta` guarda la anticipación de cada vencimiento, la tolerancia
-- sin abogado y la hora del aviso diario. Clave y valor, para que el siguiente
-- parámetro no exija otra migración.
--
-- Se siembran con los valores que ya regían, así que aplicarla no cambia cuándo
-- alerta nada.
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hiring.parametros_alerta (
  clave        varchar(60)  PRIMARY KEY,
  valor        integer      NOT NULL,
  -- Los límites viven en la fila y no en el código: la pantalla los lee para
  -- decirle a quien edita qué admite, y el servicio los usa para rechazar.
  minimo       integer      NOT NULL,
  maximo       integer      NOT NULL,
  descripcion  text         NOT NULL,
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  updated_by   varchar(120),
  CONSTRAINT ck_parametro_alerta_rango CHECK (valor BETWEEN minimo AND maximo)
);

COMMENT ON TABLE hiring.parametros_alerta IS
  'Plazos que gobiernan las alertas de contratación: anticipación por vencimiento, tolerancia sin abogado y hora del aviso diario.';

INSERT INTO hiring.parametros_alerta (clave, valor, minimo, maximo, descripcion) VALUES
  ('anticipacion_amparo',          30, 1, 180, 'Días antes del vencimiento de una póliza en que se empieza a alertar'),
  ('anticipacion_cdp',             30, 1, 180, 'Días antes del cierre de la vigencia de un CDP en que se empieza a alertar'),
  ('anticipacion_rp',              30, 1, 180, 'Días antes del cierre de la vigencia de un RP en que se empieza a alertar'),
  ('anticipacion_liquidacion',     30, 1, 180, 'Días antes del plazo legal para liquidar en que se empieza a alertar'),
  ('tolerancia_sin_abogado',        2, 0,  30, 'Días que un proceso recibido puede estar sin abogado antes de alertar'),
  ('hora_aviso',                    7, 0,  23, 'Hora de Bogotá a la que sale el aviso diario de vencimientos')
ON CONFLICT (clave) DO NOTHING;
