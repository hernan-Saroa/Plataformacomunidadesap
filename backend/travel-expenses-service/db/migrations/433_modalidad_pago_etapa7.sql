SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 433_modalidad_pago_y_dias_habiles_etapa7.sql
-- Historia de Usuario: [RF-PRE-003] Etapa 7 - Determinar modalidad de pago (AVANCE vs. RECONOCIMIENTO POSTERIOR)
-- Nota: La gestión de festivos nacionales fue centralizada en auth.festivos_colombia
--       como catálogo maestro transversal.
-- ============================================================================

-- 1. Agregar campos de modalidad de pago en la tabla solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS modalidad_pago VARCHAR(50) DEFAULT 'AVANCE' NOT NULL, -- 'AVANCE' o 'RECONOCIMIENTO_POSTERIOR'
ADD COLUMN IF NOT EXISTS dias_habiles_previos INT DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS fecha_calculo_modalidad TIMESTAMP NULL;

-- 2. Índices de desempeño para búsquedas y filtros en Tesorería (Etapa 8)
CREATE INDEX IF NOT EXISTS idx_solicitudes_modalidad_pago ON travel_expenses.solicitudes_comision (modalidad_pago);
CREATE INDEX IF NOT EXISTS idx_solicitudes_dias_habiles_previos ON travel_expenses.solicitudes_comision (dias_habiles_previos);
