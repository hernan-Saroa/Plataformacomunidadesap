-- ============================================================================
-- 146 · Las acciones de la cadena llegan a las rondas en curso (EFDS-XXXX)
--
-- BUG-006 de QA (17/11): se le dio «Devolver» al escalón del abogado revisor
-- en la cadena «Revisión del estudio previo», y en la revisión abierta no
-- apareció el botón. Cada ronda copia los escalones de la cadena al enviarse,
-- acciones incluidas, y la edición no le llegaba.
--
-- Desde ahora, guardar una cadena actualiza las acciones de los escalones que
-- todavía no deciden (PlantillasCadenaService.actualizar). Esta migración pone
-- al día las rondas que ya están en curso con lo que dice hoy su cadena.
--
-- Quién decide cada escalón no se toca: sigue siendo el de cuando se envió.
--
-- Idempotente.
-- ============================================================================

BEGIN;

UPDATE hiring.aprobacion_escalones e
   SET acciones = ARRAY(SELECT jsonb_array_elements_text(c.escalones -> (e.orden - 1) -> 'acciones'))
  FROM hiring.aprobaciones r, hiring.cadenas_aprobacion c
 WHERE e.aprobacion_id = r.id
   AND r.cadena_id = c.id
   AND r.estado = 'EN_CURSO'
   AND e.estado IN ('PENDIENTE', 'BLOQUEADO')
   AND e.orden <= jsonb_array_length(c.escalones)
   AND jsonb_typeof(c.escalones -> (e.orden - 1) -> 'acciones') = 'array'
   AND e.acciones IS DISTINCT FROM
       ARRAY(SELECT jsonb_array_elements_text(c.escalones -> (e.orden - 1) -> 'acciones'));

COMMIT;
