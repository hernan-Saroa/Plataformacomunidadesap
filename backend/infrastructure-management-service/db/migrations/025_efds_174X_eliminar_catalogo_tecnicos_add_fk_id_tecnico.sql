-- ============================================================================
-- Migracion 025 - EFDS-174X
-- Objetivo: Aplicar Opcion A. Eliminar catalogo_item TECNICO_MANTENIMIENTO
--           y reemplazar responsable_asignado (varchar TEC-xxx) por FK a auth.
--           Source of Truth unico = auth.role + auth.user_roles (P3/P4).
--
-- Politica: NUNCA editar migraciones versionadas. Esta es NUEVA 025, addenda.
-- Rollback: backend/infrastructure-management-service/db/rollback/025_rollback_efds_174X.sql
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- PASO 1: ELIMINAR catalog_item TECNICO_MANTENIMIENTO
-- Data actual = 100% pruebas. OK limpiar sin backup restore de data.
-- Si en el futuro aparecen datos prod, usar rollback 025 para re-crear columna.
-- ---------------------------------------------------------------------------
DELETE FROM "infrastructure-management".catalogo_item
 WHERE catalogo = 'TECNICO_MANTENIMIENTO';

-- ---------------------------------------------------------------------------
-- PASO 2: Agregar id_tecnico_asignado (UUID) a solicitud_mantenimiento.
-- Reemplaza semanticamente la columna legacy responsable_asignado varchar.
-- No hacemos FK constraint formal cross-schema auth.user porque:
--   a) TypeORM DataSource infra no carga entidades auth
--   b) Migraciones 159 core aun cambian auth schema
--   c) Las referencias huerfanas se limpian via scheduler o no afectan display null.
-- La consistencia la garantiza la capa de servicio (solo id_user de roles P3/P4).
-- ---------------------------------------------------------------------------
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN id_tecnico_asignado UUID NULL;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.id_tecnico_asignado
  IS 'FK logico a auth.user.id_user del tecnico asignado para ejecutar la solicitud. Source of Truth = auth.user_roles (cod P3/P4). Reemplaza la columna legacy responsable_asignado varchar(TEC-xxx).';

-- ---------------------------------------------------------------------------
-- PASO 3: Agregar id_tecnico_cierre UUID (opcional) a solicitud_mantenimiento.
-- Nota: Ya existia usuario_cierre_tecnico_id; renombrar semanticamente podria romper DTOs actuales
-- (EFDS-1736). Conservamos usuario_cierre_tecnico_id como oficial. Este agregado es
-- opcional alias forward compat y CHECK constraint ligero.
-- Nos saltamos esta columna extra para minimizar riesgo break DTOs. Queda documentado.
--   ALTER TABLE "infrastructure-management".solicitud_mantenimiento
--     ADD COLUMN id_tecnico_cierre UUID NULL;
-- En su lugar reutilizamos usuario_cierre_tecnico_id que ya es UUID y tiene data.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- PASO 4: Indice para queries carga vigente por tecnico.
-- La carga vigente COUNT sobre id_tecnico_asignado + estado IN (4 valores).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_solicitud_mantenimiento_tecnico_estado
  ON "infrastructure-management".solicitud_mantenimiento (id_tecnico_asignado, estado);

COMMIT;
