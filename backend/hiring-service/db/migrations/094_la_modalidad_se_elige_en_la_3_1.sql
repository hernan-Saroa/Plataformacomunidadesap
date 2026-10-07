-- ============================================================================
-- 094 · La modalidad se elige y se ratifica con el estudio previo
--
-- La 3.5 llegaba tarde. La lista de chequeo de la 3.1 depende de la modalidad
-- (desde la 085 cada requisito dice a qué modalidades aplica), pero el área
-- solo podía corregir la modalidad en la 3.5, que se abría con la 3.1 ya
-- enviada y revisada: los documentos se radicaban con la lista de una
-- modalidad y la modalidad se cambiaba después.
--
-- Desde aquí el área cambia la modalidad en la 3.1 mientras la arma, y la
-- lista de documentos cambia con ella. Aprobar la 3.1 es ratificarla: si no
-- corresponde, el abogado devuelve el estudio previo diciendo cuál sí. La
-- causal (3.6) pasa a esperar la 3.1 aprobada.
--
-- Cambiar la modalidad recalcula qué actividades recorre el proceso (lo hace
-- el servicio, no esta migración): antes se decidía una sola vez, al crearlo.
--
-- La 3.5 se desactiva, no se borra (mismo mecanismo que la 090 con la 3.2):
-- sale del riel y de las actividades nuevas, y sus filas en
-- `proceso_actividades` y sus revisiones se quedan como historia de lo
-- recorrido. Sus alcances se desactivan para que la matriz de permisos no
-- ofrezca un punto que ya no existe.
-- ============================================================================

BEGIN;

UPDATE hiring.alcances_permiso
   SET activo = false,
       updated_at = now()
 WHERE numeral = '3.5';

UPDATE hiring.actividades
   SET descripcion = 'Descripción de la necesidad, fundamento jurídico y modalidad de contratación, '
                  || 'con el análisis del sector y el estudio de mercado que sustentan el valor '
                  || 'estimado. La lista de documentos depende de la modalidad; aprobar el estudio '
                  || 'previo la ratifica. Obligatorio según la Ley 80 de 1993.'
 WHERE numeral = '3.1';

UPDATE hiring.actividades
   SET activa = false
 WHERE numeral = '3.5';

COMMIT;
