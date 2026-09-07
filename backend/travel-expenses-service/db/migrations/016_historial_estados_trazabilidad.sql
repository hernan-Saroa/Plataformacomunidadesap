-- ============================================================================
-- Migration: 016_historial_estados_trazabilidad.sql
-- Created: 2026-09-04
-- Description: RF-LIQ-004 (Etapa 3 — Consolidación y cierre de expediente).
--              Tabla de historial de cambios de estado del expediente para
--              garantizar la auditabilidad exigida por Control Interno y
--              contratación pública (RF-SIS-001).
--
--              Cada transición de estado (p. ej. 'RADICADA' -> 'SOLICITADO')
--              queda registrada con el usuario que la ejecutó (Enlace de
--              Dependencia) y un comentario opcional.
--
--              NOTA DE NUMERACIÓN: el archivo 015 ya está ocupado por
--              `015_gestion_tiquetes_y_presupuesto.sql` (RF-LIQ-003/004), por
--              lo que esta migración continúa con el correlativo 016.
--
--              Idempotente: CREATE TABLE IF NOT EXISTS + CREATE INDEX
--              IF NOT EXISTS.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;

-- Historial inmutable (solo INSERT) de transiciones de estado por expediente.
-- No se definen triggers de UPDATE: la trazabilidad es append-only.
CREATE TABLE IF NOT EXISTS travel_expenses.solicitudes_historial_estados (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id  UUID         NOT NULL
                  REFERENCES travel_expenses.solicitudes_comision(id)
                  ON DELETE CASCADE,
    -- Estado previo a la transición (NULL cuando es la primera acción).
    estado_anterior VARCHAR(50),
    -- Estado posterior a la transición. Ej: 'RADICADA' -> 'SOLICITADO'.
    estado_nuevo  VARCHAR(50)  NOT NULL,
    -- ID del usuario que ejecuta la acción (Enlace de Dependencia / Analista).
    usuario_id    UUID         NOT NULL,
    -- Justificación u observación de la transición (opcional, máx. 255).
    comentarios   VARCHAR(255),
    creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para consultas de auditoría por expediente.
CREATE INDEX IF NOT EXISTS idx_historial_solicitud
    ON travel_expenses.solicitudes_historial_estados (solicitud_id);

-- Índice auxiliar para auditorías temporales (cuándo ocurrió cada transición).
CREATE INDEX IF NOT EXISTS idx_historial_creado_en
    ON travel_expenses.solicitudes_historial_estados (creado_en);

COMMENT ON TABLE travel_expenses.solicitudes_historial_estados IS
    'Auditoría append-only de transiciones de estado del expediente de comisión (RF-SIS-001 / RF-LIQ-004).';

COMMENT ON COLUMN travel_expenses.solicitudes_historial_estados.estado_nuevo IS
    'Estado posterior a la transición. Ej: SOLICITADO (la solicitud queda consolidada y en revisión del Grupo de Viáticos).';

RESET search_path;
