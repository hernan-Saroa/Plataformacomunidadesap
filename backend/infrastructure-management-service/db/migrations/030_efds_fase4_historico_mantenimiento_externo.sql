-- =============================================================================
-- EFDS-Fase 4 / Migración 030 · Histórico de Mantenimientos Externos (Planner / GLPI)
-- Requerimiento #10: Carga masiva e ingesta histórica segregada
-- Ambientes: todos
-- Propósito:
--   1. Crear tabla especializada mantenimiento_historico_externo
--   2. Garantizar aislamiento total de la operación viva (mantenimiento_solicitud)
--   3. Soporte para ingesta de Mantenimientos_Infraestructura_2026.xlsx
-- =============================================================================

BEGIN;

SET search_path TO "infrastructure-management", public;

CREATE TABLE IF NOT EXISTS "infrastructure-management".mantenimiento_historico_externo (
    id_historico UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origen_sistema VARCHAR(50) NOT NULL DEFAULT 'MICROSOFT_PLANNER', -- 'MICROSOFT_PLANNER' | 'GLPI'
    id_tarea_externa VARCHAR(150) NOT NULL,                          -- Id. original o hash determinístico
    titulo_tarea TEXT NOT NULL,                                      -- Nombre de la tarea
    deposito_semana VARCHAR(150) NULL,                               -- Depósito original
    semana_normalizada VARCHAR(150) NULL,                            -- Semana normalizada
    estado_original VARCHAR(50) NULL,                                -- Estado original en texto
    estado_homologado VARCHAR(50) NOT NULL DEFAULT 'COMPLETADO',     -- COMPLETADO | EN_PROCESO | PENDIENTE
    prioridad_original VARCHAR(50) NULL,                             -- Media | Importante | Urgente | Baja
    
    -- Fechas
    fecha_creacion TIMESTAMPTZ NULL,
    fecha_inicio TIMESTAMPTZ NULL,
    fecha_vencimiento TIMESTAMPTZ NULL,
    fecha_finalizacion TIMESTAMPTZ NULL,
    
    -- Actores originales
    creado_por_texto VARCHAR(255) NULL,
    completado_por_texto VARCHAR(255) NULL,
    asignado_a_texto TEXT NULL,
    cantidad_asignados INTEGER NOT NULL DEFAULT 0,
    
    -- Homologación territorial opcional
    id_sede_homologada UUID NULL REFERENCES "infrastructure-management".sede(id_sede) ON DELETE SET NULL,
    nombre_sede_sugerida VARCHAR(150) NULL,
    categoria_sugerida VARCHAR(100) NULL,
    
    -- Auditoría de ingesta
    nombre_archivo_origen VARCHAR(255) NOT NULL,
    numero_fila_origen INTEGER NULL,
    cargado_por_usuario_id UUID NULL,
    cargado_por_nombre VARCHAR(255) NULL,
    fecha_ingesta TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    CONSTRAINT uq_historico_origen_tarea UNIQUE (origen_sistema, id_tarea_externa)
);

CREATE INDEX IF NOT EXISTS idx_hist_ext_estado 
    ON "infrastructure-management".mantenimiento_historico_externo (estado_homologado);

CREATE INDEX IF NOT EXISTS idx_hist_ext_fechas 
    ON "infrastructure-management".mantenimiento_historico_externo (fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_hist_ext_semana 
    ON "infrastructure-management".mantenimiento_historico_externo (semana_normalizada);

CREATE INDEX IF NOT EXISTS idx_hist_ext_origen 
    ON "infrastructure-management".mantenimiento_historico_externo (origen_sistema);

COMMIT;
