-- Completar el catalogo del servicio sin renombrar permisos ni modificar grants existentes.
-- Los codigos historicos siguen siendo independientes: no hay equivalencias de privilegios.
DO $$
DECLARE
    rund_module UUID;
BEGIN
    SELECT id_module INTO rund_module FROM auth.module WHERE code = 'rund';
    IF rund_module IS NULL THEN
        RAISE EXCEPTION 'Se requiere el modulo rund; aplicar primero la migracion 002';
    END IF;

    WITH inserted AS (
        INSERT INTO auth.permission (id_permission,code,name,description,id_module,is_active)
        VALUES
          (gen_random_uuid(),'banco-docentes.rund.manage','Administrar banco RUND','Administrar perfiles y operaciones generales del banco.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.view','Consultar banco RUND','Consultar el banco y sus perfiles con la proteccion de datos correspondiente.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.edit','Editar perfiles RUND','Editar informacion registrada en perfiles docentes.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.validate','Validar soportes RUND','Aprobar y devolver bloques y soportes.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.import','Importar docentes RUND','Realizar cargas masivas de perfiles docentes.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.export','Exportar banco RUND','Exportar informacion autorizada del banco.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.invite','Gestionar invitaciones RUND','Invitar docentes a la autogestion.',rund_module,true),
          (gen_random_uuid(),'banco-docentes.rund.documents.manage','Gestionar documentos RUND','Cargar, reemplazar y retirar documentos del perfil.',rund_module,true),
          (gen_random_uuid(),'pta.macro_docente.consultar','Consultar Macro Docente','Consultar historial nacional y consultas puntuales de Macro Docente.',rund_module,true),
          (gen_random_uuid(),'pta.macro_docente.gestionar_accesos_externos','Gestionar accesos externos de Macro Docente','Otorgar y revocar accesos temporales.',rund_module,true)
        ON CONFLICT (code) DO NOTHING
        RETURNING id_permission,code
    ), defaults AS (
        -- Mismos defaults funcionales de 423/418, solo para permisos recien creados.
        SELECT 'GESTION_PROFESORAL'::text AS role_code, code FROM inserted
        UNION ALL
        SELECT 'RECTOR', code FROM inserted WHERE code LIKE 'pta.macro_docente.%'
        UNION ALL
        SELECT role_code, 'pta.macro_docente.consultar' FROM (VALUES
          ('CONTROL_INTERNO'),('JEFE_CONTROL_INTERNO'),('JEFE_OCI'),('AUDITOR_LIDER'),
          ('PROFESIONAL_AUDITOR'),('CONTROL_DISCIPLINARIO'),('JEFE_DE_LA_OCID')
        ) roles(role_code)
    )
    INSERT INTO auth.role_permissions (id_rol,id_permission,is_active,created_at,updated_at)
    SELECT r.id,p.id_permission,true,now(),now()
    FROM defaults d JOIN inserted p ON p.code=d.code
    JOIN auth.role r ON r.code=d.role_code AND COALESCE(r.is_active,true)=true
    ON CONFLICT (id_rol,id_permission) DO NOTHING;
END;
$$;
