-- ============================================
-- Migration: Campos de uniformación para Juzgamiento Disciplinario
-- Description: Agrega a expedientes las columnas dedicadas origen, territorial,
--   presunta_conducta (filtrables/reporteables) y hechos_list (jsonb con múltiples
--   hechos). Hace backfill de la territorial que hasta ahora vivía dentro del jsonb
--   campos_adicionales, para dejarla consistente en su propia columna.
-- Date: 2026-07-01
-- ============================================

SET search_path TO legal_management;

-- 1. Columnas dedicadas
ALTER TABLE legal_management.expedientes
  ADD COLUMN IF NOT EXISTS origen VARCHAR(50);

ALTER TABLE legal_management.expedientes
  ADD COLUMN IF NOT EXISTS territorial VARCHAR(150);

ALTER TABLE legal_management.expedientes
  ADD COLUMN IF NOT EXISTS presunta_conducta TEXT;

-- Múltiples hechos: cada elemento es un texto (o un objeto si a futuro llevan metadata)
ALTER TABLE legal_management.expedientes
  ADD COLUMN IF NOT EXISTS hechos_list JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Guarda para acotar los backfill SOLO a expedientes disciplinarios (juzgamiento).
-- Defensa Judicial queda 100% intacto: sus filas solo reciben las columnas nuevas
-- (vacías/NULL) y su territorial sigue viviendo en campos_adicionales como hasta ahora.
-- Criterio robusto: jurisdicción o tipo_proceso disciplinario, o radicado PD-.

-- 2. Backfill de territorial desde campos_adicionales (donde vivía por convención previa).
--    Solo cuando la columna nueva está vacía y el jsonb sí trae el valor.
UPDATE legal_management.expedientes
SET territorial = campos_adicionales->>'territorial'
WHERE territorial IS NULL
  AND campos_adicionales IS NOT NULL
  AND (campos_adicionales->>'territorial') IS NOT NULL
  AND (campos_adicionales->>'territorial') <> ''
  AND (
    UPPER(COALESCE(jurisdiccion, '')) IN ('DISCIPLINARIO', 'DISCIPLINARIA')
    OR UPPER(COALESCE(tipo_proceso, '')) IN ('DISCIPLINARIO', 'DISCIPLINARIA')
    OR radicado LIKE 'PD-%'
  );

-- 3. Backfill de hechos_list a partir del texto plano `hechos` existente,
--    para que los expedientes disciplinarios actuales muestren al menos un hecho.
UPDATE legal_management.expedientes
SET hechos_list = jsonb_build_array(hechos)
WHERE hechos_list = '[]'::jsonb
  AND hechos IS NOT NULL
  AND hechos <> ''
  AND (
    UPPER(COALESCE(jurisdiccion, '')) IN ('DISCIPLINARIO', 'DISCIPLINARIA')
    OR UPPER(COALESCE(tipo_proceso, '')) IN ('DISCIPLINARIO', 'DISCIPLINARIA')
    OR radicado LIKE 'PD-%'
  );

-- 4. Índices para filtrado/reportería por origen y territorial
CREATE INDEX IF NOT EXISTS idx_expedientes_origen
  ON legal_management.expedientes(origen);

CREATE INDEX IF NOT EXISTS idx_expedientes_territorial
  ON legal_management.expedientes(territorial);

-- 5. Dependencia de la parte (para completar la información del denunciado/disciplinado).
--    La tabla actors ya guarda nombre, identificación, cargo, contacto y apoderado.
ALTER TABLE legal_management.actors
  ADD COLUMN IF NOT EXISTS dependencia VARCHAR(150);
