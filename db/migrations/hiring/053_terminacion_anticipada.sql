-- ============================================================================
-- 053 · Terminación anticipada del contrato
--
-- EFDS-1178 (RF-MOD-03, RF-MOD-05, RF-SIS-01): completa el bloque de
-- modificaciones contractuales con el séptimo tipo de la matriz.
--
-- **Por qué entra en EFDS-1178 y no en otra historia.** La 052 la dejó fuera
-- porque la historia pedía confirmar «si se maneja en esta misma HU o requiere
-- una aparte». Ninguna otra historia del proyecto la recoge —EFDS-1179 es la
-- regla del objeto y EFDS-1180 a 1182 son el bloque de incumplimiento—, y la
-- trazabilidad de la 1178 la nombra en su propio bloque. Va aquí.
--
-- Las dos causales salen de la fuente, no del equipo: la presentación del flujo
-- define la terminación anticipada como «finalización anticipada del contrato
-- por mutuo acuerdo o decisión unilateral motivada».
--
-- **La caducidad no es esto.** Terminar por incumplimiento es el proceso
-- sancionatorio de EFDS-1181, con su propio trámite y su reserva legal. Aquí no
-- hay causal de incumplimiento a propósito.
-- ============================================================================

-- ------------------------------------------------ el contrato puede terminar --
/*
 * TERMINADO era el último estado que RF-SIS-01 pedía y que nadie escribía. La
 * 052 dejó entrar SUSPENDIDO por la misma razón inversa: la suspensión ya tenía
 * quien la escribiera y la terminación no.
 *
 * Con este, el ciclo del contrato queda completo: el requerimiento lo nombra
 * también en el bloque de estadísticas —suscrito, en ejecución, terminado,
 * liquidado y cerrado—, que es lo que el módulo de reportes tendrá que contar.
 *
 * Se recrea el CHECK entero: `ADD CONSTRAINT` no acepta IF NOT EXISTS.
 */
ALTER TABLE hiring.contratos
  DROP CONSTRAINT IF EXISTS ck_contrato_estado;

ALTER TABLE hiring.contratos
  ADD CONSTRAINT ck_contrato_estado CHECK (
    estado IN (
      'GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO',
      'LEGALIZADO', 'EJECUCION', 'SUSPENDIDO', 'TERMINADO', 'LIQUIDADO', 'CERRADO'
    )
  );

COMMENT ON COLUMN hiring.contratos.estado IS
  'Ciclo del contrato (RF-SIS-01). SUSPENDIDO es ejecución en pausa; TERMINADO es ejecución acabada antes de tiempo, y de ahí se sigue a la liquidación.';

-- ------------------------------------------------ lo propio de la terminación --
/*
 * La causal y la fecha en que el contrato deja de ejecutarse.
 *
 * La fecha va aparte de `fecha_suscripcion`: el acta se firma un día y la
 * terminación puede tener efecto en otro, y lo que cuenta para el informe final
 * y para la liquidación es cuándo dejó de ejecutarse, no cuándo se firmó.
 */
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS terminacion_causal varchar(20),
  ADD COLUMN IF NOT EXISTS terminacion_el     date;

COMMENT ON COLUMN hiring.modificaciones_contrato.terminacion_causal IS
  'MUTUO_ACUERDO o UNILATERAL, las dos que define la fuente. El incumplimiento no está aquí: es el proceso sancionatorio (EFDS-1181).';

/*
 * El estado que el contrato tenía antes de terminarse.
 *
 * Mismo criterio que `valor_contrato_antes` y `plazo_dias_antes`: revocar
 * devuelve lo guardado y no lo deducido. Un contrato puede terminarse estando
 * suspendido —de hecho es el desenlace típico de una suspensión que no se
 * supera—, y entonces revocar la terminación tiene que devolverlo a SUSPENDIDO,
 * no a EJECUCION.
 */
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS estado_contrato_antes varchar(20);

-- Una terminación dice por qué y desde cuándo, y no toca plata ni plazo: si
-- trae valor adicionado o días de prórroga es otro tipo mal clasificado.
ALTER TABLE hiring.modificaciones_contrato
  DROP CONSTRAINT IF EXISTS ck_modificacion_terminacion;

ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_terminacion CHECK (
    tipo <> 'TERMINACION_ANTICIPADA'
    OR (
      terminacion_causal IN ('MUTUO_ACUERDO', 'UNILATERAL')
      AND terminacion_el IS NOT NULL
      AND valor_adicionado IS NULL
      AND dias_prorroga IS NULL
    )
  );

/*
 * Un contrato se termina una sola vez.
 *
 * Parcial sobre las que siguen vivas: revocar la terminación devuelve el
 * contrato a ejecución y rechazarla la deja sin curso, y en los dos casos tiene
 * que poder volver a intentarse. Lo que el índice impide es tramitar dos a la
 * vez o terminar dos veces lo mismo.
 *
 * El nombre lleva el tipo: los nombres de índice son únicos por esquema, y ya
 * se pisó uno así en la 048.
 */
CREATE UNIQUE INDEX IF NOT EXISTS uq_terminacion_por_contrato
  ON hiring.modificaciones_contrato (contrato_id)
  WHERE tipo = 'TERMINACION_ANTICIPADA' AND estado IN ('EN_TRAMITE', 'APROBADA');
