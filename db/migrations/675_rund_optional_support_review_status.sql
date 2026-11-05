-- Un soporte opcional devuelto no implica que el revisor haya rechazado datos.
-- Normalización conservadora: nunca toca bloques con una devolución explícita
-- de datos o del bloque, ni modifica archivos, decisiones o auditorías anteriores.
WITH candidatos AS MATERIALIZED (
  SELECT b.id, b.docente_id, b.bloque, b.estado, b.observacion, b.version
  FROM academic_work_plan."RundCampoEstado" b
  JOIN academic_work_plan."Docente" d ON d.id::text=b.docente_id::text
  WHERE b.estado='Devuelto' AND COALESCE(d."eliminadoRund",false)=false
    AND (SELECT l.accion FROM academic_work_plan."RundAprobacionLog" l
      WHERE l.docente_id::text=b.docente_id::text AND l.bloque=b.bloque
      ORDER BY l."createdAt" DESC,l.id DESC LIMIT 1)='DEVOLVER_SOPORTE'
    AND NOT EXISTS (SELECT 1 FROM academic_work_plan."RundAprobacionLog" l
      WHERE l.docente_id::text=b.docente_id::text AND l.bloque=b.bloque AND l.accion IN ('DEVOLVER_DATO','DEVOLVER'))
  FOR UPDATE OF b,d
), actualizados AS (
  UPDATE academic_work_plan."RundCampoEstado" b
  SET estado='En revisión', observacion=NULL, version=b.version+1, "updatedAt"=now()
  FROM candidatos c WHERE b.id=c.id
  RETURNING b.id,b.docente_id,b.bloque
), auditoria AS (
  INSERT INTO academic_work_plan."RundAprobacionLog"
    (id,docente_id,bloque,accion,actor_id,canal_origen,observacion,metadata,"createdAt")
  SELECT gen_random_uuid(),c.docente_id::uuid,c.bloque,'NORMALIZAR_ESTADO_SOPORTE_OPCIONAL','SISTEMA','RUND_DOCUMENTAL',
    'El rechazo de un archivo opcional se conserva en el soporte y no devuelve los datos del perfil.',
    jsonb_build_object('migracion',675,'estadoAnterior',c.estado,'estadoNuevo','En revisión',
      'observacionAnterior',c.observacion,'versionAnterior',c.version),now()
  FROM candidatos c JOIN actualizados a ON a.id=c.id
), perfiles AS (
  SELECT DISTINCT docente_id FROM actualizados
), resumen AS (
  -- Los CTE de escritura comparten snapshot: superponer los estados actualizados.
  SELECT b.docente_id,jsonb_object_agg(b.bloque,CASE WHEN a.id IS NOT NULL THEN 'En revisión' ELSE b.estado END) AS completitud
  FROM academic_work_plan."RundCampoEstado" b
  JOIN perfiles p ON p.docente_id::text=b.docente_id::text
  LEFT JOIN actualizados a ON a.id=b.id
  GROUP BY b.docente_id
)
UPDATE academic_work_plan."Docente" d
SET completitud=r.completitud,"estadoAprobacion"=CASE
  WHEN EXISTS (SELECT 1 FROM jsonb_each_text(r.completitud) item
    WHERE item.key IN ('IDENTIDAD','CONTACTO','FORMACION','VINCULACION','ACADEMICO','TRANSVERSAL') AND item.value='Devuelto') THEN 'DEVUELTO'
  WHEN r.completitud @> '{"IDENTIDAD":"Aprobado","FORMACION":"Aprobado","VINCULACION":"Aprobado","ACADEMICO":"Aprobado","TRANSVERSAL":"Aprobado"}'::jsonb THEN 'ACTIVO_RUND'
  ELSE 'PENDIENTE_APROBACION' END
FROM resumen r WHERE d.id::text=r.docente_id::text;
