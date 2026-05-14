-- Migration 305: Drop FK constraint on abogado_asignado_id in requerimientos_oc
-- The entity uses createForeignKeyConstraints: false, so abogado_asignado_id stores
-- user UUIDs from auth.user rather than IDs from the abogados table.

ALTER TABLE legal_management.requerimientos_oc
    DROP CONSTRAINT IF EXISTS requerimientos_oc_abogado_asignado_id_fkey;
