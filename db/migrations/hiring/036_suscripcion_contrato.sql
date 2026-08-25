-- ============================================================================
-- 036 · Suscripción del contrato: firma del ordenador y del contratista
--
-- EFDS-1162 (RF-LEG-01): aceptado el contrato, lo firman el Ordenador del Gasto
-- y el contratista. Con las dos firmas el contrato queda perfeccionado.
--
-- Firma REGISTRADA, no firma criptográfica. La historia anota como dependencia
-- «solución de firma electrónica a integrar», es decir, la entidad todavía no
-- ha elegido proveedor. Se construye el registro de la suscripción con sus
-- evidencias y el punto de integración queda aislado: cuando haya proveedor se
-- enchufa ahí. Implementar hoy una firma propia sería inventar una solución
-- legal que no nos corresponde definir, y que además habría que desmontar.
--
-- Misma actividad 8.1 que la migración 035: elaborar el contrato y suscribirlo
-- son dos momentos del mismo numeral, no dos actividades de la matriz.
-- ============================================================================

-- --------------------------------------------------------- las dos firmas --
CREATE TABLE IF NOT EXISTS hiring.firmas_contrato (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id           uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Quién firma: la entidad o el contratista. Son las dos partes del vínculo y
  -- el contrato no se perfecciona hasta que están ambas.
  parte                 varchar(20)  NOT NULL,

  -- Nombre de quien firma. Para el ordenador es quien ejerce la competencia ese
  -- día; para el contratista, su representante. Se copia y no se referencia por
  -- la misma razón que en el contrato: la firma dice quién firmó entonces.
  firmante_nombre       varchar(300) NOT NULL,
  firmante_documento    varchar(40),
  -- La cuenta que registró la firma, que puede no ser la del firmante: el
  -- gestor registra la del contratista con su evidencia. Separarlas es lo que
  -- permite saber después quién firmó y quién lo anotó.
  registrada_por        varchar(200),

  -- La del acto, no la del registro.
  fecha_firma           date         NOT NULL,

  -- Evidencia de la firma: el documento firmado, el acuse del proveedor o el
  -- soporte que la entidad conserve. Obligatoria: una firma sin respaldo es una
  -- afirmación, y este registro tiene que servir de prueba.
  evidencia_documento_id uuid        NOT NULL REFERENCES hiring.documentos(id),
  -- Hash del documento firmado, para poder demostrar que no cambió después.
  hash_documento        char(64),

  created_at            timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_firma_parte CHECK (parte IN ('ORDENADOR', 'CONTRATISTA')),
  -- Cada parte firma una sola vez. Si hubiera que corregir una firma, se
  -- corrige el contrato entero: volver a firmar sobre la misma parte dejaría
  -- dos actos para un solo acto.
  CONSTRAINT uq_firma_parte UNIQUE (contrato_id, parte)
);

CREATE INDEX IF NOT EXISTS ix_firmas_contrato ON hiring.firmas_contrato (contrato_id);

COMMENT ON TABLE hiring.firmas_contrato IS
  'Firmas del ordenador del gasto y del contratista, con su evidencia (EFDS-1162).';

-- ------------------------------------------------- el contrato se amplía --
-- El perfeccionamiento no lo declara quien firma: lo deriva el servicio cuando
-- comprueba que ya están las dos firmas. La columna guarda cuándo ocurrió.
ALTER TABLE hiring.contratos
  ADD COLUMN IF NOT EXISTS perfeccionado_at timestamptz;

-- El contrato ya suscrito, con las dos firmas incorporadas. Distinto de la
-- minuta: aquella es el texto que se presentó, este es el documento firmado.
ALTER TABLE hiring.contratos
  ADD COLUMN IF NOT EXISTS contrato_firmado_documento_id uuid
  REFERENCES hiring.documentos(id);

-- Se amplía el estado con PERFECCIONADO. Al ser un CHECK hay que reemplazarlo:
-- añadir un valor a la lista no es una operación incremental en Postgres.
--
-- Guardado en un DO: estas migraciones no tienen tabla de control y se
-- reaplicán. Si la 037 ya amplió el CHECK con LEGALIZADO, reponer aquí la
-- lista corta fallaría contra los contratos ya legalizados.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_contrato_estado'
      AND pg_get_constraintdef(oid) LIKE '%PERFECCIONADO%'
  ) THEN
    ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_estado;
    ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_estado
      CHECK (estado IN ('GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO'));
  END IF;
END $$;

-- Un contrato perfeccionado tiene siempre la fecha en que se perfeccionó, igual
-- que uno aceptado tiene la de su aceptación.
ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_perfeccionado;
ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_perfeccionado
  CHECK (estado <> 'PERFECCIONADO' OR perfeccionado_at IS NOT NULL);

-- El índice de la 035 excluía los rechazados para dejar generar otra minuta.
-- Sigue valiendo: PERFECCIONADO no es un estado de cierre que libere el proceso
-- para un segundo contrato, así que no hay nada que cambiar aquí. Se deja
-- anotado para que nadie lo «arregle» pensando que se olvidó.
