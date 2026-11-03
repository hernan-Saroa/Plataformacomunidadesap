-- ============================================================================
-- 105 · El objeto y el valor solo cambian con el PAA
--
-- Desde la 097 el proceso nace de una línea del PAA, y de ella saca el objeto
-- y el valor. Pero los dos se seguían editando: el valor en la 3.1, con la
-- corrección de cuantía, y el objeto como un campo más del estudio previo.
-- Contratación lo pidió en la revisión de EFDS-1146: lo que aprobó el PAA no
-- lo cambia nadie dentro del proceso. Si el objeto o el valor están mal, se
-- corrige el PAA y la versión nueva se lo aplica al proceso, como ya hace.
--
-- Desde aquí:
--
--   · `objeto_contratar` queda de solo lectura en la 3.1, como `valor_estimado`
--     desde EFDS-1147. Lo que muestra sale del proceso, no del JSON de la
--     actividad, y ya no cuenta como obligatorio por diligenciar.
--   · La corrección del valor (PUT …/estudio-previo/cuantia) desaparece en el
--     código; la modalidad se sigue cambiando en la 3.1, contra el valor del
--     PAA.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

UPDATE hiring.campos_formulario
   SET solo_lectura = true
 WHERE numeral = '3.1'
   AND codigo = 'objeto_contratar'
   AND NOT solo_lectura;

COMMIT;
