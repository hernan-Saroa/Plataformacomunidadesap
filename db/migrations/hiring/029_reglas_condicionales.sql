-- ============================================================================
-- 023 · Condiciones y acciones: reglas para un formulario reactivo
--
-- Hasta ahora una regla era `tipo` + `config` plano: "el campo X es
-- obligatorio". Eso no expresa lo que el formulario reactivo necesita —
-- "SI la modalidad es directa Y el valor supera 50 millones, ENTONCES mostrar
-- el campo Z y hacerlo obligatorio"— porque no hay dónde poner la condición
-- ni cómo encadenar más de una acción.
--
-- Se agregan dos columnas jsonb en vez de tablas aparte: una regla se lee y se
-- escribe entera, nunca por partes, y separarla en tres tablas obligaria a un
-- join por regla para evaluar un formulario.
--
-- `tipo` y `config` se conservan: las once reglas vigentes siguen evaluandose
-- por esa via mientras el evaluador entiende las dos formas. La migracion no
-- las convierte —convertirlas exigiria adivinar la intencion de cada una— sino
-- que deja el camino abierto para las nuevas.
-- ============================================================================

ALTER TABLE hiring.reglas_actividad
  ADD COLUMN IF NOT EXISTS condiciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acciones    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Como se combinan las condiciones. Con una sola condicion da igual, pero
  -- guardarlo evita que el evaluador tenga que suponerlo.
  ADD COLUMN IF NOT EXISTS conector    varchar(3) NOT NULL DEFAULT 'AND';

ALTER TABLE hiring.reglas_actividad
  DROP CONSTRAINT IF EXISTS ck_regla_conector;

ALTER TABLE hiring.reglas_actividad
  ADD CONSTRAINT ck_regla_conector CHECK (conector IN ('AND', 'OR'));

COMMENT ON COLUMN hiring.reglas_actividad.condiciones IS
  'Cuando aplica: [{campo, operador, valor}]. Vacio = siempre.';

COMMENT ON COLUMN hiring.reglas_actividad.acciones IS
  'Que hace: [{accion, objetivo, valor}]. accion es EXIGIR_CAMPO, MOSTRAR_CAMPO, '
  'OCULTAR_CAMPO, EXIGIR_DOCUMENTO, BLOQUEAR_AVANCE.';

-- El indice unico de la 022 se calcula sobre config, que ya no es lo unico que
-- identifica una regla: dos reglas con la misma config pero condiciones
-- distintas son reglas distintas.
DROP INDEX IF EXISTS hiring.uq_regla_vigente;

CREATE UNIQUE INDEX IF NOT EXISTS uq_regla_vigente
    ON hiring.reglas_actividad (
      numeral, tipo, coalesce(modalidad, ''), config, condiciones, acciones
    )
 WHERE vigente_hasta IS NULL;
