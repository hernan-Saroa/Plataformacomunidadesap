-- ============================================================================
-- Migration: 004_create_audit_triggers.sql
-- Description: Triggers para actualizar actualizado_en automaticamente
--              en tablas travel_expenses
-- ============================================================================

CREATE OR REPLACE FUNCTION travel_expenses.update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comisionados_actualizado_en ON travel_expenses.comisionados;
CREATE TRIGGER trg_comisionados_actualizado_en
    BEFORE UPDATE ON travel_expenses.comisionados
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

DROP TRIGGER IF EXISTS trg_solicitudes_comision_actualizado_en ON travel_expenses.solicitudes_comision;
CREATE TRIGGER trg_solicitudes_comision_actualizado_en
    BEFORE UPDATE ON travel_expenses.solicitudes_comision
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();
