-- ============================================================================
-- 022 · Una sola regla vigente por condición
--
-- La 020 siembra con INSERT sin guarda, así que correrla dos veces deja cada
-- regla repetida. El evaluador no falla —informa el mismo incumplimiento dos
-- veces— pero la vista de cobertura contaría dos reglas donde hay una, y la
-- edición dejaría la copia sin tocar aplicándose todavía.
--
-- Se deroga la copia en vez de borrarla: derogar es lo que el módulo hace con
-- cualquier regla que deja de regir, y así el histórico queda consistente.
-- ============================================================================

WITH ordenadas AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY numeral, tipo, modalidad, config
           ORDER BY created_at, id
         ) AS n
    FROM hiring.reglas_actividad
   WHERE vigente_hasta IS NULL
)
UPDATE hiring.reglas_actividad r
   SET vigente_hasta = now()
  FROM ordenadas o
 WHERE r.id = o.id
   AND o.n > 1;

-- Impide que vuelva a pasar: dos reglas vigentes con la misma condición son la
-- misma regla. El índice es parcial porque las derogadas sí pueden repetirse
-- —son versiones sucesivas de la misma condición a lo largo del tiempo.
--
-- modalidad se normaliza con coalesce porque en Postgres NULL nunca colisiona
-- con NULL, y las reglas globales —que son la mayoría— la tienen nula: sin
-- esto el índice dejaría pasar justo los duplicados más frecuentes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_regla_vigente
    ON hiring.reglas_actividad (numeral, tipo, coalesce(modalidad, ''), config)
 WHERE vigente_hasta IS NULL;
