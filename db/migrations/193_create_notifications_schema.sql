CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE IF NOT EXISTS notifications.notificacion (
  id_notificacion             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario_destinatario     UUID NOT NULL,
  tipo_notificacion           VARCHAR(100) NOT NULL,
  titulo                      VARCHAR(255) NOT NULL,
  mensaje                     TEXT NOT NULL,
  descripcion_corta           VARCHAR(255),
  icono                       VARCHAR(100),
  color                       VARCHAR(50),
  prioridad                   VARCHAR(20) NOT NULL DEFAULT 'Media',
  categoria                   VARCHAR(100),
  leida                       BOOLEAN NOT NULL DEFAULT false,
  archivada                   BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_lectura               TIMESTAMPTZ,
  fecha_archivado             TIMESTAMPTZ,
  tiene_accion                BOOLEAN NOT NULL DEFAULT false,
  texto_boton_accion          VARCHAR(100),
  url_accion                  VARCHAR(500),
  datos_adicionales           JSONB,
  email_enviado               BOOLEAN NOT NULL DEFAULT false,
  email_entregado             BOOLEAN NOT NULL DEFAULT false,
  email_abierto               BOOLEAN NOT NULL DEFAULT false,
  email_click                 BOOLEAN NOT NULL DEFAULT false,
  fecha_envio_email           TIMESTAMPTZ,
  fecha_apertura_email        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notificacion_usuario ON notifications.notificacion (id_usuario_destinatario);
CREATE INDEX IF NOT EXISTS idx_notificacion_leida ON notifications.notificacion (id_usuario_destinatario, leida, archivada);
