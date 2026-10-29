-- ============================================================================
-- 112 · La etapa 5 con los numerales y el orden de la matriz
--
-- La 104 alineó el orden y las modalidades de la etapa 5 sin tocar numerales,
-- y eso dejó el riel diciendo 5.1, 5.2, 5.4, 5.3…: un orden correcto que se
-- leía como un error. Además quedaban fuera dos actividades que la matriz
-- pide y la audiencia y las adendas iban antes de la apertura, al revés de la
-- matriz. Decisión de Juan (2026-10-16): la etapa 5 queda como la matriz v2.
--
--   antes  ahora  actividad
--   5.1    5.1    Elaboración de documentos del proceso
--   —      5.2    Elaboración del cronograma                     (nueva)
--   5.2    5.3    Publicación en SECOP II (era «del proyecto de pliego»)
--   —      5.4    Publicación en la página web de la ESAP         (nueva)
--   5.4    5.5    Limitación a MIPYME
--   5.3    5.6    Observaciones al proyecto de pliego
--   5.7    5.7    Apertura del proceso
--   5.8    5.8    CDP (sigue apagada: el CDP va en la 3.1 y la 4.2, ver 070)
--   5.9    5.9    Manifestación de interés
--   5.10   5.10   Sorteo
--   5.11   5.11   Publicación de la manifestación de interés
--   5.5    5.12   Audiencia de asignación de riesgos
--   5.6    5.13   Adendas del proceso
--
-- La 5.12 y la 5.13 de la matriz existían ya, apagadas desde la 076 por
-- duplicar a la 5.5 y la 5.6 del equipo. Esa duda la cierra esta migración: el
-- numeral bueno es el de la matriz, y lo instanciado en la 5.5 y la 5.6 se
-- lleva allá, como pedía la 076, no al revés.
--
-- El cronograma y la web de la ESAP se cumplen dejando constancia con su
-- soporte, como la 5.9-5.11: la matriz dice que la web «se realiza en la
-- página web de la ESAP pero se adjunta el soporte», y el cronograma por ahora
-- se adjunta. Las alertas que la matriz le pide al cronograma son otra pieza.
--
-- Las modalidades salen de la matriz celda por celda. Cambia, sobre todo:
--   · Contratación directa recorre cronograma, SECOP y web, no solo la 5.1.
--   · El 092 deja de excluirse con motivos propios (016-025): recorre lo que
--     la matriz le marca —5.1 a 5.6 y adendas—.
--   · Mínima cuantía y 092, que no tienen apertura, admiten adendas desde la
--     publicación; las demás, desde la apertura (ver adendas.service.ts).
--
-- Lo ya instanciado sigue la regla de `estadoConLaModalidad`: NO_APLICA vuelve
-- a BORRADOR si ahora aplica, y BORRADOR sin datos pasa a NO_APLICA si ahora
-- no. Lo que alguien trabajó se queda.
--
-- No es idempotente por construcción —renumerar dos veces correría todo un
-- puesto más—, así que se protege: si la 5.2 ya es el cronograma, no hace nada.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  tabla text;
  -- Todas las tablas del esquema que guardan un numeral de actividad. Las que
  -- tienen llave foránea a actividades y las que no: un numeral viejo en
  -- cualquiera de ellas apuntaría a otra actividad.
  tablas text[] := ARRAY[
    'actividades_con_soporte', 'actividades_excluidas', 'actividades_salvedad',
    'alcances_permiso', 'avisos', 'avisos_habilitacion', 'campos_formulario',
    'documentos', 'documentos_proceso', 'documentos_requeridos',
    'flujo_asignaciones', 'plantillas', 'proceso_actividades',
    'registros_actividad', 'reglas_actividad'
  ];
  con_trabajo int;
BEGIN
  IF EXISTS (SELECT 1 FROM hiring.actividades WHERE numeral = '5.2' AND nombre ILIKE '%cronograma%') THEN
    RAISE NOTICE '112 ya aplicada: la 5.2 es el cronograma';
    RETURN;
  END IF;

  -- 1. La 5.12 y la 5.13 viejas, la copia apagada de la matriz ---------------
  --
  -- Antes de borrarlas se comprueba que nadie trabajó en ellas: la 076 las
  -- apagó sin tocar lo instanciado, y algo con datos ahí no se puede tirar.
  SELECT count(*) INTO con_trabajo
    FROM hiring.proceso_actividades
   WHERE numeral IN ('5.12', '5.13')
     AND (datos <> '{}'::jsonb OR estado NOT IN ('BORRADOR', 'NO_APLICA'));
  IF con_trabajo > 0 THEN
    RAISE EXCEPTION '112: hay % actividades 5.12/5.13 con trabajo; revisarlas a mano antes de renumerar', con_trabajo;
  END IF;

  -- Las salvedades de la matriz sobre la 5.13 (adendas en bolsa, «si*») son de
  -- la fila de la matriz y siguen valiendo para la 5.13 nueva.
  CREATE TEMP TABLE salvedades_5_13 ON COMMIT DROP AS
    SELECT * FROM hiring.actividades_salvedad WHERE numeral IN ('5.12', '5.13');

  FOREACH tabla IN ARRAY tablas LOOP
    EXECUTE format('DELETE FROM hiring.%I WHERE numeral IN (''5.12'', ''5.13'')', tabla);
  END LOOP;
  DELETE FROM hiring.actividades WHERE numeral IN ('5.12', '5.13');

  -- 2. Renumerar en dos pasos -------------------------------------------------
  --
  -- Directo no se puede: la 5.3 pasa a 5.6 mientras la 5.6 pasa a 5.13, y
  -- las llaves únicas chocarían a mitad de camino. Primero todo va a un
  -- numeral provisional y luego al definitivo.
  CREATE TEMP TABLE renumeracion (viejo varchar, provisional varchar, nuevo varchar) ON COMMIT DROP;
  INSERT INTO renumeracion VALUES
    ('5.2', 'r5.3',  '5.3'),
    ('5.3', 'r5.6',  '5.6'),
    ('5.4', 'r5.5',  '5.5'),
    ('5.5', 'r5.12', '5.12'),
    ('5.6', 'r5.13', '5.13');

  -- Paso a paso: de viejo a provisional, y de provisional a nuevo.
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

  -- La traza guarda la actividad en el detalle. Sin esto el expediente de un
  -- proceso viejo contaría su audiencia como «5.5», que ahora es MiPymes.
  UPDATE hiring.trazabilidad t
     SET detalle = jsonb_set(t.detalle, '{actividad}', to_jsonb(r.nuevo))
    FROM renumeracion r
   WHERE t.detalle ->> 'actividad' = r.viejo;

  INSERT INTO hiring.actividades_salvedad SELECT * FROM salvedades_5_13
  ON CONFLICT DO NOTHING;
END $$;

-- 3. Las dos nuevas, el nombre de la 5.3 y el orden ---------------------------

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden, activa)
VALUES
  ('5.2', 5, 'Elaboración del cronograma',
   'Cronograma del proceso: genera alertas para los pasos siguientes y sirve de insumo para SECOP II o la Tienda Virtual.',
   2, true),
  ('5.4', 5, 'Publicación en la página web de la ESAP',
   'Se publica en la página web de la ESAP y se adjunta el soporte de la publicación al expediente.',
   4, true)
ON CONFLICT (numeral) DO NOTHING;

UPDATE hiring.actividades
   SET nombre = 'Publicación en SECOP II',
       descripcion = 'Se crea el proceso en SECOP II y se suben todos los documentos. Donde hay pliego, corre el plazo de observaciones.'
 WHERE numeral = '5.3';

UPDATE hiring.actividades
   SET orden = split_part(numeral, '.', 2)::int
 WHERE etapa = 5;

INSERT INTO hiring.actividades_con_soporte (numeral, etapa, exige_soporte, confirmado, nota_fuente)
VALUES
  ('5.2', 5, true, true, 'Genera alertas para futuros filtros y sirve de insumo para SECOP o TVEC.'),
  ('5.4', 5, true, true, 'Se realiza en la página web de la ESAP pero se adjunta el soporte de la publicación en el expediente.')
ON CONFLICT (numeral) DO NOTHING;

-- 4. Modalidades, celda por celda de la matriz v2 ------------------------------
--
-- Se rehacen todas las de la etapa 5 en vez de corregir las que había: venían
-- de cuatro migraciones con numerales distintos, y comparar contra la matriz
-- es más fácil si la tabla dice exactamente lo que dice la matriz.

DELETE FROM hiring.actividades_excluidas
 WHERE numeral IN (SELECT numeral FROM hiring.actividades WHERE etapa = 5);

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
SELECT x.numeral, x.modalidad,
       'La matriz no recorre «' || a.nombre || '» en ' || lower(m.nombre)
  FROM (VALUES
    ('5.1',  'ABREVIADA_TVEC'),
    ('5.4',  'ABREVIADA_TVEC'),
    ('5.5',  'LICITACION_PUBLICA'),
    ('5.5',  'ABREVIADA_BOLSA_MERCANTIL'),
    ('5.5',  'CONTRATACION_DIRECTA'),
    ('5.6',  'CONTRATACION_DIRECTA'),
    ('5.7',  'MINIMA_CUANTIA'),
    ('5.7',  'REGIMEN_ESPECIAL_092'),
    ('5.7',  'CONTRATACION_DIRECTA'),
    ('5.8',  'ENAJENACION_SUBASTA'),
    ('5.9',  'LICITACION_PUBLICA'),
    ('5.9',  'ABREVIADA_SUBASTA_INVERSA'),
    ('5.9',  'ENAJENACION_SUBASTA'),
    ('5.9',  'ABREVIADA_TVEC'),
    ('5.9',  'ABREVIADA_BOLSA_MERCANTIL'),
    ('5.9',  'CONCURSO_MERITOS_ABIERTO'),
    ('5.9',  'MINIMA_CUANTIA'),
    ('5.9',  'REGIMEN_ESPECIAL_092'),
    ('5.9',  'CONTRATACION_DIRECTA'),
    ('5.10', 'LICITACION_PUBLICA'),
    ('5.10', 'ABREVIADA_SUBASTA_INVERSA'),
    ('5.10', 'ENAJENACION_SUBASTA'),
    ('5.10', 'ABREVIADA_TVEC'),
    ('5.10', 'ABREVIADA_BOLSA_MERCANTIL'),
    ('5.10', 'CONCURSO_MERITOS_ABIERTO'),
    ('5.10', 'CONCURSO_MERITOS_PRECAL'),
    ('5.10', 'MINIMA_CUANTIA'),
    ('5.10', 'REGIMEN_ESPECIAL_092'),
    ('5.10', 'CONTRATACION_DIRECTA'),
    ('5.11', 'LICITACION_PUBLICA'),
    ('5.11', 'ABREVIADA_SUBASTA_INVERSA'),
    ('5.11', 'ENAJENACION_SUBASTA'),
    ('5.11', 'ABREVIADA_TVEC'),
    ('5.11', 'ABREVIADA_BOLSA_MERCANTIL'),
    ('5.11', 'CONCURSO_MERITOS_ABIERTO'),
    ('5.11', 'MINIMA_CUANTIA'),
    ('5.11', 'REGIMEN_ESPECIAL_092'),
    ('5.11', 'CONTRATACION_DIRECTA'),
    ('5.12', 'ABREVIADA_MENOR_CUANTIA'),
    ('5.12', 'ABREVIADA_SUBASTA_INVERSA'),
    ('5.12', 'ENAJENACION_SUBASTA'),
    ('5.12', 'ABREVIADA_TVEC'),
    ('5.12', 'ABREVIADA_BOLSA_MERCANTIL'),
    ('5.12', 'CONCURSO_MERITOS_ABIERTO'),
    ('5.12', 'CONCURSO_MERITOS_PRECAL'),
    ('5.12', 'MINIMA_CUANTIA'),
    ('5.12', 'REGIMEN_ESPECIAL_092'),
    ('5.12', 'CONTRATACION_DIRECTA'),
    ('5.13', 'ABREVIADA_TVEC'),
    ('5.13', 'CONTRATACION_DIRECTA')
  ) AS x (numeral, modalidad)
  JOIN hiring.actividades a ON a.numeral = x.numeral
  JOIN hiring.modalidades m ON m.codigo = x.modalidad;

-- Las celdas de la publicación en SECOP que no son un SI limpio.
INSERT INTO hiring.actividades_salvedad (numeral, modalidad, variante, nota)
VALUES
  ('5.3', 'ABREVIADA_TVEC', 'Se publica en la Tienda Virtual del Estado Colombiano',
   'La matriz marca «TVEC» en vez de SI: la publicación se hace en la Tienda Virtual'),
  ('5.3', 'ABREVIADA_BOLSA_MERCANTIL', NULL,
   'La matriz marca una condición no documentada; verificar con la Dirección de Contratación')
ON CONFLICT DO NOTHING;

-- 5. Lo ya instanciado sigue a la modalidad -----------------------------------

UPDATE hiring.proceso_actividades pa
   SET estado = 'BORRADOR', updated_at = now()
  FROM hiring.procesos p
 WHERE pa.proceso_id = p.id
   AND pa.estado = 'NO_APLICA'
   AND pa.numeral IN (SELECT numeral FROM hiring.actividades WHERE etapa = 5)
   AND NOT EXISTS (SELECT 1 FROM hiring.actividades_excluidas x
                    WHERE x.numeral = pa.numeral AND x.modalidad = p.modalidad);

UPDATE hiring.proceso_actividades pa
   SET estado = 'NO_APLICA', updated_at = now()
  FROM hiring.procesos p, hiring.actividades_excluidas x
 WHERE pa.proceso_id = p.id
   AND x.numeral = pa.numeral
   AND x.modalidad = p.modalidad
   AND pa.estado = 'BORRADOR'
   AND pa.datos = '{}'::jsonb
   AND pa.numeral IN (SELECT numeral FROM hiring.actividades WHERE etapa = 5);

COMMIT;
