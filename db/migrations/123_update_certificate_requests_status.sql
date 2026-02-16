-- Actualizar estados laborales en certificate_requests segun fechas de contrato
SET search_path TO certification, public;

UPDATE certificate_requests
SET status = CASE
  WHEN hiring_date IS NULL THEN 'INACTIVO'
  WHEN hiring_date::date > CURRENT_DATE THEN 'INACTIVO'
  WHEN request_date IS NULL THEN 'ACTIVO'
  WHEN request_date::date >= CURRENT_DATE THEN 'ACTIVO'
  ELSE 'INACTIVO'
END;
