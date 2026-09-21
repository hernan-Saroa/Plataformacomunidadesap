-- ============================================================================
-- 069 · Quién expide el CDP
--
-- La etapa 4 tiene el ciclo completo —solicitar, verificar, expedir, adjuntar—
-- pero no tiene a nadie. El CDP se solicita y queda esperando a que «la
-- Dirección Financiera» haga algo, que es una dependencia, no una persona: el
-- expediente no puede decir quién respondía por esa solicitud, y el aviso de
-- `alertas.notificar()` la descarta porque no tiene `responsableId` a quien
-- mandársela. Es el mismo agujero que la 064 vino a tapar en la etapa 3.
--
-- Tercer papel, misma tabla:
--
--   FINANCIERA · quien toma la solicitud de CDP en la 4.1 y responde por ella:
--                verifica la disponibilidad (4.2), expide (4.3) o la rechaza.
--
-- Se **toma**, no se asigna, como el papel CONTRATACION y por el mismo motivo
-- que se decidió allí: un coordinador que reparta es un cuello de botella y
-- obliga a decidir quién reparte cuando no está. La bandeja es compartida y
-- quien llega primero se queda con la solicitud.
--
-- Sin permiso nuevo. Tomar la solicitud lo habilita
-- `contratacion.presupuesto.gestionar`, que es el mismo que ya exigen verificar,
-- expedir y rechazar: quien puede resolverla es quien puede recibirla, y un
-- permiso aparte solo permitiría apropiarse de solicitudes que luego no se
-- pueden atender. Es la diferencia con la 065, que sí creó
-- `contratacion.proceso.take` porque allí tomar y aprobar son competencias de
-- personas distintas.
-- ============================================================================

-- ------------------------------------------------------------- el papel ----
-- El CHECK enumera los papeles, así que ampliarlo es soltarlo y volverlo a
-- poner. No se cambia por un enum: la 064 lo dejó como varchar con CHECK a
-- propósito, y un tipo enum de PostgreSQL haría de cada papel nuevo una
-- migración con ALTER TYPE que no se puede revertir dentro de la transacción.
ALTER TABLE hiring.participaciones_proceso
  DROP CONSTRAINT IF EXISTS ck_participacion_papel;

ALTER TABLE hiring.participaciones_proceso
  ADD CONSTRAINT ck_participacion_papel
  CHECK (papel IN ('CONTRATACION', 'ABOGADO', 'FINANCIERA'));

-- ------------------------------------------------------ lo que ya servía ----
-- No hace falta tocar nada más y conviene decir por qué, para que quien venga
-- a añadir un cuarto papel no busque lo que no existe:
--
--   · uq_participacion_vigente (proceso_id, papel) WHERE estado = 'VIGENTE'
--     ya da «un financiero vigente por proceso» y es lo que impide que dos
--     personas tomen la misma solicitud a la vez: la segunda choca contra el
--     índice y recibe un conflicto, no una fila duplicada.
--
--   · ix_participaciones_papel_vigente (papel) WHERE estado = 'VIGENTE'
--     ya resuelve «los procesos sin financiero vigente», que es la consulta de
--     la bandeja.
--
--   · el relevo con motivo, el historial y ck_participacion_relevado valen
--     igual para este papel: cambiar de financiero es relevar al anterior y
--     poner otro, porque quien verificó la disponibilidad respondió por lo que
--     certificó ese día.

COMMENT ON CONSTRAINT ck_participacion_papel ON hiring.participaciones_proceso IS
  'CONTRATACION y ABOGADO en la etapa 3 (EFDS-1183); FINANCIERA en la etapa 4, quien toma la solicitud de CDP y la resuelve.';

-- --------------------------------------------- las solicitudes ya abiertas --
-- No se les inventa financiero, con el criterio de la 064: deducirlo de quien
-- expidió daría por decidido un reparto que nadie decidió, y los CDP que están
-- en SOLICITADO no tienen siquiera de dónde deducirlo. Quedan sin tomar y
-- aparecen en la bandeja, que es exactamente lo que esta migración habilita.
