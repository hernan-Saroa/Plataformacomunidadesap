-- Decisions for rows sharing a document must be stored independently.
ALTER TABLE academic_work_plan."RundSoporteCampo"
  ADD COLUMN IF NOT EXISTS revisiones_campos JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Keep historical decisions in the audit trail. Do not infer individual approvals
-- from old document-wide approvals; those documents need a review of each row.
WITH reopened AS (
  UPDATE academic_work_plan."RundSoporteCampo"
  SET estado = 'Pendiente'
  WHERE tipo_soporte IN ('documento_identidad', 'cedula_extranjeria', 'pasaporte', 'contrato', 'acto_administrativo_dedicacion')
    AND estado = 'Aprobado' AND revisiones_campos = '{}'::jsonb
  RETURNING docente_id, bloque
), reopened_blocks AS (
UPDATE academic_work_plan."RundCampoEstado" b
SET estado = 'En revisión', revisado_por = NULL, fecha_revision = NULL,
    version = version + 1, "updatedAt" = NOW()
WHERE b.estado = 'Aprobado' AND EXISTS (
  SELECT 1 FROM reopened r WHERE r.docente_id::text = b.docente_id::text AND r.bloque = b.bloque
)
RETURNING b.docente_id
), summaries AS (
  SELECT docente_id, jsonb_object_agg(bloque, effective_estado) AS completitud,
    CASE WHEN bool_or(effective_estado = 'Devuelto') THEN 'DEVUELTO'
      WHEN count(*) FILTER (WHERE bloque <> 'CONTACTO' AND effective_estado = 'Aprobado') = 5 THEN 'ACTIVO_RUND'
      ELSE 'PENDIENTE_APROBACION' END AS estado
  FROM (
    SELECT b.*, CASE WHEN b.estado = 'Aprobado' AND EXISTS (
      SELECT 1 FROM reopened r WHERE r.docente_id::text = b.docente_id::text AND r.bloque = b.bloque
    ) THEN 'En revisión' ELSE b.estado END AS effective_estado
    FROM academic_work_plan."RundCampoEstado" b
  ) b
  WHERE EXISTS (SELECT 1 FROM reopened r WHERE r.docente_id::text = b.docente_id::text)
  GROUP BY docente_id
)
UPDATE academic_work_plan."Docente" d
SET "estadoAprobacion" = s.estado, completitud = s.completitud
FROM summaries s WHERE d.id::text = s.docente_id::text
  AND (d."estadoAprobacion" IS DISTINCT FROM s.estado OR d.completitud IS DISTINCT FROM s.completitud);
