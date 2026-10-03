-- ============================================================================
-- 450: Añadir columna instrucciones_validacion a tipos_documento_soporte
--      y parametrizar recomendaciones de validacion visual (UTF-8 seguro)
-- ============================================================================
SET client_encoding = 'UTF8';

ALTER TABLE travel_expenses.tipos_documento_soporte
ADD COLUMN IF NOT EXISTS instrucciones_validacion TEXT;

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Validar que la certificacion bancaria no supere los 90 dias de vigencia desde su fecha de expedicion, y que el titular y numero de cuenta coincidan con el comisionado.'
WHERE codigo = 'CERT_BANCARIA';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Revisar que el RUT este actualizado con fecha de generacion del ano en curso (vigencia actual) y que el NIT o Cedula coincida con el comisionado.'
WHERE codigo = 'RUT';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Verificar que la planilla de pago o certificado de afiliacion a seguridad social cubra las fechas programadas para la comision.'
WHERE codigo = 'SEGURIDAD_SOCIAL';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Verificar que el numero de contrato en el documento SECOP coincida exactamente con el numero de contrato registrado para la comision.'
WHERE codigo = 'CONTRATO_SECOP';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Verificar que el numero de CDP y su fecha de expedicion coincidan exactamente con el soporte adjunto.'
WHERE codigo = 'CDP';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Verificar vigencia minima de 6 meses posteriores a la fecha de retorno del viaje y legibilidad de datos del titular.'
WHERE codigo = 'PASAPORTE';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Verificar fecha del evento, lugar de destino y entidad anfitriona convocante.'
WHERE codigo = 'CARTA_INVITACION';

UPDATE travel_expenses.tipos_documento_soporte
SET instrucciones_validacion = 'Verificar firma de la autoridad competente y coincidencia del nombre del comisionado.'
WHERE codigo = 'RESOLUCION_ACTO';
