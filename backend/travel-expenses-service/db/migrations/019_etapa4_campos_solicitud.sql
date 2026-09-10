-- ============================================================================
-- Migration: 019_etapa4_campos_solicitud.sql
-- Created: 2026-09-04
-- Description: RF-REC-001 (Etapa 4 — Revisar solicitud y definir prioridad).
--              Agrega columnas de devolución y revisión a solicitudes_comision.
-- ============================================================================

-- ============================================================================
-- 1. Alterar tabla solicitudes_comision (columnas de devolución y revisión)
-- ============================================================================

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS motivo_devolucion TEXT NULL;

ALTER TABLE travel_expenses.solicitudes_comision
    ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMP NULL;

-- ============================================================================
-- 2. Comentarios de documentación
-- ============================================================================

COMMENT ON COLUMN travel_expenses.solicitudes_comision.motivo_devolucion IS 'Motivo de la devolución del expediente por parte del secretario o analista (RF-REC-001).';
COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_revision IS 'Marca temporal de la primera revisión del expediente por parte del secretario/a (RF-REC-001).';

RESET search_path;
