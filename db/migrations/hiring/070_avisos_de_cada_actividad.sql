-- ============================================================================
-- 070 · Los avisos de cada actividad se configuran
--
-- EFDS-1183. Hasta aquí, quién se enteraba de qué estaba escrito en el código.
--
-- `avisos` guarda, por actividad, si avisa de cada evento y a quién. Se
-- configura en la ficha de la actividad, que es donde se decide todo lo demás
-- de ella. Sin modalidad: por actividad y modalidad eran cientos de
-- combinaciones que nadie iba a llenar.
--
-- Sin fila, la actividad avisa con lo sugerido —devolver a quien envió, enviar
-- a aprobación a quien aprueba…—, que vive en el código. Así nadie tiene que
-- configurar las 55 actividades para que los avisos funcionen, y la tabla solo
-- guarda lo que alguien decidió cambiar.
--
--      papeles: ["QUIEN_ENVIO"]            a quien envió la actividad
--      roles:   ["DIRECTOR_CONTRATACION"]  además, a todos los de ese rol
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hiring.avisos (
  numeral     varchar(10)  NOT NULL REFERENCES hiring.actividades(numeral) ON DELETE CASCADE,
  evento      varchar(40)  NOT NULL,
  activo      boolean      NOT NULL DEFAULT false,
  -- Papeles en el proceso: ABOGADO, CONTRATACION, RADICADOR, QUIEN_ENVIO,
  -- QUIEN_APRUEBA. Se resuelven para cada proceso en el momento del aviso.
  papeles     jsonb        NOT NULL DEFAULT '[]'::jsonb,
  -- Códigos de rol: avisan a todas las cuentas que lo tengan.
  roles       jsonb        NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  varchar(120),
  PRIMARY KEY (numeral, evento)
);

COMMENT ON TABLE hiring.avisos IS
  'Lo que cambió la Dirección sobre los avisos de cada actividad. Sin fila, la actividad avisa con lo sugerido.';
