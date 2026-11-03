-- ============================================================================
-- 114 · La etapa 7 con los numerales de la matriz y el sobre de obra pública
--
-- La matriz v2 numera la apertura del sobre económico como 7.1.1, colgada de
-- la audiencia, y no como una actividad más de la etapa. El seed de la 030 la
-- había contado como 7.2 y corrido un puesto todo lo que venía detrás:
--
--   antes  ahora  actividad
--   7.1    7.1    Audiencia de adjudicación
--   7.2    7.1.1  Apertura de sobre económico en audiencia de adjudicación
--   7.3    7.2    Informe de evaluación definitivo
--   7.4    7.3    Acto de adjudicación
--
-- Las modalidades no cambian: las exclusiones que había ya eran las de la
-- matriz celda por celda, y viajan con el numeral.
--
-- La 7.1.1 tiene además una condición que la tabla de exclusiones no puede
-- expresar: «aplica solo para la licitación de obra pública». La modalidad la
-- sigue diciendo `actividades_excluidas` (solo licitación); que el objeto sea
-- obra lo dice la tipología contractual de la 3.1, y eso lo resuelve el
-- servicio de la audiencia (ver `aplicaSobreEconomico`). Aquí solo se dejan en
-- NO_APLICA las licitaciones ya instanciadas que no son de obra.
--
-- Mismo método que la 112: dos pasos con numeral provisional para que las
-- llaves únicas no choquen, y una guarda contra correrla dos veces.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  tabla text;
  tablas text[] := ARRAY[
    'actividades_con_soporte', 'actividades_excluidas', 'actividades_salvedad',
    'alcances_permiso', 'avisos', 'avisos_habilitacion', 'campos_formulario',
    'documentos', 'documentos_proceso', 'documentos_requeridos',
    'flujo_asignaciones', 'plantillas', 'proceso_actividades',
    'registros_actividad', 'reglas_actividad'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM hiring.actividades WHERE numeral = '7.1.1') THEN
    RAISE NOTICE '114 ya aplicada: la 7.1.1 existe';
    RETURN;
  END IF;

  CREATE TEMP TABLE renumeracion (viejo varchar, provisional varchar, nuevo varchar) ON COMMIT DROP;
  INSERT INTO renumeracion VALUES
    ('7.2', 'r7.1.1', '7.1.1'),
    ('7.3', 'r7.2',   '7.2'),
    ('7.4', 'r7.3',   '7.3');

  FOR i IN 1..2 LOOP
    INSERT INTO hiring.actividades
      (numeral, etapa, nombre, descripcion, orden, activa, plazo_dias,
       responsable_cargo, alerta_dias_antes, avisos_por_correo)
    SELECT CASE i WHEN 1 THEN r.provisional ELSE r.nuevo END,
           a.etapa, a.nombre, a.descripcion, a.orden, a.activa, a.plazo_dias,
           a.responsable_cargo, a.alerta_dias_antes, a.avisos_por_correo
      FROM hiring.actividades a
      JOIN renumeracion r ON a.numeral = CASE i WHEN 1 THEN r.viejo ELSE r.provisional END;

    FOREACH tabla IN ARRAY tablas LOOP
      EXECUTE format(
        'UPDATE hiring.%I t SET numeral = CASE %s WHEN 1 THEN r.provisional ELSE r.nuevo END
           FROM renumeracion r
          WHERE t.numeral = CASE %s WHEN 1 THEN r.viejo ELSE r.provisional END',
        tabla, i, i);
    END LOOP;

    DELETE FROM hiring.actividades a
     USING renumeracion r
     WHERE a.numeral = CASE i WHEN 1 THEN r.viejo ELSE r.provisional END;
  END LOOP;

  -- La traza guarda la actividad en el detalle: sin esto el expediente de un
  -- proceso viejo contaría su acto de adjudicación como «7.4», que ya no existe.
  UPDATE hiring.trazabilidad t
     SET detalle = jsonb_set(t.detalle, '{actividad}', to_jsonb(r.nuevo))
    FROM renumeracion r
   WHERE t.detalle ->> 'actividad' = r.viejo;
END $$;

-- El orden no se puede sacar del numeral, como en la 112: la 7.1.1 va segunda.
UPDATE hiring.actividades SET orden = 1 WHERE numeral = '7.1';
UPDATE hiring.actividades SET orden = 2 WHERE numeral = '7.1.1';
UPDATE hiring.actividades SET orden = 3 WHERE numeral = '7.2';
UPDATE hiring.actividades SET orden = 4 WHERE numeral = '7.3';

-- Las licitaciones ya instanciadas que no son de obra pública: la 7.1.1 sin
-- trabajo pasa a NO_APLICA. Lo que alguien ya trabajó se queda.
UPDATE hiring.proceso_actividades pa
   SET estado = 'NO_APLICA', updated_at = now()
 WHERE pa.numeral = '7.1.1'
   AND pa.estado = 'BORRADOR'
   AND pa.datos = '{}'::jsonb
   AND COALESCE((SELECT ep.datos ->> 'tipologia_contractual'
                   FROM hiring.proceso_actividades ep
                  WHERE ep.proceso_id = pa.proceso_id AND ep.numeral = '3.1'), '')
       <> 'Obra pública';

COMMIT;
