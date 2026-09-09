-- ============================================================================
-- 054 · La regla del objeto
--
-- EFDS-1179 (RF-MOD-04): «validación de que el objeto del contrato no puede
-- modificarse». La fuente la llama **regla de oro** y es la única del bloque de
-- modificaciones que no admite excepción por tipo: una modificación puede darle
-- al contrato más plata, más plazo, otro contratista o precisar sus cláusulas;
-- lo que no puede es cambiar qué se contrató, porque entonces no es una
-- modificación sino un contrato distinto que se saltó la selección.
--
-- Dos piezas, y ninguna sobra: la modificación **congela** el objeto sobre el
-- que se tramitó, y el trigger **impide** cambiarlo en un contrato ya suscrito.
-- La primera responde «¿sobre qué se firmó esto?»; la segunda, «¿pudo alguien
-- cambiarlo?». La validación del API vive en el servicio y cubre lo que entra
-- por ahí; esto cubre lo que no.
-- ============================================================================

-- ------------------------------------------------ el objeto sobre el que se firmó --
/*
 * El objeto tal como estaba cuando la modificación se solicitó.
 *
 * Mismo criterio que `valor_contrato_antes` o que el índice documental del
 * archivo (10.4): calcular al consultar diría siempre que todo coincide, que es
 * justo lo que una regla de integridad no puede dar por supuesto.
 *
 * Nulo en las modificaciones anteriores a esta migración: no congelaron nada, y
 * sin foto que comparar no hay diferencia que afirmar.
 */
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS objeto_contrato text;

COMMENT ON COLUMN hiring.modificaciones_contrato.objeto_contrato IS
  'El objeto del contrato el día en que se solicitó la modificación (RF-MOD-04). Aprobarla exige que siga siendo el mismo.';

-- ---------------------------------------------------- el objeto no se toca --
/*
 * Impide cambiar `contratos.objeto` una vez el contrato está suscrito.
 *
 * **Por qué en la base y no solo en el servicio.** RF-MOD-04 tiene prioridad
 * alta y es una regla de integridad, no de trámite: lo que protege es que el
 * expediente no pueda decir mañana que se contrató otra cosa. Una corrección a
 * mano en pgAdmin —o un módulo futuro— no pasa por el servicio, y ahí es donde
 * un cambio silencioso haría el daño que nadie vería.
 *
 * **Antes de la firma sí se puede.** Un contrato GENERADO o ACEPTADO todavía es
 * una minuta que se está acordando, y corregirle una palabra al objeto no es
 * modificar el contrato: es redactarlo. La regla empieza donde empieza el
 * contrato, que es cuando las dos partes lo firman (PERFECCIONADO).
 *
 * `IS DISTINCT FROM` y no `<>`: un UPDATE que reescriba el mismo objeto —o que
 * ni lo toque— no es un cambio y no tiene por qué fallar.
 */
CREATE OR REPLACE FUNCTION hiring.fn_objeto_contrato_inmutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.objeto IS DISTINCT FROM OLD.objeto
     AND OLD.estado NOT IN ('GENERADO', 'ACEPTADO', 'RECHAZADO') THEN
    RAISE EXCEPTION
      'El objeto del contrato no se modifica (RF-MOD-04): el contrato % ya está suscrito',
      OLD.numero
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_objeto_contrato_inmutable ON hiring.contratos;

CREATE TRIGGER tg_objeto_contrato_inmutable
  BEFORE UPDATE ON hiring.contratos
  FOR EACH ROW
  EXECUTE FUNCTION hiring.fn_objeto_contrato_inmutable();

COMMENT ON COLUMN hiring.contratos.objeto IS
  'Qué se contrató. Inmutable desde que el contrato se suscribe (RF-MOD-04): ninguna modificación contractual lo cambia.';
