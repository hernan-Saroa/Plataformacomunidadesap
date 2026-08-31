-- ============================================================================
-- 047 · El objeto del contrato no se modifica
--
-- EFDS-1179: ninguna modificación contractual puede alterar el objeto. La
-- prórroga mueve el plazo, la adición el valor, la cesión quién ejecuta; el
-- objeto es lo único que ninguna toca —cambiarlo sería otro contrato—.
--
-- Se impide con trigger y no solo en el servicio: la tabla de modificaciones
-- ni siquiera tiene columna de objeto, pero un UPDATE directo a contratos
-- podría cambiarlo por debajo. Mientras la minuta está en GENERADO todavía se
-- corrige; aceptada por el proponente, queda en firme.
-- ============================================================================

CREATE OR REPLACE FUNCTION hiring.contrato_objeto_inmutable()
RETURNS trigger AS $$
BEGIN
  IF NEW.objeto IS DISTINCT FROM OLD.objeto AND OLD.estado <> 'GENERADO' THEN
    RAISE EXCEPTION 'El objeto del contrato % no se puede modificar: cambiarlo seria otro contrato (EFDS-1179)', OLD.numero;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contrato_objeto_inmutable ON hiring.contratos;
CREATE TRIGGER trg_contrato_objeto_inmutable
  BEFORE UPDATE ON hiring.contratos
  FOR EACH ROW
  EXECUTE FUNCTION hiring.contrato_objeto_inmutable();
