SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 434_crear_obligacion_siif_etapa8.sql (Modelo de Datos)
-- Historia de Usuario: [RF-PAG-001] Etapa 8 - Crear obligación en SIIF Nación según modalidad de pago
-- Rol: Analista de Viáticos
-- Estado anterior: COMPROMETIDA
-- Estado nuevo: OBLIGADA (Lista para desembolso por Tesorería)
-- Descripción: Campos, restricciones foráneas e índices para la Obligación SIIF
-- ============================================================================

-- 1. Agregar campos de la Obligación en solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS numero_obligacion VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS fecha_obligacion DATE NULL,
ADD COLUMN IF NOT EXISTS valor_obligacion NUMERIC(12, 2) NULL,
ADD COLUMN IF NOT EXISTS observaciones_obligacion TEXT NULL,
ADD COLUMN IF NOT EXISTS soporte_obligacion_path VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS obligado_por_id UUID NULL,
ADD COLUMN IF NOT EXISTS fecha_registro_obligacion TIMESTAMP WITH TIME ZONE NULL;

-- 2. Claves foráneas idempotentes para obligado_por_id (compatibles con auth."user" y usuarios)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_solicitudes_obligado_por_usuarios'
              AND connamespace = 'travel_expenses'::regnamespace
        ) THEN
            ALTER TABLE travel_expenses.solicitudes_comision
              ADD CONSTRAINT fk_solicitudes_obligado_por_usuarios
              FOREIGN KEY (obligado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL;
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'user') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_solicitudes_obligado_por_auth_user'
              AND connamespace = 'travel_expenses'::regnamespace
        ) THEN
            ALTER TABLE travel_expenses.solicitudes_comision
              ADD CONSTRAINT fk_solicitudes_obligado_por_auth_user
              FOREIGN KEY (obligado_por_id) REFERENCES auth."user" (id_user) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 3. Índices de desempeño
CREATE INDEX IF NOT EXISTS idx_solicitudes_numero_obligacion ON travel_expenses.solicitudes_comision (numero_obligacion);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado_obligada ON travel_expenses.solicitudes_comision (estado_solicitud);
