-- ============================================================================
-- 090 · El análisis del sector se entrega con el estudio previo
--
-- La 3.2 no tenía trámite propio: era un registro cuyo único contenido eran
-- dos documentos de la lista de chequeo —estudio del sector y estudio de
-- mercado—. Y llegaba tarde: la 3.1 se enviaba sola, la Dirección la revisaba
-- sin el análisis del sector y la 3.2 solo se abría cuando la 3.1 ya estaba
-- aprobada. En la práctica el área arma los dos juntos y los radica juntos.
--
-- Desde la 085 la lista de chequeo es una sola tabla por numeral, así que
-- juntarlas es mover los dos requisitos a la 3.1: aparecen en su lista, el
-- envío de la 3.1 los exige y el abogado los revisa con el estudio previo.
--
-- Lo que ya se entregó en la 3.2 se lleva a la 3.1 para que los procesos en
-- curso no vean como faltante algo que ya cargaron. Los códigos no chocan con
-- los de la 3.1.
--
-- La 3.2 se desactiva, no se borra (mismo mecanismo que la 070 y la 076): sale
-- del riel y de las actividades nuevas, y sus filas en `proceso_actividades` y
-- `registros_actividad` se quedan como historia de lo recorrido.
-- ============================================================================

BEGIN;

UPDATE hiring.documentos_requeridos
   SET numeral = '3.1',
       orden = orden + 100,
       updated_at = now()
 WHERE numeral = '3.2';

UPDATE hiring.documentos d
   SET numeral = '3.1'
  FROM hiring.documentos_proceso dp
 WHERE dp.documento_id = d.id
   AND dp.numeral = '3.2'
   AND d.numeral = '3.2';

UPDATE hiring.documentos_proceso
   SET numeral = '3.1'
 WHERE numeral = '3.2';

UPDATE hiring.alcances_permiso
   SET activo = false,
       updated_at = now()
 WHERE numeral = '3.2';

UPDATE hiring.actividades
   SET nombre = 'Elaboración de estudios previos, análisis del sector y estudio de mercado',
       descripcion = 'Descripción de la necesidad, fundamento jurídico y modalidad propuesta, '
                  || 'con el análisis del sector y el estudio de mercado que sustentan el valor '
                  || 'estimado. Obligatorio según la Ley 80 de 1993.'
 WHERE numeral = '3.1';

UPDATE hiring.actividades
   SET activa = false
 WHERE numeral = '3.2';

COMMIT;
