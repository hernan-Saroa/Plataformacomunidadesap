-- ============================================================================
-- 011 · Deja en el formulario solo lo que el HU necesita
--
-- Los campos del numeral 3.1 se derivaron del formato oficial BS-FO-047, que
-- tiene treinta capítulos. Eso llevó a pedir datos que el formato diligencia
-- pero que ningún criterio de aceptación del HU EFDS-1146 usa.
--
-- El HU pide dos cosas: identificar el proceso en el expediente y registrar su
-- fundamento jurídico. Todo lo demás vive en el documento firmado, que es el
-- entregable real de la actividad.
--
-- Se desactivan, no se borran: los procesos existentes conservan lo que ya
-- tengan diligenciado, y reactivar uno es un UPDATE si Contratación lo pide.
-- ============================================================================

UPDATE hiring.campos_formulario
   SET activo = false
 WHERE numeral = '3.1'
   AND codigo IN (
     -- El formato lo pide como "indicar el cargo de quien ejercerá las
     -- funciones de supervisor", pero la designación del supervisor es
     -- RF-LEG-04, de la etapa 9. En la 3.1 no se designa a nadie.
     'cargo_supervisor',
     -- Misma razón: pertenece al capítulo de control y vigilancia, que se
     -- resuelve al estructurar el contrato, no al elaborar el estudio previo.
     'requiere_interventoria',
     -- Dato del contrato, no del sustento jurídico de la contratación.
     'lugar_ejecucion'
   );

-- La causal normativa sí sustenta la modalidad, así que se conserva: es lo que
-- da precisión a la "referencia normativa" que exige el criterio 1. Queda
-- opcional porque solo aplica a Contratación Directa y Régimen Especial, y
-- campos_formulario no modela obligatoriedad condicional.

-- Quedan ocho obligatorios y uno opcional:
--   Identificación · objeto, área solicitante, responsable, línea del PAA
--   Contratación   · tipología, fundamento jurídico, causal (opcional)
--   Valor y plazo  · valor estimado, plazo de ejecución
