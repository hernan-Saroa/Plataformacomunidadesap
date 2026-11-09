-- ============================================================================
-- 134 · La adenda de cronograma también mueve la hora del cierre de ofertas
-- ============================================================================
-- Revisión de QA de EFDS-1155: la fecha de cierre se extiende con una adenda
-- de cronograma aunque ya se estén recibiendo ofertas. Hasta ahora la adenda
-- solo movía el día y conservaba la hora del cronograma, así que no podía
-- llevar el cierre de las 10:00 a las 17:00 del mismo día ni fijar la hora que
-- trae el documento firmado.
--
-- `hora_nueva` se pide al emitir, como el día, y solo cuando lo que se
-- prorroga es el cierre de ofertas. `hora_anterior` se llena al publicar,
-- junto con `vencimiento_anterior`, para que el expediente diga de qué momento
-- a qué momento se movió el cierre. Nulas en las adendas anteriores a esta
-- migración y en las que mueven el plazo de observaciones, que no tiene hora.
--
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.adendas ADD COLUMN IF NOT EXISTS hora_anterior time;
ALTER TABLE hiring.adendas ADD COLUMN IF NOT EXISTS hora_nueva time;

COMMENT ON COLUMN hiring.adendas.hora_anterior IS
  'Hora del cierre de ofertas antes de la adenda (Bogotá); nula si lo movido fue el plazo de observaciones';
COMMENT ON COLUMN hiring.adendas.hora_nueva IS
  'Hora del cierre de ofertas que fija la adenda (Bogotá); nula si conserva la del cronograma o no hay cierre que mover';

COMMIT;
