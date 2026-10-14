-- 12.3a: historial propio de Auth. No copia datos ni modifica PTA/RUND.
-- Aplicar antes de habilitar CARPETA_DOCUMENT_VERSIONING_ENABLED en auth-service.
BEGIN;
CREATE TABLE IF NOT EXISTS auth.documento_carpeta_version (
  id_version uuid PRIMARY KEY,
  documento_id uuid NOT NULL REFERENCES auth.documento_carpeta_digital(id_documento) ON DELETE CASCADE,
  numero_version integer NOT NULL CHECK (numero_version > 0),
  nombre_archivo varchar(255) NOT NULL,
  url_archivo text NOT NULL,
  tipo_archivo varchar(40),
  tamano_bytes bigint NOT NULL CHECK (tamano_bytes >= 0),
  checksum_sha256 varchar(64) NOT NULL CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  comentarios text,
  creado_por uuid,
  fecha_creacion timestamptz NOT NULL,
  restaurada_desde_version integer,
  CONSTRAINT documento_version_numero_unique UNIQUE (documento_id, numero_version),
  CONSTRAINT documento_version_restaurada_check CHECK
    (restaurada_desde_version IS NULL OR restaurada_desde_version < numero_version)
);
COMMENT ON TABLE auth.documento_carpeta_version IS
  'Versiones de archivos generales locales de Auth. Restaurar agrega una versión y requiere nueva validación. No versiona soportes de PTA/RUND.';
COMMIT;
