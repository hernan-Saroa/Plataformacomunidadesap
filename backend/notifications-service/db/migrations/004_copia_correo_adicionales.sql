SET client_encoding = 'UTF8';

-- ============================================================================
-- 004: Copias de correo a destinatarios adicionales sin duplicar (EFDS-2406)
-- ============================================================================
-- Muchos módulos mandan el mismo correo a varias personas en llamadas
-- separadas (p. ej. a 3 directores). El destinatario adicional debe recibir
-- UNA copia por día de ese asunto, no una por llamada. `huella` es el sha256
-- (hex) del asunto. Repetible: se puede correr más de una vez.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications.copia_correo (
  codigo_modulo text        NOT NULL,
  clave         text        NOT NULL,
  huella        text        NOT NULL,
  correo        text        NOT NULL,
  dia           date        NOT NULL,
  enviado_en    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (codigo_modulo, clave, huella, correo, dia)
);

-- Para limpiar copias viejas por fecha.
CREATE INDEX IF NOT EXISTS idx_copia_correo_dia ON notifications.copia_correo (dia);
