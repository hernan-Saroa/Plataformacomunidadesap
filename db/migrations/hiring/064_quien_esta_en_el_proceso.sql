-- ============================================================================
-- 064 · Quién está en un proceso
--
-- Los permisos del módulo son generales: quien puede editar, puede editar los
-- sesenta y tres numerales de todos los procesos. Eso alcanzaba mientras cada
-- rol trabajaba sobre todo el expediente, y deja de alcanzar en cuanto el flujo
-- real se describe con nombres propios: «el abogado de este proceso», «el de
-- contratación que lo tomó», «el área que lo radicó edita 3.1 y 3.2 y nada
-- más».
--
-- Esta tabla es lo que faltaba para poder decir eso: quién está en un proceso y
-- con qué papel. No sustituye a los permisos —sigue haciendo falta tener
-- `contratacion.actividad.edit` para editar—, los recorta al expediente propio.
--
-- Dos papeles, no una columna por cada uno:
--
--   CONTRATACION · quien tomó el proceso en la 3.3 y responde por él dentro de
--                  la Dirección. Sube los documentos de ahí en adelante.
--   ABOGADO      · quien revisa en la 3.4 y aprueba, devuelve o niega.
--
-- Vigencia y relevo, como la supervisión de contratos (migración 038) y el
-- comité evaluador (025). Cambiar de abogado no borra al anterior: lo releva
-- con motivo, porque quien llevó el proceso el primer mes respondió por lo que
-- proyectó en él, y un expediente que solo recuerda al último no puede explicar
-- quién revisó qué.
--
-- Sin acto administrativo, que es donde se separa de la supervisión: aquélla
-- produce efectos frente al contratista, esto es reparto interno de trabajo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.participaciones_proceso (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id        uuid         NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  papel             varchar(20)  NOT NULL,

  -- `id_user` de auth."user", que es lo que el JWT trae en `sub`. Sin llave
  -- foránea a propósito, por el mismo criterio de la 038: ese esquema es de
  -- otro equipo y una FK entre esquemas ataría nuestras migraciones a las suyas.
  usuario_id        uuid,
  -- El `username` de la cuenta. Es la columna que de verdad usan los listados:
  -- `procesos.created_by` guarda ese mismo username, así que preguntar «los que
  -- radiqué o los que me tocan» se responde comparando lo mismo en los dos
  -- lados. Se guardan los dos identificadores porque el token trae ambos y
  -- ninguno está garantizado en las cuentas viejas.
  usuario_nombre    varchar(120) NOT NULL,

  -- `id_person` del directorio, para enlazar la cuenta con la persona cuando
  -- haga falta mostrar cargo o dependencia. Nulo si la cuenta no tiene persona.
  persona_id        uuid,
  -- Copia del nombre al entrar: el reparto se hizo sobre esa persona ese día.
  nombre            varchar(200) NOT NULL,
  cargo             varchar(200),
  email             varchar(200),

  -- Quién lo puso ahí. En el papel CONTRATACION es la propia persona: el
  -- proceso no se lo entrega nadie, lo toma de la bandeja compartida.
  asignado_por      varchar(200),
  asignado_at       timestamptz  NOT NULL DEFAULT now(),

  estado            varchar(20)  NOT NULL DEFAULT 'VIGENTE',
  created_at        timestamptz  NOT NULL DEFAULT now(),

  relevado_at       timestamptz,
  relevado_por      varchar(200),
  motivo_relevo     text,

  CONSTRAINT ck_participacion_papel  CHECK (papel  IN ('CONTRATACION', 'ABOGADO')),
  CONSTRAINT ck_participacion_estado CHECK (estado IN ('VIGENTE', 'RELEVADO')),
  -- Un relevado tiene siempre cuándo y por qué: es lo que explica que un
  -- proceso haya pasado por dos manos.
  CONSTRAINT ck_participacion_relevado CHECK (
    estado <> 'RELEVADO'
    OR (relevado_at IS NOT NULL AND motivo_relevo IS NOT NULL)
  )
);

-- Una sola persona vigente por papel y proceso —«uno responsable», no varios:
-- con varios deja de poder responderse de quién es esto— y tantos relevados
-- como haga falta. Índice parcial y no UNIQUE a secas, con el criterio de la
-- 038: cambiar de responsable es relevar al anterior y poner otro, y los dos
-- tienen que quedar.
--
-- Es además lo que impide que dos personas tomen el mismo proceso de la bandeja
-- a la vez: la segunda choca contra el índice y recibe un conflicto, no una
-- fila duplicada.
CREATE UNIQUE INDEX IF NOT EXISTS uq_participacion_vigente
  ON hiring.participaciones_proceso (proceso_id, papel)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_participaciones_proceso
  ON hiring.participaciones_proceso (proceso_id);

-- La pregunta de cada carga del listado: «qué procesos me tocan». Sobre lower()
-- porque el username llega del token tal como lo escribió quien inició sesión,
-- y `created_by` ya arrastra la misma cuenta escrita de dos formas.
CREATE INDEX IF NOT EXISTS ix_participaciones_vigentes_usuario
  ON hiring.participaciones_proceso (lower(usuario_nombre))
  WHERE estado = 'VIGENTE';

-- Para la bandeja y la alerta: los procesos sin abogado vigente. Un proceso
-- puede quedarse sin él —no debería, pero quitar sin poner otro es una
-- situación real—, y lo que impide que se pierda es poder listarlos.
CREATE INDEX IF NOT EXISTS ix_participaciones_papel_vigente
  ON hiring.participaciones_proceso (papel)
  WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.participaciones_proceso IS
  'Quién está en cada proceso y con qué papel, vigentes y relevados, con el motivo del cambio (EFDS-1183).';

-- ------------------------------------------------- los procesos ya radicados --
-- No se les inventa participante. Deducirlo de `created_by` daría por decidido
-- un reparto que nadie decidió, y encima uno falso: el área que radica no es la
-- Dirección que lo toma. Quedan sin tomar y aparecen en la bandeja, que es
-- exactamente lo que esta migración habilita.
