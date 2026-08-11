-- ============================================================================
-- 016 · Publicación del proyecto de pliego y control del plazo de publicidad
--
-- EFDS-1150 (RF-PUB-01). La historia pide publicar el proyecto de pliego en
-- SECOP II con el plazo legal de la modalidad. No hay integración con SECOP II
-- ni está previsto tenerla en esta entrega (EFDS-1386), así que la historia se
-- resuelve por el lado del control:
--
--   · el usuario registra que el pliego quedó publicado y carga la evidencia,
--   · la plataforma calcula hasta cuándo corre el plazo y cuántos días hábiles
--     faltan.
--
-- El hecho de la publicación se afirma y se prueba con el soporte; no se
-- comprueba contra SECOP II. Es la misma situación del CDP con KLIC (010).
--
-- El control es informativo: muestra el estado del plazo pero no bloquea nada.
-- El bloqueo de la apertura es de otra historia (EFDS-1152) y ya tiene su
-- propia regla, la del CDP, en 012.
-- ============================================================================

-- --------------------------------------------------- calendario de hábiles --
-- El plazo se cuenta en días hábiles, así que hay que saber cuáles no lo son.
--
-- Los fines de semana se deducen de la fecha. Los dieciocho festivos
-- nacionales se CALCULAN en el servicio (ver `festivos-colombia.ts`): seis son
-- fijos, siete se corren al lunes siguiente por la Ley 51 de 1983 y cinco
-- dependen del Domingo de Pascua, todo determinista. Sembrarlos año por año
-- solo aplazaba el problema: llegado diciembre alguien tenía que acordarse de
-- cargar el año entrante, y si no lo hacía el módulo dejaba de poder registrar
-- publicaciones.
--
-- Esta tabla queda para lo que la ley NO da: los días no laborables que declare
-- la entidad por su cuenta —una semana de receso institucional, por ejemplo—,
-- que se suman a los festivos calculados. Nace vacía a propósito.
CREATE TABLE IF NOT EXISTS hiring.dias_no_habiles (
  fecha        date         PRIMARY KEY,
  descripcion  varchar(120) NOT NULL,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.dias_no_habiles IS
  'Días no laborables propios de la ESAP, adicionales a los festivos nacionales que el servicio calcula (EFDS-1150).';

-- ------------------------------------------- plazos de publicidad por modalidad
-- Parametrizables por la misma razón que los umbrales de cuantía (009): el
-- plazo lo fija la normativa, cambia con ella, y una cifra incrustada en un
-- `if` obligaría a desplegar para corregir un dato de negocio.
CREATE TABLE IF NOT EXISTS hiring.plazos_publicacion (
  modalidad     varchar(60)  PRIMARY KEY REFERENCES hiring.modalidades (codigo),
  dias_habiles  int          NOT NULL CHECK (dias_habiles > 0),
  -- De dónde sale el número. Sin esto, dentro de un año nadie sabrá si el 5
  -- vino del decreto o de un supuesto del equipo.
  fundamento    text,
  -- False mientras la Dirección de Contratación no confirme el plazo.
  confirmado    boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.plazos_publicacion IS
  'Días hábiles de publicidad del proyecto de pliego, por modalidad. Parametrizables (EFDS-1150).';

-- El único plazo que los documentos fuente fijan expresamente. La historia lo
-- dice en su contexto y en su segundo criterio de aceptación, así que entra
-- confirmado.
INSERT INTO hiring.plazos_publicacion (modalidad, dias_habiles, fundamento, confirmado) VALUES
  ('LICITACION_PUBLICA', 10,
   'HU EFDS-1150 (RF-PUB-01) y Decreto 1082 de 2015, art. 2.2.1.1.2.1.4: el proyecto de pliego se publica con diez (10) días hábiles de antelación al acto de apertura.',
   true)
ON CONFLICT (modalidad) DO NOTHING;

-- VALORES TENTATIVOS — todos con confirmado = false.
--
-- La historia dice que "el plazo varía por modalidad" pero solo cifra el de
-- licitación pública. Los de abajo se derivan del mismo artículo del Decreto
-- 1082, que fija cinco (5) días hábiles para selección abreviada y concurso de
-- méritos, y del régimen de mínima cuantía, cuya invitación pública se publica
-- por un (1) día hábil. Nadie con competencia los ha validado todavía: eso es
-- EFDS-1385.
--
-- Lo que este seed garantiza no es la cifra, sino que la cadena completa
-- funcione punta a punta. Corregir un plazo es actualizar una fila.
INSERT INTO hiring.plazos_publicacion (modalidad, dias_habiles, fundamento, confirmado) VALUES
  ('ABREVIADA_MENOR_CUANTIA',   5,
   'TENTATIVO: Decreto 1082 de 2015, art. 2.2.1.1.2.1.4 — cinco (5) días hábiles en selección abreviada. Por confirmar (EFDS-1385).', false),
  ('ABREVIADA_SUBASTA_INVERSA', 5,
   'TENTATIVO: Decreto 1082 de 2015, art. 2.2.1.1.2.1.4 — cinco (5) días hábiles en selección abreviada. Por confirmar (EFDS-1385).', false),
  ('ABREVIADA_BOLSA_MERCANTIL', 5,
   'TENTATIVO: Decreto 1082 de 2015, art. 2.2.1.1.2.1.4 — cinco (5) días hábiles en selección abreviada. Por confirmar (EFDS-1385).', false),
  ('CONCURSO_MERITOS_ABIERTO',  5,
   'TENTATIVO: Decreto 1082 de 2015, art. 2.2.1.1.2.1.4 — cinco (5) días hábiles en concurso de méritos. Por confirmar (EFDS-1385).', false),
  ('CONCURSO_MERITOS_PRECAL',   5,
   'TENTATIVO: Decreto 1082 de 2015, art. 2.2.1.1.2.1.4 — cinco (5) días hábiles en concurso de méritos. Por confirmar (EFDS-1385).', false),
  ('MINIMA_CUANTIA',            1,
   'TENTATIVO: en mínima cuantía no hay proyecto de pliego sino invitación pública, con un (1) día hábil de publicidad. Por confirmar si la actividad aplica (EFDS-1385).', false)
ON CONFLICT (modalidad) DO NOTHING;

-- Selección abreviada por TVEC y enajenación por subasta se dejan SIN plazo a
-- propósito. La primera compra por acuerdo marco y la segunda vende, y en
-- ninguna se reconoce un proyecto de pliego con el mismo trámite de
-- publicidad; pero los documentos fuente no lo dicen con claridad suficiente
-- para excluirlas de la actividad. Sin fila, la pantalla dice "plazo no
-- parametrizado" en vez de inventarse un número, que es la respuesta honesta
-- mientras EFDS-1385 no las resuelva.

-- ---------------------------------------------------- publicación del pliego
CREATE TABLE IF NOT EXISTS hiring.publicaciones_pliego (
  id                  uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  proceso_id          uuid         NOT NULL REFERENCES hiring.procesos (id),

  -- Fecha real en que el pliego quedó publicado en SECOP II, no la fecha del
  -- registro: es la que arranca el conteo del plazo legal, y el usuario puede
  -- estar registrando días después algo que ya ocurrió.
  fecha_publicacion   date         NOT NULL,

  -- Se congelan el plazo aplicado y su vencimiento en vez de recalcularlos en
  -- cada consulta: si mañana se corrige el plazo de la modalidad, los procesos
  -- ya publicados deben seguir explicándose con la regla que estaba vigente el
  -- día en que se publicaron.
  --
  -- Nulos cuando la modalidad no tiene plazo parametrizado. La publicación se
  -- registra igual —el hecho ocurrió— pero no hay término que contar.
  plazo_dias_habiles  int,
  fecha_vencimiento   date,

  -- Datos del proceso en SECOP II. Se capturan a mano porque no hay
  -- integración; el enlace es lo que permite verificar la publicación desde el
  -- expediente sin salir a buscarla.
  secop_numero        varchar(60),
  secop_url           text,

  -- La evidencia de que el pliego se publicó, obligatoria.
  --
  -- Sin integración con SECOP II, la plataforma no puede comprobar por su
  -- cuenta que la publicación ocurrió: el soporte es lo único que la sostiene.
  -- Un registro sin evidencia sería una afirmación sin respaldo que además
  -- arranca un plazo legal, así que no se admite. Corregir una publicación es
  -- anularla y volver a registrarla, con su soporte.
  documento_id        uuid         NOT NULL,

  publicado_por       varchar(160),

  -- Una publicación registrada con la fecha equivocada no se borra: se anula y
  -- se registra la correcta. Así cada una conserva su propia evidencia y el
  -- expediente guarda el rastro de la corrección.
  anulada_at          timestamptz,
  anulada_por         varchar(160),
  motivo_anulacion    text,

  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),

  -- El plazo y su vencimiento van juntos o no van: un vencimiento sin plazo no
  -- se puede explicar, y un plazo sin vencimiento no sirve para nada.
  CONSTRAINT publicacion_plazo_coherente CHECK (
    (plazo_dias_habiles IS NULL) = (fecha_vencimiento IS NULL)
  ),
  CONSTRAINT publicacion_plazo_positivo CHECK (
    plazo_dias_habiles IS NULL OR plazo_dias_habiles > 0
  ),
  CONSTRAINT publicacion_vencimiento_posterior CHECK (
    fecha_vencimiento IS NULL OR fecha_vencimiento >= fecha_publicacion
  ),
  CONSTRAINT publicacion_anulacion_motivada CHECK (
    anulada_at IS NULL OR motivo_anulacion IS NOT NULL
  )
);

COMMENT ON TABLE hiring.publicaciones_pliego IS
  'Registro de la publicación del proyecto de pliego en SECOP II y su plazo de publicidad (EFDS-1150).';

COMMENT ON COLUMN hiring.publicaciones_pliego.fecha_publicacion IS
  'Fecha real de publicación en SECOP II. Arranca el conteo del plazo legal.';

COMMENT ON COLUMN hiring.publicaciones_pliego.plazo_dias_habiles IS
  'Plazo vigente el día del registro, congelado. Null si la modalidad no lo tiene parametrizado.';

-- Un proceso no puede tener dos publicaciones vigentes del proyecto de pliego:
-- sería ambiguo cuál plazo corre. Las anuladas sí se acumulan, que es el
-- historial de correcciones.
CREATE UNIQUE INDEX IF NOT EXISTS idx_publicacion_vigente_por_proceso
  ON hiring.publicaciones_pliego (proceso_id)
  WHERE anulada_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_publicacion_proceso
  ON hiring.publicaciones_pliego (proceso_id);

-- Para el listado de procesos con el plazo por vencer.
CREATE INDEX IF NOT EXISTS idx_publicacion_vencimiento
  ON hiring.publicaciones_pliego (fecha_vencimiento)
  WHERE anulada_at IS NULL;

-- ------------------------------------------------------ actividad 5.2 -------
-- El numeral es una decisión del equipo. La historia dice "5.x (publicación)"
-- y de la etapa 5 solo están sembradas la 5.1 (elaboración de documentos, en
-- 013) y la 5.7 (apertura, en 012). Se toma el siguiente disponible después de
-- la elaboración, que es donde el flujo la ubica: primero se produce el
-- pliego, luego se publica. Si la matriz dice otro número, se corrige aquí.
INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.2', 5, 'Publicación del proyecto de pliego',
   'Se publica el proyecto de pliego en SECOP II y corre el plazo legal de publicidad de la modalidad. El soporte cargado es la evidencia de la publicación.',
   20)
ON CONFLICT (numeral) DO NOTHING;

-- Exclusiones por modalidad. Solo las dos que los documentos fuente dejan sin
-- duda, por la misma razón que en 012 y 013: una exclusión equivocada
-- escondería una actividad que la ley sí exige.
--
--   · Contratación directa no tiene pliego. La 013 ya lo dice: en directa se
--     elabora justificación y minuta, no pliego ni convocatoria.
--   · El régimen especial del Decreto 092 de 2017 ya está excluido de la
--     elaboración de documentos (5.1); mal podría publicar lo que no elabora.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo) VALUES
  ('5.2', 'CONTRATACION_DIRECTA',
   'La contratación directa no tiene pliego de condiciones que publicar: se elabora acto de justificación y minuta'),
  ('5.2', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no elabora los documentos ordinarios del proceso, así que no hay proyecto de pliego que publicar')
ON CONFLICT DO NOTHING;
