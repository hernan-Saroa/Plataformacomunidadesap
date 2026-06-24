-- Repara de forma idempotente la estructura mínima requerida por audit-service.
-- No elimina tablas ni logs existentes.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  method VARCHAR(10) NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  module VARCHAR(100),
  submodule VARCHAR(100),
  action VARCHAR(100),
  version VARCHAR(10),
  ip_address VARCHAR(45),
  user_agent TEXT,
  origin TEXT,
  referer TEXT,
  user_id BIGINT,
  user_email VARCHAR(255),
  user_role VARCHAR(100),
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  response_size_bytes INTEGER DEFAULT 0,
  request_body JSONB,
  request_body_size INTEGER DEFAULT 0,
  has_large_body BOOLEAN DEFAULT FALSE,
  response_body JSONB,
  response_body_size INTEGER DEFAULT 0,
  has_large_response BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  error_stack TEXT,
  entity_name VARCHAR(100),
  entity_id VARCHAR(100),
  previous_data JSONB,
  new_data JSONB,
  changes JSONB,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, "timestamp")
) PARTITION BY RANGE ("timestamp");

ALTER TABLE audit.request_logs
  ADD COLUMN IF NOT EXISTS action VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS previous_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS changes JSONB;

DO $$
DECLARE
  partition_name TEXT := 'request_logs_' || to_char(CURRENT_DATE, 'YYYY_MM');
  start_date DATE := date_trunc('month', CURRENT_DATE)::date;
  end_date DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
  parent_kind "char";
BEGIN
  SELECT relkind
  INTO parent_kind
  FROM pg_class
  WHERE oid = 'audit.request_logs'::regclass;

  IF parent_kind = 'p' AND to_regclass('audit.' || partition_name) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE audit.%I PARTITION OF audit.request_logs FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp
  ON audit.request_logs ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_method
  ON audit.request_logs (method);
CREATE INDEX IF NOT EXISTS idx_request_logs_module
  ON audit.request_logs (module);
CREATE INDEX IF NOT EXISTS idx_request_logs_submodule
  ON audit.request_logs (submodule);
CREATE INDEX IF NOT EXISTS idx_request_logs_action
  ON audit.request_logs (action);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id
  ON audit.request_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_status
  ON audit.request_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_entity_name
  ON audit.request_logs (entity_name);
CREATE INDEX IF NOT EXISTS idx_request_logs_entity_id
  ON audit.request_logs (entity_id);

