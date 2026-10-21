-- ============================================================================
-- Migración: 500_permiso_reversion_control_viaticos.sql
-- Historia de Usuario: EFDS-1310 — Reversión de una revisión aprobada.
--
-- Asigna travel_expenses:legalizations.revert_approval (migración 454) al rol
-- CONTROL_VIATICOS: es el que EFDS-1297 ya usa para la segunda revisión del
-- analista, precisamente por segregación de funciones.
--
-- Los JWT llevan roles y no permisos: el backend lo resuelve con el fallback de
-- permissions.guard.ts. Esta asignación es la que auth-service entrega al MFE,
-- que decide con ella si muestra la bandeja de reversiones.
--
-- Primera migración de la Etapa 9 en el rango 500–599 acordado con Juan Pablo.
--
-- Idempotente.
-- ============================================================================

DO $$
DECLARE
    v_permission_id UUID;
    v_role          RECORD;
BEGIN
    SELECT id_permission INTO v_permission_id
      FROM auth.permission WHERE code = 'travel_expenses:legalizations.revert_approval';
    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'Falta el permiso travel_expenses:legalizations.revert_approval: aplique antes la migración 454.';
    END IF;

    FOR v_role IN
        SELECT id FROM auth.role WHERE code IN ('CONTROL_VIATICOS', 'ROL_CONTROL_VIATICOS')
    LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role.id AND id_permission = v_permission_id) THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (v_role.id, v_permission_id);
        END IF;
    END LOOP;
END $$;
