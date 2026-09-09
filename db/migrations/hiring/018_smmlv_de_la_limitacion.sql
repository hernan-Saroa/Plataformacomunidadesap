-- ============================================================================
-- 018 · Salario mínimo con el que se evaluó la limitación a MIPYME
--
-- EFDS-1151. Corrige un hueco de 017: la decisión congela el tope aplicado y su
-- unidad, pero no el salario con el que ese tope se convirtió a pesos.
--
-- El tope se guarda en SMMLV y el salario vive en `hiring.smmlv`, una tabla
-- editable desde la pantalla de Umbrales. Corregir ahí el salario del año
-- —cosa esperable, porque hoy está sembrado sin confirmar— dejaba las
-- decisiones ya tomadas diciendo "tope aplicado: 300 SMMLV" sin forma de
-- reconstruir contra cuántos pesos se comparó realmente.
--
-- El veredicto nunca estuvo en riesgo: `condiciones_cumplidas`, `valor_proceso`
-- y el conteo sí quedaban congelados. Lo que faltaba era poder rehacer la
-- aritmética, que es justo lo que pide un ente de control.
-- ============================================================================

-- Nulable y sin relleno retroactivo: en las decisiones anteriores a esta
-- columna el dato no se guardó y no hay de dónde deducirlo. Inventarlo con el
-- salario de hoy sería peor que dejarlo vacío — afirmaría como probado algo
-- que nadie registró. Null aquí significa "no consta", y así lo dice la
-- pantalla.
--
-- Solo se llena cuando el tope se aplicó en SMMLV: con un tope en pesos el
-- salario no entra en el cálculo, y guardarlo sugeriría que sí.
ALTER TABLE hiring.limitaciones_mipyme
  ADD COLUMN IF NOT EXISTS smmlv_aplicado numeric(18, 2);

COMMENT ON COLUMN hiring.limitaciones_mipyme.smmlv_aplicado IS
  'Salario mínimo con el que se convirtió el tope a pesos. Null si el tope se aplicó en pesos o si la decisión es anterior a esta columna.';
