-- ============================================================================
-- 057 · Estados del contrato hasta el cierre
--
-- EFDS-1184 (RF-SIS-01): el sistema gestiona los estados del contrato
-- —suscrito, en ejecución, suspendido, terminado, liquidado y cerrado— para
-- reflejar en todo momento su situación, e impide las transiciones no válidas.
--
-- Hasta aquí el ciclo llegaba a EJECUCION (042) porque era lo último que había
-- ocurrido en el módulo. Los cuatro que faltan son los que necesitan las
-- historias del final del contrato: SUSPENDIDO lo exige la suspensión y
-- reanudación de RF-MOD-03 (EFDS-1178), y TERMINADO, LIQUIDADO y CERRADO los
-- exige la etapa 10 —informe final, liquidación y cierre—.
--
-- Los estados se siguen derivando de hechos y no se declaran a mano, igual que
-- PERFECCIONADO viene de las firmas y LEGALIZADO de las coberturas. Lo que
-- añade esta historia es la máquina que dice qué salto es válido: la recta de
-- avance decía si un estado va después de otro, pero no si se puede llegar
-- directamente, y de LEGALIZADO a LIQUIDADO no se llega sin ejecutar. Esa
-- máquina vive en `puedeTransicionar` (contrato.entity.ts) y este CHECK solo
-- guarda el conjunto de valores admitidos.
--
-- SUSPENDIDO no es un punto más adelante del camino sino una pausa sobre el
-- punto en que se iba, así que en el código queda fuera de la recta de avance
-- y `alMenos` lo responde por EJECUCION, que es donde quedó detenido. Aquí, en
-- cambio, es un valor como cualquier otro: la base guarda en qué estado está,
-- no cuánto avanzó.
--
-- En un DO por la misma razón que en la 036, la 037 y la 042: sin tabla de
-- control, la reaplicación tiene que converger en vez de fallar o retroceder.
-- Sin el guard, volver a aplicar la 042 después de esta borraría los cuatro
-- estados nuevos del CHECK.
--
-- Renumerada de 044 a 057 al integrar la rama: la etapa 10 ya había tomado los
-- números 044 a 047 en la otra línea de trabajo. Las tres migraciones que la
-- acompañaban —modificaciones, cesión/suspensión/aclaración y objeto
-- inmutable— no se traen: la 049 y las 052 a 054 hacen lo mismo sobre el mismo
-- esquema, y aplicar las dos dejaría dos triggers vigilando el objeto y
-- columnas que ningún servicio llena.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_contrato_estado'
      AND pg_get_constraintdef(oid) LIKE '%CERRADO%'
  ) THEN
    ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_estado;
    ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_estado
      CHECK (estado IN (
        'GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO', 'LEGALIZADO',
        'EJECUCION', 'SUSPENDIDO', 'TERMINADO', 'LIQUIDADO', 'CERRADO'
      ));
  END IF;
END $$;

-- El CHECK de la 042 exige fecha de arranque a los contratos en ejecución. Los
-- estados nuevos también la tienen —todos ocurren después de haber empezado—,
-- así que la condición se amplía en vez de dejarlos fuera: sin esto, terminar
-- un contrato que sí arrancó fallaría contra la restricción anterior.
--
-- SUSPENDIDO entra por la misma puerta: se suspende lo que está corriendo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_contrato_ejecucion'
      AND pg_get_constraintdef(oid) LIKE '%CERRADO%'
  ) THEN
    ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_ejecucion;
    ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_ejecucion
      CHECK (
        estado NOT IN ('EJECUCION', 'SUSPENDIDO', 'TERMINADO', 'LIQUIDADO', 'CERRADO')
        OR ejecucion_desde IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON COLUMN hiring.contratos.estado IS
  'Situación actual del contrato en su ciclo (EFDS-1184, RF-SIS-01). Las transiciones válidas las decide puedeTransicionar en contrato.entity.ts.';
