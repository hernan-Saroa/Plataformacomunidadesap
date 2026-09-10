-- Información reportada: independiente de la asignación operativa a PTA.
ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "territorialReportada" TEXT,
  ADD COLUMN IF NOT EXISTS "datosCargaMasiva" JSONB;

COMMENT ON COLUMN academic_work_plan."Docente"."territorialReportada" IS
  'Nombre informativo reportado en RUND; no concede acceso ni asigna una territorial PTA.';
COMMENT ON COLUMN academic_work_plan."Docente"."datosCargaMasiva" IS
  'Valores originales de las 38 columnas RUND de la última carga; protegidos por RBAC al consultar.';
