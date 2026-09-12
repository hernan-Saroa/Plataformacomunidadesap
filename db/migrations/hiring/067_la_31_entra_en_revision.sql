-- ============================================================================
-- 067 · El estudio previo entra en revisión, y la resuelve su abogado
--
-- EFDS-1183. Dos cambios que se cruzaron y hay que casar.
--
-- Por un lado, el envío del estudio previo dejó de forzar EN_REVISION y ahora
-- consulta la configuración, como las otras treinta y siete actividades. El
-- motivo es bueno: forzarlo dejaba la 3.1 «pendiente de revisión» sin revisor
-- que la resolviera, y a quien la envió se le ofrecían botones que el servicio
-- le iba a rechazar.
--
-- Por otro, la 3.4 pasó a resolverla el abogado que recibió el proceso en la
-- 3.3, y ese flujo empieza justamente cuando la 3.1 entra en revisión.
--
-- El problema es que la 3.1 no tenía regla EXIGE_APROBACION en ninguna
-- modalidad, así que sin esta migración todo estudio previo se cerraría en
-- APROBADO al enviarlo y no llegaría nunca a la 3.4: el reparto, la revisión y
-- las tres decisiones quedarían construidos y sin usar.
--
-- Se siembra la regla. No configura quién decide de verdad —eso lo resuelve el
-- reparto de la 3.3, que nombra a una persona concreta y no a un rol— sino que
-- declara que la actividad se revisa, que es lo que el envío consulta.
-- ============================================================================

INSERT INTO hiring.reglas_actividad (numeral, modalidad, tipo, config, mensaje, orden)
SELECT '3.1',
       NULL,
       'EXIGE_APROBACION',
       -- Los roles que pueden revisar, para que la configuración diga algo
       -- cierto si alguien la abre. Quién decide sobre un expediente concreto
       -- lo dice su abogado asignado, que es más estricto que esta lista.
       '{"roles": ["REVISOR_CONTRATACION", "DIRECTOR_CONTRATACION"], "personas": []}'::jsonb,
       'El estudio previo lo revisa en la 3.4 el abogado al que se le asignó el proceso',
       100
WHERE NOT EXISTS (
  SELECT 1 FROM hiring.reglas_actividad
   WHERE numeral = '3.1'
     AND tipo = 'EXIGE_APROBACION'
     AND vigente_hasta IS NULL
);

-- ------------------------------------------------ nota para quien venga después
--
-- Si la Dirección decide que el estudio previo no se revisa —que la 3.4 solo
-- reparta y no apruebe—, se deroga esta regla desde la pantalla de
-- configuración y el envío volverá a cerrarlo solo. No hace falta tocar código:
-- esa es exactamente la flexibilidad que el cambio del envío vino a dar.
