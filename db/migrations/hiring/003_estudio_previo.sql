-- ============================================================================
-- Migration: Modelo base del módulo de Contratación — HU EFDS-1146
-- Descripción: Tablas mínimas para elaborar y registrar el estudio previo
--              (numeral 3.1 de la matriz de flujo, etapa 3 Estudios Previos).
--
-- Alcance deliberado: solo lo que exigen los criterios de aceptación del HU.
--   NO incluye: catálogo de modalidades (HU de modalidad, RF-EST-03),
--   matriz de aplicabilidad, catálogo de 63 actividades, ni flujo de
--   revisión/aprobación (HU de revisión, numeral 3.4).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS hiring;

-- Consecutivos sin condición de carrera: dos creaciones simultáneas con
-- SELECT MAX() colisionarían contra el UNIQUE.
CREATE SEQUENCE IF NOT EXISTS hiring.radicado_seq;
CREATE SEQUENCE IF NOT EXISTS hiring.expediente_seq;

-- ---------------------------------------------------------------- proceso ---
CREATE TABLE IF NOT EXISTS hiring.procesos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado         varchar(60)  NOT NULL UNIQUE,
  objeto           text         NOT NULL,
  -- Materializa el "Dado: proceso en etapa de Estudios Previos" del criterio 1
  etapa            int          NOT NULL DEFAULT 3,
  fecha_radicacion timestamptz  NOT NULL DEFAULT now(),
  created_by       varchar(120),
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------- expediente ---
-- RF-SIS-04: expediente electrónico único por proceso
CREATE TABLE IF NOT EXISTS hiring.expedientes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id        uuid        NOT NULL UNIQUE REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numero_expediente varchar(60) NOT NULL UNIQUE,
  estado            varchar(40) NOT NULL DEFAULT 'ABIERTO',
  fecha_apertura    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------- actividad ----
-- Genérica por numeral: mismo costo que una tabla dedicada al estudio previo,
-- y evita migrar datos cuando lleguen los numerales 3.2 a 3.6.
CREATE TABLE IF NOT EXISTS hiring.proceso_actividades (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id    uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral       varchar(20) NOT NULL,
  estado        varchar(30) NOT NULL DEFAULT 'BORRADOR',
  datos         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Optimistic lock: se incrementa en cada guardado; el cliente manda la
  -- versión que leyó y un desfase responde 409 en vez de pisar cambios.
  version       int         NOT NULL DEFAULT 1,
  enviado_por   varchar(120),
  enviado_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_proceso_numeral UNIQUE (proceso_id, numeral),
  CONSTRAINT ck_pa_estado CHECK (estado IN ('BORRADOR', 'EN_REVISION'))
);

-- ------------------------------------------------- definición del formulario --
-- El HU pide parametrizar los campos obligatorios en vez de fijarlos en código.
CREATE TABLE IF NOT EXISTS hiring.campos_formulario (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  numeral     varchar(20)  NOT NULL,
  codigo      varchar(80)  NOT NULL,
  etiqueta    varchar(300) NOT NULL,
  ayuda       text,
  tipo        varchar(30)  NOT NULL,
  obligatorio boolean      NOT NULL DEFAULT false,
  grupo       varchar(120),
  orden       int          NOT NULL,
  opciones    jsonb,
  activo      boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_campo UNIQUE (numeral, codigo),
  CONSTRAINT ck_campo_tipo CHECK (tipo IN ('texto', 'texto_largo', 'numero', 'moneda', 'seleccion')),
  -- Un campo de selección sin opciones no se puede pintar ni validar
  CONSTRAINT ck_campo_opciones CHECK (tipo <> 'seleccion' OR opciones IS NOT NULL)
);

-- ------------------------------------------------------------- documentos ---
CREATE TABLE IF NOT EXISTS hiring.documentos (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id           uuid         NOT NULL REFERENCES hiring.expedientes(id) ON DELETE CASCADE,
  numeral                 varchar(20),
  -- ADJUNTO: archivo subido. SNAPSHOT_FORMULARIO: copia inmutable del estudio
  -- previo al momento del envío — es lo que da por cumplido el criterio 1
  -- ("registra el documento en el expediente electrónico").
  tipo                    varchar(30)  NOT NULL DEFAULT 'ADJUNTO',
  nombre                  varchar(300) NOT NULL,
  archivo_url             text,
  contenido_snapshot      jsonb,
  archivo_nombre_original varchar(300),
  archivo_mime_type       varchar(120),
  archivo_tamano          bigint,
  -- Integridad probatoria: el expediente es prueba ante entes de control
  hash_sha256             char(64)     NOT NULL,
  version                 int          NOT NULL DEFAULT 1,
  subido_por              varchar(120),
  created_at              timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_doc_tipo CHECK (tipo IN ('ADJUNTO', 'SNAPSHOT_FORMULARIO')),
  -- Un adjunto necesita archivo; un snapshot necesita contenido
  CONSTRAINT ck_doc_contenido CHECK (
    (tipo = 'ADJUNTO' AND archivo_url IS NOT NULL) OR
    (tipo = 'SNAPSHOT_FORMULARIO' AND contenido_snapshot IS NOT NULL)
  )
);

-- ------------------------------------------------------------ trazabilidad ---
CREATE TABLE IF NOT EXISTS hiring.trazabilidad (
  id             bigserial   PRIMARY KEY,
  proceso_id     uuid        REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  entidad        varchar(80) NOT NULL,
  entidad_id     uuid,
  accion         varchar(60) NOT NULL,
  detalle        jsonb,
  usuario_id     varchar(120),
  usuario_nombre varchar(200),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_proceso    ON hiring.proceso_actividades(proceso_id);
CREATE INDEX IF NOT EXISTS idx_campos_num    ON hiring.campos_formulario(numeral, orden) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_doc_exp       ON hiring.documentos(expediente_id);
CREATE INDEX IF NOT EXISTS idx_traza_proceso ON hiring.trazabilidad(proceso_id, created_at DESC);
