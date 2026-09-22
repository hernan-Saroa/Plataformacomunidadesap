-- ============================================================================
-- 078 · Los avisos llegan a dependencias y personas, y avisan cuando te toca
--
-- EFDS-1183. Dos cosas que pidió la Dirección al configurar los avisos:
--
-- 1. Elegir a quién avisar por dependencia, por rol o nombrando a alguien.
--    `dependencias` guarda ids de `auth.dependencias`, el catálogo de la
--    plataforma, y avisa a las personas que la tienen en `auth.personas`.
--    `personas` guarda el id de persona, que es lo que devuelve el buscador;
--    la campana lo traduce a la cuenta al avisar.
--
-- 2. El aviso de «te toca»: cuando una actividad se habilita porque se cerró
--    lo que venía antes. `avisos_habilitacion` recuerda qué actividad de qué
--    proceso ya se avisó, para no repetirlo cada vez que alguien toca el
--    proceso. Se registra aunque el aviso esté apagado: si la Dirección lo
--    enciende después, no le llegan de golpe todas las que se habilitaron
--    mientras estaba apagado.
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================

ALTER TABLE hiring.avisos
  ADD COLUMN IF NOT EXISTS personas jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hiring.avisos.personas IS
  'Ids de persona (auth.personas.id_person) a los que además llega el aviso.';

ALTER TABLE hiring.avisos
  ADD COLUMN IF NOT EXISTS dependencias jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hiring.avisos.dependencias IS
  'Ids de auth.dependencias: el aviso llega a todas las personas de cada una.';

CREATE TABLE IF NOT EXISTS hiring.avisos_habilitacion (
  proceso_id  uuid         NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral     varchar(10)  NOT NULL REFERENCES hiring.actividades(numeral) ON DELETE CASCADE,
  avisado_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (proceso_id, numeral)
);

COMMENT ON TABLE hiring.avisos_habilitacion IS
  'Actividades de cada proceso de las que ya salió el aviso de «te toca». Evita repetirlo.';
