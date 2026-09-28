SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 438_procesar_pago_desembolso_etapa8.sql (Modelo de Datos)
-- Historia de Usuario: [RF-PAG-003] Etapa 8 - Procesar desembolso y pago de comisión
-- Rol: Tesorería / Pagador
-- Estado anterior: OBLIGADA
-- Estado nuevo: PAGADA (Comisión desembolsada formalmente al comisionado)
-- Descripción: Columnas, restricciones foráneas e índices para el desembolso y pago
-- ============================================================================

-- 1. Agregar campos del Pago y Desembolso en solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS fecha_pago DATE NULL,
ADD COLUMN IF NOT EXISTS valor_pagado NUMERIC(12, 2) NULL,
ADD COLUMN IF NOT EXISTS soporte_pago_path VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS numero_orden_pago VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS observaciones_pago TEXT NULL,
ADD COLUMN IF NOT EXISTS pagado_por_id UUID NULL,
ADD COLUMN IF NOT EXISTS fecha_registro_pago TIMESTAMP WITH TIME ZONE NULL;

-- 2. Claves foráneas idempotentes para pagado_por_id (compatibles con auth."user" y usuarios)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_solicitudes_pagado_por_usuarios'
              AND connamespace = 'travel_expenses'::regnamespace
        ) THEN
            ALTER TABLE travel_expenses.solicitudes_comision
              ADD CONSTRAINT fk_solicitudes_pagado_por_usuarios
              FOREIGN KEY (pagado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL;
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'user') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_solicitudes_pagado_por_auth_user'
              AND connamespace = 'travel_expenses'::regnamespace
        ) THEN
            ALTER TABLE travel_expenses.solicitudes_comision
              ADD CONSTRAINT fk_solicitudes_pagado_por_auth_user
              FOREIGN KEY (pagado_por_id) REFERENCES auth."user" (id_user) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 3. Índices de desempeño para búsquedas por orden de pago y estado
CREATE INDEX IF NOT EXISTS idx_solicitudes_numero_orden_pago ON travel_expenses.solicitudes_comision (numero_orden_pago);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado_pagada ON travel_expenses.solicitudes_comision (estado_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_pago ON travel_expenses.solicitudes_comision (fecha_pago);
