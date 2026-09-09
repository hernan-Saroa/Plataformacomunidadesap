-- ============================================================================
-- 038 · La evaluación se hace por fuera; la plataforma recibe el resultado
--
-- Corrección de EFDS-1157. La 035 construyó la evaluación como si el comité
-- calificara dentro del sistema: un catálogo de criterios habilitantes y
-- ponderables, un juicio por oferta y dimensión, y una consolidación que
-- decidía quién quedaba habilitado y con cuánto puntaje.
--
-- No es así como trabaja la ESAP. El comité evalúa por fuera —con sus propios
-- formatos y su cuadro comparativo— y elige la oferta ganadora; lo que llega a
-- la plataforma es el resultado ya tomado y los documentos que lo sustentan.
-- La matriz de roles lo decía desde el principio y no se leyó a tiempo: del
-- Comité Evaluador dice "accede a consultar las ofertas que estén cargadas" y
-- "consulta y cargue de archivos". Consultar y cargar; nunca calificar.
--
-- Por eso esta migración **borra** las tres tablas de la 035 en vez de dejarlas
-- sin uso. Una tabla de criterios que no gobierna ningún cálculo invita a
-- volver a llenarla, y un `evaluaciones_oferta` vacío al lado del resultado
-- real haría dudar de cuál manda. Lo que se borra son supuestos del equipo que
-- nunca llegaron a producción, no expediente de nadie.
--
-- Lo que sí se conserva es todo lo de EFDS-1156: el comité se sigue designando
-- por memorando y sigue siendo el que responde. Cambia lo que hace adentro.
-- ============================================================================

-- ---------------------------------------------- lo que deja de existir --
-- En orden de dependencia: el resultado por criterio, el juicio por dimensión
-- y por último el catálogo al que ambos apuntaban.
DROP TABLE IF EXISTS hiring.evaluacion_criterios;
DROP TABLE IF EXISTS hiring.evaluaciones_oferta;
DROP TABLE IF EXISTS hiring.criterios_evaluacion;

-- La actividad sigue siendo la 6.3 y sigue llamándose evaluación de ofertas
-- —la matriz la numera 6.2 y el realineamiento sigue abierto en EFDS-1445—,
-- pero su descripción decía que el comité calificaba aquí dentro.
UPDATE hiring.actividades
   SET nombre = 'Evaluación de las ofertas',
       descripcion = 'El comité evalúa las ofertas por fuera de la plataforma y elige la ganadora; aquí se registra el resultado con su informe y las evidencias que lo sustentan.'
 WHERE numeral = '6.3';

-- El valor ofertado se queda: lo captura el gestor al registrar cada oferta
-- (actividad 6.1) y es un dato de la oferta, no un juicio. Lo que cambia es
-- para qué sirve: ya no alimenta ningún cálculo de puntaje.
COMMENT ON COLUMN hiring.oferentes.valor_ofertado IS
  'Valor de la oferta tal como se presentó. Dato de la oferta, no base de cálculo: la evaluación se hace por fuera (EFDS-1157).';

-- ------------------------------------------------- el resultado que llega --
-- Una fila por proceso: quién ganó, con cuánto y por qué. Los números entran
-- como los trae el comité; la plataforma no los calcula ni los verifica contra
-- nada, porque no tiene con qué —el cuadro comparativo vive en el informe.
CREATE TABLE IF NOT EXISTS hiring.resultados_evaluacion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- La oferta que el comité eligió. Con FK a oferentes: la ganadora tiene que
  -- ser una de las que el proceso recibió y no un nombre escrito a mano.
  oferente_id           uuid        NOT NULL REFERENCES hiring.oferentes(id),

  -- El informe del comité. Sin él esto sería la opinión de quien digitó, así
  -- que la columna es obligatoria, con el mismo criterio del memorando de
  -- designación (025).
  informe_documento_id  uuid        NOT NULL REFERENCES hiring.documentos(id),

  -- La valoración, tal como la reporta el comité. Nulos permitidos porque no
  -- toda modalidad puntúa: en mínima cuantía suele bastar con el menor precio
  -- que cumple, sin nota. Cuando vienen, vienen los dos: un 85 sin saber sobre
  -- cuánto no dice nada.
  puntaje_obtenido      numeric(6, 2),
  puntaje_maximo        numeric(6, 2),

  -- El valor por el que se evalúa la ganadora. Suele ser el `valor_ofertado`
  -- de la oferta, y se guarda aparte porque puede no serlo: una corrección
  -- aritmética del comité cambia la cifra que se adjudica sin reescribir lo
  -- que el oferente presentó.
  valor_evaluado        numeric(18, 2),

  -- Por qué esa y no otra. Obligatoria: es lo que el traslado del informe
  -- (6.4) le tiene que poder mostrar a los demás oferentes.
  justificacion         text        NOT NULL,

  estado                varchar(20) NOT NULL DEFAULT 'VIGENTE',
  registrado_por        varchar(200),
  registrado_at         timestamptz NOT NULL DEFAULT now(),

  rectificado_at        timestamptz,
  rectificado_por       varchar(200),
  motivo_rectificacion  text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_resultado_estado CHECK (estado IN ('VIGENTE', 'RECTIFICADO')),
  -- Un resultado rectificado dice siempre cuándo y por qué: es lo que explica
  -- que el expediente tenga dos informes de evaluación del mismo proceso.
  CONSTRAINT ck_resultado_rectificado CHECK (
    estado <> 'RECTIFICADO'
    OR (rectificado_at IS NOT NULL AND motivo_rectificacion IS NOT NULL)
  ),
  -- O los dos puntajes o ninguno, y el obtenido nunca por encima del máximo.
  CONSTRAINT ck_resultado_puntajes CHECK (
    (puntaje_obtenido IS NULL AND puntaje_maximo IS NULL)
    OR (
      puntaje_obtenido IS NOT NULL AND puntaje_maximo IS NOT NULL
      AND puntaje_obtenido >= 0 AND puntaje_maximo > 0
      AND puntaje_obtenido <= puntaje_maximo
    )
  ),
  CONSTRAINT ck_resultado_valor CHECK (valor_evaluado IS NULL OR valor_evaluado > 0)
);

-- Un solo resultado vigente por proceso, tantos rectificados como haga falta.
-- Índice parcial y no UNIQUE a secas, por lo mismo que el comité (025):
-- corregir es rectificar el anterior y registrar otro, y los dos se quedan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resultado_vigente
  ON hiring.resultados_evaluacion (proceso_id)
  WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.resultados_evaluacion IS
  'Resultado de la evaluación hecha por el comité fuera de la plataforma: oferta ganadora, su valoración y el informe que la sustenta (EFDS-1157).';

-- ------------------------------------------------------------ evidencias --
-- Lo que el comité carga además del informe: las verificaciones jurídica,
-- financiera y técnica, el cuadro comparativo, las actas de reunión.
--
-- Tabla aparte y no una columna más en el resultado porque son varias, llegan
-- en momentos distintos y cada una la sube quien la produjo. Es exactamente el
-- "cargue de archivos" que la matriz de roles le reconoce al comité.
CREATE TABLE IF NOT EXISTS hiring.evidencias_evaluacion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_id  uuid         NOT NULL REFERENCES hiring.resultados_evaluacion(id) ON DELETE CASCADE,
  documento_id  uuid         NOT NULL REFERENCES hiring.documentos(id),

  -- Qué es lo que se está cargando. Obligatoria: una lista de archivos sin
  -- decir cuál es cuál no sustenta nada.
  descripcion   varchar(300) NOT NULL,
  cargada_por   varchar(200),
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_evidencias_resultado
  ON hiring.evidencias_evaluacion (resultado_id);

COMMENT ON TABLE hiring.evidencias_evaluacion IS
  'Documentos con que el comité sustenta su evaluación: verificaciones, cuadro comparativo, actas (EFDS-1157).';
