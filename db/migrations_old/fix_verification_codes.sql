-- Actualizar los códigos de verificación de los certificados existentes
-- para que coincidan con el formato esperado

UPDATE certification.certificates
SET verification_code = 'QR-CERT-2025-0EA10-113ef832'
WHERE certificate_number = '12_620_700_20_CD 002';

UPDATE certification.certificates
SET verification_code = 'QR-CERT-2025-0EA9F-abc12345'
WHERE certificate_number = '12_620_700_20_CD 001';
