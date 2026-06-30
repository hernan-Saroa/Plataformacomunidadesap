-- Migración: Mejoras R1-R6 — Circular Dispositiva 003/2025
-- R1: Expandir Investigación Aplicada a 8 tipos de producto (Tabla 12) con rangos min-max
-- R2: Agregar min_horas a Alto Gobierno (Tabla 13)
-- R6: Agregar circular_version y config_changelog vacío
-- Tabla: academic_work_plan."ConfiguracionSistema" (clave='pta_rules_v2', valor=JSONB)
-- IDEMPOTENTE: puede ejecutarse múltiples veces sin efectos secundarios

BEGIN;

-- R1: Expandir Investigación Aplicada (Tabla 12)
UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = jsonb_set(
  "valor",
  '{ext_actividades,investigacion_aplicada}',
  '[
    {"id": "INV_AP_01", "nombre": "Documentos técnicos (informe, análisis temático)", "min_horas": 40, "max_horas": 60},
    {"id": "INV_AP_02", "nombre": "Plan de Trabajo de Investigación Aplicada", "min_horas": 2, "max_horas": 6},
    {"id": "INV_AP_03", "nombre": "Productos de Generación de Nuevo Conocimiento (SNCTI)", "min_horas": 40, "max_horas": 60},
    {"id": "INV_AP_04", "nombre": "Productos de Desarrollo Tecnológico e Innovación (SNCTI)", "min_horas": 40, "max_horas": 60},
    {"id": "INV_AP_05", "nombre": "Productos de Apropiación Social del Conocimiento (SNCTI)", "min_horas": 40, "max_horas": 60},
    {"id": "INV_AP_06", "nombre": "Productos de Formación de Recurso Humano para CTeI (SNCTI)", "min_horas": 40, "max_horas": 60},
    {"id": "INV_AP_07", "nombre": "Asistencia a eventos académicos / representación Grupo Inv. Aplicada", "max_horas": 8},
    {"id": "INV_AP_08", "nombre": "Procesos de evaluación de desempeño y productos", "max_horas": 4}
  ]'::jsonb
),
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2'
  AND "valor" IS NOT NULL;

-- R2: Agregar min_horas a Alto Gobierno (Tabla 13)
UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = jsonb_set(
  "valor",
  '{ext_actividades,alto_gobierno}',
  '[
    {"id": "EAG_01", "nombre": "Coaching directivo", "min_horas": 80, "max_horas": 200},
    {"id": "EAG_02", "nombre": "Formación estratégica a la alta gerencia", "min_horas": 80, "max_horas": 200},
    {"id": "EAG_03", "nombre": "Gestión del conocimiento", "min_horas": 80, "max_horas": 200},
    {"id": "EAG_04", "nombre": "Desarrollo de contenidos", "min_horas": 40, "max_horas": 120}
  ]'::jsonb
),
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2'
  AND "valor" IS NOT NULL;

-- R6: Agregar circular_version y config_changelog si no existen
UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = jsonb_set(
  CASE
    WHEN "valor" ? 'config_changelog' THEN "valor"
    ELSE jsonb_set("valor", '{config_changelog}', '[]'::jsonb)
  END,
  '{circular_version}',
  '"Circular Dispositiva 003/2025"'::jsonb
),
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2'
  AND "valor" IS NOT NULL;

-- Verificación
DO $$
DECLARE
  v_inv_ap_count integer;
  v_eag_01_min numeric;
  v_circular_version text;
BEGIN
  SELECT
    jsonb_array_length("valor"->'ext_actividades'->'investigacion_aplicada'),
    ("valor"->'ext_actividades'->'alto_gobierno'->0->>'min_horas')::numeric,
    "valor"->>'circular_version'
  INTO v_inv_ap_count, v_eag_01_min, v_circular_version
  FROM academic_work_plan."ConfiguracionSistema"
  WHERE clave = 'pta_rules_v2'
  LIMIT 1;

  RAISE NOTICE '=== Verificación Mejoras R1-R6 ===';
  RAISE NOTICE 'R1: Total productos Inv. Aplicada = % (esperado: 8)', v_inv_ap_count;
  RAISE NOTICE 'R2: EAG_01 min_horas = % (esperado: 80)', v_eag_01_min;
  RAISE NOTICE 'R6: circular_version = % (esperado: Circular Dispositiva 003/2025)', v_circular_version;
END $$;

COMMIT;
