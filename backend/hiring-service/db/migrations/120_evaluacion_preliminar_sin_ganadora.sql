-- ============================================================================
-- 120 · La evaluación preliminar no nombra ganadora
--
-- La revisión de QA de la etapa 6 (EFDS-1157): en la 6.3 la evaluación es
-- preliminar y todavía no se sabe qué oferta gana, así que no tiene sentido
-- registrar puntajes por proponente. Lo que entrega el comité es un informe
-- consolidado, en uno o varios archivos (jurídico, técnico, financiero y
-- económico), y ese mismo soporte alimenta la 6.3 y la 6.4.
--
-- La ganadora se decide en el informe definitivo (7.2), que es donde ya se
-- aplicaron las fórmulas y se resolvieron las observaciones.
--
-- `resultados_evaluacion` sigue siendo el registro de la evaluación, con su
-- historial: actualizar el informe deja el anterior RECTIFICADO con su motivo.
-- Lo que cambia es que la ganadora y la justificación dejan de ser obligatorias.
-- Los resultados que ya existían conservan las suyas.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.resultados_evaluacion ALTER COLUMN oferente_id DROP NOT NULL;
ALTER TABLE hiring.resultados_evaluacion ALTER COLUMN justificacion DROP NOT NULL;

COMMENT ON COLUMN hiring.resultados_evaluacion.oferente_id IS
  'Ganadora que nombraba el comité antes de la 120. Nula desde entonces: la ganadora se decide en el informe definitivo (7.2).';
COMMENT ON COLUMN hiring.resultados_evaluacion.justificacion IS
  'Observación del informe preliminar, opcional desde la 120.';

COMMIT;
