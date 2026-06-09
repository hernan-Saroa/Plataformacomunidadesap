-- Migration 327: Remove Delivery Status Notifications (DSN) and auto-replies
-- from correos_juridicos that were synced incorrectly.
--
-- Context: Cuando se activó requestDeliveryReceipt en sendEmail, Exchange empezó a
-- generar DSN automáticos que la plataforma sincronizaba como correos legítimos.
-- Este script limpia los DSN históricos para que la bandeja muestre solo
-- comunicaciones reales.

DELETE FROM legal_management.correos_juridicos
WHERE
    LOWER(TRIM(asunto)) LIKE 'retransmitido:%'
    OR LOWER(TRIM(asunto)) LIKE 'relayed:%'
    OR LOWER(TRIM(asunto)) LIKE 'delivery status notification%'
    OR LOWER(TRIM(asunto)) LIKE 'undelivered mail%'
    OR LOWER(TRIM(asunto)) LIKE 'undeliverable%'
    OR LOWER(TRIM(asunto)) LIKE 'mail delivery failed%'
    OR LOWER(TRIM(asunto)) LIKE 'failure notice%'
    OR LOWER(TRIM(asunto)) LIKE 'returned mail%'
    OR LOWER(TRIM(asunto)) LIKE 'mail delivery subsystem%'
    OR LOWER(TRIM(asunto)) LIKE 'leído:%'
    OR LOWER(TRIM(asunto)) LIKE 'read:%'
    OR LOWER(TRIM(asunto)) LIKE 'no leído:%'
    OR LOWER(TRIM(asunto)) LIKE 'not read:%'
    OR LOWER(TRIM(asunto)) LIKE 'acuse de recibo%'
    OR LOWER(TRIM(asunto)) LIKE 'delivery receipt%'
    OR LOWER(TRIM(asunto)) LIKE 'read receipt%'
    OR LOWER(TRIM(asunto)) LIKE 'recibo de entrega%'
    OR LOWER(TRIM(asunto)) LIKE 'recibo de lectura%'
    OR LOWER(TRIM(asunto)) LIKE 'sin entregar:%'
    OR LOWER(TRIM(asunto)) LIKE 'no entregado:%'
    OR LOWER(remitente_email) LIKE '%mailer-daemon%'
    OR LOWER(remitente_email) LIKE 'postmaster@%'
    OR LOWER(remitente_email) LIKE '%microsoftexchange%'
    OR LOWER(remitente_email) LIKE 'noreply@%'
    OR LOWER(remitente_email) LIKE 'no-reply@%'
    OR LOWER(remitente_email) LIKE 'donotreply@%'
    OR LOWER(remitente_email) LIKE 'do-not-reply@%';
