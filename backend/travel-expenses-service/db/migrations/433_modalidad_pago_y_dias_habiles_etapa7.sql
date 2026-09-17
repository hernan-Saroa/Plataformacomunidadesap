SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 433_modalidad_pago_y_dias_habiles_etapa7.sql
-- Historia de Usuario: [RF-PRE-003] Etapa 7 - Determinar modalidad de pago (AVANCE vs. RECONOCIMIENTO POSTERIOR)
-- ============================================================================

-- 1. Agregar campos de modalidad de pago en la tabla solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS modalidad_pago VARCHAR(50) DEFAULT 'AVANCE' NOT NULL, -- 'AVANCE' o 'RECONOCIMIENTO_POSTERIOR'
ADD COLUMN IF NOT EXISTS dias_habiles_previos INT DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS fecha_calculo_modalidad TIMESTAMP NULL;

-- 2. Tabla de festivos nacionales de Colombia para cómputo de días hábiles
CREATE TABLE IF NOT EXISTS travel_expenses.festivos_colombia (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexar fecha para acelerar el cálculo del calendario
CREATE INDEX IF NOT EXISTS idx_festivos_fecha ON travel_expenses.festivos_colombia(fecha);

-- Semillar festivos nacionales de Colombia para la vigencia 2026
INSERT INTO travel_expenses.festivos_colombia (fecha, descripcion)
VALUES
    ('2026-01-01', 'Año Nuevo'),
    ('2026-01-12', 'Día de los Reyes Magos'),
    ('2026-03-23', 'Día de San José'),
    ('2026-04-02', 'Jueves Santo'),
    ('2026-04-03', 'Viernes Santo'),
    ('2026-05-01', 'Día del Trabajo'),
    ('2026-05-18', 'Ascensión del Señor'),
    ('2026-06-08', 'Corpus Christi'),
    ('2026-06-15', 'Sagrado Corazón'),
    ('2026-06-29', 'San Pedro y San Pablo'),
    ('2026-07-20', 'Día de la Independencia'),
    ('2026-08-07', 'Batalla de Boyacá'),
    ('2026-08-17', 'La Asunción de la Virgen'),
    ('2026-10-12', 'Día de la Raza'),
    ('2026-11-02', 'Día de todos los Santos'),
    ('2026-11-16', 'Independencia de Cartagena'),
    ('2026-12-08', 'Inmaculada Concepción'),
    ('2026-12-25', 'Navidad')
ON CONFLICT (fecha) DO NOTHING;

-- 3. Índices de desempeño para búsquedas y filtros en Tesorería (Etapa 8)
CREATE INDEX IF NOT EXISTS idx_solicitudes_modalidad_pago ON travel_expenses.solicitudes_comision (modalidad_pago);
CREATE INDEX IF NOT EXISTS idx_solicitudes_dias_habiles_previos ON travel_expenses.solicitudes_comision (dias_habiles_previos);
