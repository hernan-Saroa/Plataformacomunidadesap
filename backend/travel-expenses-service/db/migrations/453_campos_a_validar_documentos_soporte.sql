-- ============================================================================
-- 453: Añadir columna campos_a_validar a tipos_documento_soporte
--      y configurar campos predeterminados para validación con el formulario
-- ============================================================================
SET client_encoding = 'UTF8';

ALTER TABLE travel_expenses.tipos_documento_soporte
ADD COLUMN IF NOT EXISTS campos_a_validar JSONB DEFAULT '[]'::jsonb;

-- Certificación bancaria: titular, documento, tipo cuenta, número cuenta, banco
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "numeroDocumento", "tipoCuenta", "numeroCuenta", "entidadBancaria"]'::jsonb
WHERE codigo = 'CERT_BANCARIA';

-- RUT: titular/razón social, NIT/documento
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "numeroDocumento"]'::jsonb
WHERE codigo = 'RUT';

-- Contrato SECOP: contratista, documento, número contrato, valor honorarios
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "numeroDocumento", "numeroContrato", "valorHonorarios"]'::jsonb
WHERE codigo = 'CONTRATO_SECOP';

-- CDP: número CDP, fecha expedición
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["numeroCdp", "fechaCdp"]'::jsonb
WHERE codigo = 'CDP';

-- Seguridad Social: cotizante comisionado, cédula, fecha inicio, fecha fin
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "numeroDocumento", "fechaInicio", "fechaFin"]'::jsonb
WHERE codigo = 'SEGURIDAD_SOCIAL';

-- Pasaporte: titular pasaporte, documento, fecha fin viaje
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "numeroDocumento", "fechaFin"]'::jsonb
WHERE codigo = 'PASAPORTE';

-- Carta de Invitación: comisionado, destino, fechas
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "destinoCiudad", "destinoDepartamento", "fechaInicio", "fechaFin"]'::jsonb
WHERE codigo = 'CARTA_INVITACION';

-- Resolución / Acto: comisionado autorizado, documento
UPDATE travel_expenses.tipos_documento_soporte
SET campos_a_validar = '["nombreComisionado", "numeroDocumento"]'::jsonb
WHERE codigo = 'RESOLUCION_ACTO';
