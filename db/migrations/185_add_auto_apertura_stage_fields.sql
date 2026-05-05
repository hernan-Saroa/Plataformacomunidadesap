-- Migración: Soporte para HU Auto de Apertura con cambio de etapa automático
-- Agrega fechaInicioEtapa a disciplinary_processes y etapaDestino a legal_autos

ALTER TABLE internal_disciplinary_control.disciplinary_processes
  ADD COLUMN IF NOT EXISTS "fechaInicioEtapa" TIMESTAMP NULL;

ALTER TABLE internal_disciplinary_control.legal_autos
  ADD COLUMN IF NOT EXISTS "etapaDestino" VARCHAR(50) NULL;
