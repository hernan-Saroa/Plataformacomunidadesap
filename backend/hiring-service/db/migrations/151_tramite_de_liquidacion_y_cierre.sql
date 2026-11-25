-- ============================================================================
-- 151 · Trámite de liquidación y de cierre del contrato, dentro del proceso (EFDS-XXXX)
--
-- Decisiones de Juan (25/11/2026), con el texto de los dos flujos:
--
-- · Va dentro del proceso, no en el módulo de Modificaciones.
-- · PSPAG (contratación directa por prestación de servicios profesionales y de
--   apoyo a la gestión, con contratista persona natural) lleva el flujo de
--   CIERRE; todos los demás, el de LIQUIDACIÓN. Nunca los dos.
-- · Se radica cuando terminó la etapa 9, salvo la 9.2 y la 9.3, que siguen
--   abiertas hasta el final del proceso. Radicar abre la etapa 10.
-- · Liquidación: radica el área → la líder asigna al abogado → revisión
--   (Abogado → Líder, devuelve al área) → acta para visto bueno → visto bueno
--   (Líder → Jefe, devuelve al abogado) → el área sube el acta firmada (es la
--   10.2 de siempre: acta vigente, balance congelado, LIQUIDADO) → el abogado
--   carga la evidencia de SECOP II y se avisa al supervisor.
-- · Cierre: radica el área con el memorando → el asignador líder asigna al
--   abogado o devuelve → el abogado devuelve o cierra en SECOP II cargando la
--   evidencia: el contrato queda CERRADO sin acta de liquidación.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------ el trámite --

CREATE TABLE IF NOT EXISTS hiring.tramites_liquidacion (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado               varchar(20)  NOT NULL UNIQUE,
  clase                  varchar(12)  NOT NULL,
  proceso_id             uuid         NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  contrato_id            uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,
  estado                 varchar(20)  NOT NULL DEFAULT 'RADICADA',
  observaciones          text,
  abogado_id             varchar(120),
  abogado_nombre         varchar(200),
  -- Quien asignó: es la líder de las dos cadenas de la liquidación.
  lider_id               varchar(120),
  lider_nombre           varchar(200),
  asignada_at            timestamptz,
  -- Lo que se declara al subir el acta firmada (liquidación).
  tipo_acta              varchar(12),
  fecha_acta             date,
  acta_liquidacion_id    uuid         REFERENCES hiring.actas_liquidacion(id),
  perfeccionada_por      varchar(200),
  perfeccionada_at       timestamptz,
  -- El cierre del contrato que dejó el trámite de cierre (PSPAG).
  cierre_contrato_id     uuid         REFERENCES hiring.cierres_contrato(id),
  secop_numero           varchar(80),
  secop_url              text,
  fecha_publicacion      date,
  publicada_por          varchar(200),
  publicada_at           timestamptz,
  motivo_cierre          text,
  cerrada_por            varchar(200),
  cerrada_at             timestamptz,
  radicada_por           varchar(200),
  radicada_por_id        varchar(120),
  radicada_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at             timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_tramite_liq_clase CHECK (clase IN ('LIQUIDACION', 'CIERRE')),
  CONSTRAINT ck_tramite_liq_estado CHECK (estado IN (
    'RADICADA', 'EN_REVISION', 'DEVUELTA', 'ACTA', 'EN_VISTO_BUENO',
    'EN_FIRMA', 'PERFECCIONADA', 'PUBLICADA', 'CERRADA', 'DESISTIDA')),
  -- Cada clase tiene sus estados: el cierre no pasa por acta ni firma.
  CONSTRAINT ck_tramite_liq_estados_de_la_clase CHECK (
    (clase = 'LIQUIDACION' AND estado <> 'CERRADA')
    OR (clase = 'CIERRE' AND estado IN ('RADICADA', 'EN_REVISION', 'DEVUELTA', 'CERRADA', 'DESISTIDA'))),
  CONSTRAINT ck_tramite_liq_tipo_acta CHECK (tipo_acta IS NULL OR tipo_acta IN ('BILATERAL', 'UNILATERAL')),
  CONSTRAINT ck_tramite_liq_asignada CHECK (
    estado IN ('RADICADA', 'DESISTIDA') OR (estado = 'DEVUELTA' AND clase = 'CIERRE')
    OR abogado_id IS NOT NULL),
  CONSTRAINT ck_tramite_liq_perfeccionada CHECK (
    estado NOT IN ('PERFECCIONADA', 'PUBLICADA') OR acta_liquidacion_id IS NOT NULL),
  CONSTRAINT ck_tramite_liq_publicada CHECK (
    estado NOT IN ('PUBLICADA', 'CERRADA') OR (publicada_at IS NOT NULL AND fecha_publicacion IS NOT NULL)),
  CONSTRAINT ck_tramite_liq_desistida CHECK (
    estado <> 'DESISTIDA' OR (cerrada_at IS NOT NULL AND motivo_cierre IS NOT NULL))
);

COMMENT ON TABLE hiring.tramites_liquidacion IS
  'Liquidación (o cierre, en PSPAG) del contrato de un proceso, radicada al terminar la etapa 9 (151).';
COMMENT ON COLUMN hiring.tramites_liquidacion.lider_id IS
  'Quien asignó al abogado: es la líder de la revisión y del visto bueno de la liquidación.';

-- Un solo trámite vivo por contrato: lo desistido no cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tramite_liq_vivo
  ON hiring.tramites_liquidacion (contrato_id) WHERE estado <> 'DESISTIDA';
CREATE INDEX IF NOT EXISTS ix_tramites_liq_proceso ON hiring.tramites_liquidacion (proceso_id);
CREATE INDEX IF NOT EXISTS ix_tramites_liq_estado ON hiring.tramites_liquidacion (estado);

CREATE SEQUENCE IF NOT EXISTS hiring.seq_radicado_liquidacion;

-- ------------------------------------------------ documentos del trámite --

CREATE TABLE IF NOT EXISTS hiring.documentos_tramite_liquidacion (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id              uuid         NOT NULL REFERENCES hiring.tramites_liquidacion(id) ON DELETE CASCADE,
  clase                   varchar(20)  NOT NULL,
  requisito_id            uuid         REFERENCES hiring.documentos_requeridos(id),
  nombre                  varchar(300) NOT NULL,
  archivo_url             text         NOT NULL,
  archivo_nombre_original varchar(300),
  archivo_mime_type       varchar(120),
  archivo_tamano          bigint,
  hash_sha256             char(64)     NOT NULL,
  version                 int          NOT NULL DEFAULT 1,
  vigente                 boolean      NOT NULL DEFAULT true,
  subido_por              varchar(200),
  created_at              timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_doc_tramite_liq_clase CHECK (clase IN (
    'REQUISITO', 'ACTA', 'ACTA_FIRMADA', 'PAZ_Y_SALVO', 'EVIDENCIA_SECOP'))
);

CREATE INDEX IF NOT EXISTS ix_docs_tramite_liq ON hiring.documentos_tramite_liquidacion (tramite_id) WHERE vigente;

-- Los documentos para radicar salen del catálogo único (085), en la 10.2, y
-- cada uno dice a qué trámite se pide. NULL = a los dos.
ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS tramite_liquidacion varchar(12);

ALTER TABLE hiring.documentos_requeridos
  DROP CONSTRAINT IF EXISTS ck_doc_req_tramite_liquidacion;
ALTER TABLE hiring.documentos_requeridos
  ADD CONSTRAINT ck_doc_req_tramite_liquidacion
  CHECK (tramite_liquidacion IS NULL OR tramite_liquidacion IN ('LIQUIDACION', 'CIERRE'));

COMMENT ON COLUMN hiring.documentos_requeridos.tramite_liquidacion IS
  'Solo en la 10.2: LIQUIDACION o CIERRE (PSPAG) si se pide a uno solo de los dos trámites; NULL = a los dos.';

-- Los que ya había en la 10.2 son de la liquidación.
UPDATE hiring.documentos_requeridos
   SET tramite_liquidacion = 'LIQUIDACION'
 WHERE numeral = '10.2' AND tramite_liquidacion IS NULL
   AND codigo IN ('MEMORANDO_RADICACION', 'VERIFICACION_ANTECEDENTES', 'INFORME_BALANCE_FINAL', 'ACTA_RECIBO');

INSERT INTO hiring.documentos_requeridos
  (numeral, codigo, nombre, descripcion, obligatorio, orden, confirmado, nota_fuente, tramite_liquidacion)
VALUES
  ('10.2', 'PROYECTO_ACTA_LIQUIDACION', 'Proyecto de acta de liquidación (BS-FO-060)',
   'El acta que el abogado y la líder revisan y ajustan; la firmada se sube al final.', true, 5, false,
   'Propuesta del equipo (151): el flujo dice que el área radica la documentación y al final firma el acta.',
   'LIQUIDACION'),
  ('10.2', 'MEMORANDO_SOLICITUD_CIERRE', 'Memorando de solicitud de cierre',
   'Memorando del área técnica que pide el cierre del contrato.', true, 5, false,
   'Flujo de cierre, paso 1: «Área Técnica radica memorando de solicitud».', 'CIERRE')
ON CONFLICT (numeral, codigo) DO NOTHING;

-- ------------------------------------------------ las dos cadenas --

-- Un escalón lo decide el abogado o la líder del trámite (papel), o quien
-- tenga alguno de los roles. Mismo molde que las de modificaciones (150).
CREATE TABLE IF NOT EXISTS hiring.cadenas_liquidacion (
  fase        varchar(12)  PRIMARY KEY,
  escalones   jsonb        NOT NULL,
  confirmado  boolean      NOT NULL DEFAULT false,
  updated_by  varchar(200),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_cadena_liq_fase CHECK (fase IN ('REVISION', 'VISTO_BUENO'))
);

INSERT INTO hiring.cadenas_liquidacion (fase, escalones) VALUES
  ('REVISION', '[
     {"nombre": "Abogado", "papel": "ABOGADO", "roles": [], "acciones": ["APROBAR", "DEVOLVER"]},
     {"nombre": "Líder", "papel": "LIDER", "roles": [], "acciones": ["APROBAR", "DEVOLVER"]}
   ]'::jsonb),
  ('VISTO_BUENO', '[
     {"nombre": "Líder", "papel": "LIDER", "roles": [], "acciones": ["APROBAR", "DEVOLVER"]},
     {"nombre": "Jefe", "papel": null, "roles": ["DIRECTORA_DE_CONTRATACION", "DIRECTOR_CONTRATACION"], "acciones": ["APROBAR", "DEVOLVER"]}
   ]'::jsonb)
ON CONFLICT (fase) DO NOTHING;

CREATE TABLE IF NOT EXISTS hiring.rondas_liquidacion (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id      uuid         NOT NULL REFERENCES hiring.tramites_liquidacion(id) ON DELETE CASCADE,
  fase            varchar(12)  NOT NULL,
  ronda           int          NOT NULL,
  estado          varchar(12)  NOT NULL DEFAULT 'EN_CURSO',
  escalon_actual  int,
  escalones       jsonb        NOT NULL,
  iniciada_por    varchar(200),
  iniciada_at     timestamptz  NOT NULL DEFAULT now(),
  cerrada_at      timestamptz,
  CONSTRAINT ck_ronda_liq_fase CHECK (fase IN ('REVISION', 'VISTO_BUENO')),
  CONSTRAINT ck_ronda_liq_estado CHECK (estado IN ('EN_CURSO', 'APROBADA', 'DEVUELTA', 'NEGADA', 'CANCELADA')),
  CONSTRAINT uq_ronda_liq UNIQUE (tramite_id, fase, ronda)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ronda_liq_en_curso
  ON hiring.rondas_liquidacion (tramite_id) WHERE estado = 'EN_CURSO';

-- --------------------------------------------------------- el historial --

CREATE TABLE IF NOT EXISTS hiring.eventos_tramite_liquidacion (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id    uuid         NOT NULL REFERENCES hiring.tramites_liquidacion(id) ON DELETE CASCADE,
  accion        varchar(30)  NOT NULL,
  ronda_id      uuid         REFERENCES hiring.rondas_liquidacion(id) ON DELETE CASCADE,
  escalon       int,
  observaciones text,
  detalle       jsonb        NOT NULL DEFAULT '{}'::jsonb,
  por           varchar(200),
  por_id        varchar(120),
  at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_eventos_tramite_liq ON hiring.eventos_tramite_liquidacion (tramite_id, at);

-- ------------------------------------------------------------- permisos --

-- Dos trámites sin numeral, para que la liquidación y el cierre tengan cada uno
-- su asignador (hoy Helena y Daniel):
--   ver      ver el trámite
--   editar   radicar, corregir, subir el acta firmada, desistir (el área)
--   aprobar  ser elegible como abogado
--   decidir  asignar (y, en el cierre, devolver antes de asignar)
ALTER TABLE hiring.alcances_permiso
  DROP CONSTRAINT IF EXISTS ck_alcance_tramite;

ALTER TABLE hiring.alcances_permiso
  ADD CONSTRAINT ck_alcance_tramite
  CHECK (tramite IS NULL OR tramite IN ('INC.1', 'INC.2', 'PAA', 'PAA.R', 'MOD', 'LIQ', 'CIE'));

INSERT INTO hiring.alcances_permiso (rol_id, accion, tramite, created_by)
SELECT r.id, v.accion, t.tramite, 'migracion-151'
FROM (VALUES
  ('AREA_RADICADORA',               'ver'),
  ('AREA_RADICADORA',               'editar'),
  ('ABOGADO_ESTRUCTURADOR',         'ver'),
  ('ABOGADO_ESTRUCTURADOR',         'aprobar'),
  ('ABOGADO_REVISOR',               'ver'),
  ('ABOGADO_REVISOR',               'aprobar'),
  ('GESTOR_CONTRATACION',           'ver'),
  ('GESTOR_CONTRATACION',           'aprobar'),
  ('REVISOR_CONTRATACION',          'ver'),
  ('REVISOR_CONTRATACION',          'aprobar'),
  ('DIRECTORA_DE_CONTRATACION',     'ver'),
  ('DIRECTORA_DE_CONTRATACION',     'decidir'),
  ('DIRECTOR_CONTRATACION',         'ver'),
  ('DIRECTOR_CONTRATACION',         'decidir'),
  ('SECRETARIO_DE_CONTRATACION',    'ver'),
  ('SECRETARIO_DE_CONTRATACION',    'decidir'),
  ('GESTOR_DE_ARCHIVO_Y_SUPERVISION', 'ver'),
  ('ADMINISTRADOR_CONTRATACION',    'ver')
) AS v(rol, accion)
CROSS JOIN (VALUES ('LIQ'), ('CIE')) AS t(tramite)
JOIN auth.role r ON r.code = v.rol
ON CONFLICT DO NOTHING;

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT DISTINCT a.rol_id, p.id_permission, true
  FROM hiring.alcances_permiso a
  JOIN auth.permission p ON p.code = 'contratacion.' || a.accion
 WHERE a.activo
   AND a.created_by = 'migracion-151'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

COMMIT;
