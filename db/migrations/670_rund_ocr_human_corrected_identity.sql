-- The document number remains immutable outside a locked, current OCR suggestion.
-- A human correction preserves the OCR value and uses a transaction-local value.
CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_document_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  suggestion_id text := current_setting('app.rund_ocr_suggestion_id', true);
  confirmed_number text := current_setting('app.rund_ocr_confirmed_document_number', true);
  authorized_ocr_correction boolean := false;
BEGIN
  IF suggestion_id IS NOT NULL AND suggestion_id <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM academic_work_plan."RundExtraccionSugerencia" s
      JOIN academic_work_plan."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
      JOIN academic_work_plan."RundDocumentoPerfil" doc ON doc.id = j.documento_id
      JOIN academic_work_plan."Docente" d ON d.id::text = j.docente_id::text
      WHERE s.id::text = suggestion_id AND s.estado = 'PENDIENTE' AND s.campo = 'documentNumber'
        AND j.estado = 'COMPLETADO' AND doc.estado = 'ACTIVO' AND d."personaId" = OLD.id_person
        AND regexp_replace(upper(btrim(coalesce(nullif(confirmed_number, ''), s.valor))), '[^A-Z0-9]', '', 'g') =
            regexp_replace(upper(btrim(NEW.num_identificacion::text)), '[^A-Z0-9]', '', 'g')
    ) INTO authorized_ocr_correction;
  END IF;
  IF OLD.num_identificacion IS NOT NULL AND btrim(OLD.num_identificacion::text) <> ''
    AND upper(regexp_replace(btrim(NEW.num_identificacion::text), '\.', '', 'g')) IS DISTINCT FROM
        upper(regexp_replace(btrim(OLD.num_identificacion::text), '\.', '', 'g'))
    AND EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = OLD.id_person)
    AND NOT authorized_ocr_correction THEN
    RAISE EXCEPTION 'REQ-RUND-F001: la cédula de un perfil docente no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$;
