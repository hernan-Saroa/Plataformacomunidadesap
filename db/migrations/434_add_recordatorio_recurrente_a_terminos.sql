-- Recordatorios recurrentes y aviso de vencimiento para terminos_procesales.
--
-- Hasta ahora cada umbral avisaba UNA sola vez en toda la vida del término
-- (tabla terminos_alertas_enviadas) y no pasaba nada al vencerse: el responsable
-- recibía un único correo y después silencio, incluso con el término vencido.
--
-- - ultimo_recordatorio_recurrente_en: marca de tiempo del último recordatorio
--   periódico, para que el scheduler sepa cuándo toca el siguiente y no reenvíe
--   en cada corrida. Se limpia cuando cambia la fecha de vencimiento (plazo nuevo).
-- - alerta_vencimiento_enviada_en: marca el aviso puntual de "ya venció", que es
--   de envío único y distinto de los recordatorios recurrentes.

ALTER TABLE legal_management.terminos_procesales
    ADD COLUMN IF NOT EXISTS ultimo_recordatorio_recurrente_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS alerta_vencimiento_enviada_en TIMESTAMPTZ;

-- El scheduler recorre los términos no cumplidos en cada corrida y filtra por estas
-- marcas; el índice evita el seq scan cuando la tabla crece.
CREATE INDEX IF NOT EXISTS idx_terminos_procesales_recordatorio_recurrente
    ON legal_management.terminos_procesales (ultimo_recordatorio_recurrente_en);
