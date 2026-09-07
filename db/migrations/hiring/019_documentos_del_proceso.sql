-- ============================================================================
-- 019 · Documentos que exige la actividad 5.1 según la modalidad
--
-- EFDS-1149 (RF-DOC-01, RF-DOC-02): las modalidades con pliego elaboran aviso
-- de convocatoria y proyecto de pliego de condiciones; la contratación directa
-- elabora, en su lugar, el acto administrativo de justificación.
--
-- Qué documento exige cada modalidad se guarda en una tabla y no en el código
-- porque es exactamente la clase de regla que cambia con la normativa, y
-- porque el Módulo de Configuración de Etapas (EFDS-1187) tendrá que
-- administrarla sin un despliegue de por medio.
--
-- No se reutiliza hiring.plantillas: esa tabla son los formatos aprobados del
-- SIG —código BS-FO-xxx, versión y fecha de aprobación— y lista sus modalidades
-- por nombre. Un aviso de convocatoria no es un formato del SIG, y mezclar las
-- dos convenciones de modalidad en una misma columna acabaría en un bug de
-- comparación. Cuando existan las plantillas oficiales de estos documentos, se
-- enlazan con una FK.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.documentos_requeridos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numeral       varchar(20)  NOT NULL,
  codigo        varchar(60)  NOT NULL,
  nombre        varchar(200) NOT NULL,
  descripcion   text,
  -- Códigos de modalidad a las que aplica. Vacío = todas, misma convención que
  -- el resto del módulo.
  modalidades   jsonb        NOT NULL DEFAULT '[]'::jsonb,
  obligatorio   boolean      NOT NULL DEFAULT true,
  orden         integer      NOT NULL DEFAULT 0,
  activo        boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_documento_requerido UNIQUE (numeral, codigo)
);

COMMENT ON TABLE hiring.documentos_requeridos IS
  'Catálogo de documentos que exige cada actividad, filtrado por modalidad (EFDS-1149).';

-- ----------------------------------------------------------------------------
-- Los documentos cargados de un proceso.
--
-- Tabla propia y no una columna en hiring.documentos porque su `tipo` está
-- restringido a ADJUNTO/SNAPSHOT_FORMULARIO —distingue cómo se guarda el
-- contenido, no qué documento es—, y ampliarlo con los códigos de negocio
-- mezclaría las dos cosas. El archivo sigue viviendo en hiring.documentos con
-- su hash; esta tabla dice qué requisito satisface.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hiring.documentos_proceso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id    uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral       varchar(20) NOT NULL,
  codigo        varchar(60) NOT NULL,
  documento_id  uuid        NOT NULL REFERENCES hiring.documentos(id),
  cargado_por   varchar(200),
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Un documento sustituido no se borra: el expediente es prueba ante entes de
  -- control, y saber que hubo una versión anterior es parte de lo que prueba.
  anulado_at    timestamptz,
  anulado_por   varchar(200)
);

-- Un solo documento vigente por requisito; los sustituidos quedan fuera del
-- índice y por eso no estorban.
CREATE UNIQUE INDEX IF NOT EXISTS uq_documento_proceso_vigente
  ON hiring.documentos_proceso (proceso_id, numeral, codigo)
  WHERE anulado_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_documentos_proceso_proceso
  ON hiring.documentos_proceso (proceso_id, numeral);

-- ----------------------------------------------------------------------------
-- Los documentos de la actividad 5.1.
--
-- Las modalidades competitivas son las once menos contratación directa y el
-- régimen especial 092, que la actividad ya excluye por completo (migración
-- 013). Se listan una a una en vez de dejar el arreglo vacío porque "todas
-- menos dos" y "todas" tienen que poder distinguirse cuando se agregue una
-- modalidad nueva al catálogo.
-- ----------------------------------------------------------------------------
INSERT INTO hiring.documentos_requeridos (numeral, codigo, nombre, descripcion, modalidades, orden)
VALUES
  ('5.1', 'AVISO_CONVOCATORIA', 'Aviso de convocatoria',
   'Convoca públicamente el proceso. Se elabora en las modalidades con pliego.',
   '["LICITACION_PUBLICA", "ABREVIADA_MENOR_CUANTIA", "ABREVIADA_SUBASTA_INVERSA", "ENAJENACION_SUBASTA", "ABREVIADA_TVEC", "ABREVIADA_BOLSA_MERCANTIL", "CONCURSO_MERITOS_ABIERTO", "CONCURSO_MERITOS_PRECAL", "MINIMA_CUANTIA"]'::jsonb,
   10),

  ('5.1', 'PROYECTO_PLIEGO', 'Proyecto de pliego de condiciones',
   'Documento que se publica para observaciones en la actividad 5.2.',
   '["LICITACION_PUBLICA", "ABREVIADA_MENOR_CUANTIA", "ABREVIADA_SUBASTA_INVERSA", "ENAJENACION_SUBASTA", "ABREVIADA_TVEC", "ABREVIADA_BOLSA_MERCANTIL", "CONCURSO_MERITOS_ABIERTO", "CONCURSO_MERITOS_PRECAL", "MINIMA_CUANTIA"]'::jsonb,
   20),

  ('5.1', 'ACTO_JUSTIFICACION', 'Acto administrativo de justificación',
   'Sustituye al pliego en contratación directa: motiva por qué se contrata sin convocatoria.',
   '["CONTRATACION_DIRECTA"]'::jsonb,
   30)
ON CONFLICT (numeral, codigo) DO NOTHING;
