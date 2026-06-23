-- ════════════════════════════════════════════════════════════════════════════
-- Migración: Tabla seguimiento_plan
-- RF-SG-09 / US-020: Seguimiento periódico (trimestral / semestral)
-- RF-SG-10: Informe de seguimiento
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tabla de seguimientos periódicos ──
CREATE TABLE IF NOT EXISTS control_interno.seguimiento_plan (
    id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id                   UUID NOT NULL,
    periodicidad              VARCHAR(20) NOT NULL DEFAULT 'TRIMESTRAL',  -- TRIMESTRAL | SEMESTRAL
    tipo_control              VARCHAR(20) NOT NULL DEFAULT 'INTERNO',     -- INTERNO | ENTE_EXTERNO
    fecha_corte               TIMESTAMP NOT NULL,
    responsable_id            VARCHAR(255) NOT NULL,
    responsable_nombre        VARCHAR(255),
    resumen                   TEXT,
    informe_ref               VARCHAR(500),          -- Referencia al informe de ley generado
    total_acciones_evaluadas  INT DEFAULT 0,
    acciones_cumplen          INT DEFAULT 0,
    acciones_parcial          INT DEFAULT 0,
    acciones_no_cumplen       INT DEFAULT 0,
    alertas_generadas         INT DEFAULT 0,
    automatico                BOOLEAN DEFAULT FALSE, -- TRUE = generado por job
    created_at                TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda por plan
CREATE INDEX IF NOT EXISTS idx_seguimiento_plan_plan_id
    ON control_interno.seguimiento_plan (plan_id);

-- Índice para búsqueda por fecha de corte
CREATE INDEX IF NOT EXISTS idx_seguimiento_plan_fecha_corte
    ON control_interno.seguimiento_plan (fecha_corte);

-- ── Agregar campo 'descripcion' a alerta_plan si no existe ──
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno'
          AND table_name = 'alerta_plan'
          AND column_name = 'descripcion'
    ) THEN
        ALTER TABLE control_interno.alerta_plan
            ADD COLUMN descripcion TEXT;
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Permisos RBAC para seguimiento periódico 
-- (complementa los permisos del DDL anterior)
-- ════════════════════════════════════════════════════════════════════════════

-- Permiso: generar seguimientos periódicos
INSERT INTO auth.permissions (name, description, module, created_at, updated_at)
VALUES ('seguimiento-periodico', 'Generar seguimientos periódicos de planes de mejoramiento', 'control-interno', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Asignar a AUDITOR y JEFE_OCI
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('AUDITOR', 'JEFE_OCI', 'SUPER_ADMIN')
  AND p.name = 'seguimiento-periodico'
  AND NOT EXISTS (
    SELECT 1 FROM auth.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
