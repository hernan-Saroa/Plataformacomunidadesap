BEGIN;
SET LOCAL search_path = "infrastructure-management", auth, public;

-- =============================================================================
-- 020: Relación REAL entre auth.dependencias y sedes UMI (UUID cross-schema)
--
-- Problema original:
--   auth.dependencias.id_sede es numeric(11,0) y se había sembrado id_sede = 1
--   como placeholder semántico. PERO la tabla que usa la UI para listar 8 sedes
--   activas NO es auth.sedes (vacía) sino "infrastructure-management".sede,
--   cuyo id_sede es UUID largos (ej: 0930584e-d881-412f-a271-9e3526918e51 = Central).
--   JOIN directo numeric <-> UUID es IMPOSIBLE.
--
-- Solución (SOLO AGREGAR, NUNCA BORRAR):
--   1. Agregar columna nueva sede_umi_id UUID NULL a auth.dependencias (tipo compatible).
--   2. Hacer UPDATE de esa columna por MATCH DE CÓDIGO contra infrastructure-management.sede.codigo.
--      La asociación semántica usada por defecto:
--        * DEP-PLAN-01      → SEDE-CENTRAL
--        * DEP-ACAD-01      → SEDE-CENTRAL
--        * DEP-ADM-01       → SEDE-CENTRAL
--        * DEP-TH-01        → SEDE-CENTRAL
--        * DEP-OFI-JUR-01   → SEDE-CENTRAL
--        * DEP-CONT-INT-01  → SEDE-CENTRAL
--      (todo administrativo vive en Bogotá Central; si después hay distribución
--       física real, solo se actualiza la columna por UPDATE o desde la UI de
--       dependencias, no se toca la migración).
--   3. Índice partial por el JOIN más común (catálogo + filtro sede).
-- =============================================================================

-- Paso 1: nueva columna UUID compatible con infrastructure-management.sede.id_sede
ALTER TABLE auth.dependencias
  ADD COLUMN IF NOT EXISTS sede_umi_id UUID NULL;

COMMENT ON COLUMN auth.dependencias.sede_umi_id IS
  'FK lógica cross-schema a infrastructure-management.sede.id_sede (UUID). Populada por match de código en migración 020. La columna id_sede numeric original se conserva intacta por backward-compatibility con auth.sedes (vacía a sep-2026).';

-- Paso 2: match por código de sede. Se usa CASE para que la distribución semántica
-- sea declarativa y fácil de editar si mañana cambia la asignación física.
UPDATE auth.dependencias d
SET    sede_umi_id = CASE d.cod_dependencia
           WHEN 'DEP-PLAN-01'      THEN (SELECT s.id_sede FROM "infrastructure-management".sede s WHERE s.codigo = 'SEDE-CENTRAL'   LIMIT 1)
           WHEN 'DEP-ACAD-01'      THEN (SELECT s.id_sede FROM "infrastructure-management".sede s WHERE s.codigo = 'SEDE-CENTRAL'   LIMIT 1)
           WHEN 'DEP-ADM-01'       THEN (SELECT s.id_sede FROM "infrastructure-management".sede s WHERE s.codigo = 'SEDE-CENTRAL'   LIMIT 1)
           WHEN 'DEP-TH-01'        THEN (SELECT s.id_sede FROM "infrastructure-management".sede s WHERE s.codigo = 'SEDE-CENTRAL'   LIMIT 1)
           WHEN 'DEP-OFI-JUR-01'   THEN (SELECT s.id_sede FROM "infrastructure-management".sede s WHERE s.codigo = 'SEDE-CENTRAL'   LIMIT 1)
           WHEN 'DEP-CONT-INT-01'  THEN (SELECT s.id_sede FROM "infrastructure-management".sede s WHERE s.codigo = 'SEDE-CENTRAL'   LIMIT 1)
           ELSE d.sede_umi_id
         END
WHERE  d.sede_umi_id IS NULL
  AND  d.activo = TRUE;

-- Paso 3: índice para cuando el front filtre dependencias desplegables por sede seleccionada.
CREATE INDEX IF NOT EXISTS idx_auth_dependencias_sede_umi_id
  ON auth.dependencias (sede_umi_id)
  WHERE activo = TRUE;

COMMIT;
