-- RUND-003: varios títulos por nivel de formación.
-- Aditiva e idempotente: el título de la plantilla sigue en pregrado/especializacion/maestria/doctorado/posDoctorado
-- ("Información precargada"); los demás se guardan por nivel en este JSONB ("Información adicional").
-- Formato: {"pregrado": ["Título 2", ...], "maestria": [...]}. NULL = sin títulos adicionales (registros anteriores).
-- El servicio también la crea al arrancar (ensureBancoDocentesExcelColumns); esta migración deja el cambio versionado.
BEGIN;
ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "titulosAdicionales" JSONB;
COMMIT;
