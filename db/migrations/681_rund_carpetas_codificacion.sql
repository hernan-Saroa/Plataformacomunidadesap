-- RUND-002: carpetas de la codificación documental (02, 03, 05 a 09), cada una con su propia aprobación.
-- Aditiva e idempotente. No cambia los bloques obligatorios ni los estados existentes.
-- Prerrequisitos: 333 (RundCampoEstado, RundSoporteCampo) y 422 (RundDocumentoPerfil).
BEGIN;

-- 1) Crea la fila de estado de cada carpeta nueva para los docentes que ya tienen expediente.
INSERT INTO academic_work_plan."RundCampoEstado"
  (id, docente_id, bloque, estado, version, soporte_ids, "createdAt", "updatedAt")
SELECT gen_random_uuid(), d.docente_id, b.bloque, 'Soporte faltante', 1, '[]', NOW(), NOW()
FROM (SELECT DISTINCT docente_id FROM academic_work_plan."RundCampoEstado") d
CROSS JOIN (VALUES
  ('EXPERIENCIA_DOCENTE'), ('EXPERIENCIA_LABORAL'), ('PRODUCTIVIDAD_ACADEMICA'),
  ('SEGUNDA_LENGUA'), ('FORMACION_NO_FORMAL'), ('ESTUDIO_HOJA_VIDA'), ('DOCUMENTOS_NO_VALIDOS')
) AS b(bloque)
WHERE NOT EXISTS (
  SELECT 1 FROM academic_work_plan."RundCampoEstado" e
  WHERE e.docente_id = d.docente_id AND e.bloque = b.bloque
);

-- 2) Reubica los soportes que se cargaron en "Académico" y ahora tienen su propia carpeta.
--    experiencia_investigativa se queda en ACADEMICO (carpeta 04).
UPDATE academic_work_plan."RundSoporteCampo"
SET bloque = CASE tipo_soporte
  WHEN 'experiencia_docente' THEN 'EXPERIENCIA_DOCENTE'
  WHEN 'experiencia_laboral' THEN 'EXPERIENCIA_LABORAL'
  WHEN 'productividad_academica' THEN 'PRODUCTIVIDAD_ACADEMICA'
  WHEN 'dominio_segunda_lengua' THEN 'SEGUNDA_LENGUA'
  WHEN 'formacion_no_formal' THEN 'FORMACION_NO_FORMAL'
  WHEN 'estudio_hoja_vida' THEN 'ESTUDIO_HOJA_VIDA'
END
WHERE bloque = 'ACADEMICO'
  AND tipo_soporte IN ('experiencia_docente', 'experiencia_laboral', 'productividad_academica',
                       'dominio_segunda_lengua', 'formacion_no_formal', 'estudio_hoja_vida');

UPDATE academic_work_plan."RundDocumentoPerfil"
SET bloque = CASE tipo_soporte
  WHEN 'experiencia_docente' THEN 'EXPERIENCIA_DOCENTE'
  WHEN 'experiencia_laboral' THEN 'EXPERIENCIA_LABORAL'
  WHEN 'productividad_academica' THEN 'PRODUCTIVIDAD_ACADEMICA'
  WHEN 'dominio_segunda_lengua' THEN 'SEGUNDA_LENGUA'
  WHEN 'formacion_no_formal' THEN 'FORMACION_NO_FORMAL'
  WHEN 'estudio_hoja_vida' THEN 'ESTUDIO_HOJA_VIDA'
END
WHERE bloque = 'ACADEMICO'
  AND tipo_soporte IN ('experiencia_docente', 'experiencia_laboral', 'productividad_academica',
                       'dominio_segunda_lengua', 'formacion_no_formal', 'estudio_hoja_vida');

COMMIT;
