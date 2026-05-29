-- Retira el contador historico de descargas de certificados de grado.
-- Los certificados se visualizan/descargan desde el visor PDF del navegador y
-- la trazabilidad vigente queda en academic_registration.certificate_validations.

DROP TABLE IF EXISTS academic_registration.certificate_downloads;
