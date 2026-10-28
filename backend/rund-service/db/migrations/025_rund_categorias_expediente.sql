-- REQ-RUND-F012 (665 embebido): ampliación aditiva del catálogo de categorías documentales.
-- Prerrequisito: 422_create_rund_documentos_perfil.sql.
BEGIN;
INSERT INTO rund."RundDocumentoCategoria"
  (codigo, nombre, descripcion, orden)
VALUES
  ('EXPERIENCIA', 'Experiencia', 'Certificaciones y soportes de experiencia docente y profesional.', 35),
  ('ACTOS_ADMINISTRATIVOS', 'Actos administrativos', 'Actos administrativos asociados al perfil docente.', 51),
  ('EVALUACIONES', 'Evaluaciones', 'Evaluaciones del docente y sus soportes.', 55)
ON CONFLICT (codigo) DO NOTHING;
COMMIT;
