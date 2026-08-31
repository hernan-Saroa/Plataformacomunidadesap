-- ============================================================================
-- 004_audit_triggers.sql
-- Description: Triggers para actualizar actualizado_en automáticamente
--              en tablas de travel_expenses. Idempotente.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;

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

DROP TRIGGER IF EXISTS trg_config_campos_formulario_actualizado_en ON travel_expenses.config_campos_formulario;
CREATE TRIGGER trg_config_campos_formulario_actualizado_en
    BEFORE UPDATE ON travel_expenses.config_campos_formulario
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

DROP TRIGGER IF EXISTS trg_config_tipo_comisionado_actualizado_en ON travel_expenses.config_tipo_comisionado;
CREATE TRIGGER trg_config_tipo_comisionado_actualizado_en
    BEFORE UPDATE ON travel_expenses.config_tipo_comisionado
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

DROP TRIGGER IF EXISTS trg_tipos_documento_soporte_actualizado_en ON travel_expenses.tipos_documento_soporte;
CREATE TRIGGER trg_tipos_documento_soporte_actualizado_en
    BEFORE UPDATE ON travel_expenses.tipos_documento_soporte
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

DROP TRIGGER IF EXISTS trg_config_tipo_comisionado_documentos_actualizado_en ON travel_expenses.config_tipo_comisionado_documentos;
CREATE TRIGGER trg_config_tipo_comisionado_documentos_actualizado_en
    BEFORE UPDATE ON travel_expenses.config_tipo_comisionado_documentos
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();