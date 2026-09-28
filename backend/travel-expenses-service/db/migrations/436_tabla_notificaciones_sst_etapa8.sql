SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 436_tabla_notificaciones_sst_etapa8.sql
-- Historia de Usuario: [RF-PAG-002] Etapa 8 - Notificar automáticamente a SST
-- Descripción: Bandera notificado_sst en solicitudes_comision y delegación
--              de notificaciones in-app a la bandeja central (notifications.notificacion).
-- ============================================================================

-- 1. Agregar bandera de estado en la tabla solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS notificado_sst BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Eliminar tabla local redundante de logs SST si existía (las notificaciones
--    in-app residen en el esquema central 'notifications.notificacion' y la
--    traza del expediente en 'travel_expenses.solicitudes_historial_estados')
DROP TABLE IF EXISTS travel_expenses.notificaciones_sst_log CASCADE;
