-- ============================================================
-- Migration 417: Macro Docente (REQ-RUND-F020/F022) — acceso
-- externo temporal controlado y bitácora de consultas.
--
-- El historial de asignaturas dictadas por docente (Macro Docente)
-- se calcula en caliente a partir de PlanTrabajoAcademico
-- (datosEstructurados.asignaturas), que ya tiene índices en
-- ("docenteId", periodo) y (estado, periodo) — ver migración 190.
-- Esta migración solo agrega lo que no existía: el registro de
-- accesos temporales de entes externos y la bitácora de consultas.
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_work_plan."RundAccesoExterno" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ente_nombre TEXT NOT NULL,
  ente_contacto TEXT,
  token TEXT UNIQUE NOT NULL,
  -- Cada acceso externo se limita siempre a UN docente puntual (F022: "qué
  -- dictó el docente X en el período Y"); si un ente necesita ver varios
  -- docentes, se le otorgan varios accesos.
  docente_id TEXT NOT NULL,
  motivo TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  otorgado_por TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rund_acceso_externo_vigencia CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_rund_acceso_externo_token
  ON academic_work_plan."RundAccesoExterno" (token);

CREATE INDEX IF NOT EXISTS idx_rund_acceso_externo_vigencia
  ON academic_work_plan."RundAccesoExterno" (activo, fecha_fin);

CREATE TABLE IF NOT EXISTS academic_work_plan."RundMacroDocenteConsultaLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_consulta TEXT NOT NULL, -- MACRO_DOCENTE | CONSULTA_PUNTUAL | EXTERNA
  actor_id TEXT NOT NULL,
  roles TEXT[],
  acceso_externo_id UUID REFERENCES academic_work_plan."RundAccesoExterno"(id),
  docente_id TEXT,
  periodo TEXT,
  filtros JSONB,
  total_resultados INTEGER,
  ip TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_macro_docente_log_fecha
  ON academic_work_plan."RundMacroDocenteConsultaLog" ("createdAt");

CREATE INDEX IF NOT EXISTS idx_rund_macro_docente_log_docente
  ON academic_work_plan."RundMacroDocenteConsultaLog" (docente_id);

CREATE INDEX IF NOT EXISTS idx_rund_macro_docente_log_acceso_externo
  ON academic_work_plan."RundMacroDocenteConsultaLog" (acceso_externo_id);
