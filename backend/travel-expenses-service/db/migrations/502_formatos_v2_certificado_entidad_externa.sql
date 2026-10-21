-- ============================================================================
-- Migración: 502_formatos_v2_certificado_entidad_externa.sql
-- Historia de Usuario: EFDS-1309 — Soportes de legalización.
--
-- Formatos con su nombre oficial:
--   GF-FO-031 V2 — Certificado de Cumplimiento.
--   GF-FO-032 V2 — Informe cumplimiento de comisión o desplazamiento y
--                  legalización de gastos de transporte.
--
-- tipos_documento_soporte.nombre es VARCHAR(100) y el nombre oficial del 032,
-- con su código, tiene 103 caracteres: el nombre lleva el título oficial y la
-- descripción empieza por el código y la versión del formato.
--
-- Soporte condicional nuevo: certificado de la entidad externa, obligatorio
-- cuando la comisión se cumplió fuera de la ESAP (condición COMISION_EXTERNA,
-- que el comisionado declara al legalizar: migración 501). Se agrega a cada
-- tipo de comisionado que ya exige el GF-FO-031, justo después de él.
--
-- Idempotente.
-- ============================================================================

UPDATE travel_expenses.tipos_documento_soporte
   SET nombre = 'Certificado de Cumplimiento',
       descripcion = 'GF-FO-031 V2. Certificado de cumplimiento de la comisión.'
 WHERE codigo = 'LEG_GF_FO_031';

UPDATE travel_expenses.tipos_documento_soporte
   SET nombre = 'Informe cumplimiento de comisión o desplazamiento y legalización de gastos de transporte',
       descripcion = 'GF-FO-032 V2. Incluye las fechas en que realmente se cumplió la comisión.'
 WHERE codigo = 'LEG_GF_FO_032';

INSERT INTO travel_expenses.tipos_documento_soporte (codigo, nombre, descripcion, activo)
SELECT 'LEG_CERT_ENTIDAD_EXTERNA', 'Certificado de la entidad externa',
       'Certificado de cumplimiento expedido por la entidad donde se cumplió la comisión, cuando fue fuera de la ESAP.', TRUE
 WHERE NOT EXISTS (SELECT 1 FROM travel_expenses.tipos_documento_soporte WHERE codigo = 'LEG_CERT_ENTIDAD_EXTERNA');

ALTER TABLE travel_expenses.config_legalizacion_documentos
    DROP CONSTRAINT IF EXISTS chk_config_legalizacion_documentos_condicion;
ALTER TABLE travel_expenses.config_legalizacion_documentos
    ADD CONSTRAINT chk_config_legalizacion_documentos_condicion
        CHECK (condicion IS NULL OR condicion IN ('TRANSPORTE_AEREO', 'COMISION_EXTERNA'));

-- Justo después del 031: se corre el orden de los que siguen.
WITH con_031 AS (
    SELECT d.config_tipo_comisionado_id, d.orden
      FROM travel_expenses.config_legalizacion_documentos d
      JOIN travel_expenses.tipos_documento_soporte t ON t.id = d.tipo_documento_soporte_id
     WHERE t.codigo = 'LEG_GF_FO_031' AND d.activo
       AND NOT EXISTS (
           SELECT 1 FROM travel_expenses.config_legalizacion_documentos e
             JOIN travel_expenses.tipos_documento_soporte te ON te.id = e.tipo_documento_soporte_id
            WHERE te.codigo = 'LEG_CERT_ENTIDAD_EXTERNA' AND e.config_tipo_comisionado_id = d.config_tipo_comisionado_id)
), corridos AS (
    UPDATE travel_expenses.config_legalizacion_documentos d
       SET orden = d.orden + 1
      FROM con_031
     WHERE d.config_tipo_comisionado_id = con_031.config_tipo_comisionado_id
       AND d.orden > con_031.orden
    RETURNING d.id
)
INSERT INTO travel_expenses.config_legalizacion_documentos
    (config_tipo_comisionado_id, tipo_documento_soporte_id, tipo_requisito, condicion, orden, activo)
SELECT con_031.config_tipo_comisionado_id, t.id, 'OBLIGATORIO', 'COMISION_EXTERNA', con_031.orden + 1, TRUE
  FROM con_031
 CROSS JOIN travel_expenses.tipos_documento_soporte t
 WHERE t.codigo = 'LEG_CERT_ENTIDAD_EXTERNA';

COMMENT ON COLUMN travel_expenses.config_legalizacion_documentos.condicion IS
    'Cuándo aplica: NULL = siempre; TRANSPORTE_AEREO = solo con tramo aéreo; COMISION_EXTERNA = solo si se cumplió fuera de la ESAP.';
