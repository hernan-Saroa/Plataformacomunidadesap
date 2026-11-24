-- ============================================================================
-- 143 · Cada puesto puede llevar el rol que lo ocupa
--
-- Un puesto solo ofrece en la 3.3 a las cuentas que tienen todos los permisos
-- de lo que el puesto hace o aprueba. Cuando una actividad pasa a un puesto, o
-- su aprobación lo suma, es difícil saber qué permiso falta y a qué rol
-- dárselo (pasó con «aprobar 3.7» del Abogado estructurador, 142). Juan
-- (2026-11-13): que el puesto diga su rol y que desde ahí se completen los
-- permisos que le falten.
--
-- El rol es de referencia: no limita a los candidatos —siguen siendo los que
-- tienen los permisos, tengan el rol que tengan— ni da permisos por sí solo.
-- Sirve para saber a qué rol completarle los permisos.
--
-- Los puestos sembrados por la 137 quedan con su rol, por nombre: en cada
-- ambiente tienen ids distintos. Solo donde el puesto no tenga ya uno.
--
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.puestos_proceso
  ADD COLUMN IF NOT EXISTS rol_id uuid REFERENCES auth.role(id) ON DELETE SET NULL;

COMMENT ON COLUMN hiring.puestos_proceso.rol_id IS
  'Rol que suele ocupar el puesto (143). Referencia para completar sus permisos; no filtra candidatos.';

UPDATE hiring.puestos_proceso pu
   SET rol_id = r.id, updated_by = 'migracion-143', updated_at = now()
  FROM (VALUES
         ('abogado estructurador',                   'ABOGADO_ESTRUCTURADOR'),
         ('abogado revisor',                         'ABOGADO_REVISOR'),
         ('revisor estudios de sector y de mercado', 'EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO')
       ) AS m(puesto, rol)
  JOIN auth.role r ON r.code = m.rol AND r.is_active
 WHERE lower(pu.nombre) = m.puesto AND pu.activo AND pu.rol_id IS NULL;

COMMIT;
