-- Proyección separada de estados cuyo propietario es Auth. Sin FK a schemas ajenos.
CREATE TABLE IF NOT EXISTS rund.carpeta_auth_sync (
  persona_id uuid PRIMARY KEY,
  revision bigint CHECK (revision >= 0),
  fingerprint varchar(64),
  deleted boolean NOT NULL DEFAULT false,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  error_code varchar(40)
);
CREATE TABLE IF NOT EXISTS rund.carpeta_auth_documento (
  persona_id uuid NOT NULL,
  documento_id uuid NOT NULL,
  metadata jsonb NOT NULL,
  PRIMARY KEY (persona_id, documento_id)
);
CREATE TABLE IF NOT EXISTS rund.carpeta_auth_sync_evento (
  persona_id uuid NOT NULL,
  revision bigint NOT NULL,
  fingerprint varchar(64) NOT NULL,
  total integer NOT NULL,
  deleted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (persona_id, revision)
);
