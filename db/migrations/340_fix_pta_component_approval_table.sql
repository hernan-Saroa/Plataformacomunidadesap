-- ============================================================================
-- 340: Reparar tabla academic_work_plan."PtaComponentApproval"
-- ============================================================================
-- La migración 327 creó los permisos (auth.permission pta.approve.*) pero la
-- tabla PtaComponentApproval no quedó creada en algunos entornos (el CREATE
-- TABLE falló o no se ejecutó), provocando un 500 en
-- GET /pta/api/v1/:id/componentes-aprobacion.
-- Esta migración es idempotente: crea la tabla solo si falta.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- NOTA: academic_work_plan."PlanTrabajoAcademico".id es de tipo TEXT (no UUID),
-- por eso pta_id debe ser TEXT para que el FK sea válido.
CREATE TABLE IF NOT EXISTS academic_work_plan."PtaComponentApproval" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pta_id TEXT NOT NULL REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE,
    componente VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    aprobador_id VARCHAR(100) NULL,
    aprobador_nombre VARCHAR(200) NULL,
    aprobador_rol VARCHAR(100) NULL,
    comentarios TEXT NULL,
    fecha_aprobacion TIMESTAMP NULL,
    scope VARCHAR(50) NULL,
    scope_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pta_componente UNIQUE (pta_id, componente)
);

CREATE INDEX IF NOT EXISTS idx_pta_component_approval_pta
  ON academic_work_plan."PtaComponentApproval"(pta_id);
