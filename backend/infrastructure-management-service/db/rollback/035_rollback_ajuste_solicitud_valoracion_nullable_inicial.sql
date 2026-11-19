-- ---------------------------------------------------------------------------
-- Rollback 035 · Restaurar NOT NULL en solicitud_valoracion
-- ---------------------------------------------------------------------------

BEGIN;

SET LOCAL search_path TO "infrastructure-management", public;

UPDATE "infrastructure-management".solicitud_valoracion
  SET estado_al_finalizar = 'EN_PROGRESO'
  WHERE estado_al_finalizar IS NULL;

UPDATE "infrastructure-management".solicitud_valoracion
  SET diagnostico = 'Diagnóstico preliminar registrado en visita.'
  WHERE diagnostico IS NULL;

UPDATE "infrastructure-management".solicitud_valoracion
  SET alcance_identificado = 'Alcance preliminar de inspección técnica.'
  WHERE alcance_identificado IS NULL;

UPDATE "infrastructure-management".solicitud_valoracion
  SET fecha_fin_valoracion = now()
  WHERE fecha_fin_valoracion IS NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN estado_al_finalizar SET NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN diagnostico SET NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN alcance_identificado SET NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN fecha_fin_valoracion SET NOT NULL;

COMMIT;
