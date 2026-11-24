SET client_encoding = 'UTF8';

-- ============================================================================
-- 510: El módulo de Viáticos en Gestión de módulos (EFDS-2406)
-- ============================================================================
-- Las migraciones de este servicio buscan `auth.module` con code 'viaticos'
-- para colgar sus permisos, pero ninguna lo crea: en un ambiente nuevo queda
-- sin fila y el módulo no aparece ni en Gestión de módulos ni en la consola de
-- configuración de notificaciones. Aquí se crea si falta; si ya existe no se
-- toca nada.
-- ============================================================================

INSERT INTO auth.module (code, name, description, icon, color, display_order, category, is_active)
SELECT 'viaticos',
       'Viáticos y Gastos de Viaje',
       'Comisiones de servicios, tiquetes, legalización y pago de viáticos',
       'Plane',
       '#003DA5',
       25,
       'backoffice',
       true
 WHERE NOT EXISTS (SELECT 1 FROM auth.module WHERE code = 'viaticos');
