-- ============================================================================
-- 035 · Criterios de evaluación de las ofertas (actividad 6.3)
--
-- EFDS-1157 (RF-PUB-07): el comité evalúa las ofertas en cuatro dimensiones
-- —jurídica, financiera, técnica y económica— con criterios habilitantes y
-- ponderables, y de ahí salen las ofertas habilitadas y su calificación.
--
-- Habilitante y ponderable no son dos etiquetas del mismo dato. El habilitante
-- decide si la oferta sigue en carrera; el ponderable, cuánto suma. Guardarlos
-- en una sola columna obligaría a leer un cero como "no cumple" o como "cumple
-- con puntaje cero", que no es lo mismo y decide quién gana.
--
-- Cuatro dimensiones y tres evaluadores no es un descuido: la matriz de roles
-- nombra evaluador jurídico, financiero y técnico, y ninguno económico, porque
-- la económica no la juzga una persona sino que se calcula sobre el precio
-- ofertado. Por eso esta migración añade `valor_ofertado` a las ofertas.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('6.3', 6, 'Evaluación de las ofertas',
   'El comité evalúa cada oferta en las dimensiones jurídica, financiera, técnica y económica, con criterios habilitantes y ponderables.',
   30)
ON CONFLICT (numeral) DO NOTHING;

-- Las mismas dos exclusiones de la recepción y del comité: sin ofertas en
-- competencia no hay evaluación que hacer.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('6.3', 'CONTRATACION_DIRECTA',
   'La contratación directa no evalúa ofertas en competencia'),
  ('6.3', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la evaluación ordinaria de ofertas')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------- el valor de la oferta --
-- La actividad 6.1 (EFDS-1155) no lo captura porque su historia no lo pedía,
-- pero sin el precio la evaluación económica no se puede calcular.
--
-- Nulo y no obligatorio: las ofertas ya registradas no lo tienen, y exigirlo
-- hacia atrás falsearía el expediente. La pantalla lo pide de ahora en
-- adelante, y la evaluación económica dice que falta cuando no está.
ALTER TABLE hiring.oferentes
  ADD COLUMN IF NOT EXISTS valor_ofertado numeric(18, 2);

COMMENT ON COLUMN hiring.oferentes.valor_ofertado IS
  'Valor de la oferta presentada. Base del cálculo de la evaluación económica (EFDS-1157).';

-- --------------------------------------------------- catálogo de criterios --
-- Parametrizable por la misma razón que los umbrales (009), los plazos de
-- publicidad (016) y los de ofertas (024): los criterios y sus pesos cambian
-- con la normativa y con la modalidad, y una cifra incrustada en un `if`
-- obligaría a desplegar para corregir un dato de negocio.
CREATE TABLE IF NOT EXISTS hiring.criterios_evaluacion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nulo significa "aplica a todas las modalidades". La historia dice que los
  -- ponderables varían por modalidad sin cifrar cómo, así que se admiten los
  -- dos casos en vez de obligar a repetir el mismo criterio once veces.
  modalidad       varchar(60) REFERENCES hiring.modalidades (codigo),

  dimension       varchar(20)  NOT NULL,
  tipo            varchar(20)  NOT NULL,
  nombre          varchar(200) NOT NULL,
  descripcion     text,

  -- Solo en los ponderables. En un habilitante no hay puntaje que dar: se
  -- cumple o no se cumple.
  puntaje_maximo  numeric(6, 2),

  orden           int          NOT NULL DEFAULT 0,
  -- Un criterio ya usado en una evaluación no se borra, se desactiva: el
  -- expediente tiene que poder explicar con qué reglas se calificó.
  activo          boolean      NOT NULL DEFAULT true,
  -- De dónde sale, con el mismo criterio de los demás parámetros.
  fundamento      text,
  -- False mientras la Dirección de Contratación no lo confirme.
  confirmado      boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_criterio_dimension CHECK (
    dimension IN ('JURIDICO', 'FINANCIERO', 'TECNICO', 'ECONOMICO')
  ),
  CONSTRAINT ck_criterio_tipo CHECK (tipo IN ('HABILITANTE', 'PONDERABLE')),
  -- Un ponderable sin puntaje no pondera, y un habilitante con puntaje sugiere
  -- que suma cuando en realidad solo deja pasar.
  CONSTRAINT ck_criterio_puntaje CHECK (
    (tipo = 'PONDERABLE' AND puntaje_maximo IS NOT NULL AND puntaje_maximo > 0)
    OR (tipo = 'HABILITANTE' AND puntaje_maximo IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_criterios_modalidad
  ON hiring.criterios_evaluacion (modalidad, dimension, orden);

COMMENT ON TABLE hiring.criterios_evaluacion IS
  'Criterios habilitantes y ponderables de la evaluación, por modalidad y dimensión (EFDS-1157).';

-- ------------------------------------------ la evaluación de cada oferta --
-- Una por oferta y dimensión: cada evaluador responde por la suya, y el juicio
-- se guarda completo y no criterio a criterio suelto.
CREATE TABLE IF NOT EXISTS hiring.evaluaciones_oferta (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferente_id   uuid        NOT NULL REFERENCES hiring.oferentes(id) ON DELETE CASCADE,
  dimension     varchar(20) NOT NULL,

  -- Quién evaluó. Se guarda la persona además del nombre para poder cruzarla
  -- con el memorando del comité que lo designó (EFDS-1156).
  persona_id    uuid,
  evaluada_por  varchar(200),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_evaluacion_dimension CHECK (
    dimension IN ('JURIDICO', 'FINANCIERO', 'TECNICO', 'ECONOMICO')
  ),
  -- Una sola evaluación vigente por oferta y dimensión. Reevaluar sustituye la
  -- anterior; el rastro de quién la cambió vive en la trazabilidad.
  CONSTRAINT uq_evaluacion_dimension UNIQUE (oferente_id, dimension)
);

COMMENT ON TABLE hiring.evaluaciones_oferta IS
  'Evaluación de una oferta en una dimensión, con quién la hizo (EFDS-1157).';

-- ------------------------------------------------- el resultado por criterio --
CREATE TABLE IF NOT EXISTS hiring.evaluacion_criterios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id  uuid NOT NULL REFERENCES hiring.evaluaciones_oferta(id) ON DELETE CASCADE,
  -- Sin borrado en cascada: un criterio usado no se borra, se desactiva.
  criterio_id    uuid NOT NULL REFERENCES hiring.criterios_evaluacion(id),

  -- En los habilitantes.
  cumple         boolean,
  -- En los ponderables.
  puntaje        numeric(6, 2),
  -- Lo que sustenta el juicio. Es lo que el oferente reclama y lo que el
  -- informe de evaluación tiene que poder mostrar.
  observacion    text,

  created_at     timestamptz NOT NULL DEFAULT now(),

  -- Uno u otro, nunca ninguno: una fila sin resultado no es una evaluación.
  -- Cuál de los dos corresponde lo dice el tipo del criterio, que vive en el
  -- catálogo; la base garantiza que haya resultado y el servicio que sea el
  -- que toca.
  CONSTRAINT ck_resultado_presente CHECK (cumple IS NOT NULL OR puntaje IS NOT NULL),
  CONSTRAINT ck_puntaje_no_negativo CHECK (puntaje IS NULL OR puntaje >= 0),
  CONSTRAINT uq_criterio_evaluado UNIQUE (evaluacion_id, criterio_id)
);

CREATE INDEX IF NOT EXISTS ix_evaluacion_criterios
  ON hiring.evaluacion_criterios (evaluacion_id);

COMMENT ON TABLE hiring.evaluacion_criterios IS
  'Resultado de cada criterio dentro de una evaluación: si cumple o cuánto puntúa (EFDS-1157).';

-- ------------------------------------------------------- criterios base --
-- NINGUNO de estos criterios ni de sus pesos sale de los documentos fuente.
-- RF-PUB-07 es una sola línea del requerimiento —"Evaluación jurídica,
-- financiera, técnica/experiencia y económica (ponderables y habilitantes)"— y
-- no dice qué criterios hay ni cuánto pesan.
--
-- Entran como supuesto del equipo, sin confirmar y sin modalidad —aplican a
-- todas— para que el flujo funcione punta a punta. Corregir uno es editar una
-- fila desde la pantalla de administración (EFDS-1443), no desplegar. Queda
-- EFDS-1445 abierta para que la Dirección de Contratación los ratifique.
--
-- Los tres ponderables suman 100, que es la escala habitual; que ese sea el
-- total también está por confirmar.
INSERT INTO hiring.criterios_evaluacion
  (modalidad, dimension, tipo, nombre, descripcion, puntaje_maximo, orden, fundamento, confirmado)
VALUES
  (NULL, 'JURIDICO', 'HABILITANTE',
   'Capacidad jurídica y documentos habilitantes',
   'Existencia y representación legal, ausencia de inhabilidades e incompatibilidades y documentos exigidos en el pliego.',
   NULL, 10, 'Supuesto del equipo, sin validar', false),

  (NULL, 'FINANCIERO', 'HABILITANTE',
   'Indicadores financieros mínimos',
   'Capital de trabajo, índices de liquidez y endeudamiento exigidos en el pliego.',
   NULL, 20, 'Supuesto del equipo, sin validar', false),

  (NULL, 'TECNICO', 'HABILITANTE',
   'Experiencia mínima acreditada',
   'Contratos acreditados que cumplen la experiencia mínima exigida.',
   NULL, 30, 'Supuesto del equipo, sin validar', false),

  (NULL, 'TECNICO', 'PONDERABLE',
   'Experiencia adicional acreditada',
   'Experiencia por encima de la mínima exigida.',
   30.00, 40, 'Supuesto del equipo, sin validar', false),

  (NULL, 'TECNICO', 'PONDERABLE',
   'Apoyo a la industria nacional',
   'Factor de desempate y ponderación por bienes y servicios de origen nacional.',
   10.00, 50, 'Supuesto del equipo, sin validar', false),

  (NULL, 'ECONOMICO', 'PONDERABLE',
   'Precio ofertado',
   'Se calcula sobre el valor de la oferta, no lo registra un evaluador. La fórmula aplicada está por confirmar (EFDS-1445).',
   60.00, 60, 'Supuesto del equipo, sin validar', false)
ON CONFLICT DO NOTHING;
