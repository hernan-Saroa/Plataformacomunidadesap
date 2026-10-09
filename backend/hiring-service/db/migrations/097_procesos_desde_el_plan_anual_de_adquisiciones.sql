-- ============================================================================
-- 097 · Los procesos nacen de una línea del Plan Anual de Adquisiciones
--
-- Hasta aquí el área tecleaba el objeto, la modalidad y el valor al crear el
-- proceso, y después volvía a teclear casi lo mismo en la 3.1. Todo eso ya
-- está en el PAA que publica Planeación: un Excel con formato fijo (el de
-- SECOP), una línea por contratación y un código por línea —`LINEA 12` en la
-- Sede Central, `CHOCO 3` en la territorial— metido al comienzo de la
-- descripción.
--
-- El PAA cambia mucho (la de octubre de 2026 era la versión 31) y cada año se
-- reemplaza por uno nuevo, con otros códigos. Por eso:
--
--   paa_regiones           · quién contrata: Sede Central, Chocó…
--   paa_vigencias          · el año; solo uno está vigente para crear procesos
--   paa_versiones          · cada archivo cargado, con su validación
--   paa_lineas             · las filas de cada versión, ya repartidas por región
--   paa_campos_visibles    · qué columnas ve quien crea el proceso
--   paa_comparaciones      · qué cambió entre dos versiones
--   paa_aplicaciones       · qué le cambió a cada proceso y desde qué versión
--   paa_revisiones         · lo que el abogado tiene que decidir por un cambio
--
-- Un archivo trae varias regiones a la vez, así que la versión es del archivo
-- (de la vigencia) y la región es de cada línea.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------- regiones --

CREATE TABLE IF NOT EXISTS hiring.paa_regiones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              varchar(40)  NOT NULL UNIQUE,
  nombre              varchar(150) NOT NULL,
  -- Lo que antecede al número en la descripción: «LINEA 12 - …», «CHOCO 3 - …».
  prefijo_linea       varchar(30)  NOT NULL UNIQUE,
  -- Cómo la nombra la columna «Unidad de contratación (referencia)». Sirve de
  -- comprobación: un prefijo y una unidad que no casan es un error del archivo.
  unidad_contratacion varchar(150) NOT NULL,
  activa              boolean      NOT NULL DEFAULT true,
  created_by          varchar(150),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_paa_region_prefijo CHECK (prefijo_linea ~ '^[A-Z]+$')
);

COMMENT ON TABLE hiring.paa_regiones IS
  'Regiones que contratan con su propio bloque del PAA. El prefijo identifica sus líneas.';

INSERT INTO hiring.paa_regiones (codigo, nombre, prefijo_linea, unidad_contratacion, created_by)
VALUES ('SEDE_CENTRAL', 'Sede Central', 'LINEA', 'Contratación', 'migracion-097'),
       ('CHOCO',        'Territorial Chocó', 'CHOCO', 'Territorial Choco', 'migracion-097')
ON CONFLICT (codigo) DO NOTHING;

-- --------------------------------------------------------------- vigencias --

CREATE TABLE IF NOT EXISTS hiring.paa_vigencias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio        smallint    NOT NULL UNIQUE,
  -- La que se usa para crear procesos. Las demás siguen consultables.
  vigente     boolean     NOT NULL DEFAULT false,
  declarada_vigente_por varchar(150),
  declarada_vigente_at  timestamptz,
  created_by  varchar(150),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_paa_vigencia_anio CHECK (anio BETWEEN 2000 AND 2100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_paa_una_vigencia_vigente
  ON hiring.paa_vigencias ((true)) WHERE vigente;

-- --------------------------------------------------------------- versiones --

CREATE TABLE IF NOT EXISTS hiring.paa_versiones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_id      uuid         NOT NULL REFERENCES hiring.paa_vigencias(id),
  numero           int          NOT NULL,
  nombre_archivo   varchar(300) NOT NULL,
  ruta_archivo     varchar(500) NOT NULL,
  sha256           char(64)     NOT NULL,
  -- Encabezados tal como venían, para poder decir qué columnas sobraban.
  encabezados      jsonb        NOT NULL DEFAULT '[]'::jsonb,
  estado           varchar(15)  NOT NULL,
  errores          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  advertencias     jsonb        NOT NULL DEFAULT '[]'::jsonb,
  total_lineas     int          NOT NULL DEFAULT 0,
  cargada_por      varchar(150),
  cargada_por_id   varchar(120),
  cargada_at       timestamptz  NOT NULL DEFAULT now(),
  activada_por     varchar(150),
  activada_at      timestamptz,
  descartada_por   varchar(150),
  descartada_at    timestamptz,
  motivo_descarte  text,
  reemplazada_at   timestamptz,
  CONSTRAINT uq_paa_version_numero UNIQUE (vigencia_id, numero),
  CONSTRAINT ck_paa_version_estado
    CHECK (estado IN ('INVALIDA', 'VALIDADA', 'ACTIVA', 'REEMPLAZADA', 'DESCARTADA'))
);

-- Nunca dos versiones activas en la misma vigencia: es lo que hace que no haya
-- duda sobre de qué documento sale un proceso nuevo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_paa_una_version_activa
  ON hiring.paa_versiones (vigencia_id) WHERE estado = 'ACTIVA';

-- ------------------------------------------------------------------ líneas --

CREATE TABLE IF NOT EXISTS hiring.paa_lineas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  uuid        NOT NULL REFERENCES hiring.paa_versiones(id) ON DELETE CASCADE,
  region_id   uuid        NOT NULL REFERENCES hiring.paa_regiones(id),
  codigo      varchar(40) NOT NULL,
  fila        int         NOT NULL,
  -- Las columnas del Excel por su clave estable (`valor_total`, `modalidad`…).
  valores     jsonb       NOT NULL,
  -- sha256 de `valores` normalizados: comparar dos versiones de 1.500 líneas no
  -- debería exigir recorrer cada campo de las que no cambiaron.
  huella      char(64)    NOT NULL,
  CONSTRAINT uq_paa_linea_codigo UNIQUE (version_id, codigo)
);

CREATE INDEX IF NOT EXISTS ix_paa_lineas_region ON hiring.paa_lineas (version_id, region_id);

-- ---------------------------------------------------- campos del formulario --

CREATE TABLE IF NOT EXISTS hiring.paa_campos_visibles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id   uuid         NOT NULL REFERENCES hiring.paa_regiones(id),
  vigencia_id uuid         NOT NULL REFERENCES hiring.paa_vigencias(id),
  clave       varchar(80)  NOT NULL,
  visible     boolean      NOT NULL DEFAULT true,
  orden       int          NOT NULL,
  etiqueta    varchar(300),
  -- La clave ya no viene en la versión activa: se conserva la preferencia por
  -- si vuelve, pero la pantalla la señala.
  huerfana    boolean      NOT NULL DEFAULT false,
  updated_by  varchar(150),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_paa_campo UNIQUE (region_id, vigencia_id, clave)
);

-- ------------------------------------------------------------ comparaciones --

CREATE TABLE IF NOT EXISTS hiring.paa_comparaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_base_id   uuid        NOT NULL REFERENCES hiring.paa_versiones(id),
  version_nueva_id  uuid        NOT NULL REFERENCES hiring.paa_versiones(id),
  tipo              varchar(20) NOT NULL,
  -- Falsa si alguna de las dos trae códigos duplicados o ilegibles: entonces
  -- cruzar por código podría pegarle a un proceso los datos de otra línea.
  confiable         boolean     NOT NULL,
  resumen           jsonb       NOT NULL,
  detalle           jsonb       NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_paa_comparacion UNIQUE (version_base_id, version_nueva_id),
  CONSTRAINT ck_paa_comparacion_tipo CHECK (tipo IN ('MISMA_VIGENCIA', 'CAMBIO_VIGENCIA'))
);

-- ---------------------------------------------------- el proceso y su origen --

ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS paa_linea_id  uuid REFERENCES hiring.paa_lineas(id),
  ADD COLUMN IF NOT EXISTS paa_codigo    varchar(40),
  ADD COLUMN IF NOT EXISTS paa_region_id uuid REFERENCES hiring.paa_regiones(id),
  ADD COLUMN IF NOT EXISTS paa_anio      smallint,
  ADD COLUMN IF NOT EXISTS paa_origen    jsonb,
  ADD COLUMN IF NOT EXISTS cancelado_por varchar(150),
  ADD COLUMN IF NOT EXISTS cancelado_at  timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text;

COMMENT ON COLUMN hiring.procesos.paa_linea_id IS
  'Línea del PAA de la que sale el proceso, en la última versión que se le aplicó.';
COMMENT ON COLUMN hiring.procesos.paa_origen IS
  'Valores que trajo el PAA al crear o al último cambio aplicado: distinguen lo que vino del Excel de lo que se corrigió a mano.';

-- Una línea, un proceso vivo. Un proceso desierto, negado o cancelado la libera.
CREATE UNIQUE INDEX IF NOT EXISTS uq_paa_linea_un_proceso_vivo
  ON hiring.procesos (paa_region_id, paa_anio, paa_codigo)
  WHERE paa_codigo IS NOT NULL AND estado IN ('EN_CURSO', 'ADJUDICADO');

-- Cuarto desenlace: el proceso no puede seguir por un cambio en sus
-- condiciones. No es negado —la Dirección no dijo que no procediera— ni
-- desierto —no salió al mercado sin oferentes—.
ALTER TABLE hiring.procesos
  DROP CONSTRAINT IF EXISTS ck_proceso_estado;

ALTER TABLE hiring.procesos
  ADD CONSTRAINT ck_proceso_estado
  CHECK (estado IN ('EN_CURSO', 'ADJUDICADO', 'DESIERTO', 'NEGADO', 'CANCELADO'));

ALTER TABLE hiring.procesos
  DROP CONSTRAINT IF EXISTS ck_proceso_cancelado;

ALTER TABLE hiring.procesos
  ADD CONSTRAINT ck_proceso_cancelado
  CHECK (estado <> 'CANCELADO' OR (cancelado_at IS NOT NULL AND motivo_cancelacion IS NOT NULL));

COMMENT ON COLUMN hiring.procesos.estado IS
  'Desenlace del proceso: en curso, adjudicado, desierto, negado en la revisión o cancelado.';

-- ------------------------------------------------------------- aplicaciones --

CREATE TABLE IF NOT EXISTS hiring.paa_aplicaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id          uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  linea_origen_id     uuid        REFERENCES hiring.paa_lineas(id),
  linea_destino_id    uuid        NOT NULL REFERENCES hiring.paa_lineas(id),
  tipo                varchar(20) NOT NULL,
  -- [{ campo, antes, despues, aplicado, motivo }]: también lo que no se aplicó
  -- porque alguien lo había corregido a mano.
  campos              jsonb       NOT NULL DEFAULT '[]'::jsonb,
  aplicado_por        varchar(150),
  aplicado_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_paa_aplicacion_tipo CHECK (tipo IN ('CREACION', 'ACTUALIZACION', 'MIGRACION'))
);

CREATE INDEX IF NOT EXISTS ix_paa_aplicaciones_proceso
  ON hiring.paa_aplicaciones (proceso_id, aplicado_at DESC);

-- --------------------------------------------------------------- revisiones --

CREATE TABLE IF NOT EXISTS hiring.paa_revisiones (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid         NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  comparacion_id        uuid         REFERENCES hiring.paa_comparaciones(id),
  version_anterior_id   uuid         NOT NULL REFERENCES hiring.paa_versiones(id),
  version_nueva_id      uuid         NOT NULL REFERENCES hiring.paa_versiones(id),
  codigo                varchar(40)  NOT NULL,
  tipo                  varchar(20)  NOT NULL,
  cambios               jsonb        NOT NULL DEFAULT '[]'::jsonb,
  motivo                text         NOT NULL,
  -- Mientras esté pendiente, el proceso no avanza.
  bloquea               boolean      NOT NULL,
  -- Nulo: nadie tiene el proceso como abogado; va a la bandeja compartida.
  responsable_id        varchar(120),
  responsable_nombre    varchar(200),
  estado                varchar(15)  NOT NULL DEFAULT 'PENDIENTE',
  decision              varchar(15),
  justificacion         text,
  linea_destino_id      uuid         REFERENCES hiring.paa_lineas(id),
  decidida_por          varchar(150),
  decidida_por_id       varchar(120),
  decidida_at           timestamptz,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_paa_revision UNIQUE (proceso_id, version_nueva_id),
  CONSTRAINT ck_paa_revision_tipo
    CHECK (tipo IN ('MODIFICACION', 'ELIMINACION', 'CAMBIO_VIGENCIA')),
  CONSTRAINT ck_paa_revision_estado CHECK (estado IN ('PENDIENTE', 'RESUELTA')),
  CONSTRAINT ck_paa_revision_decision
    CHECK (decision IS NULL OR decision IN ('CONTINUAR', 'DEVOLVER', 'MIGRAR', 'CANCELAR')),
  CONSTRAINT ck_paa_revision_resuelta
    CHECK (estado <> 'RESUELTA' OR (decision IS NOT NULL AND justificacion IS NOT NULL AND decidida_at IS NOT NULL)),
  -- Migrar solo tiene sentido entre vigencias, y exige decir a qué línea.
  CONSTRAINT ck_paa_revision_migrar
    CHECK (decision IS DISTINCT FROM 'MIGRAR' OR (tipo = 'CAMBIO_VIGENCIA' AND linea_destino_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_paa_revisiones_pendientes
  ON hiring.paa_revisiones (proceso_id) WHERE estado = 'PENDIENTE';

-- ------------------------------------------------- equivalencias de modalidad --
--
-- El PAA nombra la modalidad en texto libre de SECOP («Contratación directa»,
-- «Seléccion abreviada - acuerdo marco», con su tilde mal puesta). Se traduce
-- con una tabla y no en código porque ese texto cambia de un año a otro, y una
-- modalidad que no está aquí es un error del archivo, no un valor que se
-- adivina.

CREATE TABLE IF NOT EXISTS hiring.paa_equivalencias_modalidad (
  -- En minúsculas, sin tildes y con los espacios colapsados.
  texto_normalizado varchar(200) PRIMARY KEY,
  modalidad         varchar(60)  NOT NULL REFERENCES hiring.modalidades(codigo)
);

INSERT INTO hiring.paa_equivalencias_modalidad (texto_normalizado, modalidad) VALUES
  ('contratacion directa',                  'CONTRATACION_DIRECTA'),
  ('minima cuantia',                        'MINIMA_CUANTIA'),
  ('seleccion abreviada menor cuantia',     'ABREVIADA_MENOR_CUANTIA'),
  ('seleccion abreviada de menor cuantia',  'ABREVIADA_MENOR_CUANTIA'),
  ('seleccion abreviada subasta inversa',   'ABREVIADA_SUBASTA_INVERSA'),
  ('seleccion abreviada - acuerdo marco',   'ABREVIADA_TVEC'),
  ('seleccion abreviada acuerdo marco',     'ABREVIADA_TVEC'),
  ('licitacion publica',                    'LICITACION_PUBLICA'),
  ('concurso de meritos abierto',           'CONCURSO_MERITOS_ABIERTO'),
  ('concurso de meritos con precalificacion', 'CONCURSO_MERITOS_PRECAL'),
  ('contratacion regimen especial',         'REGIMEN_ESPECIAL_092'),
  ('enajenacion de bienes con subasta',     'ENAJENACION_SUBASTA'),
  ('seleccion abreviada bolsa de productos', 'ABREVIADA_BOLSA_MERCANTIL')
ON CONFLICT (texto_normalizado) DO NOTHING;

COMMIT;
