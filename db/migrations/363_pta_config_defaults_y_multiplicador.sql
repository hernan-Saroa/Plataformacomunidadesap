-- Migracion 363: Configuracion del PTA — asegurar tabla y completar claves nuevas.
-- Contexto: la pantalla de Configuracion del PTA persiste en academic_work_plan."ConfiguracionSistema"
-- (fila clave='pta_rules_v2', columna jsonb 'valor'). Esta migracion:
--   1. Asegura el esquema y la tabla (idempotente, por si algun ambiente no corrio el init 190).
--   2. Asegura que exista la fila base pta_rules_v2.
--   3. Agrega SOLO las claves nuevas que falten, preservando lo que el admin ya configuro:
--        - docencia_base_* (horas base de docencia por categoria)
--        - max_pct_inv_ext_combinado (tope cruzado investigacion + extension Enlace/Director)
--   4. Completa el campo 'multiplicador' en ext_secciones donde falte (Capacitacion=2, resto=1),
--      para que el ×2 de Capacitacion quede explicito y visible en la configuracion.
-- Idempotente: se puede correr varias veces sin efectos adversos.

-- 1) Esquema + tabla
CREATE SCHEMA IF NOT EXISTS academic_work_plan;

CREATE TABLE IF NOT EXISTS academic_work_plan."ConfiguracionSistema" (
    clave text NOT NULL,
    valor jsonb NOT NULL,
    descripcion text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "ConfiguracionSistema_pkey" PRIMARY KEY (clave)
);

-- 2) Fila base de reglas del PTA
INSERT INTO academic_work_plan."ConfiguracionSistema" (clave, valor, descripcion, "updatedAt")
VALUES ('pta_rules_v2', '{}'::jsonb, 'Reglas globales de configuracion del PTA', CURRENT_TIMESTAMP)
ON CONFLICT (clave) DO NOTHING;

-- 3) Completar SOLO claves nuevas que falten (defaults a la izquierda => 'valor' existente gana en colision)
UPDATE academic_work_plan."ConfiguracionSistema"
SET valor = '{
  "docencia_base_seminario_sc": 128,
  "docencia_base_pregrado_sc": 64,
  "docencia_base_maestria": 12,
  "docencia_base_especializacion": 16,
  "docencia_base_apt": 16,
  "max_pct_inv_ext_combinado": 50
}'::jsonb || valor,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE clave IN ('pta_rules_v2', 'global');

-- 4) Agregar 'multiplicador' a las secciones de extension que no lo tengan (Capacitacion=2, resto=1)
UPDATE academic_work_plan."ConfiguracionSistema"
SET valor = jsonb_set(
      valor,
      '{ext_secciones}',
      COALESCE((
        SELECT jsonb_agg(
          CASE
            WHEN (elem ? 'multiplicador') THEN elem
            WHEN (elem->>'key') = 'capacitacion' THEN elem || '{"multiplicador": 2}'::jsonb
            ELSE elem || '{"multiplicador": 1}'::jsonb
          END
        )
        FROM jsonb_array_elements(valor->'ext_secciones') AS elem
      ), valor->'ext_secciones')
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE clave IN ('pta_rules_v2', 'global')
  AND jsonb_typeof(valor->'ext_secciones') = 'array'
  AND jsonb_array_length(valor->'ext_secciones') > 0;
