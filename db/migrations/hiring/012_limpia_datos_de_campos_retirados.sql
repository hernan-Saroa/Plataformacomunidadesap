-- ============================================================================
-- 012 · Quita de los datos los campos que se retiraron del formulario
--
-- Las migraciones 007 y 011 desactivaron campos, pero dejaron sus valores en
-- proceso_actividades.datos. El guardado rechaza cualquier clave que no
-- corresponda a un campo activo —para que un cliente no inyecte datos
-- arbitrarios en el expediente— así que esos procesos quedaron sin poder
-- guardarse: el formulario los reenvía y el backend responde
-- "Campos no definidos para el estudio previo: modalidad_propuesta".
--
-- Los valores se descartan en lugar de conservarse porque ya no significan
-- nada: modalidad_propuesta se sustituyó por procesos.modalidad, y los otros
-- tres pertenecen a etapas posteriores. Lo diligenciado antes sigue en la
-- trazabilidad, que registra cada guardado con su contenido.
-- ============================================================================

UPDATE hiring.proceso_actividades
   SET datos = datos
             - 'modalidad_propuesta'   -- ahora vive en procesos.modalidad (007)
             - 'lugar_ejecucion'       -- dato del contrato, no del estudio (011)
             - 'requiere_interventoria'-- control y vigilancia, etapa posterior
             - 'cargo_supervisor'      -- designación del supervisor: RF-LEG-04
 WHERE numeral = '3.1'
   AND (datos ?| array[
         'modalidad_propuesta',
         'lugar_ejecucion',
         'requiere_interventoria',
         'cargo_supervisor'
       ]);
