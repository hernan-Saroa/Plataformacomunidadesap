-- ============================================================================
-- 038 · Designación del supervisor del contrato (actividad 8.2)
--
-- EFDS-1165 (RF-LEG-04): legalizado el contrato, el Ordenador del Gasto designa
-- por acto administrativo a quien vigilará su ejecución. La matriz añade en 8.2
-- que al supervisor se le debe alertar de su designación.
--
-- Mismo modelo que el comité evaluador (migración 025) y por la misma razón: el
-- acto que designa no es un adjunto más, es lo que convierte un nombre en un
-- supervisor. De ahí que la designación no exista sin él.
--
-- Un contrato puede tener varios supervisores a lo largo de su ejecución —el
-- titular se traslada, se encarga a otro—, así que se modela como el comité:
-- uno vigente y tantos relevados como haga falta, todos en el expediente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.supervisiones_contrato (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id          uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- El acto administrativo que designa. Sin él hay un nombre, no un supervisor.
  acto_documento_id    uuid         NOT NULL REFERENCES hiring.documentos(id),
  -- La del acto, no la del registro: es cuando la entidad designó.
  fecha_designacion    date         NOT NULL,

  -- `id_person` de auth.personas, SIN llave foránea a propósito: ese esquema es
  -- de otro equipo y una FK entre esquemas ataría nuestras migraciones a las
  -- suyas. Se guarda para poder enlazar después la cuenta con la persona.
  persona_id           uuid         NOT NULL,
  -- Copia del nombre al designar. El acto nombró a esa persona ese día: si
  -- mañana el directorio corrige el nombre, el expediente debe seguir diciendo
  -- lo que el acto dijo.
  nombre               varchar(200) NOT NULL,
  cargo                varchar(200),
  email                varchar(200),

  designado_por        varchar(200),

  estado               varchar(20)  NOT NULL DEFAULT 'VIGENTE',
  created_at           timestamptz  NOT NULL DEFAULT now(),

  -- «Y que se le alerte al supervisor», dice la matriz en 8.2. El módulo de
  -- contratación no envía correos todavía, así que se registra que el aviso
  -- está pendiente en vez de darlo por hecho: cuando exista notificaciones,
  -- esta columna dice a quién falta avisar. Marcarlo como enviado sin haberlo
  -- enviado dejaría al supervisor sin enterarse y al expediente afirmando lo
  -- contrario.
  alerta_enviada_at    timestamptz,

  relevado_at          timestamptz,
  relevado_por         varchar(200),
  motivo_relevo        text,

  CONSTRAINT ck_supervision_estado CHECK (estado IN ('VIGENTE', 'RELEVADO')),
  -- Un supervisor relevado tiene siempre cuándo y por qué: es lo que explica
  -- que un contrato tenga dos actos de designación.
  CONSTRAINT ck_supervision_relevado CHECK (
    estado <> 'RELEVADO'
    OR (relevado_at IS NOT NULL AND motivo_relevo IS NOT NULL)
  )
);

-- Un solo supervisor vigente por contrato, pero tantos relevados como haga
-- falta. Índice parcial y no UNIQUE a secas, con el criterio de la 025: cambiar
-- de supervisor es relevar al anterior y designar otro, y los dos tienen que
-- quedar. Quien vigiló los primeros meses respondió por ellos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_supervision_vigente
  ON hiring.supervisiones_contrato (contrato_id)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_supervisiones_contrato
  ON hiring.supervisiones_contrato (contrato_id);
-- Para responder «qué contratos supervisa esta persona», que es la pregunta que
-- hará la etapa 9 (EFDS-1167 y EFDS-1168) en cada consulta.
CREATE INDEX IF NOT EXISTS ix_supervisiones_persona
  ON hiring.supervisiones_contrato (persona_id);

COMMENT ON TABLE hiring.supervisiones_contrato IS
  'Supervisores designados por acto administrativo, vigentes y relevados (EFDS-1165).';

-- ------------------------------------------------------------- el rol --
-- Mismo caso que las migraciones 015 y 025: el módulo va a exigir un rol que en
-- auth.role no existe, y sin sembrarlo la etapa 9 quedaría sin quien la trabaje.
--
-- Sembrar el rol NO es asignárselo a nadie: quién lo tiene se decide en el
-- backoffice de usuarios, que es de otro equipo y no se toca desde aquí.
INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
VALUES
  (uuid_generate_v4(),
   'SUPERVISOR_CONTRATO',
   'Supervisor de Contrato',
   'Vigila y controla la ejecución de los contratos que le han sido asignados por acto administrativo.',
   'backoffice', 'sistema', true, '#0F766E', 'Eye', 'Backoffice')
ON CONFLICT (code) DO NOTHING;
