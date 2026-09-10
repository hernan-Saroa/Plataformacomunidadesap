-- ============================================================================
-- 009 · Umbrales de cuantía por modalidad
--
-- EFDS-1147 pide que el sistema sugiera la modalidad según la cuantía. Los
-- umbrales que gobiernan esa sugerencia son parámetros que administra la
-- Dirección de Contratación, no constantes en el código: cambian con la
-- normativa y con el salario mínimo de cada año, y una cifra incrustada en un
-- `if` obligaría a desplegar para corregir un dato de negocio.
--
-- Los documentos fuente NO traen los valores. El requerimiento y la matriz de
-- flujo solo dicen "según cuantía/umbral"; el único número que aparece
-- (1.000 SMMLV) es para otra cosa: cuándo un contrato directo pasa por Comité
-- de Contratación. Por eso todo lo que se siembra aquí queda con
-- `confirmado = false` y debe validarse con la Dirección de Contratación antes
-- de usarse en producción.
--
-- Dos unidades, porque conviven dos orígenes:
--   · SMMLV — la Ley 1150 de 2007 define las cuantías en salarios mínimos. Se
--     guarda el número de salarios y se resuelve contra el SMMLV del año, así
--     que en enero solo se carga el salario nuevo y los umbrales se recalculan
--     solos.
--   · PESOS — para los topes que la entidad fije en cifra cerrada, que no
--     siguen al salario.
-- ============================================================================

-- ------------------------------------------------- salario mínimo por año ---
-- Tabla propia y no una constante: el SMMLV cambia cada año por decreto y de
-- él dependen todos los umbrales expresados en salarios.
CREATE TABLE IF NOT EXISTS hiring.smmlv (
  anio        int          PRIMARY KEY,
  valor       numeric(18, 2) NOT NULL CHECK (valor > 0),
  -- Mientras esté en false, el valor es un supuesto del equipo de desarrollo.
  confirmado  boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.smmlv IS
  'Salario mínimo mensual legal vigente por año. Base de los umbrales expresados en SMMLV (EFDS-1147).';

-- Valores POR CONFIRMAR: verificar contra el decreto de salario de cada año
-- antes de dar por buena cualquier sugerencia de modalidad.
INSERT INTO hiring.smmlv (anio, valor, confirmado) VALUES
  (2025, 1423500.00, false),
  (2026, 1623500.00, false)
ON CONFLICT (anio) DO NOTHING;

-- ------------------------------------ modalidades que no dependen de cuantía -
-- Contratación directa, régimen especial 092/2017 y enajenación por subasta se
-- eligen por la causal, no por el monto. Sin esta marca no habría cómo
-- distinguir "esta modalidad no se decide por cuantía" de "a esta modalidad le
-- falta configurar el umbral", y la regla de EFDS-1325 necesita esa diferencia.
ALTER TABLE hiring.modalidades
  ADD COLUMN IF NOT EXISTS determinada_por_cuantia boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN hiring.modalidades.determinada_por_cuantia IS
  'False cuando la modalidad se elige por causal y no por monto (directa, 092/2017, enajenación).';

UPDATE hiring.modalidades
   SET determinada_por_cuantia = false
 WHERE codigo IN ('CONTRATACION_DIRECTA', 'REGIMEN_ESPECIAL_092', 'ENAJENACION_SUBASTA');

-- ------------------------------------------------------------- umbrales -----
CREATE TABLE IF NOT EXISTS hiring.umbrales_modalidad (
  id              uuid           PRIMARY KEY DEFAULT uuid_generate_v4(),
  modalidad       varchar(60)    NOT NULL REFERENCES hiring.modalidades (codigo),

  -- Intervalo semiabierto [inferior, superior): el límite superior pertenece al
  -- tramo siguiente. Así dos umbrales contiguos no se solapan en el valor
  -- exacto de la frontera, que es el borde que más se equivoca.
  -- NULL en inferior = sin piso; NULL en superior = sin techo.
  limite_inferior numeric(18, 2),
  limite_superior numeric(18, 2),

  unidad          varchar(10)    NOT NULL DEFAULT 'SMMLV'
                  CHECK (unidad IN ('SMMLV', 'PESOS')),

  -- Un umbral no se edita: se cierra y se abre otro. Los procesos ya creados
  -- deben poder explicarse con las reglas que estaban vigentes ese día.
  vigencia_desde  date           NOT NULL DEFAULT CURRENT_DATE,
  vigencia_hasta  date,

  -- False mientras la Dirección de Contratación no confirme la cifra.
  confirmado      boolean        NOT NULL DEFAULT false,

  created_by      varchar(160),
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT umbral_limites_coherentes CHECK (
    limite_inferior IS NULL
    OR limite_superior IS NULL
    OR limite_inferior < limite_superior
  ),
  CONSTRAINT umbral_algun_limite CHECK (
    limite_inferior IS NOT NULL OR limite_superior IS NOT NULL
  ),
  CONSTRAINT umbral_vigencia_coherente CHECK (
    vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde
  ),
  CONSTRAINT umbral_no_negativo CHECK (
    (limite_inferior IS NULL OR limite_inferior >= 0)
    AND (limite_superior IS NULL OR limite_superior >= 0)
  )
);

COMMENT ON TABLE hiring.umbrales_modalidad IS
  'Rangos de cuantía que sugieren cada modalidad. Parametrizables por administrador (EFDS-1147).';

-- Una modalidad no puede tener dos umbrales abiertos a la vez: sería ambiguo
-- cuál aplica. Los cerrados (vigencia_hasta no nulo) sí pueden repetirse, que
-- es justamente el historial.
CREATE UNIQUE INDEX IF NOT EXISTS idx_umbral_vigente_por_modalidad
  ON hiring.umbrales_modalidad (modalidad)
  WHERE vigencia_hasta IS NULL;

CREATE INDEX IF NOT EXISTS idx_umbral_vigencia
  ON hiring.umbrales_modalidad (vigencia_desde, vigencia_hasta);

-- ------------------------------------------------------------- seed ---------
-- VALORES PROVISIONALES — TODOS CON confirmado = false.
--
-- Construidos sobre la estructura de la Ley 1150 de 2007, art. 2: la menor
-- cuantía depende del presupuesto anual de la entidad en SMMLV, y la mínima
-- cuantía es el 10% de la menor. NO se conoce el presupuesto anual de la ESAP,
-- así que el tramo elegido (menor cuantía = 1.000 SMMLV) es un supuesto del
-- equipo de desarrollo, no un dato verificado.
--
-- Lo que este seed garantiza no es la cifra, sino que la cadena completa
-- funcione punta a punta con datos coherentes. Cambiar los números es una
-- actualización de filas, no un despliegue.
INSERT INTO hiring.umbrales_modalidad
  (modalidad, limite_inferior, limite_superior, unidad, confirmado, created_by)
VALUES
  -- [0, 100) SMMLV — 10% de la menor cuantía
  ('MINIMA_CUANTIA',            0,    100,  'SMMLV', false, 'seed-009'),
  -- [100, 1000) SMMLV
  ('ABREVIADA_MENOR_CUANTIA',   100,  1000, 'SMMLV', false, 'seed-009'),
  -- [1000, ∞) SMMLV — por encima de la menor cuantía la licitación es forzosa
  ('LICITACION_PUBLICA',        1000, NULL, 'SMMLV', false, 'seed-009')
ON CONFLICT DO NOTHING;

-- Las demás modalidades determinadas por cuantía (subasta inversa, TVEC, bolsa
-- mercantil, los dos concursos de méritos) se dejan SIN umbral a propósito: la
-- causal manda sobre el monto y sus rangos hay que confirmarlos uno por uno.
-- La ausencia de fila es un estado legítimo, no un dato faltante.
