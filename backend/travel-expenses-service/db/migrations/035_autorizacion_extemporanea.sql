
-- ============================================================================
-- 5. Columnas en travel_expenses.solicitudes_comision
-- ============================================================================

ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS autorizador_direccion_id UUID NULL,
ADD COLUMN IF NOT EXISTS fecha_autorizacion_direccion TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS decision_direccion VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS justificacion_direccion TEXT NULL,
ADD COLUMN IF NOT EXISTS es_delegado_direccion BOOLEAN DEFAULT false;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.autorizador_direccion_id
  IS 'ID del usuario de Dirección Nacional o delegado que autorizó/negó la extemporaneidad (auth.user.id_user).';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_autorizacion_direccion
  IS 'Marca temporal en que la Dirección Nacional emitió la decisión (Etapa 6 - RF-AUT-002).';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.decision_direccion
  IS 'Resultado de la decisión de Dirección Nacional: AUTORIZADA o RECHAZADA.';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.justificacion_direccion
  IS 'Justificación motivada de la decisión emitida por Dirección Nacional.';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.es_delegado_direccion
  IS 'Indica si la autorización/negación fue emitida por un delegado formal de la Dirección Nacional.';

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_solicitudes_autorizador_direccion_id
  ON travel_expenses.solicitudes_comision (autorizador_direccion_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_decision_direccion
  ON travel_expenses.solicitudes_comision (decision_direccion);

CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_autorizacion_direccion
  ON travel_expenses.solicitudes_comision (fecha_autorizacion_direccion);
