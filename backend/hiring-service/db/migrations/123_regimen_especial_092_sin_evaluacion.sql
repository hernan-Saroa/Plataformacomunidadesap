-- ============================================================================
-- 123 · Régimen especial 092 sin traslado ni informe definitivo
--
-- La matriz excluía en el régimen especial del Decreto 092 de 2017 la
-- recepción de ofertas, el comité y la evaluación (6.1 a 6.3), pero dejaba
-- aplicables el traslado del informe preliminar, las subsanaciones, las
-- respuestas y el informe definitivo (6.4 a 6.6 y 7.2). Las cuatro trabajan
-- sobre una evaluación que no existe: el riel se trancaba en la 6.4 y el
-- proceso no llegaba al acto de adjudicación.
--
-- Decisión de Juan (2026-10-21): como en contratación directa. El 092 asigna
-- a la entidad sin ánimo de lucro sin evaluación en competencia, así que se
-- excluyen también las cuatro. El acto (7.3) sigue aplicando: sin
-- convocatoria nombra él mismo al contratista (migración 122).
--
-- Los procesos 092 ya instanciados: lo que nadie ha trabajado pasa a
-- NO_APLICA; lo que alguien ya trabajó se queda.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo) VALUES
  ('6.4', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no evalúa ofertas en competencia: no hay informe que trasladar'),
  ('6.5', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no evalúa ofertas en competencia: no hay informe que subsanar'),
  ('6.6', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no evalúa ofertas en competencia: no hay observaciones que responder'),
  ('7.2', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no evalúa ofertas en competencia: el acto (7.3) nombra a la entidad')
ON CONFLICT (numeral, modalidad) DO UPDATE SET motivo = EXCLUDED.motivo;

UPDATE hiring.proceso_actividades pa
   SET estado = 'NO_APLICA', updated_at = now()
  FROM hiring.procesos p
 WHERE p.id = pa.proceso_id
   AND p.modalidad = 'REGIMEN_ESPECIAL_092'
   AND pa.numeral IN ('6.4', '6.5', '6.6', '7.2')
   AND pa.estado = 'BORRADOR'
   AND pa.datos = '{}'::jsonb;

COMMIT;
