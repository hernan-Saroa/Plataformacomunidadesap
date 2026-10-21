-- EFDS-1311: documentos de la persona, fuera del expediente de comisiones.
CREATE TABLE IF NOT EXISTS travel_expenses.paz_y_salvos (
  id uuid PRIMARY KEY,
  comisionado_id uuid NOT NULL REFERENCES travel_expenses.comisionados(id),
  solicitado_por_id uuid NOT NULL,
  contenido jsonb NOT NULL,
  contenido_sha256 varchar(64) NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  firma jsonb,
  firmado_en timestamptz,
  archivo_sha256 varchar(64),
  CHECK ((firma IS NULL AND firmado_en IS NULL AND archivo_sha256 IS NULL)
      OR (firma IS NOT NULL AND firmado_en IS NOT NULL AND archivo_sha256 IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_paz_y_salvos_persona ON travel_expenses.paz_y_salvos(comisionado_id, creado_en);
CREATE TABLE IF NOT EXISTS travel_expenses.paz_y_salvo_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paz_y_salvo_id uuid NOT NULL REFERENCES travel_expenses.paz_y_salvos(id),
  usuario_id uuid NOT NULL,
  accion varchar(30) NOT NULL CHECK (accion IN ('SOLICITADO','OTP_SOLICITADO','FIRMA_VERIFICADA','CONSULTADO','DESCARGADO')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  detalle jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_paz_y_salvo_eventos_documento ON travel_expenses.paz_y_salvo_eventos(paz_y_salvo_id, id);
