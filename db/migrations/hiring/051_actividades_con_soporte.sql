-- ============================================================================
-- 051 · Registro con soporte de las actividades sin historia
--
-- Once actividades de la matriz de flujo quedaron fuera de todas las historias
-- 1146-1176: las cuatro que acompañan al estudio previo (3.2 análisis del
-- sector, 3.3 radicación, 3.4 revisión y reparto, 3.5 definir modalidad), las
-- tres de participación previa a la apertura (5.9 manifestación de interés,
-- 5.10 sorteo, 5.11 publicación de la manifestación) y las cuatro del cierre
-- de la etapa 6 (6.7 informe previo a la audiencia, 6.8 informe previo a la
-- subasta, 6.9 apertura del sobre económico previo a la subasta, 6.10 evento
-- de subasta).
--
-- Hasta hoy existían solo como filas del riel: el proceso nace con las 63
-- actividades instanciadas y estas once no tenían forma de cumplirse, así que
-- se quedaban en BORRADOR para siempre.
--
-- **Todas se resuelven por fuera de la plataforma.** El sorteo se hace en la
-- Dirección de Contratación, la subasta en SECOP II, la radicación en Active
-- Document. Siguen el criterio que atraviesa el módulo —lo que llega de afuera
-- lo transcribe el gestor con su soporte— y por eso comparten un solo
-- mecanismo en vez de once pantallas: una fecha, una nota de trazabilidad y el
-- documento que lo respalda.
--
-- Lo que **no** hace este registro: calcular nada. No sugiere modalidad (eso ya
-- lo hace EFDS-1147 sobre el estudio previo), no valida el resultado de una
-- subasta ni sortea. Deja constancia de que la actividad ocurrió y de con qué.
-- ============================================================================

-- ------------------------------------- qué actividades admiten registro --
/*
 * Tabla de parámetros, no de código, por lo mismo que los umbrales y los plazos:
 * si mañana la Dirección de Contratación dice que la 6.7 sí exige soporte, es
 * un UPDATE y no un despliegue.
 *
 * `exige_soporte` sale de la matriz donde la matriz lo dice —«adjunta soporte»,
 * «adjuntar soporte»— y es suposición del equipo donde no dice nada. Por eso
 * `confirmado` viaja al lado: marca cuáles se pueden dar por buenas.
 */
CREATE TABLE IF NOT EXISTS hiring.actividades_con_soporte (
  numeral varchar(20) PRIMARY KEY,
  etapa int NOT NULL,
  exige_soporte boolean NOT NULL DEFAULT false,
  confirmado boolean NOT NULL DEFAULT false,
  nota_fuente text
);

COMMENT ON TABLE hiring.actividades_con_soporte IS
  'Las actividades de la matriz que se cumplen registrando lo que pasó afuera, y si exigen soporte.';
COMMENT ON COLUMN hiring.actividades_con_soporte.confirmado IS
  'false mientras la exigencia de soporte sea suposición del equipo y no cita de la matriz.';

INSERT INTO hiring.actividades_con_soporte (numeral, etapa, exige_soporte, confirmado, nota_fuente)
VALUES
  -- Etapa 3. La matriz no pide soporte en ninguna, pero las cuatro producen un
  -- documento real (el estudio de mercado, el radicado, el acta de la mesa de
  -- trabajo). Exigirlo es decisión del equipo: sin confirmar.
  ('3.2', 3, true,  false, 'Consulta de proveedores, precios de mercado y fichas técnicas para estimar el valor.'),
  ('3.3', 3, true,  false, 'Debe generar un consecutivo en Active Document; el soporte es ese radicado.'),
  ('3.4', 3, false, false, 'Revisiones, mesas de trabajo y observaciones al estudio previo.'),
  ('3.5', 3, false, false, 'Licitación, Selección Abreviada, Concurso de Méritos, Directa o Mínima Cuantía (Decreto 1082/2015).'),
  -- Etapa 5. La matriz es explícita en las tres.
  ('5.9',  5, false, true, 'Campo para nota de trazabilidad, alerta según cronograma de fecha máxima para manifestar interés.'),
  ('5.10', 5, true,  true, 'Campo de sí/no, adjunta soporte.'),
  ('5.11', 5, true,  true, 'Adjuntar soporte.'),
  -- Etapa 6. Las dos primeras son informes publicados y las dos últimas ocurren
  -- en SECOP II; la matriz nombra el documento pero no dice «adjuntar».
  ('6.7',  6, true,  false, 'Informe de evaluación publicado en SECOP 2.'),
  ('6.8',  6, true,  false, 'Generado en la Dirección de Contratación por los profesionales a cargo del proceso.'),
  ('6.9',  6, false, false, 'Se adelanta la apertura de las ofertas económicas de los oferentes habilitados en SECOP 2.'),
  ('6.10', 6, false, false, 'Se adelanta a través de la plataforma de subasta de SECOP 2.')
ON CONFLICT (numeral) DO NOTHING;

-- --------------------------------------------------- el registro en sí --
/*
 * `fecha` es cuándo ocurrió el hecho, no cuándo se digitó: el sorteo se hace un
 * día y se transcribe otro, y la alerta de la 5.9 se cuenta contra el
 * cronograma, no contra el momento en que alguien abrió la pantalla.
 *
 * `datos` recoge lo propio de cada actividad —el sí/no del sorteo, el número de
 * radicado de la 3.3— sin columna por actividad. Va en jsonb y no en columnas
 * con CHECK, a diferencia de las modificaciones contractuales, porque aquí nada
 * lleva llave foránea: son anotaciones, no relaciones.
 */
CREATE TABLE IF NOT EXISTS hiring.registros_actividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral varchar(20) NOT NULL REFERENCES hiring.actividades_con_soporte(numeral),
  fecha date NOT NULL,
  nota text NOT NULL,
  documento_id uuid REFERENCES hiring.documentos(id),
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado varchar(20) NOT NULL DEFAULT 'VIGENTE',
  registrado_por varchar(200),
  registrado_at timestamptz NOT NULL DEFAULT now(),
  anulado_at timestamptz,
  anulado_por varchar(200),
  motivo_anulacion text,
  CONSTRAINT ck_registro_actividad_estado
    CHECK (estado IN ('VIGENTE', 'ANULADO')),
  -- Anular exige decir por qué, como en el resto del módulo.
  CONSTRAINT ck_registro_actividad_anulacion
    CHECK (estado <> 'ANULADO' OR (anulado_at IS NOT NULL AND motivo_anulacion IS NOT NULL))
);

/*
 * Una sola vigente por actividad y proceso. Parcial y no total: los registros
 * anulados se quedan —son la historia de lo que se corrigió— y un índice total
 * impediría registrar de nuevo después de anular.
 */
CREATE UNIQUE INDEX IF NOT EXISTS uq_registro_actividad_vigente
  ON hiring.registros_actividad (proceso_id, numeral)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_registros_actividad_proceso
  ON hiring.registros_actividad (proceso_id);

COMMENT ON TABLE hiring.registros_actividad IS
  'Constancia de que una actividad sin historia propia ocurrió, con su fecha, su nota y su soporte.';
COMMENT ON COLUMN hiring.registros_actividad.fecha IS
  'Cuándo ocurrió el hecho, no cuándo se transcribió.';
