-- ============================================================================
-- Migración: 453_plazo_legalizacion_desde_regreso.sql
-- Historia de Usuario: EFDS-1309 — Plazo de la legalización.
--
-- El plazo corre desde la fecha de regreso de la comisión (confirmado por el
-- Grupo de Viáticos). Corrige el supuesto anterior: "lo más tardío entre el fin
-- de la comisión y la apertura de la legalización".
--
-- El modelo no distingue una fecha de regreso real de la planeada: se usa
-- solicitudes_comision.fecha_fin.
--
-- Recalcula las legalizaciones que ya existen y no están cerradas, con el
-- plazo en días hábiles y la hora de corte que cada una guardó al abrirse. Las
-- que con la regla nueva ya vencieron quedan vencidas: el semáforo se deriva de
-- fecha_limite y el aviso diario de vencimiento las recoge.
--
-- Las cerradas (LEGALIZADO) no se tocan: son inmutables (migración 451) y su
-- plazo ya no produce efectos.
--
-- Las comisiones pagadas sin legalización abierta no necesitan migrarse: el
-- barrido de EFDS-1309 las abre con la regla nueva.
--
-- Mismo cálculo que calcularPlazo() de plazo-legalizacion.util.ts: N-ésimo día
-- hábil estrictamente posterior al regreso (sin sábados, domingos ni festivos
-- de auth.festivos_colombia), a la hora de corte, en hora de Colombia.
-- calendario_incompleto = el conteo pasó por un año sin festivos cargados.
--
-- Idempotente.
-- ============================================================================

CREATE FUNCTION pg_temp.plazo_legalizacion_desde_regreso(p_regreso DATE, p_dias INTEGER, p_hora_corte VARCHAR)
RETURNS TABLE (fecha_base_plazo TIMESTAMPTZ, fecha_limite TIMESTAMPTZ, calendario_incompleto BOOLEAN)
LANGUAGE sql STABLE AS $$
    WITH vence AS (
        SELECT d::date AS dia
          FROM generate_series(p_regreso + 1, p_regreso + p_dias * 3 + 30, INTERVAL '1 day') d
         WHERE EXTRACT(ISODOW FROM d) < 6
           AND NOT EXISTS (SELECT 1 FROM auth.festivos_colombia f WHERE f.fecha = d::date)
         ORDER BY d
        OFFSET p_dias - 1
         LIMIT 1
    )
    SELECT (p_regreso + TIME '23:59:59') AT TIME ZONE 'America/Bogota',
           (vence.dia + p_hora_corte::time) AT TIME ZONE 'America/Bogota',
           EXISTS (
               SELECT 1
                 FROM generate_series(p_regreso + 1, vence.dia, INTERVAL '1 day') g
                WHERE NOT EXISTS (
                    SELECT 1 FROM auth.festivos_colombia f
                     WHERE EXTRACT(YEAR FROM f.fecha) = EXTRACT(YEAR FROM g)
                )
           )
      FROM vence;
$$;

DO $$
DECLARE
    v_sin_calculo INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_sin_calculo
      FROM travel_expenses.legalizaciones_comision l
      JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
     WHERE l.cerrada_en IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM pg_temp.plazo_legalizacion_desde_regreso(s.fecha_fin::date, l.plazo_dias_habiles, l.hora_corte)
       );
    IF v_sin_calculo > 0 THEN
        RAISE EXCEPTION '453: % legalizaciones abiertas sin plazo calculable (¿fecha_fin nula?)', v_sin_calculo;
    END IF;
END $$;

WITH nuevo AS (
    SELECT l.id, p.fecha_base_plazo, p.fecha_limite, p.calendario_incompleto
      FROM travel_expenses.legalizaciones_comision l
      JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
     CROSS JOIN LATERAL pg_temp.plazo_legalizacion_desde_regreso(s.fecha_fin::date, l.plazo_dias_habiles, l.hora_corte) p
     WHERE l.cerrada_en IS NULL
)
UPDATE travel_expenses.legalizaciones_comision l
   SET fecha_base_plazo      = nuevo.fecha_base_plazo,
       fecha_limite          = nuevo.fecha_limite,
       calendario_incompleto = nuevo.calendario_incompleto
  FROM nuevo
 WHERE l.id = nuevo.id
   AND (l.fecha_base_plazo, l.fecha_limite, l.calendario_incompleto)
       IS DISTINCT FROM (nuevo.fecha_base_plazo, nuevo.fecha_limite, nuevo.calendario_incompleto);

COMMENT ON COLUMN travel_expenses.legalizaciones_comision.fecha_base_plazo IS
    'Desde cuándo corre el plazo: el fin del día de regreso de la comisión (solicitudes_comision.fecha_fin), en hora de Colombia. Migración 453.';
