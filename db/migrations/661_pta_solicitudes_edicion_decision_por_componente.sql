-- ============================================================================
-- 661: Decisión parcial por componente en solicitudes de edición PTA
-- ============================================================================
-- pta.requests.edit.manage habilita la pestaña y las acciones. Cada usuario
-- decide únicamente los componentes cubiertos por sus permisos pta.review.*;
-- ninguno de los dos permisos sustituye al otro.
-- ============================================================================

ALTER TABLE academic_work_plan."SolicitudPTA"
  ADD COLUMN IF NOT EXISTS "decisionesComponentes" JSONB NULL;

-- La bandeja filtra el arreglo JSONB por las áreas autorizadas antes de aplicar
-- su límite. Este índice evita recorrer todas las solicitudes al usar @>.
CREATE INDEX IF NOT EXISTS idx_solicitud_pta_componentes_gin
  ON academic_work_plan."SolicitudPTA"
  USING GIN (componentes jsonb_path_ops);

UPDATE academic_work_plan."SolicitudPTA" AS s
SET "decisionesComponentes" = COALESCE((
  SELECT jsonb_object_agg(
    componente,
    jsonb_build_object(
      'estado', CASE
        WHEN LOWER(COALESCE(s.estado, '')) = 'pendiente' THEN 'pendiente'
        WHEN LOWER(COALESCE(s.estado, '')) = 'denegado' THEN 'denegado'
        ELSE 'aprobado'
      END,
      'resueltoPor', s."resueltoPor",
      'motivo', s."resolucionMotivo",
      'fecha', s."resolucionFecha"
    )
  )
  FROM jsonb_array_elements_text(COALESCE(s.componentes, '[]'::jsonb)) AS componente
), '{}'::jsonb)
WHERE s."tipoSolicitud" = 'edicion_componentes'
  AND s."decisionesComponentes" IS NULL;

COMMENT ON COLUMN academic_work_plan."SolicitudPTA"."decisionesComponentes" IS
  'Estado y trazabilidad de la decisión independiente por componente solicitado.';

UPDATE auth.permission
SET description = 'Habilita la pestaña y las acciones de solicitudes de edición PTA; los componentes visibles y gestionables dependen de los permisos pta.review.* del rol.'
WHERE code = 'pta.requests.edit.manage';
