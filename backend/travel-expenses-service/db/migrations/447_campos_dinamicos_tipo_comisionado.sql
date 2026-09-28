-- ============================================================================
-- 447_campos_dinamicos_tipo_comisionado.sql
-- Descripción:
--   Agrega al catálogo (config_campos_formulario) los campos dinámicos por tipo:
--     - numeroContrato (para CONTRATISTA)
--     - cargoEsap (para FUNCIONARIO)
--     - rolEsap (para DOCENTE e INVESTIGADOR)
--   Y actualiza las configuraciones por tipo de comisionado (config_tipo_comisionado)
--   de forma idempotente para entornos ya desplegados.
-- ============================================================================

BEGIN;

-- 1) Catálogo de campos
INSERT INTO travel_expenses.config_campos_formulario
  (clave, etiqueta, tipo_campo, placeholder, opciones, grupo, orden, activo)
VALUES
  ('numeroContrato', 'Número de Contrato', 'TEXT', 'Ej. C-2024-001 (contrato SECOP)', NULL, 'comisionado', 13, TRUE),
  ('cargoEsap', 'Cargo / Rol ESAP', 'TEXT', 'Ej. Asesor Jurídico, Coordinador de Área...', NULL, 'comisionado', 14, TRUE),
  ('rolEsap', 'Rol ESAP', 'TEXT', 'Ej. Docente Capacitador, Catedrático, Investigador...', NULL, 'comisionado', 15, TRUE)
ON CONFLICT (clave) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  tipo_campo = EXCLUDED.tipo_campo,
  placeholder = EXCLUDED.placeholder,
  grupo = EXCLUDED.grupo,
  orden = EXCLUDED.orden,
  activo = EXCLUDED.activo;

-- 2) Configuración FUNCIONARIO: cargoEsap obligatorio, otros dos ocultos
UPDATE travel_expenses.config_tipo_comisionado
SET
  campos_obligatorios = CASE
    WHEN NOT (campos_obligatorios ? 'cargoEsap') THEN campos_obligatorios || '["cargoEsap"]'::jsonb
    ELSE campos_obligatorios
  END,
  campos_ocultos = CASE
    WHEN NOT (campos_ocultos ? 'numeroContrato') AND NOT (campos_ocultos ? 'rolEsap') THEN campos_ocultos || '["numeroContrato","rolEsap"]'::jsonb
    WHEN NOT (campos_ocultos ? 'numeroContrato') THEN campos_ocultos || '["numeroContrato"]'::jsonb
    WHEN NOT (campos_ocultos ? 'rolEsap') THEN campos_ocultos || '["rolEsap"]'::jsonb
    ELSE campos_ocultos
  END
WHERE tipo_comisionado = 'FUNCIONARIO';

-- 3) Configuración CONTRATISTA: numeroContrato obligatorio, otros dos ocultos
UPDATE travel_expenses.config_tipo_comisionado
SET
  campos_obligatorios = CASE
    WHEN NOT (campos_obligatorios ? 'numeroContrato') THEN campos_obligatorios || '["numeroContrato"]'::jsonb
    ELSE campos_obligatorios
  END,
  campos_ocultos = CASE
    WHEN NOT (campos_ocultos ? 'cargoEsap') AND NOT (campos_ocultos ? 'rolEsap') THEN campos_ocultos || '["cargoEsap","rolEsap"]'::jsonb
    WHEN NOT (campos_ocultos ? 'cargoEsap') THEN campos_ocultos || '["cargoEsap"]'::jsonb
    WHEN NOT (campos_ocultos ? 'rolEsap') THEN campos_ocultos || '["rolEsap"]'::jsonb
    ELSE campos_ocultos
  END
WHERE tipo_comisionado = 'CONTRATISTA';

-- 4) Configuración DOCENTE: rolEsap obligatorio, otros dos ocultos
UPDATE travel_expenses.config_tipo_comisionado
SET
  campos_obligatorios = CASE
    WHEN NOT (campos_obligatorios ? 'rolEsap') THEN campos_obligatorios || '["rolEsap"]'::jsonb
    ELSE campos_obligatorios
  END,
  campos_ocultos = CASE
    WHEN NOT (campos_ocultos ? 'numeroContrato') AND NOT (campos_ocultos ? 'cargoEsap') THEN campos_ocultos || '["numeroContrato","cargoEsap"]'::jsonb
    WHEN NOT (campos_ocultos ? 'numeroContrato') THEN campos_ocultos || '["numeroContrato"]'::jsonb
    WHEN NOT (campos_ocultos ? 'cargoEsap') THEN campos_ocultos || '["cargoEsap"]'::jsonb
    ELSE campos_ocultos
  END
WHERE tipo_comisionado = 'DOCENTE';

-- 5) Configuración INVESTIGADOR: rolEsap obligatorio, otros dos ocultos
UPDATE travel_expenses.config_tipo_comisionado
SET
  campos_obligatorios = CASE
    WHEN NOT (campos_obligatorios ? 'rolEsap') THEN campos_obligatorios || '["rolEsap"]'::jsonb
    ELSE campos_obligatorios
  END,
  campos_ocultos = CASE
    WHEN NOT (campos_ocultos ? 'numeroContrato') AND NOT (campos_ocultos ? 'cargoEsap') THEN campos_ocultos || '["numeroContrato","cargoEsap"]'::jsonb
    WHEN NOT (campos_ocultos ? 'numeroContrato') THEN campos_ocultos || '["numeroContrato"]'::jsonb
    WHEN NOT (campos_ocultos ? 'cargoEsap') THEN campos_ocultos || '["cargoEsap"]'::jsonb
    ELSE campos_ocultos
  END
WHERE tipo_comisionado = 'INVESTIGADOR';

-- 6) Configuración ESTUDIANTE: oculta los 3 campos
UPDATE travel_expenses.config_tipo_comisionado
SET
  campos_ocultos = CASE
    WHEN NOT (campos_ocultos ? 'numeroContrato') AND NOT (campos_ocultos ? 'cargoEsap') AND NOT (campos_ocultos ? 'rolEsap')
      THEN campos_ocultos || '["numeroContrato","cargoEsap","rolEsap"]'::jsonb
    ELSE campos_ocultos
  END
WHERE tipo_comisionado = 'ESTUDIANTE';

-- 7) Configuración DEFAULT: oculta los 3 campos
UPDATE travel_expenses.config_tipo_comisionado
SET
  campos_ocultos = CASE
    WHEN NOT (campos_ocultos ? 'numeroContrato') AND NOT (campos_ocultos ? 'cargoEsap') AND NOT (campos_ocultos ? 'rolEsap')
      THEN campos_ocultos || '["numeroContrato","cargoEsap","rolEsap"]'::jsonb
    ELSE campos_ocultos
  END
WHERE tipo_comisionado = 'DEFAULT';

COMMIT;
