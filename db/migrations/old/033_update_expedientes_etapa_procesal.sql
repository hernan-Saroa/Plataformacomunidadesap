-- 033_update_expedientes_etapa_procesal.sql
-- Set etapa_procesal for seeded expedientes so they appear correctly in Kanban

-- Expediente 1: TRASLADO_DESCARGOS -> ADMISION (primera etapa activa)
UPDATE legal_management.expedientes 
SET etapa_procesal = 'ADMISION'
WHERE radicado = '110013335002202500125';

-- Expediente 2: EN_TRAMITE con contestación de demanda radicada -> CONTESTACION
UPDATE legal_management.expedientes 
SET etapa_procesal = 'CONTESTACION'
WHERE radicado = '250002341000202400567';

-- Expediente 3: FALLO -> SENTENCIA
UPDATE legal_management.expedientes 
SET etapa_procesal = 'SENTENCIA'
WHERE radicado = '470013333003202400890';

-- Expediente 4: RADICADO (nuevo, reparto a juzgado) -> ADMISION
UPDATE legal_management.expedientes 
SET etapa_procesal = 'ADMISION'
WHERE radicado = '050013331001202500001';

-- Expediente 5: EN_TRAMITE, audiencia de conciliación fallida -> PRUEBAS
UPDATE legal_management.expedientes 
SET etapa_procesal = 'PRUEBAS'
WHERE radicado = '680013334004202400234';
