-- ============================================================================
-- Migración: 453_plazo_legalizacion_desde_regreso.sql
-- Historia de Usuario: EFDS-1309 — Plazo de la legalización.
--
-- El plazo corre desde GREATEST(fecha_fin, fecha_pago). Corrige el supuesto
-- anterior, "lo más tardío entre el fin de la comisión y la apertura de la
-- legalización": la base es la fecha de pago, no el momento en que el sistema
-- abrió la legalización.
--
-- En avance, el caso normal, se paga antes del viaje y el plazo corre desde el
-- regreso, como pidió el Grupo de Viáticos. En reconocimiento posterior el pago
-- llega después del regreso: desde el regreso, casi toda comisión de esa
-- modalidad nacería vencida. Sin fecha de pago (legalización abierta antes del
-- pago), corre desde el regreso: GREATEST ignora los nulos.
--
-- El regreso es el planeado (solicitudes_comision.fecha_fin): el real solo se
-- conoce al legalizar, con el formato GF-FO-032.
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
-- hábil estrictamente posterior a la base (sin sábados, domingos ni festivos
-- de auth.festivos_colombia), a la hora de corte, en hora de Colombia.
-- calendario_incompleto = el conteo pasó por un año sin festivos cargados.
--
-- Idempotente.
-- ============================================================================

CREATE FUNCTION pg_temp.plazo_legalizacion(p_base DATE, p_dias INTEGER, p_hora_corte VARCHAR)
RETURNS TABLE (fecha_base_plazo TIMESTAMPTZ, fecha_limite TIMESTAMPTZ, calendario_incompleto BOOLEAN)
LANGUAGE sql STABLE AS $$
    WITH vence AS (
        SELECT d::date AS dia
          FROM generate_series(p_base + 1, p_base + p_dias * 3 + 30, INTERVAL '1 day') d
         WHERE EXTRACT(ISODOW FROM d) < 6
           AND NOT EXISTS (SELECT 1 FROM auth.festivos_colombia f WHERE f.fecha = d::date)
         ORDER BY d
        OFFSET p_dias - 1
         LIMIT 1
    )
    SELECT (p_base + TIME '23:59:59') AT TIME ZONE 'America/Bogota',
           (vence.dia + p_hora_corte::time) AT TIME ZONE 'America/Bogota',
           EXISTS (
               SELECT 1
                 FROM generate_series(p_base + 1, vence.dia, INTERVAL '1 day') g
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
           SELECT 1 FROM pg_temp.plazo_legalizacion(GREATEST(s.fecha_fin::date, s.fecha_pago), l.plazo_dias_habiles, l.hora_corte)
       );
    IF v_sin_calculo > 0 THEN
        RAISE EXCEPTION '453: % legalizaciones abiertas sin plazo calculable (¿fecha_fin nula?)', v_sin_calculo;
    END IF;
END $$;

WITH nuevo AS (
    SELECT l.id, p.fecha_base_plazo, p.fecha_limite, p.calendario_incompleto
      FROM travel_expenses.legalizaciones_comision l
      JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
     CROSS JOIN LATERAL pg_temp.plazo_legalizacion(GREATEST(s.fecha_fin::date, s.fecha_pago), l.plazo_dias_habiles, l.hora_corte) p
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
    'Desde cuándo corre el plazo: el fin del día más tardío entre el regreso planeado (fecha_fin) y el pago (fecha_pago), en hora de Colombia. Migración 453.';
