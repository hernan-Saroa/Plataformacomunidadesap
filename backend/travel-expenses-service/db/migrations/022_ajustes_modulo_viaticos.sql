SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 022_ajustes_modulo_viaticos.sql
-- Created: 2026-09-07
-- Description: RF-REC-002 — Asignar comision a analista con tablero de carga.
--              Agrega columna analista_asignado_id y crea parametro LIMITE_CARGA_SATURACION.
-- ============================================================================

-- ============================================================================
-- 1. Alterar travel_expenses.solicitudes_comision: agregar analista_asignado_id
-- ============================================================================

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS analista_asignado_id UUID;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.analista_asignado_id IS 'ID del usuario analista asignado para resolver la comision (auth.user.id_user)';

-- ============================================================================
-- 2. Parametro Global de Carga: LIMITE_CARGA_SATURACION = 12
-- ============================================================================

CREATE TABLE IF NOT EXISTS travel_expenses.parametros_globales (
    clave VARCHAR(100) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'number',
    descripcion TEXT,
    editable BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE travel_expenses.parametros_globales IS 'Parametros globales configurables del modulo de viaticos y comisiones';

INSERT INTO travel_expenses.parametros_globales (clave, valor, tipo, descripcion, editable)
VALUES (
    'LIMITE_CARGA_SATURACION',
    '12',
    'number',
    'Puntaje maximo de carga laboral antes de considerar al analista en estado de saturacion (semaforo rojo).',
    true
)
ON CONFLICT (clave) DO UPDATE SET
    valor = EXCLUDED.valor,
    tipo = EXCLUDED.tipo,
    descripcion = EXCLUDED.descripcion,
    actualizado_en = NOW();
