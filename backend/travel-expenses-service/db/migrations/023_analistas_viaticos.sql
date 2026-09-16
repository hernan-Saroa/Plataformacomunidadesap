SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 023_analistas_viaticos.sql
-- Created: 2026-09-07
-- Description: RF-REC-002 — Tabla de analistas para relacion de carga laboral
--              y operativa del modulo de viaticos.
-- ============================================================================

-- ============================================================================
-- 1. Crear tabla analistas_viaticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS travel_expenses.analistas_viaticos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    id_persona UUID,
    identificacion VARCHAR(50),
    nombre_completo VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(50),
    cargo VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_analista_usuario FOREIGN KEY (usuario_id) REFERENCES auth."user" (id_user) ON DELETE RESTRICT,
    CONSTRAINT uq_analista_usuario UNIQUE (usuario_id),
    CONSTRAINT uq_analista_identificacion UNIQUE (identificacion)
);

COMMENT ON TABLE travel_expenses.analistas_viaticos IS 'Catalogo de analistas del Grupo de Viaticos para asignacion de comisiones y calculo de carga laboral';

COMMENT ON COLUMN travel_expenses.analistas_viaticos.usuario_id IS 'Referencia al usuario del sistema (auth.user.id_user)';
COMMENT ON COLUMN travel_expenses.analistas_viaticos.id_persona IS 'Referencia a la persona en auth.personas';
COMMENT ON COLUMN travel_expenses.analistas_viaticos.identificacion IS 'Numero de identificacion del analista';
COMMENT ON COLUMN travel_expenses.analistas_viaticos.nombre_completo IS 'Nombre completo del analista';
COMMENT ON COLUMN travel_expenses.analistas_viaticos.username IS 'Usuario de acceso del analista';
COMMENT ON COLUMN travel_expenses.analistas_viaticos.activo IS 'Indica si el analista esta activo para recibir asignaciones';

-- ============================================================================
-- 2. Indices
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_analistas_viaticos_usuario_id ON travel_expenses.analistas_viaticos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_analistas_viaticos_identificacion ON travel_expenses.analistas_viaticos (identificacion);
CREATE INDEX IF NOT EXISTS idx_analistas_viaticos_activo ON travel_expenses.analistas_viaticos (activo);

-- ============================================================================
-- 3. Trigger para actualizar updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION travel_expenses.update_analistas_viaticos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_analistas_viaticos_updated_at ON travel_expenses.analistas_viaticos;

CREATE TRIGGER trg_analistas_viaticos_updated_at
    BEFORE UPDATE ON travel_expenses.analistas_viaticos
    FOR EACH ROW
    EXECUTE FUNCTION travel_expenses.update_analistas_viaticos_updated_at();
