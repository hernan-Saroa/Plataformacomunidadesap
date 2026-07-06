-- Elimina el permiso comodín de aprobación de extensión
-- ('pta.approve.extension.secciones_actividades' / componente 'ext_secciones').
--
-- Contexto: la configuración de extensión quedó fija en 4 secciones
-- (Capacitación, Procesos de Selección, Fortalecimiento, Alto Gobierno) y toda
-- actividad se canoniza a una de esas 4 (default: fortalecimiento). El componente
-- comodín "Secciones y Actividades" ya no puede recibir datos, así que se retira
-- dejando exactamente 4 permisos de aprobación para extensión.

DO $$
DECLARE
    v_permission_id UUID;
BEGIN
    SELECT id_permission INTO v_permission_id
    FROM auth.permission
    WHERE code = 'pta.approve.extension.secciones_actividades';

    IF v_permission_id IS NOT NULL THEN
        -- 1) Quitar la asignación del permiso a cualquier rol.
        DELETE FROM auth.role_permissions
        WHERE id_permission = v_permission_id;

        -- 2) Eliminar el permiso.
        DELETE FROM auth.permission
        WHERE id_permission = v_permission_id;
    END IF;
END $$;

-- 3) Limpiar aprobaciones por componente huérfanas del comodín.
--    Con la config fija a 4 secciones no deberían existir filas 'ext_secciones';
--    se eliminan las que pudieran haber quedado de datos anteriores.
DELETE FROM academic_work_plan."PtaComponentApproval"
WHERE componente = 'ext_secciones';
