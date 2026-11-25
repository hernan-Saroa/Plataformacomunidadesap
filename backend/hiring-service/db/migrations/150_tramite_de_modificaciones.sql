-- ============================================================================
-- 150 · Trámite de modificaciones contractuales, fuera del proceso (EFDS-XXXX)
--
-- Diseño acordado con Juan (23-25/11/2026), desde el docx «FLUJO
-- MODIFICACIONES Y LIQUIDACIONES»:
--
-- · La modificación se radica desde su propio módulo, no desde la 9.5 del
--   proceso. Sirve también para contratos que nunca se cargaron en la
--   plataforma.
-- · Sin vínculo (contrato antiguo) es una NOTIFICACIÓN: número de contrato y los
--   documentos que pide cada tipo; le llega a Contratación, que tramita por
--   fuera y la da por recibida.
-- · Con vínculo (contrato de la plataforma, solo en ejecución) lleva el flujo
--   completo: asignación de abogado y revisor → revisión (cadena 1) → minuta →
--   visto bueno (cadena 2) → minuta firmada (perfecciona y cambia el contrato)
--   → publicación en SECOP.
-- · Una modificación puede traer varios cambios (adición y prórroga en la
--   misma minuta). Cada cambio es una fila de `modificaciones_contrato`, que
--   sigue siendo donde viven los efectos sobre el contrato.
-- · Los tipos son configurables: cada uno elige su efecto de una lista cerrada,
--   que es lo que el código sabe aplicar.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ------------------------------------------------- tipos de modificación --

CREATE TABLE IF NOT EXISTS hiring.tipos_modificacion (
  codigo       varchar(60)  PRIMARY KEY,
  nombre       varchar(200) NOT NULL,
  descripcion  text,
  efecto       varchar(30)  NOT NULL,
  va_sola      boolean      NOT NULL DEFAULT false,
  activo       boolean      NOT NULL DEFAULT true,
  orden        int          NOT NULL DEFAULT 100,
  confirmado   boolean      NOT NULL DEFAULT false,
  CONSTRAINT ck_tipo_modificacion_efecto CHECK (efecto IN (
    'ADICION', 'PRORROGA', 'CESION', 'ACLARATORIO', 'SUSPENSION',
    'REANUDACION', 'TERMINACION_ANTICIPADA', 'OTRO'))
);

COMMENT ON TABLE hiring.tipos_modificacion IS
  'Tipos de modificación contractual que se pueden radicar; se administran desde Configuración (150).';
COMMENT ON COLUMN hiring.tipos_modificacion.efecto IS
  'Qué le hace al contrato al perfeccionarse. Lista cerrada: es lo que el código sabe aplicar. OTRO y ACLARATORIO no cambian nada.';
COMMENT ON COLUMN hiring.tipos_modificacion.va_sola IS
  'No se combina con otros cambios en la misma modificación (suspender, reanudar, terminar).';

INSERT INTO hiring.tipos_modificacion (codigo, nombre, descripcion, efecto, va_sola, orden) VALUES
  ('ADICION', 'Adición en dinero', 'Aumenta el valor del contrato. Trae su CDP y su RP.', 'ADICION', false, 10),
  ('PRORROGA', 'Prórroga en tiempo', 'Extiende el plazo sin tocar el presupuesto.', 'PRORROGA', false, 20),
  ('CESION', 'Cesión del contrato', 'Cambia el contratista por el cesionario.', 'CESION', false, 30),
  ('ACLARATORIO', 'Aclaratorio', 'Precisa lo que el contrato ya dice; no cambia valor, plazo ni partes.', 'ACLARATORIO', false, 40),
  ('SUSPENSION', 'Suspensión', 'Detiene la ejecución del contrato.', 'SUSPENSION', true, 50),
  ('REANUDACION', 'Reanudación', 'Levanta la suspensión y devuelve al plazo los días suspendidos.', 'REANUDACION', true, 60),
  ('TERMINACION_ANTICIPADA', 'Terminación anticipada', 'Termina el contrato por mutuo acuerdo o decisión unilateral motivada.', 'TERMINACION_ANTICIPADA', true, 70),
  ('OTRO', 'Otra modificación', 'Cualquier otro cambio, con descripción libre; no cambia valor, plazo ni partes.', 'OTRO', false, 80)
ON CONFLICT (codigo) DO NOTHING;

-- Los documentos que pide cada tipo salen del catálogo único (085), en la 9.5,
-- filtrados por tipo como ya se filtran por modalidad. Vacío = todos.
ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS tipos_modificacion jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hiring.documentos_requeridos.tipos_modificacion IS
  'Solo en la 9.5: tipos de modificación (hiring.tipos_modificacion) a los que se pide; vacío = todos.';

INSERT INTO hiring.documentos_requeridos
  (numeral, codigo, nombre, descripcion, obligatorio, orden, confirmado, nota_fuente, tipos_modificacion)
VALUES
  ('9.5', 'SOLICITUD_MODIFICACION', 'Solicitud de modificación firmada',
   'Memorando del área con la justificación técnica de la modificación.', true, 10, false,
   'Propuesta del equipo (150): el docx pide que el área radique la solicitud.', '[]'::jsonb),
  ('9.5', 'CONCEPTO_SUPERVISOR', 'Concepto del supervisor',
   'Visto bueno del supervisor sobre la necesidad de la modificación.', true, 20, false,
   'Propuesta del equipo (150).', '[]'::jsonb),
  ('9.5', 'CDP_ADICION', 'CDP de la adición',
   'Certificado de disponibilidad presupuestal que respalda el valor adicionado.', true, 30, false,
   'Propuesta del equipo (150).', '["ADICION"]'::jsonb),
  ('9.5', 'DOCUMENTOS_CESIONARIO', 'Documentos del cesionario',
   'Identificación, RUT y certificados del cesionario.', true, 40, false,
   'Propuesta del equipo (150).', '["CESION"]'::jsonb)
ON CONFLICT (numeral, codigo) DO NOTHING;

-- ------------------------------------------------------------ el trámite --

CREATE TABLE IF NOT EXISTS hiring.tramites_modificacion (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado               varchar(20)  NOT NULL UNIQUE,
  contrato_numero        varchar(60)  NOT NULL,
  contrato_id            uuid         REFERENCES hiring.contratos(id) ON DELETE CASCADE,
  proceso_id             uuid         REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  tipos                  varchar(60)[] NOT NULL,
  justificacion          text         NOT NULL,
  -- Lo que el área quiera contar de un contrato antiguo: contratista, objeto,
  -- valor, plazo, supervisor, enlace a SECOP. Nada de eso se valida.
  datos_contrato         jsonb        NOT NULL DEFAULT '{}'::jsonb,
  estado                 varchar(20)  NOT NULL DEFAULT 'RADICADA',
  abogado_id             varchar(120),
  abogado_nombre         varchar(200),
  revisor_id             varchar(120),
  revisor_nombre         varchar(200),
  asignada_por           varchar(200),
  asignada_at            timestamptz,
  numero_modificacion    varchar(80),
  fecha_suscripcion      date,
  perfeccionada_por      varchar(200),
  perfeccionada_at       timestamptz,
  secop_numero           varchar(80),
  secop_url              text,
  fecha_publicacion      date,
  publicada_por          varchar(200),
  publicada_at           timestamptz,
  nota_recibido          text,
  recibida_por           varchar(200),
  recibida_at            timestamptz,
  motivo_cierre          text,
  cerrada_por            varchar(200),
  cerrada_at             timestamptz,
  radicada_por           varchar(200),
  radicada_por_id        varchar(120),
  radicada_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at             timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_tramite_mod_estado CHECK (estado IN (
    'RADICADA', 'RECIBIDA',                                     -- notificación
    'EN_REVISION', 'DEVUELTA', 'MINUTA', 'EN_VISTO_BUENO',      -- flujo completo
    'EN_FIRMA', 'PERFECCIONADA', 'PUBLICADA',
    'DESISTIDA', 'NEGADA')),
  CONSTRAINT ck_tramite_mod_tipos CHECK (cardinality(tipos) >= 1),
  -- Una notificación no tiene flujo; el flujo exige contrato vinculado.
  CONSTRAINT ck_tramite_mod_vinculo CHECK (
    contrato_id IS NOT NULL OR estado IN ('RADICADA', 'RECIBIDA', 'DESISTIDA')),
  CONSTRAINT ck_tramite_mod_asignada CHECK (
    estado IN ('RADICADA', 'RECIBIDA', 'DESISTIDA', 'NEGADA')
    OR (abogado_id IS NOT NULL AND revisor_id IS NOT NULL)),
  CONSTRAINT ck_tramite_mod_perfeccionada CHECK (
    estado NOT IN ('PERFECCIONADA', 'PUBLICADA')
    OR (perfeccionada_at IS NOT NULL AND numero_modificacion IS NOT NULL AND fecha_suscripcion IS NOT NULL)),
  CONSTRAINT ck_tramite_mod_publicada CHECK (
    estado <> 'PUBLICADA' OR (publicada_at IS NOT NULL AND fecha_publicacion IS NOT NULL)),
  CONSTRAINT ck_tramite_mod_cerrada CHECK (
    estado NOT IN ('DESISTIDA', 'NEGADA') OR (cerrada_at IS NOT NULL AND motivo_cierre IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_tramites_mod_contrato ON hiring.tramites_modificacion (contrato_id);
CREATE INDEX IF NOT EXISTS ix_tramites_mod_estado ON hiring.tramites_modificacion (estado);

CREATE SEQUENCE IF NOT EXISTS hiring.seq_radicado_modificacion;

COMMENT ON TABLE hiring.tramites_modificacion IS
  'Una modificación radicada desde el módulo de Modificaciones (150). Sin contrato_id es una notificación de un contrato antiguo.';

-- Cada cambio de un trámite vinculado es una modificación de las de siempre.
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS tramite_id uuid REFERENCES hiring.tramites_modificacion(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo_codigo varchar(60) REFERENCES hiring.tipos_modificacion(codigo);

CREATE INDEX IF NOT EXISTS ix_modificaciones_tramite
  ON hiring.modificaciones_contrato (tramite_id) WHERE tramite_id IS NOT NULL;

-- ------------------------------------------------ documentos del trámite --

-- Propios y no en `hiring.documentos`: un contrato antiguo no tiene expediente.
-- Al perfeccionar, la minuta firmada se copia también al expediente del
-- proceso vinculado.
CREATE TABLE IF NOT EXISTS hiring.documentos_tramite_modificacion (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id              uuid         NOT NULL REFERENCES hiring.tramites_modificacion(id) ON DELETE CASCADE,
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
  CONSTRAINT ck_doc_tramite_mod_clase CHECK (clase IN (
    'REQUISITO', 'MINUTA', 'MINUTA_FIRMADA', 'EVIDENCIA_SECOP', 'OTRO'))
);

CREATE INDEX IF NOT EXISTS ix_docs_tramite_mod ON hiring.documentos_tramite_modificacion (tramite_id) WHERE vigente;

-- ------------------------------------------------ las dos cadenas --

-- Cómo se forma cada cadena. Un escalón lo decide el abogado o el revisor
-- asignados al trámite (papel), o quien tenga alguno de los roles.
CREATE TABLE IF NOT EXISTS hiring.cadenas_modificacion (
  fase        varchar(12)  PRIMARY KEY,
  escalones   jsonb        NOT NULL,
  confirmado  boolean      NOT NULL DEFAULT false,
  updated_by  varchar(200),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_cadena_mod_fase CHECK (fase IN ('REVISION', 'VISTO_BUENO'))
);

INSERT INTO hiring.cadenas_modificacion (fase, escalones) VALUES
  ('REVISION', '[
     {"nombre": "Abogado", "papel": "ABOGADO", "roles": [], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"]},
     {"nombre": "Revisor", "papel": "REVISOR", "roles": [], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"]}
   ]'::jsonb),
  ('VISTO_BUENO', '[
     {"nombre": "Revisor", "papel": "REVISOR", "roles": [], "acciones": ["APROBAR", "DEVOLVER"]},
     {"nombre": "Jefe", "papel": null, "roles": ["DIRECTORA_DE_CONTRATACION", "DIRECTOR_CONTRATACION"], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"]}
   ]'::jsonb)
ON CONFLICT (fase) DO NOTHING;

CREATE TABLE IF NOT EXISTS hiring.rondas_modificacion (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id      uuid         NOT NULL REFERENCES hiring.tramites_modificacion(id) ON DELETE CASCADE,
  fase            varchar(12)  NOT NULL,
  ronda           int          NOT NULL,
  estado          varchar(12)  NOT NULL DEFAULT 'EN_CURSO',
  escalon_actual  int,
  escalones       jsonb        NOT NULL,
  iniciada_por    varchar(200),
  iniciada_at     timestamptz  NOT NULL DEFAULT now(),
  cerrada_at      timestamptz,
  CONSTRAINT ck_ronda_mod_fase CHECK (fase IN ('REVISION', 'VISTO_BUENO')),
  CONSTRAINT ck_ronda_mod_estado CHECK (estado IN ('EN_CURSO', 'APROBADA', 'DEVUELTA', 'NEGADA', 'CANCELADA')),
  CONSTRAINT uq_ronda_mod UNIQUE (tramite_id, fase, ronda)
);

-- Una sola ronda viva por trámite.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ronda_mod_en_curso
  ON hiring.rondas_modificacion (tramite_id) WHERE estado = 'EN_CURSO';

-- --------------------------------------------------------- el historial --

CREATE TABLE IF NOT EXISTS hiring.eventos_tramite_modificacion (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id    uuid         NOT NULL REFERENCES hiring.tramites_modificacion(id) ON DELETE CASCADE,
  accion        varchar(30)  NOT NULL,
  ronda_id      uuid         REFERENCES hiring.rondas_modificacion(id) ON DELETE CASCADE,
  escalon       int,
  observaciones text,
  detalle       jsonb        NOT NULL DEFAULT '{}'::jsonb,
  por           varchar(200),
  por_id        varchar(120),
  at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_eventos_tramite_mod ON hiring.eventos_tramite_modificacion (tramite_id, at);

-- ------------------------------------------------------------- permisos --

-- `MOD`, un trámite sin numeral como el del incumplimiento:
--   ver      la bandeja de modificaciones
--   editar   radicar (área radicadora), corregir, subir la minuta firmada, desistir
--   aprobar  ser elegible como abogado o revisor de una modificación
--   decidir  asignar abogado y revisor, y dar por recibida una notificación
ALTER TABLE hiring.alcances_permiso
  DROP CONSTRAINT IF EXISTS ck_alcance_tramite;

ALTER TABLE hiring.alcances_permiso
  ADD CONSTRAINT ck_alcance_tramite
  CHECK (tramite IS NULL OR tramite IN ('INC.1', 'INC.2', 'PAA', 'PAA.R', 'MOD'));

INSERT INTO hiring.alcances_permiso (rol_id, accion, tramite, created_by)
SELECT r.id, v.accion, v.tramite, 'migracion-150'
FROM (VALUES
  ('AREA_RADICADORA',               'ver',      'MOD'),
  ('AREA_RADICADORA',               'editar',   'MOD'),
  ('ABOGADO_ESTRUCTURADOR',         'ver',      'MOD'),
  ('ABOGADO_ESTRUCTURADOR',         'aprobar',  'MOD'),
  ('ABOGADO_REVISOR',               'ver',      'MOD'),
  ('ABOGADO_REVISOR',               'aprobar',  'MOD'),
  ('GESTOR_CONTRATACION',           'ver',      'MOD'),
  ('GESTOR_CONTRATACION',           'aprobar',  'MOD'),
  ('REVISOR_CONTRATACION',          'ver',      'MOD'),
  ('REVISOR_CONTRATACION',          'aprobar',  'MOD'),
  ('DIRECTORA_DE_CONTRATACION',     'ver',      'MOD'),
  ('DIRECTORA_DE_CONTRATACION',     'decidir',  'MOD'),
  ('DIRECTOR_CONTRATACION',         'ver',      'MOD'),
  ('DIRECTOR_CONTRATACION',         'decidir',  'MOD'),
  ('SECRETARIO_DE_CONTRATACION',    'ver',      'MOD'),
  ('SECRETARIO_DE_CONTRATACION',    'decidir',  'MOD'),
  ('ADMINISTRADOR_CONTRATACION',    'ver',      'MOD')
) AS v(rol, accion, tramite)
JOIN auth.role r ON r.code = v.rol
ON CONFLICT DO NOTHING;

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT DISTINCT a.rol_id, p.id_permission, true
  FROM hiring.alcances_permiso a
  JOIN auth.permission p ON p.code = 'contratacion.' || a.accion
 WHERE a.activo
   AND a.created_by = 'migracion-150'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

COMMIT;
