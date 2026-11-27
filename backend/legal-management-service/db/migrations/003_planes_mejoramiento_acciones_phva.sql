-- Bug 2418: Planes de Mejoramiento - Ciclo PHVA, peso porcentual automático,
-- estado de ejecución de acciones y campos para exportación individual.
-- Idempotente y ubicada dentro del microservicio legal-management-service.

ALTER TABLE legal_management.planes_hallazgos
    ADD COLUMN IF NOT EXISTS fase_phva VARCHAR(20) NOT NULL DEFAULT 'PLANEAR',
    ADD COLUMN IF NOT EXISTS peso_porcentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    ADD COLUMN IF NOT EXISTS responsable VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fecha_limite DATE,
    ADD COLUMN IF NOT EXISTS fecha_ejecucion TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'planes_hallazgos_fase_phva_check'
          AND conrelid = 'legal_management.planes_hallazgos'::regclass
    ) THEN
        ALTER TABLE legal_management.planes_hallazgos
            ADD CONSTRAINT planes_hallazgos_fase_phva_check
            CHECK (fase_phva IN ('PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'planes_hallazgos_peso_porcentual_check'
          AND conrelid = 'legal_management.planes_hallazgos'::regclass
    ) THEN
        ALTER TABLE legal_management.planes_hallazgos
            ADD CONSTRAINT planes_hallazgos_peso_porcentual_check
            CHECK (peso_porcentual >= 0 AND peso_porcentual <= 100);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'planes_hallazgos_estado_check'
          AND conrelid = 'legal_management.planes_hallazgos'::regclass
    ) THEN
        ALTER TABLE legal_management.planes_hallazgos
            ADD CONSTRAINT planes_hallazgos_estado_check
            CHECK (estado IN ('PENDIENTE', 'EJECUTADA'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_planes_hallazgos_fase_phva
    ON legal_management.planes_hallazgos (plan_id, fase_phva);

-- Compatibilidad con registros legados que ya tenían porcentaje_avance = 100
UPDATE legal_management.planes_hallazgos
SET estado = 'EJECUTADA',
    fecha_ejecucion = COALESCE(fecha_ejecucion, updated_at, now())
WHERE porcentaje_avance >= 100
  AND estado = 'PENDIENTE';
