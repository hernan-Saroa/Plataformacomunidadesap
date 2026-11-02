SET client_encoding = 'UTF8';

-- ============================================================================
-- 002: Configuración de notificaciones por módulo (EFDS-2406)
-- ============================================================================
-- Hasta ahora la campana y el correo reciben todo lo que cada módulo decide
-- mandar, sin un lugar donde apagarlo. Esta migración crea el catálogo que
-- consulta la compuerta del notifications-service antes de guardar una
-- notificación o enviar un correo:
--
--   * modulo_notificacion   Un interruptor por módulo y el canal por defecto.
--   * modulo_alias          Lo que hoy mandan los módulos en `categoria`
--                           ('PTA', 'UMI-MANTENIMIENTO', ...) traducido al
--                           código del módulo. Así ningún emisor cambia hoy.
--   * evento_notificacion   Un renglón por `tipo_notificacion`. Se llena solo:
--                           el primer aviso que llega con una clave nueva la
--                           registra activa. Desde la consola se apaga, se le
--                           cambia el canal, la prioridad o se marca obligatoria.
--   * configuracion_historial  Valor anterior y nuevo de cada cambio (RN5).
--   * envio_omitido         Lo que la compuerta no dejó pasar y por qué. Los
--                           emisores no pasan por el gateway, así que esto es
--                           la única huella de un aviso apagado.
--
-- Con las tablas vacías todo sigue igual: sin regla, el aviso pasa.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE IF NOT EXISTS notifications.modulo_notificacion (
  codigo          VARCHAR(60) PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  canal_defecto   VARCHAR(12) NOT NULL DEFAULT 'ambos'
                  CHECK (canal_defecto IN ('plataforma', 'correo', 'ambos')),
  orden           INTEGER NOT NULL DEFAULT 100,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS notifications.modulo_alias (
  alias         VARCHAR(100) PRIMARY KEY,
  codigo_modulo VARCHAR(60) NOT NULL REFERENCES notifications.modulo_notificacion (codigo)
);

CREATE TABLE IF NOT EXISTS notifications.evento_notificacion (
  clave             VARCHAR(100) PRIMARY KEY,
  codigo_modulo     VARCHAR(60) NOT NULL REFERENCES notifications.modulo_notificacion (codigo),
  nombre            VARCHAR(150) NOT NULL,
  descripcion       TEXT,
  activo            BOOLEAN NOT NULL DEFAULT true,
  -- NULL hereda el canal por defecto del módulo.
  canal             VARCHAR(12) CHECK (canal IN ('plataforma', 'correo', 'ambos')),
  obligatorio       BOOLEAN NOT NULL DEFAULT false,
  -- NULL deja la prioridad que trae el código; prioridad_codigo es la primera vista.
  prioridad         VARCHAR(20) CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Crítica')),
  prioridad_codigo  VARCHAR(20),
  -- true cuando el código manda correo para este evento; si no, "correo" no se ofrece.
  envia_correo      BOOLEAN NOT NULL DEFAULT false,
  roles_adicionales         TEXT[] NOT NULL DEFAULT '{}',
  dependencias_adicionales  BIGINT[] NOT NULL DEFAULT '{}',
  sedes_adicionales         BIGINT[] NOT NULL DEFAULT '{}',
  visto_en          TIMESTAMPTZ,
  verificado_en     TIMESTAMPTZ,
  verificado_por    VARCHAR(150),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por   VARCHAR(150)
);

CREATE INDEX IF NOT EXISTS idx_evento_notificacion_modulo
  ON notifications.evento_notificacion (codigo_modulo);

CREATE TABLE IF NOT EXISTS notifications.configuracion_historial (
  id        BIGSERIAL PRIMARY KEY,
  entidad   VARCHAR(20) NOT NULL CHECK (entidad IN ('modulo', 'evento')),
  clave     VARCHAR(100) NOT NULL,
  anterior  JSONB,
  nuevo     JSONB,
  usuario   VARCHAR(150),
  fecha     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_configuracion_historial_fecha
  ON notifications.configuracion_historial (fecha DESC);

CREATE TABLE IF NOT EXISTS notifications.envio_omitido (
  id            BIGSERIAL PRIMARY KEY,
  codigo_modulo VARCHAR(60) NOT NULL,
  clave_evento  VARCHAR(100) NOT NULL,
  canal         VARCHAR(12) NOT NULL,
  destinatario  VARCHAR(255),
  motivo        VARCHAR(40) NOT NULL,
  titulo        VARCHAR(255),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_envio_omitido_fecha
  ON notifications.envio_omitido (fecha DESC);

-- Los módulos que hoy notifican, con el mismo código que usa auth.module para
-- que la consola los nombre igual que Gestión de Módulos. `otros` recoge lo
-- que llegue sin categoría reconocible hasta que su módulo se conecte.
INSERT INTO notifications.modulo_notificacion (codigo, nombre, orden) VALUES
  ('pta',                     'Plan de Trabajo Académico (PTA)', 10),
  ('gestion-infraestructura', 'Gestión de Infraestructura',       20),
  ('control-disciplinario',   'Control Disciplinario',            30),
  ('gestion-legal',           'Gestión Legal (SIGL)',             40),
  ('viaticos',                'Viáticos y Gastos de Viaje',       50),
  ('contratacion',            'Contratación',                     60),
  ('control-interno',         'Control Interno de Gestión',       70),
  ('sistema',                 'Correos del sistema',              90),
  ('otros',                   'Sin módulo identificado',          999)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO notifications.modulo_alias (alias, codigo_modulo) VALUES
  ('pta',               'pta'),
  ('rund',              'pta'),
  ('umi-mantenimiento', 'gestion-infraestructura'),
  ('disciplinario',     'control-disciplinario'),
  ('gestion-legal',     'gestion-legal'),
  ('viaticos',          'viaticos'),
  ('contratacion',      'contratacion'),
  ('control-interno',   'control-interno')
ON CONFLICT (alias) DO NOTHING;

-- Correos de seguridad que nadie puede apagar (función 5): credenciales,
-- códigos de acceso y el OTP de firma. Se registran antes de que lleguen
-- para que nazcan obligatorios; el resto del catálogo se llena solo.
INSERT INTO notifications.evento_notificacion (clave, codigo_modulo, nombre, descripcion, obligatorio, envia_correo)
VALUES
  ('pta_otp_firma',             'pta', 'Código OTP para firmar el PTA',
   'Correo con el código de un solo uso que valida la firma del PTA. Sin él no se puede firmar.', true, true),
  ('rund_credenciales_docente', 'pta', 'Credenciales de acceso del docente (RUND)',
   'Usuario y contraseña temporal que recibe un docente cuando se le crea el acceso desde el Banco de Docentes.', true, true),
  ('rund_codigo_acceso',        'pta', 'Código de acceso a la invitación RUND',
   'Código que el docente recibe para entrar a actualizar sus datos en RUND.', true, true)
ON CONFLICT (clave) DO NOTHING;
