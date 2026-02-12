-- Agregar prima tecnica (20%) a certificados laborales
ALTER TABLE certification.certificates
ADD COLUMN IF NOT EXISTS technical_bonus DECIMAL(12, 2) DEFAULT 0;

UPDATE certification.certificates
SET technical_bonus = ROUND(monthly_salary * 0.2, 2)
WHERE technical_bonus IS NULL OR technical_bonus = 0;
