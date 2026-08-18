-- Parámetros de la actividad que Contratación ajusta sin desplegar.
--
-- La HU pide configurar plazos, responsables y alertas además de la
-- aplicabilidad. Van en el catálogo y no en tablas propias porque son tres
-- datos de la misma actividad: separarlos obligaría a tres consultas para
-- dibujar una fila y a mantener tres tablas que siempre se leen juntas.
--
-- El responsable se guarda como cargo y no como persona: la configuración dice
-- quién aprueba —«Director de Contratación»—, y quien ocupa el cargo cambia sin
-- que cambie el proceso.

ALTER TABLE hiring.actividades
  ADD COLUMN IF NOT EXISTS plazo_dias        INTEGER,
  ADD COLUMN IF NOT EXISTS responsable_cargo VARCHAR(200),
  ADD COLUMN IF NOT EXISTS alerta_dias_antes INTEGER;

COMMENT ON COLUMN hiring.actividades.plazo_dias IS
  'Días hábiles previstos para completar la actividad. Nulo = sin plazo definido.';

COMMENT ON COLUMN hiring.actividades.responsable_cargo IS
  'Cargo que responde por la actividad, no la persona: quien lo ocupa cambia sin que cambie el proceso.';

COMMENT ON COLUMN hiring.actividades.alerta_dias_antes IS
  'Cuántos días antes del vencimiento avisar. Nulo = sin aviso.';

-- Un plazo de cero o negativo no describe nada, y avisar antes de empezar
-- tampoco: se rechazan en la base para que ninguna ruta los cuele.
ALTER TABLE hiring.actividades
  DROP CONSTRAINT IF EXISTS ck_actividades_plazo_positivo;
ALTER TABLE hiring.actividades
  ADD CONSTRAINT ck_actividades_plazo_positivo
  CHECK (plazo_dias IS NULL OR plazo_dias > 0);

ALTER TABLE hiring.actividades
  DROP CONSTRAINT IF EXISTS ck_actividades_alerta_positiva;
ALTER TABLE hiring.actividades
  ADD CONSTRAINT ck_actividades_alerta_positiva
  CHECK (alerta_dias_antes IS NULL OR alerta_dias_antes > 0);
