-- Diagnóstico (SOLO LECTURA): periodos académicos guardados ANTES de la corrección del día corrido.
--
-- Qué pasaba: crear o editar un periodo convertía '2027-04-19' en un Date de JavaScript (medianoche UTC)
-- y TypeORM lo escribía en la columna `date` con la hora LOCAL del servidor. Si el servidor corría en una
-- zona al oeste de UTC (Colombia, UTC-5), la medianoche UTC era el día anterior a las 19:00 y se guardaba
-- el día anterior. El desfase es siempre de 1 día hacia atrás (en UTC o al este de UTC no hay desfase).
--
-- Qué NO se puede saber desde la base: la fecha que escribió la persona. No hay bitácora de periodos
-- (AuditLog no los registra) ni otra copia de las fechas. Por eso esta consulta no «corrige» nada: lista los
-- periodos candidatos y muestra, al lado de lo guardado, cómo quedaría si se hubieran corrido, para que
-- quien conozca el calendario oficial decida.
--
-- Uso (psql, en la base del PTA):
--   1) Paso 0 — ¿el servidor del PTA corría al oeste de UTC? En el contenedor o equipo del servicio:
--        node -p "new Date().getTimezoneOffset()"      -> 300 = UTC-5 (SÍ se corrían); 0 = UTC (NO se corrían)
--      Si da 0 en todo el tiempo que estuvo desplegado, no hay nada que revisar.
--   2) Ajustar :corte = fecha y hora (de la base) en que se desplegó la corrección en ESE ambiente.
--        psql "$DATABASE_URL" -v corte="'2026-10-25 18:00'" -f diagnostico-periodos-dia-corrido.sql
--      Sin -v, se usa la hora del commit de la corrección (25-oct-2026 13:00 UTC-5).
--
-- No modifica datos: la transacción es de solo lectura.

\if :{?corte}
\else
  \set corte '\'2026-10-25 18:00\''
\endif

BEGIN READ ONLY;

SELECT
  p.codigo,
  p.tipo,
  p.estado,
  CASE WHEN p.extraordinario THEN 'extraordinario' ELSE 'principal' END       AS rol,
  COALESCE(p.updated_at, p.created_at)                                          AS ultima_escritura,
  p.fecha_inicio                                                                AS inicio_guardado,
  to_char(p.fecha_inicio, 'TMDy')                                               AS dia_inicio,
  (p.fecha_inicio + 1)                                                          AS inicio_si_corrido,
  to_char(p.fecha_inicio + 1, 'TMDy')                                           AS dia_inicio_si_corrido,
  p.fecha_fin                                                                   AS fin_guardado,
  to_char(p.fecha_fin, 'TMDy')                                                  AS dia_fin,
  (p.fecha_fin + 1)                                                             AS fin_si_corrido,
  to_char(p.fecha_fin + 1, 'TMDy')                                              AS dia_fin_si_corrido,
  1                                                                             AS dias_corridos_posibles,
  -- Pista (no prueba): un periodo que arranca en domingo o termina en sábado/domingo suele ser un lunes
  -- o un domingo/lunes escrito en la pantalla y corrido un día.
  (extract(isodow FROM p.fecha_inicio) = 7)                                     AS sospecha_inicio_domingo,
  (extract(isodow FROM p.fecha_fin) IN (6, 7))                                  AS sospecha_fin_fin_de_semana,
  (SELECT count(*) FROM "academic-schedule".grupo g WHERE g.id_periodo_academico = p.id)        AS grupos,
  (SELECT count(*) FROM "academic-schedule".periodo_receso r WHERE r.id_periodo_academico = p.id) AS recesos
FROM academic_work_plan.periodo_academico p
WHERE COALESCE(p.updated_at, p.created_at) < :corte::timestamp
ORDER BY (extract(isodow FROM p.fecha_inicio) = 7) DESC,
         (extract(isodow FROM p.fecha_fin) IN (6, 7)) DESC,
         p.fecha_inicio;

-- Periodos escritos DESPUÉS de la corrección (no son candidatos), para contrastar.
SELECT p.codigo, p.fecha_inicio, p.fecha_fin, COALESCE(p.updated_at, p.created_at) AS ultima_escritura
FROM academic_work_plan.periodo_academico p
WHERE COALESCE(p.updated_at, p.created_at) >= :corte::timestamp
ORDER BY p.fecha_inicio;

ROLLBACK;
