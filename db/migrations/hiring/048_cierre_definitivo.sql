-- ============================================================================
-- 048 · Cierre definitivo del contrato
--
-- EFDS-1175 (RF-LIQ-05, RF-SIS-01): liquidado el contrato, cuando vencen los
-- amparos de estabilidad y calidad ya no queda nada que reclamar y la entidad
-- lo cierra en firme.
--
-- **No se crea numeral.** La matriz le da cuatro actividades a la etapa 10
-- —10.1 informe final, 10.2 liquidación, 10.3 cierre, 10.4 archivo— y las
-- cuatro están tomadas por las historias 1171 a 1174. El cierre definitivo no
-- tiene una propia, así que llega por su cuenta y no marca actividad en el
-- riel, exactamente como la declaratoria desierta de EFDS-1160.
--
-- Queda anotado que el 10.3 se lo llevó el cierre financiero mientras la matriz
-- llama a ese numeral «Cierre según tipología contractual», que se parece más a
-- esto. Realinear la etapa 10 con la matriz obligaría a migrar tres historias
-- ya cerradas, y se decidió no hacerlo por cuenta propia.
-- ============================================================================

-- ------------------------------------------- los estados que faltaban --
/*
 * RF-SIS-01 pide gestionar «suscrito, en ejecución, suspendido, terminado,
 * liquidado y cerrado». Hoy el ciclo llega hasta EJECUCION.
 *
 * Se agregan LIQUIDADO y CERRADO, que son los dos hechos que esta historia
 * necesita y que son distintos: el primero lo produce la firma del acta (10.2)
 * y el segundo el vencimiento de las garantías.
 *
 * SUSPENDIDO y TERMINADO **no se agregan**, aunque RF-SIS-01 los nombre: hoy
 * nadie los escribe, y ponerlos en el CHECK declararía soportado un estado al
 * que ningún camino lleva. Entran con EFDS-1177 y EFDS-1178, que son las que
 * los producen.
 *
 * Mismo patrón de las migraciones 036, 037 y 042: DROP y ADD, para que volver a
 * correr la migración no falle.
 */
ALTER TABLE hiring.contratos
  DROP CONSTRAINT IF EXISTS ck_contrato_estado;

ALTER TABLE hiring.contratos
  ADD CONSTRAINT ck_contrato_estado CHECK (
    estado IN (
      'GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO',
      'LEGALIZADO', 'EJECUCION', 'LIQUIDADO', 'CERRADO'
    )
  );

-- Los contratos que ya se liquidaron antes de esta migración se ponen al día:
-- el acta existe, así que el estado tiene que decirlo. Sin esto, un contrato
-- liquidado la semana pasada seguiría figurando en ejecución para siempre.
UPDATE hiring.contratos c
   SET estado = 'LIQUIDADO'
  FROM hiring.actas_liquidacion a
 WHERE a.contrato_id = c.id
   AND a.estado = 'VIGENTE'
   AND c.estado = 'EJECUCION';

-- ------------------------------------------------ el cierre definitivo --
CREATE TABLE IF NOT EXISTS hiring.cierres_contrato (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id          uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  fecha_cierre         date         NOT NULL,

  /*
   * Los amparos que se miraron y cómo estaban ese día.
   *
   * Congelado con el criterio del informe final, el acta y el cierre
   * financiero: si mañana se prorroga una póliza —o se carga una garantía que
   * faltaba—, el cierre tiene que seguir explicando por qué se cerró cuando se
   * cerró. Recalcularlo al consultar diría otra cosa.
   */
  amparos_verificados  jsonb        NOT NULL DEFAULT '[]'::jsonb,

  /*
   * Cuándo venció el último amparo de estabilidad o calidad.
   *
   * Nulo cuando el contrato no tenía ninguno, que es el caso corriente de los
   * de servicios profesionales. Nulo aquí no significa «falta el dato» sino
   * «no había nada que esperar», y el jsonb vacío lo confirma.
   */
  ultimo_vencimiento   date,

  -- El soporte del cierre. Opcional: no hay un documento típico —a veces es la
  -- certificación de la aseguradora, a veces nada— y exigir uno concreto
  -- dejaría a alguien sin poder cerrar. Mismo criterio del cierre financiero.
  soporte_documento_id uuid         REFERENCES hiring.documentos(id),
  observaciones        text,

  estado               varchar(20)  NOT NULL DEFAULT 'VIGENTE',
  cerrado_por          varchar(200),
  created_at           timestamptz  NOT NULL DEFAULT now(),

  revertido_at         timestamptz,
  revertido_por        varchar(200),
  motivo_reversion     text,

  CONSTRAINT ck_cierre_contrato_estado CHECK (estado IN ('VIGENTE', 'REVERTIDO')),
  -- Revertir un cierre definitivo dice siempre por qué: el contrato se había
  -- declarado cerrado en firme ante entes de control, y reabrirlo no es un
  -- detalle administrativo.
  CONSTRAINT ck_cierre_contrato_revertido CHECK (
    estado <> 'REVERTIDO' OR (revertido_at IS NOT NULL AND motivo_reversion IS NOT NULL)
  )
);

-- Un cierre vigente por contrato, y tantos revertidos como haga falta. Mismo
-- criterio del resto del módulo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cierre_contrato_vigente
  ON hiring.cierres_contrato (contrato_id)
  WHERE estado = 'VIGENTE';

-- El nombre `ix_cierres_contrato` ya lo tomó la migración 046 para el índice de
-- `cierres_financieros`. Los nombres de índice son únicos por esquema, así que
-- uno repetido no se crea y `IF NOT EXISTS` lo deja pasar en silencio.
CREATE INDEX IF NOT EXISTS ix_cierres_definitivos_contrato
  ON hiring.cierres_contrato (contrato_id);

COMMENT ON TABLE hiring.cierres_contrato IS
  'Cierre definitivo del contrato tras vencer los amparos de estabilidad y calidad (EFDS-1175).';

-- `hiring.amparos (vigencia_hasta)` ya está indexado desde la migración 037,
-- que lo creó para el mismo tipo de pregunta: qué amparo vence primero. No hace
-- falta otro.
