-- ============================================================================
-- HOTFIX SEGURO: Schema notifications + tabla notificacion + columna es_favorito
-- SIN BORRAR NADA. Todo es IF NOT EXISTS. Para ejecutar en BD esap_db actual.
-- ============================================================================

-- 1) Crear schema si no existe (necesario antes de synchronize de TypeORM)
CREATE SCHEMA IF NOT EXISTS notifications;

-- 2) Crear la tabla completa con todas las columnas + índices, si NO existe
CREATE TABLE IF NOT EXISTS notifications.notificacion (
  id_notificacion         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario_destinatario UUID NOT NULL,
  tipo_notificacion       VARCHAR(100) NOT NULL,
  titulo                  VARCHAR(255) NOT NULL,
  mensaje                 TEXT NOT NULL,
  descripcion_corta       VARCHAR(255),
  icono                   VARCHAR(100),
  color                   VARCHAR(50),
  prioridad               VARCHAR(20) NOT NULL DEFAULT 'Media',
  categoria               VARCHAR(100),
  leida                   BOOLEAN NOT NULL DEFAULT false,
  archivada               BOOLEAN NOT NULL DEFAULT false,
  es_favorito             BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_lectura           TIMESTAMPTZ,
  fecha_archivado         TIMESTAMPTZ,
  tiene_accion            BOOLEAN NOT NULL DEFAULT false,
  texto_boton_accion      VARCHAR(100),
  url_accion              VARCHAR(500),
  datos_adicionales       JSONB,
  email_enviado           BOOLEAN NOT NULL DEFAULT false,
  email_entregado         BOOLEAN NOT NULL DEFAULT false,
  email_abierto           BOOLEAN NOT NULL DEFAULT false,
  email_click             BOOLEAN NOT NULL DEFAULT false,
  fecha_envio_email       TIMESTAMPTZ,
  fecha_apertura_email    TIMESTAMPTZ
);

-- 3) PARCHE IN-PLACE: Si la tabla EXISTÍA PERO LE FALTABA es_favorito,
--    la agregamos ahora. (UPDATE no falla aunque la columna ya exista.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'notifications'
       AND table_name   = 'notificacion'
       AND column_name  = 'es_favorito'
  ) THEN
    ALTER TABLE notifications.notificacion
      ADD COLUMN es_favorito BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4) Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario
  ON notifications.notificacion (id_usuario_destinatario);

CREATE INDEX IF NOT EXISTS idx_notificacion_leida
  ON notifications.notificacion (id_usuario_destinatario, leida, archivada);

-- 5) Mensaje de confirmación que se ve en DBeaver/pgAdmin results
SELECT 'HOTFIX APLICADO: schema notifications + tabla notificacion OK' AS status;
