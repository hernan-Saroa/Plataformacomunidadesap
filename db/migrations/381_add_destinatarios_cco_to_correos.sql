-- Migration 381: Columna para destinatarios en Copia Oculta (CCO) de correos jurídicos
--
-- Contexto: el Centro de Comunicaciones (Redactar Correo) ahora permite enviar con
-- Copia Oculta (CCO / BCC). Estos destinatarios NO son visibles para los demás
-- destinatarios del correo, pero SÍ deben quedar registrados en la plataforma para
-- trazabilidad institucional y para mostrarse en el detalle del correo enviado.
--
-- Se almacena como texto (arreglo JSON de correos), igual que el campo `destinatarios`
-- que guarda el CC. Nullable y sin default: solo se rellena en correos enviados con CCO.

ALTER TABLE legal_management.correos_juridicos
    ADD COLUMN IF NOT EXISTS destinatarios_cco text;

COMMENT ON COLUMN legal_management.correos_juridicos.destinatarios_cco
    IS 'Destinatarios en Copia Oculta (CCO/BCC), como arreglo JSON de correos. No visibles para los demás destinatarios; se conservan para trazabilidad.';
