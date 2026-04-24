-- Migración: tabla AprobacionJefatura para flujo multi-territorial de PTAs
-- Cada fila representa la aprobación requerida de una jefatura territorial
-- cuando el docente tiene asignaturas en varias territoriales.
--
-- decision: pendiente | aprobado | aprobado_con_cambios | devuelto

CREATE TABLE IF NOT EXISTS academic_work_plan."AprobacionJefatura" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "ptaId"                 TEXT NOT NULL,
  "jefaturaUserId"        TEXT NOT NULL DEFAULT '',
  "jefaturaRol"           TEXT NOT NULL DEFAULT 'Jefatura de Zona',
  "territorialId"         TEXT NOT NULL,
  "territorialNombre"     TEXT,
  "decision"              TEXT NOT NULL DEFAULT 'pendiente',
  "comentarios"           TEXT,
  "camposModificados"     JSONB,
  "componentesBloqueados" JSONB,
  "firmaId"               TEXT,
  "createdAt"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "AprobacionJefatura_ptaId_territorialId_key"
    UNIQUE ("ptaId", "territorialId"),

  CONSTRAINT "AprobacionJefatura_ptaId_fkey"
    FOREIGN KEY ("ptaId")
    REFERENCES academic_work_plan."PlanTrabajoAcademico"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_aprobacion_jefatura_ptaId"
  ON academic_work_plan."AprobacionJefatura" ("ptaId");

CREATE INDEX IF NOT EXISTS "idx_aprobacion_jefatura_jefaturaUserId"
  ON academic_work_plan."AprobacionJefatura" ("jefaturaUserId");
