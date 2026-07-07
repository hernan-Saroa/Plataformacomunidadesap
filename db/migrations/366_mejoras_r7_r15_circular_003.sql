-- Migración: Mejoras R7-R15 — Circular Dispositiva 003/2025
-- R7: Agregar config_bloqueada: false
-- R9: Pre-poblar docencia_por_programa con programas reales (Tabla 1)
-- R12: Inicializar config_snapshots: []
-- Tabla: academic_work_plan."ConfiguracionSistema" (clave='pta_rules_v2', valor=JSONB)
-- IDEMPOTENTE

BEGIN;

-- R7: config_bloqueada
UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = CASE
  WHEN "valor" ? 'config_bloqueada' THEN "valor"
  ELSE jsonb_set("valor", '{config_bloqueada}', 'false'::jsonb)
END,
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2' AND "valor" IS NOT NULL;

-- R12: config_snapshots
UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = CASE
  WHEN "valor" ? 'config_snapshots' THEN "valor"
  ELSE jsonb_set("valor", '{config_snapshots}', '[]'::jsonb)
END,
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2' AND "valor" IS NOT NULL;

-- R9: Pre-poblar docencia_por_programa (Tabla 1 Circular)
UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = jsonb_set(
  "valor",
  '{docencia_por_programa}',
  '{
    "57": {"base": 64, "multiplicador": 3, "esVariable": true},
    "58": {"base": 64, "multiplicador": 3, "esVariable": true},
    "59": {"base": 64, "multiplicador": 3, "esVariable": true},
    "60": {"base": 64, "multiplicador": 3, "esVariable": true},
    "61": {"base": 16, "multiplicador": 3, "esVariable": true},
    "62": {"base": 16, "multiplicador": 3, "esVariable": true},
    "63": {"base": 16, "multiplicador": 3, "esVariable": true},
    "64": {"base": 16, "multiplicador": 3, "esVariable": true},
    "65": {"base": 16, "multiplicador": 3, "esVariable": true},
    "66": {"base": 16, "multiplicador": 3, "esVariable": true},
    "67": {"base": 16, "multiplicador": 3, "esVariable": true},
    "68": {"base": 12, "multiplicador": 3, "esVariable": true},
    "69": {"base": 12, "multiplicador": 3, "esVariable": true},
    "70": {"base": 12, "multiplicador": 3, "esVariable": true}
  }'::jsonb
),
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2'
  AND "valor" IS NOT NULL
  AND ("valor"->'docencia_por_programa' IS NULL OR "valor"->'docencia_por_programa' = '{}'::jsonb);

-- Verificación
DO $$
DECLARE
  v_bloqueada boolean;
  v_snapshots_count integer;
  v_programa_count integer;
BEGIN
  SELECT
    ("valor"->>'config_bloqueada')::boolean,
    COALESCE(jsonb_array_length("valor"->'config_snapshots'), 0),
    (SELECT count(*) FROM jsonb_object_keys("valor"->'docencia_por_programa'))
  INTO v_bloqueada, v_snapshots_count, v_programa_count
  FROM academic_work_plan."ConfiguracionSistema"
  WHERE clave = 'pta_rules_v2'
  LIMIT 1;

  RAISE NOTICE '=== Verificación R7-R15 ===';
  RAISE NOTICE 'R7: config_bloqueada = % (esperado: false)', v_bloqueada;
  RAISE NOTICE 'R12: config_snapshots count = % (esperado: 0)', v_snapshots_count;
  RAISE NOTICE 'R9: programas en docencia_por_programa = % (esperado: 14)', v_programa_count;
END $$;

COMMIT;
