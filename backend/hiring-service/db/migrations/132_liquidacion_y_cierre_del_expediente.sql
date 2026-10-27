-- ============================================================================
-- 132 · Liquidación con sus soportes y cierre del expediente en dos pasos
--
-- Revisión de QA (2026-10-26):
--
-- EFDS-1171 · Cuando el informe final de supervisión no se exige (la 10.1 se
-- configura como opcional), el soporte es el acta de recibo: queda como
-- documento opcional de la 10.1 y de la 10.2.
--
-- EFDS-1172 · El balance financiero del contrato hace parte de la
-- liquidación: el cierre financiero (10.3) se registra desde el panel de la
-- 10.2 y sale del riel. La liquidación admite varios soportes opcionales,
-- cada uno con su tipo; «otro» va como anexo adicional con su nombre.
--
-- EFDS-1175 · La etapa de cierre queda en la 10.4 con dos pasos: publicar la
-- liquidación o el cierre (SECOP II o página web) y archivar con el número de
-- radicado.
--
-- Idempotente.
-- ============================================================================

BEGIN;

INSERT INTO hiring.documentos_requeridos
  (numeral, codigo, nombre, descripcion, modalidades, obligatorio, orden, confirmado, nota_fuente)
VALUES
  ('10.1', 'ACTA_RECIBO', 'Acta de recibo',
   'Cuando no se produce informe final de supervisión, el acta de recibo es el soporte.',
   '[]', false, 50, true, 'Revisión de QA de EFDS-1171 (2026-10-26).'),
  ('10.2', 'MEMORANDO_RADICACION', 'Memorando de radicación', NULL,
   '[]', false, 10, true, 'Revisión de QA de EFDS-1172 (2026-10-26).'),
  ('10.2', 'VERIFICACION_ANTECEDENTES', 'Verificación de antecedentes', NULL,
   '[]', false, 20, true, 'Revisión de QA de EFDS-1172 (2026-10-26).'),
  ('10.2', 'INFORME_BALANCE_FINAL', 'Informe o balance final', NULL,
   '[]', false, 30, true, 'Revisión de QA de EFDS-1172 (2026-10-26).'),
  ('10.2', 'ACTA_RECIBO', 'Acta de recibo',
   'Cuando no se produjo informe final de supervisión.',
   '[]', false, 40, true, 'Revisión de QA de EFDS-1171 (2026-10-26).')
ON CONFLICT (numeral, codigo) DO NOTHING;

UPDATE hiring.actividades SET nombre = 'Liquidación y balance financiero' WHERE numeral = '10.2';
UPDATE hiring.actividades
   SET nombre = 'Cierre financiero',
       descripcion = 'Se registra dentro de la liquidación (10.2), con el balance del contrato (132).'
 WHERE numeral = '10.3';
UPDATE hiring.actividades
   SET nombre = 'Cierre del expediente: publicación y archivo'
 WHERE numeral = '10.4';

COMMIT;
