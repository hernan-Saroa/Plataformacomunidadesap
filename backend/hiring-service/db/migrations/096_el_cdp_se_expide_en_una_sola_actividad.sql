-- ============================================================================
-- 096 · El CDP se verifica, se expide y se adjunta en una sola actividad
--
-- La Dirección Financiera trabajaba el CDP en tres pantallas seguidas: la 4.2
-- (verificar la disponibilidad contra un rubro), la 4.3 (registrar número,
-- valor y fecha) y la 4.4 (cargar el certificado). Las tres las hace la misma
-- persona, una detrás de otra y con el mismo papel en la mano: cuando la
-- Financiera verifica es porque ya tiene el certificado, y partirlo en tres
-- solo obligaba a firmar tres veces y a buscar en el riel la que seguía.
--
-- Desde aquí la 4.2 recoge las tres: rubro, número, valor, fecha y el soporte
-- en un solo formulario, con una confirmación que muestra si el valor
-- certificado queda por encima o por debajo del estimado antes de expedir.
--
-- La 4.3 y la 4.4 se desactivan, no se borran (mismo mecanismo que la 090 con
-- la 3.2 y la 094 con la 3.5): salen del riel y de las actividades nuevas, y
-- sus filas en `proceso_actividades` se quedan como historia de lo recorrido.
-- Sus alcances se desactivan para que la matriz de permisos no ofrezca un
-- punto que ya no existe.
-- ============================================================================

BEGIN;

UPDATE hiring.alcances_permiso
   SET activo = false,
       updated_at = now()
 WHERE numeral IN ('4.3', '4.4');

UPDATE hiring.actividades
   SET nombre = 'Expedición del CDP',
       descripcion = 'La Dirección Financiera verifica la disponibilidad contra un rubro, registra '
                  || 'el certificado expedido y lo adjunta al expediente. Sin CDP no se puede '
                  || 'abrir el proceso.'
 WHERE numeral = '4.2';

UPDATE hiring.actividades
   SET activa = false
 WHERE numeral IN ('4.3', '4.4');

COMMIT;
