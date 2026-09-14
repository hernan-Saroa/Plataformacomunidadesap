-- ============================================================================
-- 025 · Designación del comité evaluador (actividad 6.2)
--
-- EFDS-1156 (RF-PUB-06): el Ordenador del Gasto designa mediante memorando el
-- comité que evaluará las ofertas, con los roles jurídico, financiero y
-- técnico (RF-SIS-02). Sin comité designado, la evaluación no arranca.
--
-- El memorando no es un adjunto más: es lo que convierte una lista de nombres
-- en un comité. De ahí que la designación no exista sin él.
--
-- Segunda actividad de la etapa 6, después de la recepción de ofertas (024):
-- se designa sobre una lista de oferentes ya cerrada, porque nombrar
-- evaluadores para ofertas que todavía pueden cambiar no tendría sentido.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('6.2', 6, 'Designación del comité evaluador',
   'El Ordenador del Gasto designa mediante memorando a quienes evaluarán las ofertas, en las dimensiones jurídica, financiera y técnica.',
   20)
ON CONFLICT (numeral) DO NOTHING;

-- Solo las dos exclusiones que los documentos fuente dejan sin duda, con el
-- criterio de la migración 022. Son además las mismas que ya se excluyen de la
-- recepción (024): sin ofertas recibidas no hay nada que evaluar.
--
-- Mínima cuantía queda DENTRO a propósito, aunque en la práctica suele
-- evaluarla el gestor sin comité: la historia dice "modalidades con evaluación
-- por comité" sin cifrar cuáles, y excluirla por nuestra cuenta sería decidir
-- una regla de negocio. Queda en EFDS-1436 para que Contratación lo resuelva.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('6.2', 'CONTRATACION_DIRECTA',
   'La contratación directa no evalúa ofertas en competencia, así que no hay comité que designar'),
  ('6.2', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la evaluación ordinaria por comité')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------- el comité --
CREATE TABLE IF NOT EXISTS hiring.comites_evaluadores (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id              uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- El acto que designa. Sin memorando no hay comité, solo una lista de
  -- nombres, así que la columna es obligatoria y no se llena después.
  memorando_documento_id  uuid        NOT NULL REFERENCES hiring.documentos(id),
  -- La del memorando, no la del registro: es cuando la entidad designó.
  fecha_designacion       date        NOT NULL,
  designado_por           varchar(200),

  estado                  varchar(20) NOT NULL DEFAULT 'VIGENTE',
  created_at              timestamptz NOT NULL DEFAULT now(),

  revocado_at             timestamptz,
  revocado_por            varchar(200),
  motivo_revocacion       text,

  CONSTRAINT ck_comite_estado CHECK (estado IN ('VIGENTE', 'REVOCADO')),
  -- Un comité revocado tiene siempre cuándo y por qué: es lo que explica que
  -- el expediente tenga dos memorandos de designación para el mismo proceso.
  CONSTRAINT ck_comite_revocado CHECK (
    estado <> 'REVOCADO'
    OR (revocado_at IS NOT NULL AND motivo_revocacion IS NOT NULL)
  )
);

-- Un solo comité vigente por proceso, pero tantos revocados como haga falta.
-- Índice parcial y no UNIQUE a secas: corregir una designación es revocarla y
-- hacer otra, y las dos tienen que quedar en el expediente. Un comité revocado
-- existió y pudo evaluar; borrarlo contaría otra historia.
CREATE UNIQUE INDEX IF NOT EXISTS uq_comite_vigente
  ON hiring.comites_evaluadores (proceso_id)
  WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.comites_evaluadores IS
  'Comités evaluadores designados por memorando, vigentes y revocados (EFDS-1156).';

-- --------------------------------------------------------- sus miembros --
CREATE TABLE IF NOT EXISTS hiring.miembros_comite (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comite_id     uuid        NOT NULL REFERENCES hiring.comites_evaluadores(id) ON DELETE CASCADE,

  -- `id_person` de auth.personas, SIN llave foránea a propósito: ese esquema es
  -- de otro equipo y una FK entre esquemas ataría nuestras migraciones a las
  -- suyas. Se guarda el identificador para poder enlazar la cuenta que evalúa
  -- (auth.user.id_person) con la persona designada.
  persona_id    uuid        NOT NULL,
  -- Copia del nombre al momento de designar. El memorando nombró a esa persona
  -- ese día: si mañana el directorio corrige el nombre, el expediente tiene que
  -- seguir diciendo lo que el acto dijo.
  nombre        varchar(200) NOT NULL,

  rol           varchar(20) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_miembro_rol CHECK (rol IN ('JURIDICO', 'FINANCIERO', 'TECNICO')),
  -- La misma persona no repite el mismo rol, pero sí puede llevar dos: en una
  -- entidad pequeña es corriente que quien evalúa lo técnico evalúe también lo
  -- financiero. RF-SIS-02 nombra los tres roles y no dice que sean excluyentes,
  -- así que se modela permisivo; apretar la regla después es una restricción
  -- más, mientras que aflojarla obligaría a migrar datos.
  CONSTRAINT uq_miembro_rol UNIQUE (comite_id, persona_id, rol)
);

CREATE INDEX IF NOT EXISTS ix_miembros_comite ON hiring.miembros_comite (comite_id);
-- Para responder rápido "¿esta persona evalúa en este proceso?", que es la
-- pregunta que hará la evaluación (EFDS-1157) en cada petición.
CREATE INDEX IF NOT EXISTS ix_miembros_persona ON hiring.miembros_comite (persona_id);

COMMENT ON TABLE hiring.miembros_comite IS
  'Integrantes del comité evaluador con su dimensión de evaluación (EFDS-1156).';

-- ----------------------------------------------- los roles que faltaban --
-- Mismo caso que la migración 015: el módulo va a exigir roles que en auth.role
-- no existen, y sin sembrarlos la actividad queda inejecutable salvo para un
-- superadministrador. Hoy solo están gestor, revisor, director de contratación
-- y estructurador financiero.
--
-- Sembrar el rol NO es asignárselo a nadie: quién lo tiene se decide en el
-- backoffice de usuarios, que es de otro equipo y no se toca desde aquí.
INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
VALUES
  (uuid_generate_v4(),
   'ORDENADOR_GASTO',
   'Ordenador del Gasto',
   'Designa mediante memorando el comité evaluador de los procesos de contratación y compromete el gasto de la entidad.',
   'backoffice', 'sistema', true, '#B45309', 'Stamp', 'Backoffice'),

  (uuid_generate_v4(),
   'EVALUADOR_JURIDICO',
   'Evaluador Jurídico',
   'Miembro del comité evaluador: verifica los requisitos jurídicos habilitantes de las ofertas.',
   'backoffice', 'sistema', true, '#1D4ED8', 'Gavel', 'Backoffice'),

  (uuid_generate_v4(),
   'EVALUADOR_FINANCIERO',
   'Evaluador Financiero',
   'Miembro del comité evaluador: verifica los indicadores y la capacidad financiera de las ofertas.',
   'backoffice', 'sistema', true, '#047857', 'Calculator', 'Backoffice'),

  (uuid_generate_v4(),
   'EVALUADOR_TECNICO',
   'Evaluador Técnico',
   'Miembro del comité evaluador: verifica la experiencia y las condiciones técnicas de las ofertas.',
   'backoffice', 'sistema', true, '#9333EA', 'Wrench', 'Backoffice')
ON CONFLICT (code) DO NOTHING;
