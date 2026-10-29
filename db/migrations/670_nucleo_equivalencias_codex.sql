-- ============================================================================
-- 670 · EFDS-2345 — Equivalencias de núcleo del archivo de Codex.
--
-- Fuente: esap/programacion/resultados/2026-1/datos/nucleos/nucleo_equivalencia.csv
-- (rama feature/pa/ronda3-codex, commit fbd18264d; formato en INTEGRACION-claude.md §21.1).
--
-- Se SUMA a lo sembrado en la 669 (tabla de la instrucción): una variante nueva se
-- inserta; una que ya existe toma el área, el tipo y la fuente del archivo, pero un
-- prefijo NO se rebaja a exacta. Motivo: con «Gestión del Desarrollo» y «Finanzas
-- Públicas y Presupuesto» exactas dejarían de resolverse textos reales del RUND como
-- «Gestión Del Desarrollo Territorial, …» o «Finanzas Públicas Y Presupuesto Público».
-- Ninguna variante de la 669 se borra (p. ej. «Gobierno y Política Pública…», que el
-- archivo no trae y aparece en el RUND).
--
-- Forward-only e idempotente.
-- ============================================================================

DO $$
DECLARE v_sin_area INT;
BEGIN
  CREATE TEMP TABLE tmp_equivalencia_codex (area_canonica text, variante text, coincidencia text, tipo text, fuente text) ON COMMIT DROP;
  INSERT INTO tmp_equivalencia_codex VALUES
    ('Complementario', 'Complementaria', 'exacta', 'area', 'base'),
    ('Complementario', 'Complementario', 'exacta', 'area', 'plan'),
    ('Cuantitativa', 'Ciencias de Datos', 'exacta', 'area', 'rund'),
    ('Cuantitativa', 'Cuantitativa', 'exacta', 'area', 'plan'),
    ('Cuantitativa', 'Fundamentación cuantitativa', 'exacta', 'area', 'plan'),
    ('Cuantitativa', 'Matemáticas, Estadística', 'exacta', 'area', 'rund'),
    ('Desarrollo y Gestión Territorial', 'Desarrollo y Gestión Territorial', 'exacta', 'area', 'plan'),
    ('Desarrollo y Gestión Territorial', 'Gestión Territorial', 'exacta', 'area', 'plan'),
    ('Economía Pública', 'Economía de lo Público', 'exacta', 'area', 'plan'),
    ('Economía Pública', 'Economía Pública', 'exacta', 'area', 'plan'),
    ('Economía Pública', 'Política Económica Y Procesos Económicos Territoriales', 'exacta', 'area', 'rund'),
    ('Electivas', 'Electivas', 'exacta', 'area', 'plan'),
    ('Electivas', 'Electivas Generales', 'exacta', 'area', 'plan'),
    ('Espacio, Tiempo y Territorio', 'Espacio Tiempo Y Territorio', 'exacta', 'area', 'rund'),
    ('Estado y Poder', 'Derechos Constitucional Y Organización Del Estado', 'exacta', 'area', 'rund'),
    ('Estado y Poder', 'Estado y poder', 'exacta', 'area', 'plan'),
    ('Estado y Poder', 'Problemática Del  Estado Y Del Poder', 'exacta', 'area', 'base'),
    ('Estado y Poder', 'Problemática Del Estado Y Poder', 'exacta', 'area', 'rund'),
    ('Estado y Poder', 'Régimenes Y Sistemas Políticos', 'exacta', 'area', 'rund'),
    ('Estado, Gobierno y Sociedad', 'Estado Gobierno y Sociedad', 'exacta', 'area', 'plan'),
    ('Estado, Gobierno y Sociedad', 'Gobierno y Políticas Públicas', 'exacta', 'area', 'rund'),
    ('Finanzas Públicas', 'FINANZAS PÚBLICAS', 'exacta', 'area', 'plan'),
    ('Finanzas Públicas', 'Finanzas Públicas Y Presupuesto', 'exacta', 'area', 'rund'),
    ('Finanzas Públicas', 'Finanzas Públicas Y Presupuesto Público', 'exacta', 'area', 'rund'),
    ('Formación Específica', 'Ciclo De Formación Específica', 'exacta', 'area', 'base'),
    ('Formación Específica', 'Materias de Formación Especifica', 'exacta', 'area', 'plan'),
    ('Formación General', 'Formación General', 'exacta', 'area', 'plan'),
    ('Formación integral y de contexto', 'Formación integral Y de contexto', 'exacta', 'area', 'plan'),
    ('Gestión del Desarrollo', 'Gestión del Desarrollo', 'exacta', 'area', 'plan'),
    ('Gestión del Desarrollo', 'Gestión Para El Desarrollo', 'exacta', 'area', 'rund'),
    ('Gestión del Desarrollo', 'Proyectos de Desarrollo - ESP', 'exacta', 'area', 'base'),
    ('Gestión del Desarrollo', 'Proyectos De Desarrollo Y Servicios Públicos Y Medio Ambiente', 'exacta', 'area', 'rund'),
    ('Gestión del Desarrollo', 'Teorias Y Enfoques Del Desarrollo Y Enfoques Del Desarrollo Territorial', 'exacta', 'area', 'rund'),
    ('Gestión del Desarrollo', 'Teorías Y Enfoques Del Desarrollo Y Teorías Y Enfoques Del Desarrollo Territorial', 'exacta', 'area', 'rund'),
    ('Idiomas', 'Idioma extranjero', 'exacta', 'area', 'plan'),
    ('Idiomas', 'Idiomas', 'exacta', 'area', 'plan'),
    ('Opción de grado', 'Opción de grado', 'exacta', 'area', 'plan'),
    ('Organizaciones Públicas', 'Derecho Administrativo Y Contratación Estatal', 'exacta', 'area', 'rund'),
    ('Organizaciones Públicas', 'Gerencia De Los Recursos Físicos Y Financieros', 'exacta', 'area', 'rund'),
    ('Organizaciones Públicas', 'Gerencia Pública Integral', 'exacta', 'area', 'rund'),
    ('Organizaciones Públicas', 'Organizaciones públicas', 'exacta', 'area', 'plan'),
    ('Organizaciones Públicas', 'Organizaciones Públicas y Gestión', 'exacta', 'area', 'plan'),
    ('Problemática Pública', 'Pensamiento Administrativo Y Problemática Pública', 'exacta', 'area', 'rund'),
    ('Problemática Pública', 'Problemática Pública', 'exacta', 'area', 'plan'),
    ('Problemática Pública', 'Problremática Pública', 'exacta', 'area', 'rund'),
    ('Teoría Económica e Historia', 'Teoría Económica e Historia', 'exacta', 'area', 'plan'),
    ('Formación Específica', 'Formación Específica', 'exacta', 'area', 'base'),
    ('Gestión del Desarrollo', 'Teorías y Enfoques del Desarrollo', 'prefijo', 'area', 'rund'),
    ('Gestión del Desarrollo', 'Proyectos de Desarrollo', 'prefijo', 'area', 'rund'),
    ('Gestión del Desarrollo', 'Planeación del Desarrollo', 'prefijo', 'area', 'rund'),
    (NULL, 'Labores de docencia', 'prefijo', 'generica', 'rund'),
    (NULL, 'Impartir asignaturas', 'prefijo', 'generica', 'rund'),
    (NULL, 'Desarrollo de los diferentes programas misionales', 'prefijo', 'generica', 'rund'),
    (NULL, 'Programas curriculares', 'prefijo', 'generica', 'rund'),
    (NULL, 'Procesos Étnicos e Interculturales', 'exacta', 'sin_area', 'rund'),
    (NULL, 'Gerencia Social', 'exacta', 'sin_area', 'rund')
;

  -- Toda área del archivo debe existir como canónica (se compara normalizada).
  SELECT count(*) INTO v_sin_area FROM tmp_equivalencia_codex t
   WHERE t.tipo = 'area' AND NOT EXISTS (
     SELECT 1 FROM academic_work_plan.area_formacion a
      WHERE academic_work_plan.normalizar_nucleo(a.nombre) = academic_work_plan.normalizar_nucleo(t.area_canonica));
  IF v_sin_area > 0 THEN
    RAISE EXCEPTION '670: % filas del archivo apuntan a un área canónica que no existe', v_sin_area;
  END IF;

  INSERT INTO academic_work_plan.nucleo_equivalencia (variante, variante_normalizada, coincidencia, tipo, id_area, fuente)
  SELECT DISTINCT ON (academic_work_plan.normalizar_nucleo(t.variante))
         t.variante, academic_work_plan.normalizar_nucleo(t.variante), t.coincidencia, t.tipo,
         (SELECT a.id FROM academic_work_plan.area_formacion a
           WHERE a.id_programa IS NULL
             AND academic_work_plan.normalizar_nucleo(a.nombre) = academic_work_plan.normalizar_nucleo(t.area_canonica)),
         t.fuente
    FROM tmp_equivalencia_codex t
   ORDER BY academic_work_plan.normalizar_nucleo(t.variante), t.coincidencia DESC
  ON CONFLICT (variante_normalizada) DO UPDATE
     SET id_area = EXCLUDED.id_area,
         tipo = EXCLUDED.tipo,
         fuente = EXCLUDED.fuente,
         coincidencia = CASE WHEN academic_work_plan.nucleo_equivalencia.coincidencia = 'prefijo'
                             THEN 'prefijo' ELSE EXCLUDED.coincidencia END,
         updated_at = NOW()
   WHERE (academic_work_plan.nucleo_equivalencia.id_area, academic_work_plan.nucleo_equivalencia.tipo,
          academic_work_plan.nucleo_equivalencia.fuente)
         IS DISTINCT FROM (EXCLUDED.id_area, EXCLUDED.tipo, EXCLUDED.fuente);
END $$;
