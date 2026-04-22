-- Tabla de eventos PTA para notificaciones en tiempo real y trazabilidad cross-sistema
CREATE TABLE IF NOT EXISTS academic_work_plan."PtaEvento" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "ptaId"           TEXT NOT NULL,
  "docenteId"       TEXT,
  "docenteNombre"   TEXT,
  "tipo"            TEXT NOT NULL, -- cambio_estado | notificacion | respuesta_docente | escalamiento | edicion_admin | guardado
  "estadoAnterior"  TEXT,
  "estadoNuevo"     TEXT,
  "actor"           TEXT,
  "actorRol"        TEXT,
  "sistemaOrigen"   TEXT NOT NULL DEFAULT 'sistema', -- backoffice | portal | sistema
  "mensaje"         TEXT,
  "leidoBackoffice" BOOLEAN NOT NULL DEFAULT FALSE,
  "leidoPortal"     BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "PtaEvento_ptaId_fkey"
    FOREIGN KEY ("ptaId")
    REFERENCES academic_work_plan."PlanTrabajoAcademico"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_pta_evento_ptaId"       ON academic_work_plan."PtaEvento" ("ptaId");
CREATE INDEX IF NOT EXISTS "idx_pta_evento_docenteId"   ON academic_work_plan."PtaEvento" ("docenteId");
CREATE INDEX IF NOT EXISTS "idx_pta_evento_origen"      ON academic_work_plan."PtaEvento" ("sistemaOrigen");
CREATE INDEX IF NOT EXISTS "idx_pta_evento_createdAt"   ON academic_work_plan."PtaEvento" ("createdAt" DESC);
