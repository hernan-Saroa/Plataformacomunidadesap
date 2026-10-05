-- REQ-RUND-F012: ampliación aditiva del catálogo. No mueve ni reclasifica archivos.
-- Prerrequisito: 422_create_rund_documentos_perfil.sql.
BEGIN;
INSERT INTO academic_work_plan."RundDocumentoCategoria"
  (codigo, nombre, descripcion, orden)
VALUES
  ('EXPERIENCIA', 'Experiencia', 'Certificaciones y soportes de experiencia docente y profesional.', 35),
  ('ACTOS_ADMINISTRATIVOS', 'Actos administrativos', 'Actos administrativos asociados al perfil docente.', 51),
  ('EVALUACIONES', 'Evaluaciones', 'Evaluaciones del docente y sus soportes.', 55)
ON CONFLICT (codigo) DO NOTHING;
COMMIT;
