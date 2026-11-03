-- ============================================================================
-- 104 · La etapa 5 contra la matriz: orden y modalidades
--
-- Revisada la etapa 5 contra la matriz oficial (v2, 20260702), dos cosas se
-- pueden corregir sin tocar lo que hacen los paneles:
--
-- 1. Orden. La matriz pone la limitación a MiPymes antes de la recepción de
--    observaciones (sus 5.5 y 5.6). Aquí iban al revés: la 5.3 observaciones
--    y la 5.4 MiPymes. Se intercambia el `orden`, no el numeral: los numerales
--    del equipo tienen panel, backend e historias cerradas contra ellos (ver
--    la 076). Ninguna de las dos espera a la otra —el riel las hace depender
--    solo de la publicación (5.2)—, así que el cambio es del recorrido que se
--    ve, no de lo que se puede trabajar.
--
-- 2. Modalidades. Tres actividades se recorrían en modalidades que la matriz
--    marca con NO:
--
--      equipo  matriz  actividad                      la matriz dice NO en
--      5.4     5.5     Limitación a MiPymes           Licitación Pública, Bolsa Mercantil
--      5.5     5.12    Audiencia de riesgos           todas menos Licitación Pública
--      5.6     5.13    Adendas                        TVEC
--
--    La audiencia ya era obligatoria solo en Licitación Pública
--    (`audiencia_riesgos_config`); en las demás salía en el riel como algo
--    por hacer que nada exigía.
--
-- Fuera de esta migración, a propósito:
--
--   · Que la audiencia y las adendas vayan después de la apertura, como dice
--     la matriz. Hoy la apertura exige la audiencia y las adendas se cierran
--     al abrir: moverlas solo de orden trancaría la Licitación Pública. Cambia
--     las historias EFDS-1153 y EFDS-1154 y se decide con Contratación.
--   · El régimen especial 092, que la matriz recorre en 5.1-5.6 y aquí se
--     excluye con motivos propios del equipo (016-025).
--   · La publicación en SECOP II en contratación directa: la matriz la pide,
--     pero la 5.2 del equipo es la del proyecto de pliego, que la directa no
--     tiene.
--   · El cronograma (matriz 5.2) y la publicación en la página web de la ESAP
--     (matriz 5.4), que no existen todavía.
--
-- Lo ya instanciado sigue la regla de `estadoConLaModalidad`: solo pasa a
-- NO_APLICA lo que está en BORRADOR sin datos. Lo que alguien trabajó se queda.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

-- 1. Orden ------------------------------------------------------------------

UPDATE hiring.actividades SET orden = 3 WHERE numeral = '5.4';
UPDATE hiring.actividades SET orden = 4 WHERE numeral = '5.3';

-- 2. Modalidades ------------------------------------------------------------

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('5.4', 'LICITACION_PUBLICA',
   'La matriz no recorre la limitación a MiPymes en licitación pública'),
  ('5.4', 'ABREVIADA_BOLSA_MERCANTIL',
   'La matriz no recorre la limitación a MiPymes en la compra por bolsa mercantil'),
  ('5.6', 'ABREVIADA_TVEC',
   'La compra por Tienda Virtual del Estado Colombiano no tiene pliego que modificar por adenda: se adquiere por el catálogo del acuerdo marco')
ON CONFLICT (numeral, modalidad) DO NOTHING;

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
SELECT '5.5', m.codigo,
       'La matriz solo adelanta la audiencia de asignación de riesgos en licitación pública'
  FROM hiring.modalidades m
 WHERE m.codigo <> 'LICITACION_PUBLICA'
ON CONFLICT (numeral, modalidad) DO NOTHING;

UPDATE hiring.proceso_actividades pa
   SET estado = 'NO_APLICA',
       updated_at = now()
  FROM hiring.procesos p, hiring.actividades_excluidas x
 WHERE pa.proceso_id = p.id
   AND x.numeral = pa.numeral
   AND x.modalidad = p.modalidad
   AND pa.numeral IN ('5.4', '5.5', '5.6')
   AND pa.estado = 'BORRADOR'
   AND pa.datos = '{}'::jsonb;

COMMIT;
