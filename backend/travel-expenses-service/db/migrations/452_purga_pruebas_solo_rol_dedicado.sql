-- ============================================================================
-- Migración: 452_purga_pruebas_solo_rol_dedicado.sql
-- Historia de Usuario: EFDS-1310 — Cierre inmutable de la legalización.
--
-- La 451 dejaba saltar la inmutabilidad con solo
-- `SET LOCAL travel_expenses.purga_pruebas = 'on'` desde cualquier conexión.
-- No agregaba privilegios, pero volvía silencioso el salto: un SET LOCAL más un
-- DELETE se ve como un borrado común, mientras que quitar un trigger deja rastro.
--
-- Desde aquí la purga exige además que la sesión corra con el rol de base de
-- datos dedicado a pruebas, `travel_expenses_pruebas`, por igualdad de nombre
-- (no por pertenencia: un superusuario "pertenece" a todos los roles).
--
-- Esta migración NO crea ese rol. Solo existe donde se ejecuta a propósito
-- db/dev-fixtures/rol_pruebas_legalizacion.sql (entornos locales). En una base
-- sin el rol el atajo es imposible: usarlo exigiría primero crear el rol, que
-- es DDL auditable.
--
-- Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION travel_expenses.fn_purga_pruebas_activa()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT current_user = 'travel_expenses_pruebas'
       AND COALESCE(current_setting('travel_expenses.purga_pruebas', true), '') = 'on';
$$;

COMMENT ON FUNCTION travel_expenses.fn_purga_pruebas_activa() IS
    'EFDS-1310 — Solo la purga de pruebas automatizadas, con el rol travel_expenses_pruebas (inexistente fuera de entornos locales) y la variable de sesión explícita, salta la inmutabilidad de legalizaciones cerradas.';
