-- 011_comision_internacional.sql
-- Agrega el indicador de comisión internacional/acto administrativo sobre solicitudes_comision.
-- El checklist de documentos obligatorios (pasaporte, carta de invitación, resolución, etc.)
-- se adapta en base a este flag cuando la solicitud se finaliza/radica.

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS es_internacional BOOLEAN NOT NULL DEFAULT false;

-- Normaliza tipo_comision para las filas existentes que aún no lo tengan cargado.
UPDATE travel_expenses.solicitudes_comision
  SET tipo_comision = 'TERRESTRE'
  WHERE tipo_comision IS NULL OR tipo_comision = '';
