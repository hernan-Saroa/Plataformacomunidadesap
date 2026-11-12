SET client_encoding = 'UTF8';

-- ============================================================================
-- 003: Aviso identificado por módulo + clave, y buzón de desvío (EFDS-2406)
-- ============================================================================
-- Cambios, todos repetibles (la migración se puede correr más de una vez):
--
--   1. evento_notificacion pasa de PK `clave` a PK (codigo_modulo, clave).
--      Disciplinario y Legal emiten PROCESO_ASIGNADO y PROCESO_REASIGNADO: con
--      la clave sola, el primero que llegaba se quedaba la fila y el otro
--      módulo no podía apagar ni configurar el suyo por separado.
--   2. configuracion_historial guarda también el módulo del aviso que cambió.
--   3. modulo_notificacion.correo_desvio: buzón que recibe lo que habría salido
--      mientras el módulo o el aviso están apagados.
--   4. envio_omitido.desviado_a: el buzón al que fue a parar un aviso desviado
--      (motivo 'desviado'; la columna `motivo` es texto libre, sin CHECK).
--   5. evento_notificacion.envia_campana: simétrica a envia_correo, para que la
--      consola sepa si un aviso es solo correo (y no ofrezca prioridad ni
--      destinatarios adicionales, que solo aplican a la campana).
--   6. Aviso obligatorio nuevo: el OTP de firma de Legal.
-- ============================================================================

-- 1. Clave compuesta ----------------------------------------------------------
ALTER TABLE notifications.evento_notificacion
  ALTER COLUMN codigo_modulo SET NOT NULL;

DO $$
DECLARE
  columnas text;
BEGIN
  SELECT string_agg(a.attname, ',' ORDER BY k.ord)
    INTO columnas
    FROM pg_constraint c
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
   WHERE c.conrelid = 'notifications.evento_notificacion'::regclass
     AND c.contype = 'p';

  IF columnas IS DISTINCT FROM 'codigo_modulo,clave' THEN
    IF columnas IS NOT NULL THEN
      ALTER TABLE notifications.evento_notificacion DROP CONSTRAINT evento_notificacion_pkey;
    END IF;
    ALTER TABLE notifications.evento_notificacion
      ADD CONSTRAINT evento_notificacion_pkey PRIMARY KEY (codigo_modulo, clave);
  END IF;
END $$;

-- La PK ya cubre las búsquedas por módulo (su primera columna); el índice
-- viejo sobraba. Para buscar un aviso por su clave sola (avisos que llegan sin
-- módulo) hace falta uno por clave.
DROP INDEX IF EXISTS notifications.idx_evento_notificacion_modulo;
CREATE INDEX IF NOT EXISTS idx_evento_notificacion_clave
  ON notifications.evento_notificacion (clave);

-- 2. Historial con módulo -----------------------------------------------------
ALTER TABLE notifications.configuracion_historial
  ADD COLUMN IF NOT EXISTS codigo_modulo VARCHAR(60);

-- Lo anterior se identificaba solo por clave: se completa con el módulo cuando
-- la clave existe en uno solo; si estaba en varios queda NULL (no se adivina).
UPDATE notifications.configuracion_historial h
   SET codigo_modulo = h.clave
 WHERE h.entidad = 'modulo' AND h.codigo_modulo IS NULL;

UPDATE notifications.configuracion_historial h
   SET codigo_modulo = u.codigo_modulo
  FROM (SELECT clave, MIN(codigo_modulo) AS codigo_modulo
          FROM notifications.evento_notificacion
         GROUP BY clave
        HAVING COUNT(*) = 1) u
 WHERE h.entidad = 'evento' AND h.codigo_modulo IS NULL AND u.clave = h.clave;

CREATE INDEX IF NOT EXISTS idx_configuracion_historial_modulo_clave
  ON notifications.configuracion_historial (codigo_modulo, clave);

-- 3. Buzón de desvío por módulo ----------------------------------------------
ALTER TABLE notifications.modulo_notificacion
  ADD COLUMN IF NOT EXISTS correo_desvio VARCHAR(150);

-- 4. Destino de lo desviado ---------------------------------------------------
ALTER TABLE notifications.envio_omitido
  ADD COLUMN IF NOT EXISTS desviado_a VARCHAR(150);

-- 5. ¿El código manda campana para este aviso? -------------------------------
ALTER TABLE notifications.evento_notificacion
  ADD COLUMN IF NOT EXISTS envia_campana BOOLEAN NOT NULL DEFAULT false;

-- Los avisos que ya dejaron campanas en la tabla de notificaciones la mandan.
UPDATE notifications.evento_notificacion e
   SET envia_campana = true
 WHERE NOT e.envia_campana
   AND EXISTS (SELECT 1 FROM notifications.notificacion n
                WHERE n.tipo_notificacion = e.clave);

-- 6. Aviso obligatorio nuevo --------------------------------------------------
-- Si el aviso ya se había registrado solo (activo y no obligatorio) pasa a
-- obligatorio; el resto de lo que haya configurado el administrador se respeta.
INSERT INTO notifications.evento_notificacion (clave, codigo_modulo, nombre, descripcion, obligatorio, envia_correo)
VALUES
  ('legal_otp_firma', 'gestion-legal', 'Código OTP para firmar actuaciones',
   'Correo con el código de un solo uso que valida la firma de una actuación. Sin él el jefe no puede firmar.', true, true)
ON CONFLICT (codigo_modulo, clave) DO UPDATE
   SET obligatorio  = true,
       activo       = true,
       envia_correo = true;
