-- ============================================================================
-- 669 · EFDS-2345 / EFDS-2375 — Áreas de formación canónicas, equivalencias y
-- núcleo de cada docente.
--
-- El área de formación es lo que relaciona a un docente con las asignaturas que
-- puede dictar (EFDS-2371: el programador filtra por núcleo temático). Los nombres
-- de área NO son un catálogo limpio: el plan de estudios, el catálogo
-- `nucleo_tematico` y el RUND escriben la misma área de formas distintas, y cada
-- generación de plan le cambió el nombre. Comparar texto dejaría por fuera, sin
-- avisar, a docentes aptos.
--
-- Por eso:
--   · `area_formacion`      — el área CANÓNICA (con código). Una por área real; en
--                              posgrado, mientras llegan las áreas, el programa es
--                              el área (`id_programa`).
--   · `nucleo_equivalencia` — DATOS EDITABLES (no código): cada forma de escribir un
--                              área, normalizada, apunta a su área canónica. También
--                              registra las frases genéricas que NO son un núcleo
--                              («Labores de docencia…») y los núcleos reales que aún
--                              no tienen área (se reportan).
--   · `docente_nucleo`      — qué áreas puede dictar cada docente, con su ORIGEN:
--                              `rund` (interpretado del NUCLEO_TEMATICO del RUND) o
--                              `puente` (áreas de las asignaturas que ya dicta, para
--                              los catedráticos mientras el RUND no traiga su núcleo).
--                              El texto original se conserva en el RUND
--                              ("Docente"."nucleoTematico") y en `texto_origen`.
--
-- La tabla de equivalencias la definió Tomás (instrucción de la ronda 3b, §3). El
-- archivo que genera Codex (`datos/nucleos/nucleo_equivalencia.csv`) la reemplaza con
-- la misma estructura.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- ── Normalización única (la misma que `normalizarNucleo` en TypeScript) ──────────
-- minúsculas, sin tildes, sin . , ; : ( ), espacios unificados.
CREATE OR REPLACE FUNCTION academic_work_plan.normalizar_nucleo(texto text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             translate(lower(coalesce(texto, '')),
                       'áéíóúàèìòùäëïöüâêîôûñç',
                       'aeiouaeiouaeiouaeiounc'),
             '[.,;:()]', ' ', 'g'),
           '\s+', ' ', 'g'));
$$;

COMMENT ON FUNCTION academic_work_plan.normalizar_nucleo(text) IS
  'Normaliza un nombre de área/núcleo para compararlo: minúsculas, sin tildes, sin puntuación, espacios unificados. Igual a normalizarNucleo() en el PTA.';

-- ── Áreas canónicas ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_work_plan.area_formacion (
  id           BIGSERIAL PRIMARY KEY,
  codigo       VARCHAR(20)  NOT NULL UNIQUE,
  nombre       VARCHAR(200) NOT NULL UNIQUE,
  -- Posgrado: el programa es el área mientras llegan las áreas de posgrado.
  id_programa  BIGINT REFERENCES academic_work_plan.programa(id) ON DELETE RESTRICT,
  activa       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_area_formacion_programa UNIQUE (id_programa)
);

COMMENT ON TABLE academic_work_plan.area_formacion IS
  'Área de formación canónica (EFDS-2345). Las variantes de nombre apuntan aquí desde nucleo_equivalencia. En posgrado, id_programa = el programa como área.';

INSERT INTO academic_work_plan.area_formacion (codigo, nombre)
SELECT v.codigo, v.nombre
  FROM (VALUES
    ('AF-01', 'Estado y Poder'),
    ('AF-02', 'Organizaciones Públicas'),
    ('AF-03', 'Economía Pública'),
    ('AF-04', 'Finanzas Públicas'),
    ('AF-05', 'Desarrollo y Gestión Territorial'),
    ('AF-06', 'Gestión del Desarrollo'),
    ('AF-07', 'Cuantitativa'),
    ('AF-08', 'Problemática Pública'),
    ('AF-09', 'Espacio, Tiempo y Territorio'),
    ('AF-10', 'Estado, Gobierno y Sociedad'),
    ('AF-11', 'Idiomas'),
    ('AF-12', 'Electivas'),
    ('AF-13', 'Complementario'),
    ('AF-14', 'Formación Específica'),
    ('AF-15', 'Teoría Económica e Historia'),
    ('AF-16', 'Formación integral y de contexto'),
    ('AF-17', 'Opción de grado'),
    ('AF-18', 'Formación General')
  ) AS v(codigo, nombre)
 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.area_formacion a WHERE a.codigo = v.codigo);

-- Posgrado: un área por programa (el programa como área).
INSERT INTO academic_work_plan.area_formacion (codigo, nombre, id_programa)
SELECT 'AF-PRG-' || p.id, 'Programa: ' || p.nombre, p.id
  FROM academic_work_plan.programa p
 WHERE lower(coalesce(p.tipo, '')) IN ('especializacion', 'maestria', 'doctorado')
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan.area_formacion a WHERE a.id_programa = p.id)
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan.area_formacion a WHERE a.nombre = 'Programa: ' || p.nombre);

-- ── Equivalencias (datos editables) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_work_plan.nucleo_equivalencia (
  id                    BIGSERIAL PRIMARY KEY,
  variante              VARCHAR(300) NOT NULL,
  variante_normalizada  VARCHAR(300) NOT NULL UNIQUE,
  coincidencia          VARCHAR(10)  NOT NULL DEFAULT 'exacta' CHECK (coincidencia IN ('exacta', 'prefijo')),
  tipo                  VARCHAR(10)  NOT NULL CHECK (tipo IN ('area', 'generica', 'sin_area')),
  id_area               BIGINT REFERENCES academic_work_plan.area_formacion(id) ON DELETE RESTRICT,
  fuente                VARCHAR(10)  NOT NULL CHECK (fuente IN ('plan', 'rund', 'base', 'manual')),
  activa                BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ,
  -- Un área exige su área canónica; una frase genérica o un núcleo sin área, no.
  CONSTRAINT chk_equivalencia_area CHECK ((tipo = 'area') = (id_area IS NOT NULL))
);

COMMENT ON TABLE academic_work_plan.nucleo_equivalencia IS
  'Variantes de nombre de área (plan, catálogo, RUND) → área canónica. Datos editables, no código. tipo=generica: frase que no es un núcleo; tipo=sin_area: núcleo real aún sin área (se reporta).';

INSERT INTO academic_work_plan.nucleo_equivalencia (variante, variante_normalizada, coincidencia, tipo, id_area, fuente)
SELECT v.variante, academic_work_plan.normalizar_nucleo(v.variante), v.coincidencia, v.tipo,
       (SELECT a.id FROM academic_work_plan.area_formacion a WHERE a.codigo = v.codigo), v.fuente
  FROM (VALUES
    -- Estado y Poder
    ('AF-01', 'Estado y Poder', 'exacta', 'area', 'plan'),
    ('AF-01', 'Problemática del Estado y del Poder', 'exacta', 'area', 'plan'),
    ('AF-01', 'Problemática del Estado y Poder', 'exacta', 'area', 'rund'),
    ('AF-01', 'Regímenes y Sistemas Políticos', 'exacta', 'area', 'rund'),
    ('AF-01', 'Derechos Constitucional y Organización del Estado', 'exacta', 'area', 'rund'),
    -- Organizaciones Públicas
    ('AF-02', 'Organizaciones Públicas', 'exacta', 'area', 'plan'),
    ('AF-02', 'Organizaciones Públicas y Gestión', 'exacta', 'area', 'plan'),
    ('AF-02', 'Derecho Administrativo y Contratación Estatal', 'exacta', 'area', 'rund'),
    ('AF-02', 'Gerencia Pública Integral', 'exacta', 'area', 'rund'),
    ('AF-02', 'Gerencia de los Recursos Físicos y Financieros', 'exacta', 'area', 'rund'),
    -- Economía Pública
    ('AF-03', 'Economía Pública', 'exacta', 'area', 'plan'),
    ('AF-03', 'Economía de lo Público', 'exacta', 'area', 'plan'),
    ('AF-03', 'Política Económica y Procesos Económicos Territoriales', 'exacta', 'area', 'rund'),
    -- Finanzas Públicas
    ('AF-04', 'Finanzas Públicas', 'exacta', 'area', 'plan'),
    ('AF-04', 'Finanzas Públicas y Presupuesto', 'prefijo', 'area', 'rund'),
    -- Desarrollo y Gestión Territorial
    ('AF-05', 'Desarrollo y Gestión Territorial', 'exacta', 'area', 'plan'),
    ('AF-05', 'Gestión Territorial', 'exacta', 'area', 'plan'),
    -- Gestión del Desarrollo
    ('AF-06', 'Gestión del Desarrollo', 'prefijo', 'area', 'plan'),
    ('AF-06', 'Gestión para el Desarrollo', 'exacta', 'area', 'rund'),
    ('AF-06', 'Teorías y Enfoques del Desarrollo', 'prefijo', 'area', 'rund'),
    ('AF-06', 'Proyectos de Desarrollo', 'prefijo', 'area', 'rund'),
    ('AF-06', 'Planeación del Desarrollo', 'prefijo', 'area', 'rund'),
    -- Cuantitativa
    ('AF-07', 'Cuantitativa', 'exacta', 'area', 'plan'),
    ('AF-07', 'Fundamentación cuantitativa', 'exacta', 'area', 'plan'),
    ('AF-07', 'Matemáticas, Estadística', 'exacta', 'area', 'rund'),
    ('AF-07', 'Ciencias de Datos', 'exacta', 'area', 'rund'),
    -- Problemática Pública
    ('AF-08', 'Problemática Pública', 'exacta', 'area', 'plan'),
    ('AF-08', 'Problremática Pública', 'exacta', 'area', 'rund'),
    ('AF-08', 'Pensamiento Administrativo y Problemática Pública', 'exacta', 'area', 'rund'),
    -- Espacio, Tiempo y Territorio
    ('AF-09', 'Espacio, Tiempo y Territorio', 'exacta', 'area', 'plan'),
    -- Estado, Gobierno y Sociedad (la más incierta: Gobierno y Políticas Públicas)
    ('AF-10', 'Estado, Gobierno y Sociedad', 'exacta', 'area', 'plan'),
    ('AF-10', 'Gobierno y Políticas Públicas', 'exacta', 'area', 'rund'),
    ('AF-10', 'Gobierno y Política Pública', 'prefijo', 'area', 'rund'),
    -- Idiomas
    ('AF-11', 'Idiomas', 'exacta', 'area', 'plan'),
    ('AF-11', 'Idioma extranjero', 'exacta', 'area', 'plan'),
    -- Electivas
    ('AF-12', 'Electivas', 'exacta', 'area', 'plan'),
    ('AF-12', 'Electivas Generales', 'exacta', 'area', 'plan'),
    -- Complementario
    ('AF-13', 'Complementario', 'exacta', 'area', 'plan'),
    ('AF-13', 'Complementaria', 'exacta', 'area', 'base'),
    -- Formación Específica
    ('AF-14', 'Materias de Formación Específica', 'exacta', 'area', 'plan'),
    ('AF-14', 'Ciclo de Formación Específica', 'exacta', 'area', 'base'),
    -- Las que quedan solas
    ('AF-15', 'Teoría Económica e Historia', 'exacta', 'area', 'plan'),
    ('AF-16', 'Formación integral y de contexto', 'exacta', 'area', 'plan'),
    ('AF-17', 'Opción de grado', 'exacta', 'area', 'plan'),
    ('AF-18', 'Formación General', 'exacta', 'area', 'plan'),
    -- Frases genéricas: NO son un núcleo
    (NULL, 'Labores de docencia', 'prefijo', 'generica', 'rund'),
    (NULL, 'Impartir asignaturas', 'prefijo', 'generica', 'rund'),
    (NULL, 'Desarrollo de los diferentes programas misionales', 'prefijo', 'generica', 'rund'),
    (NULL, 'Programas curriculares', 'prefijo', 'generica', 'rund'),
    -- Núcleos reales sin área todavía: se reportan
    (NULL, 'Procesos Étnicos e Interculturales', 'exacta', 'sin_area', 'rund'),
    (NULL, 'Gerencia Social', 'exacta', 'sin_area', 'rund')
  ) AS v(codigo, variante, coincidencia, tipo, fuente)
ON CONFLICT (variante_normalizada) DO NOTHING;

-- ── Núcleo de cada docente ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_work_plan.docente_nucleo (
  id            BIGSERIAL PRIMARY KEY,
  -- Identidad estable de la persona (la misma de franja_horaria.id_docente).
  id_persona    UUID   NOT NULL REFERENCES auth.personas(id_person) ON DELETE CASCADE,
  id_area       BIGINT NOT NULL REFERENCES academic_work_plan.area_formacion(id) ON DELETE RESTRICT,
  origen        VARCHAR(10) NOT NULL CHECK (origen IN ('rund', 'puente')),
  -- De dónde salió: la parte del NUCLEO_TEMATICO del RUND, o las asignaturas que dicta.
  texto_origen  TEXT,
  cargado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cargado_por   VARCHAR(120),
  CONSTRAINT uq_docente_nucleo UNIQUE (id_persona, id_area, origen)
);

CREATE INDEX IF NOT EXISTS idx_docente_nucleo_area ON academic_work_plan.docente_nucleo (id_area, origen);

COMMENT ON TABLE academic_work_plan.docente_nucleo IS
  'Áreas que puede dictar cada docente (EFDS-2345). origen=rund: del NUCLEO_TEMATICO del RUND; origen=puente: de las asignaturas que ya dicta (temporal, para catedráticos; se apaga con PROG_NUCLEO_PUENTE=false en Programación Académica).';

-- ── Canario ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_sin_variante INT; v_rotas INT;
BEGIN
  -- Toda área canónica de pregrado tiene al menos una variante (su nombre).
  SELECT count(*) INTO v_sin_variante
    FROM academic_work_plan.area_formacion a
   WHERE a.id_programa IS NULL
     AND NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_equivalencia e WHERE e.id_area = a.id);
  IF v_sin_variante > 0 THEN
    RAISE EXCEPTION '669: % áreas canónicas sin ninguna variante', v_sin_variante;
  END IF;
  -- La normalización de SQL es idempotente sobre lo sembrado.
  SELECT count(*) INTO v_rotas FROM academic_work_plan.nucleo_equivalencia
   WHERE variante_normalizada <> academic_work_plan.normalizar_nucleo(variante_normalizada);
  IF v_rotas > 0 THEN
    RAISE EXCEPTION '669: % variantes mal normalizadas', v_rotas;
  END IF;
END $$;
