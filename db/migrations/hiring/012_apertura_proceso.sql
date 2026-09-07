-- ============================================================================
-- 012 · Apertura del proceso
--
-- El primer criterio de EFDS-1148 dice que el sistema impide la apertura sin
-- CDP expedido. La apertura no es una actividad de la etapa 4: es la 5.7 de la
-- matriz, ya dentro de la etapa 5. Por eso el bloqueo cruza de una etapa a la
-- siguiente.
--
-- Aquí solo se registra esa actividad, que es la que la validación protege.
-- Las demás de la etapa 5 —documentos, cronograma, publicación en SECOP— son de
-- historias posteriores y se cargarán cuando se trabajen.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.7', 5, 'Apertura del proceso',
   'Documento de respuesta a observaciones, proyecto de pliego, resolución de apertura, pliego definitivo y anexos. Requiere CDP expedido.',
   70)
ON CONFLICT (numeral) DO NOTHING;

-- La matriz marca NO esta actividad en tres de las once modalidades, pero el
-- orden de sus columnas no se puede leer sin ambigüedad del texto extraído.
-- Se dejan sin registrar en vez de adivinarlas: una exclusión equivocada
-- bloquearía un proceso que la ley permite abrir.
