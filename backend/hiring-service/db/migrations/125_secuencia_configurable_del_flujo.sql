-- ============================================================================
-- 125 · Cuándo empieza cada actividad, en la versión del flujo
--
-- El orden de las actividades estaba escrito en el código, dos veces —el riel
-- y el «te toca»—, y ya no coincidían: el servidor no sabía que el RP, las
-- garantías, la ARL y la publicación del contrato (8.3, 8.4, 8.5, 8.8) solo
-- esperan al contrato firmado, así que avisaba tarde.
--
-- Desde aquí cada asignación del flujo (111) dice también su secuencia:
--
--   secuencia = { "dependeDe": ["5.7"] | null, "noBloquea": true | false }
--
--   · dependeDe: las actividades anteriores que tienen que terminar para que
--     esta empiece. null = la anterior en la matriz, como siempre.
--   · noBloquea: si quedarse sin terminar NO detiene a las que siguen (las
--     que duran toda la ejecución, o las que corren en paralelo).
--
-- Igual que `la_hace` y `aprobacion`: NULL en la fila de una modalidad hereda
-- la general; NULL en la general es lo predeterminado del código (las reglas
-- que había hasta hoy). Los procesos siguen con la versión con que corren.
--
-- Se dejan configurados, en la versión activa y en el borrador, los puntos
-- que no dependen de la actividad anterior (revisados contra lo que exige
-- cada servicio, 2026-10-21):
--
--   · 8.8  Publicación del contrato: no detiene la reunión de inicio (9.1).
--   · 10.4 Archivo: espera a la liquidación (10.2), no al cierre (10.3).
--   · 5.12 Audiencia de riesgos: espera a la apertura (5.7), no a 5.9–5.11.
--   · 5.4  Publicación en la web: espera a SECOP II (5.3) y no detiene nada.
--   · 5.2  Cronograma: en paralelo con los documentos (5.1), tras el CDP.
--
-- Solo se tocan filas generales sin secuencia: lo que la Dirección ya
-- configuró se respeta. Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.flujo_asignaciones ADD COLUMN IF NOT EXISTS secuencia jsonb;

ALTER TABLE hiring.flujo_asignaciones DROP CONSTRAINT IF EXISTS ck_flujo_secuencia;
ALTER TABLE hiring.flujo_asignaciones ADD CONSTRAINT ck_flujo_secuencia CHECK (
  secuencia IS NULL OR (
    jsonb_typeof(secuencia) = 'object'
    AND jsonb_typeof(secuencia -> 'noBloquea') = 'boolean'
    AND jsonb_typeof(secuencia -> 'dependeDe') IN ('array', 'null')
  )
);

COMMENT ON COLUMN hiring.flujo_asignaciones.secuencia IS
  'Cuándo empieza (dependeDe; null = la anterior) y si detiene a las siguientes (noBloquea). NULL: hereda (125).';

CREATE TEMP TABLE semilla_125 (numeral varchar(10), secuencia jsonb) ON COMMIT DROP;
INSERT INTO semilla_125 VALUES
  ('8.8',  '{"dependeDe": ["8.1"], "noBloquea": true}'),
  ('10.4', '{"dependeDe": ["10.2"], "noBloquea": false}'),
  ('5.12', '{"dependeDe": ["5.7"], "noBloquea": false}'),
  ('5.4',  '{"dependeDe": ["5.3"], "noBloquea": true}'),
  ('5.2',  '{"dependeDe": ["4.2"], "noBloquea": false}');

-- Las filas generales que ya existen y no dicen nada de la secuencia.
UPDATE hiring.flujo_asignaciones f
   SET secuencia = s.secuencia, updated_by = 'migración 125', updated_at = now()
  FROM semilla_125 s, hiring.flujo_versiones v
 WHERE f.numeral = s.numeral
   AND f.modalidad IS NULL
   AND f.secuencia IS NULL
   AND v.id = f.version_id
   AND v.estado IN ('ACTIVA', 'BORRADOR');

-- Y las que no existen: solo la secuencia, el resto sigue en lo predeterminado.
INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, secuencia, updated_by)
SELECT v.id, s.numeral, NULL, s.secuencia, 'migración 125'
  FROM hiring.flujo_versiones v
 CROSS JOIN semilla_125 s
 WHERE v.estado IN ('ACTIVA', 'BORRADOR')
   AND EXISTS (SELECT 1 FROM hiring.actividades a WHERE a.numeral = s.numeral)
   AND NOT EXISTS (
     SELECT 1 FROM hiring.flujo_asignaciones f
      WHERE f.version_id = v.id AND f.numeral = s.numeral AND f.modalidad IS NULL
   );

COMMIT;
