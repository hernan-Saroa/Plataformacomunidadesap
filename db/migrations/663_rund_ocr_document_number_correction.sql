-- Permite corregir la llave natural únicamente al confirmar una sugerencia OCR
-- pendiente, vinculada al mismo perfil y a un documento vigente. El CRUD manual
-- continúa sin poder modificar la cédula (REQ-RUND-F001).

CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_document_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  suggestion_id TEXT := current_setting('app.rund_ocr_suggestion_id', TRUE);
  authorized_ocr_correction BOOLEAN := FALSE;
BEGIN
  IF suggestion_id IS NOT NULL AND suggestion_id <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM academic_work_plan."RundExtraccionSugerencia" s
      JOIN academic_work_plan."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
      JOIN academic_work_plan."RundDocumentoPerfil" doc ON doc.id = j.documento_id
      JOIN academic_work_plan."Docente" d ON d.id::text = j.docente_id::text
      WHERE s.id::text = suggestion_id
        AND s.estado = 'PENDIENTE'
        AND s.campo = 'documentNumber'
        AND j.estado = 'COMPLETADO'
        AND doc.estado = 'ACTIVO'
        AND d."personaId" = OLD.id_person
        AND regexp_replace(UPPER(BTRIM(s.valor)), '[^A-Z0-9]', '', 'g') =
            regexp_replace(UPPER(BTRIM(NEW.num_identificacion::text)), '[^A-Z0-9]', '', 'g')
    ) INTO authorized_ocr_correction;
  END IF;

  -- Los registros históricos sin documento pueden regularizarse una sola vez.
  -- Después, solo una confirmación OCR humana, vigente y auditada puede corregirlo.
  IF OLD.num_identificacion IS NOT NULL
     AND BTRIM(OLD.num_identificacion::text) <> ''
     AND UPPER(regexp_replace(BTRIM(NEW.num_identificacion::text), '\.', '', 'g'))
       IS DISTINCT FROM
     UPPER(regexp_replace(BTRIM(OLD.num_identificacion::text), '\.', '', 'g'))
     AND EXISTS (
       SELECT 1
       FROM academic_work_plan."Docente" d
       WHERE d."personaId" = OLD.id_person
     )
     AND NOT authorized_ocr_correction THEN
    RAISE EXCEPTION 'REQ-RUND-F001: la cédula de un perfil docente no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION academic_work_plan.prevent_rund_document_change() IS
  'REQ-RUND-F001: bloquea cambios de cédula salvo una sugerencia OCR pendiente, vigente y vinculada a la misma persona.';
