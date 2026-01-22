-- Migración: Crear tablas de pagos e historial para procesos coactivos
-- Fecha: 2026-01-21

SET search_path TO legal_management, public;

-- 1. Tabla de Pagos
CREATE TABLE IF NOT EXISTS legal_management.pagos_coactivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proceso_id UUID NOT NULL REFERENCES legal_management.procesos_coactivos(id),
    valor NUMERIC(15, 2) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT NOW(),
    soporte_url TEXT,
    origen VARCHAR(50) DEFAULT 'MANUAL', -- BANCO, MANUAL, etc.
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de Historial (Auditoría)
CREATE TABLE IF NOT EXISTS legal_management.coactivos_historial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proceso_id UUID NOT NULL REFERENCES legal_management.procesos_coactivos(id),
    tipo_evento VARCHAR(50) NOT NULL, -- CREACION, PAGO, CAMBIO_ETAPA, ACTUALIZACION
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario VARCHAR(100), -- ID o Nombre del usuario responsable
    detalles TEXT,
    fecha_evento TIMESTAMP DEFAULT NOW()
);

-- 3. Columnas cacheadas en procesos_coactivos para rendimiento
ALTER TABLE legal_management.procesos_coactivos 
ADD COLUMN IF NOT EXISTS valor_pagado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(15, 2) DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagos_coactivos_proceso ON legal_management.pagos_coactivos(proceso_id);
CREATE INDEX IF NOT EXISTS idx_coactivos_historial_proceso ON legal_management.coactivos_historial(proceso_id);
