-- Migración: Corrección de discrepancias Circular Dispositiva 003/2025
-- Referencia: Auditoría de configuración PTA vs Circular 003/2025
-- Tabla: academic_work_plan."ConfiguracionSistema" (clave='pta_rules_v2', valor=JSONB)
-- Discrepancias: D-2 (LAB invertidos), D-3 (LAB variable expandido), D-4 (SEL_11), D-5 (SLA consolidación)
-- Fecha: 2025-06
-- IDEMPOTENTE: puede ejecutarse múltiples veces sin efectos secundarios

BEGIN;

-- =====================================================================================
-- D-2 + D-3: Laboratorio de Innovación
--   - Corregir LAB_01 (100h Participación) y LAB_02 (120h Gestión) — estaban invertidos
--   - Expandir LAB_03 genérico a 11 actividades variables individuales (Tabla 11 Circular)
-- =====================================================================================
-- D-4: SEL_11 — Sesiones por semana: 1.5h (no 2h) según Tabla 7 Circular
-- =====================================================================================
-- D-5: sla_consolidacion_nacional — 20 días hábiles (4 semanas) según §5 Circular
-- =====================================================================================

-- La configuración PTA vive en academic_work_plan."ConfiguracionSistema"
-- con clave='pta_rules_v2' y el JSONB en la columna "valor".

UPDATE academic_work_plan."ConfiguracionSistema"
SET "valor" = jsonb_set(
  jsonb_set(
    jsonb_set(
      "valor",
      '{ext_actividades,laboratorio_innovacion}',
      '[
        {"id": "LAB_01", "nombre": "Componente Fijo — Espacios de participación y representación", "max_horas": 100},
        {"id": "LAB_02", "nombre": "Componente Fijo — Aspectos administrativos y gestión", "max_horas": 120},
        {"id": "LAB_03", "nombre": "Componente Variable — Elaborar documentos técnicos en el marco de las iniciativas", "max_horas": 80},
        {"id": "LAB_04", "nombre": "Componente Variable — Preparar y compilar documentos técnicos para publicación", "max_horas": 40},
        {"id": "LAB_05", "nombre": "Componente Variable — Elaborar documentos soporte de ejecución de iniciativas", "max_horas": 80},
        {"id": "LAB_06", "nombre": "Componente Variable — Diseñar, ejecutar y/o liderar iniciativas innovadoras", "max_horas": 120},
        {"id": "LAB_07", "nombre": "Componente Variable — Ejecutar trabajo de campo", "max_horas": 40},
        {"id": "LAB_08", "nombre": "Componente Variable — Acompañamiento en planeación de eventos", "max_horas": 20},
        {"id": "LAB_09", "nombre": "Componente Variable — Acompañamiento en trabajo de campo", "max_horas": 40},
        {"id": "LAB_10", "nombre": "Componente Variable — Representar a la ESAP en espacios consultivos", "max_horas": 20},
        {"id": "LAB_11", "nombre": "Componente Variable — Charlas y conferencias (formación)", "max_horas": 20},
        {"id": "LAB_12", "nombre": "Componente Variable — Coordinar enlace de capacitación en temáticas del Lab.", "max_horas": 60},
        {"id": "LAB_13", "nombre": "Componente Variable — Diseño de estrategias de gestión social del conocimiento", "max_horas": 60}
      ]'::jsonb
    ),
    '{sla_consolidacion_nacional}',
    '20'::jsonb
  ),
  '{ext_actividades,seleccion}',
  (
    -- Rebuild seleccion array replacing SEL_11 max_horas from 2 to 1.5
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'SEL_11'
        THEN jsonb_set(elem, '{max_horas}', '1.5'::jsonb)
        ELSE elem
      END
      ORDER BY idx
    )
    FROM jsonb_array_elements("valor"->'ext_actividades'->'seleccion') WITH ORDINALITY AS t(elem, idx)
  )
),
"updatedAt" = NOW()
WHERE clave = 'pta_rules_v2'
  AND "valor" IS NOT NULL;

-- Verificación: mostrar los valores corregidos
DO $$
DECLARE
  v_lab_01_horas numeric;
  v_lab_02_horas numeric;
  v_lab_count integer;
  v_sel_11_horas numeric;
  v_sla_consolidacion integer;
BEGIN
  SELECT
    ("valor"->'ext_actividades'->'laboratorio_innovacion'->0->>'max_horas')::numeric,
    ("valor"->'ext_actividades'->'laboratorio_innovacion'->1->>'max_horas')::numeric,
    jsonb_array_length("valor"->'ext_actividades'->'laboratorio_innovacion'),
    ("valor"->>'sla_consolidacion_nacional')::integer
  INTO v_lab_01_horas, v_lab_02_horas, v_lab_count, v_sla_consolidacion
  FROM academic_work_plan."ConfiguracionSistema"
  WHERE clave = 'pta_rules_v2'
  LIMIT 1;

  -- Buscar SEL_11
  SELECT (elem->>'max_horas')::numeric
  INTO v_sel_11_horas
  FROM academic_work_plan."ConfiguracionSistema",
       jsonb_array_elements("valor"->'ext_actividades'->'seleccion') AS elem
  WHERE clave = 'pta_rules_v2'
    AND elem->>'id' = 'SEL_11'
  LIMIT 1;

  RAISE NOTICE '=== Verificación Circular 003/2025 ===';
  RAISE NOTICE 'D-2: LAB_01 (Participación) = % h (esperado: 100)', v_lab_01_horas;
  RAISE NOTICE 'D-2: LAB_02 (Gestión) = % h (esperado: 120)', v_lab_02_horas;
  RAISE NOTICE 'D-3: Total actividades Lab. Innovación = % (esperado: 13)', v_lab_count;
  RAISE NOTICE 'D-4: SEL_11 (por semana) = % h (esperado: 1.5)', v_sel_11_horas;
  RAISE NOTICE 'D-5: SLA consolidación nacional = % días (esperado: 20)', v_sla_consolidacion;
END $$;

COMMIT;
