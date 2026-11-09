-- RUND-002: categorías que usan los soportes de la codificación documental del GGP.
-- Aditiva e idempotente: no modifica ni reclasifica archivos existentes. Prerrequisito: 422.
BEGIN;
INSERT INTO academic_work_plan."RundDocumentoCategoria"
  (codigo, nombre, descripcion, orden)
VALUES
  ('CERTIFICADOS', 'Certificados', 'Certificados académicos, laborales o de evaluación.', 40),
  ('EXPERIENCIA', 'Experiencia', 'Certificaciones y soportes de experiencia docente y profesional.', 35)
ON CONFLICT (codigo) DO NOTHING;
COMMIT;
