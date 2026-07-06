-- Fix: Corregir docencia_por_programa — Circular Tabla 1
-- Pregrado SC (IDs 57, 58, 60): esVariable=false, base=64 (bloque fijo, total=192h)
-- APT (ID 59): esVariable=true, base=16 (variable por crédito)
-- IDEMPOTENTE

BEGIN;

UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = jsonb_set(
  "valor",
  '{docencia_por_programa}',
  '{
    "57": {"base": 64, "multiplicador": 3, "esVariable": false},
    "58": {"base": 64, "multiplicador": 3, "esVariable": false},
    "60": {"base": 64, "multiplicador": 3, "esVariable": false},
    "59": {"base": 16, "multiplicador": 3, "esVariable": true},
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
  AND "valor" IS NOT NULL;

-- Verificación
DO $$
DECLARE
  v_ap_diurno jsonb;
  v_apt jsonb;
  v_esp jsonb;
  v_maestria jsonb;
BEGIN
  SELECT
    "valor"->'docencia_por_programa'->'57',
    "valor"->'docencia_por_programa'->'59',
    "valor"->'docencia_por_programa'->'61',
    "valor"->'docencia_por_programa'->'68'
  INTO v_ap_diurno, v_apt, v_esp, v_maestria
  FROM academic_work_plan."ConfiguracionSistema"
  WHERE clave = 'pta_rules_v2'
  LIMIT 1;

  RAISE NOTICE '=== Fix Docencia Tabla 1 ===';
  RAISE NOTICE 'AP Diurno (57): base=%, esVariable=% (esperado: 64, false)', v_ap_diurno->>'base', v_ap_diurno->>'esVariable';
  RAISE NOTICE 'APT (59): base=%, esVariable=% (esperado: 16, true)', v_apt->>'base', v_apt->>'esVariable';
  RAISE NOTICE 'Especialización (61): base=%, esVariable=% (esperado: 16, true)', v_esp->>'base', v_esp->>'esVariable';
  RAISE NOTICE 'Maestría (68): base=%, esVariable=% (esperado: 12, true)', v_maestria->>'base', v_maestria->>'esVariable';

  -- Verificar cálculo: AP Diurno = 64 × 3 = 192h (fijo, no multiplica por créditos)
  RAISE NOTICE 'Cálculo AP Diurno SC: % × % = %h', v_ap_diurno->>'base', v_ap_diurno->>'multiplicador', (v_ap_diurno->>'base')::int * (v_ap_diurno->>'multiplicador')::int;
  -- Verificar cálculo: APT 3 créditos = 3 × 16 × 3 = 144h
  RAISE NOTICE 'Cálculo APT 3 Cr: 3 × % × % = %h', v_apt->>'base', v_apt->>'multiplicador', 3 * (v_apt->>'base')::int * (v_apt->>'multiplicador')::int;
END $$;

COMMIT;
