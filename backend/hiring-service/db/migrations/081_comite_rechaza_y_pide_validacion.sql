-- ============================================================================
-- 081 · El comité de contratación rechaza, y puede pedir validación
--
-- La 071 dejó escrito que los desenlaces eran tres y que «no existe el "no
-- aprueba" a secas: si lo que procede es no contratar, eso se niega en la
-- 3.4». Eso no es lo que hace el comité: cuando revisa los documentos y
-- concluye que el proceso no debe salir al mercado, lo rechaza él, en su
-- sesión y con su acta. Mandar esa decisión de vuelta a la 3.4 obligaba a que
-- otro firmara lo que el comité decidió.
--
-- RECHAZADO deja la 3.7 en NEGADO y el proceso en NEGADO, el mismo camino que
-- ya recorre negar el estudio previo: un expediente que nadie va a volver a
-- tocar no puede seguir contando como vivo en el listado ni en las
-- estadísticas.
--
-- Y como el rechazo objeta igual que la observación, reusa `observaciones` en
-- vez de estrenar una columna: las dos guardan lo que el comité objetó, y lo
-- que las distingue —si hay algo que corregir o ya no— es la decisión.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_sesion_comite_decision'
      AND pg_get_constraintdef(oid) LIKE '%RECHAZADO%'
  ) THEN
    ALTER TABLE hiring.sesiones_comite_contratacion
      DROP CONSTRAINT IF EXISTS ck_sesion_comite_decision;
    ALTER TABLE hiring.sesiones_comite_contratacion
      ADD CONSTRAINT ck_sesion_comite_decision CHECK (decision IN (
        'APROBADO',
        'APROBADO_CON_CONDICIONES',
        'OBSERVADO',
        'RECHAZADO'
      ));
  END IF;
END $$;

-- Un rechazo sin motivo es peor que una devolución sin observaciones: a quien
-- le devuelven un proceso puede preguntar corrigiendo, y a quien se lo
-- rechazan no le queda ocasión de preguntar nada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_sesion_comite_observaciones'
      AND pg_get_constraintdef(oid) LIKE '%RECHAZADO%'
  ) THEN
    ALTER TABLE hiring.sesiones_comite_contratacion
      DROP CONSTRAINT IF EXISTS ck_sesion_comite_observaciones;
    ALTER TABLE hiring.sesiones_comite_contratacion
      ADD CONSTRAINT ck_sesion_comite_observaciones
        CHECK (decision NOT IN ('OBSERVADO', 'RECHAZADO') OR observaciones IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN hiring.sesiones_comite_contratacion.observaciones IS
  'Lo que el comité objetó: obligatorio al observar y al rechazar, y también cuando aprueba pero reabre alguna actividad para que se la validen.';
