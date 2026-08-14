-- ============================================================================
-- 014 · Motor de reglas por actividad
--
-- La matriz no se limita a decir si una actividad aplica: también dice qué
-- hay que cumplir para darla por terminada, y eso cambia con la modalidad.
-- Hasta ahora esas condiciones vivían en el código del estudio previo, así
-- que cada actividad nueva las habría vuelto a escribir.
--
-- Al convertir la matriz aparecen seis tipos de condición distintos, no uno:
--
--   CAMPO_OBLIGATORIO   un dato del formulario que no puede quedar vacío
--   DOCUMENTO_REQUERIDO un adjunto sin el cual la actividad no tiene entregable
--   RANGO_VALOR         un umbral, como el tope de Mínima Cuantía
--   PLAZO_MINIMO        días que deben transcurrir, como la publicación previa
--   BLOQUEA_AVANCE      "sin CDP no se puede continuar" (numeral 4.3)
--   REGLA_DERIVADA      depende de otro dato, como la causal por modalidad
--
-- El detalle de cada una va en `config` como JSON en vez de en columnas: un
-- umbral necesita `max`, un plazo necesita `dias` y un campo obligatorio
-- necesita `codigo`. Con columnas fijas la tabla quedaría casi toda en NULL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.reglas_actividad (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numeral     varchar(10) NOT NULL REFERENCES hiring.actividades_catalogo (numeral) ON DELETE CASCADE,

  -- NULL = la regla aplica a todas las modalidades. Evita repetir once veces
  -- una condición que no distingue entre ellas.
  modalidad   varchar(60) REFERENCES hiring.modalidades (codigo),

  tipo        varchar(30) NOT NULL,
  config      jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Mensaje que ve el gestor cuando la regla no se cumple. En la tabla y no
  -- en el código porque el texto lo redacta Contratación, no desarrollo.
  mensaje     text,

  -- Orden en que se evalúan y se muestran los incumplimientos.
  orden       int         NOT NULL DEFAULT 100,

  -- Vigencia: un proceso aprobado en enero debe poder auditarse con las
  -- reglas de enero. Sin esto, corregir un umbral reescribiría la historia de
  -- lo ya aprobado y una auditoría posterior encontraría incumplimientos que
  -- no existían al momento de decidir.
  vigente_desde timestamptz NOT NULL DEFAULT now(),
  vigente_hasta timestamptz,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_regla_tipo CHECK (tipo IN (
    'CAMPO_OBLIGATORIO',
    'DOCUMENTO_REQUERIDO',
    'RANGO_VALOR',
    'PLAZO_MINIMO',
    'BLOQUEA_AVANCE',
    'REGLA_DERIVADA'
  )),
  -- Una vigencia que termina antes de empezar dejaría la regla inaplicable
  -- sin que nadie lo note.
  CONSTRAINT ck_regla_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
);

-- Las consultas siempre piden las reglas vigentes de una actividad, con o sin
-- modalidad; el índice parcial deja fuera las derogadas.
CREATE INDEX IF NOT EXISTS idx_reglas_actividad_vigentes
  ON hiring.reglas_actividad (numeral, modalidad, orden)
  WHERE vigente_hasta IS NULL;

-- --------------------------------------------------- reglas del numeral 3.1 -
-- El estudio previo ya tenía sus condiciones en campos_formulario y en el
-- código del servicio. Se declaran aquí para que el motor las evalúe igual
-- que las de cualquier otra actividad; campos_formulario sigue siendo la
-- fuente de las etiquetas y los tipos.

INSERT INTO hiring.reglas_actividad (numeral, modalidad, tipo, config, mensaje, orden)
SELECT
  '3.1',
  NULL,
  'CAMPO_OBLIGATORIO',
  jsonb_build_object('codigo', codigo),
  'Falta diligenciar ' || etiqueta,
  orden
FROM hiring.campos_formulario
WHERE numeral = '3.1' AND obligatorio AND activo
ON CONFLICT DO NOTHING;

INSERT INTO hiring.reglas_actividad (numeral, modalidad, tipo, config, mensaje, orden)
VALUES (
  '3.1',
  NULL,
  'DOCUMENTO_REQUERIDO',
  '{"tipo": "ADJUNTO", "minimo": 1}'::jsonb,
  'Debe adjuntar el estudio previo diligenciado y firmado',
  200
)
ON CONFLICT DO NOTHING;

-- La causal normativa solo se exige donde la norma marco no basta para saber
-- por qué se eligió esa vía. En las otras nueve modalidades pedirla bloquearía
-- el envío sin motivo.
INSERT INTO hiring.reglas_actividad (numeral, modalidad, tipo, config, mensaje, orden)
VALUES
  ('3.1', 'CONTRATACION_DIRECTA', 'CAMPO_OBLIGATORIO',
   '{"codigo": "causal_normativa"}'::jsonb,
   'La contratación directa exige indicar la causal que la sustenta', 75),
  ('3.1', 'REGIMEN_ESPECIAL_092', 'CAMPO_OBLIGATORIO',
   '{"codigo": "causal_normativa"}'::jsonb,
   'El régimen especial exige indicar el artículo que lo sustenta', 75)
ON CONFLICT DO NOTHING;
