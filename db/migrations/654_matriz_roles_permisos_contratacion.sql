-- ============================================================================
-- 654 · La matriz rol × permiso del módulo de Contratación
--
-- EFDS-1183 (RF-SIS-02): «gestionar los roles y permisos del módulo según el
-- catálogo definido para controlar qué puede hacer cada perfil».
--
-- El «Formato usuario-roles-permisos» llega en dos hojas que no se tocan: una
-- rejilla de diez permisos marcada solo para cuatro perfiles genéricos, y un
-- catálogo de catorce roles reales sin rejilla. Esta migración las cruza y deja
-- la matriz sembrada. Su gemela en código es `src/auth/matriz-roles.ts`, que es
-- lo que autoriza mientras el token no traiga los permisos: **si una cambia, la
-- otra tiene que cambiar con ella**.
--
-- Tres pasos, y los tres corrigen algo que se daba por hecho:
--
--   1. Los cuatro roles del catálogo que ninguna actividad había necesitado. Se
--      creían once de catorce y son diez: el ente de control se venía nombrando
--      en el código como cadena suelta, sin rol sembrado que lo respaldara.
--   2. Los quince permisos que las migraciones 649 a 653 dieron por existentes
--      —«ya viven en auth.permission»— y **no existían**: de los veintiocho del
--      módulo solo estaban los trece que ellas mismas crearon.
--   3. Las asignaciones, que hasta hoy eran cero. Ningún rol de contratación
--      tenía una sola fila en `auth.role_permissions`.
--
-- **Es configuración inicial, no una imposición.** Solo inserta lo que falta:
-- no borra ni desactiva nada, así que lo que la entidad haya ajustado desde el
-- backoffice de roles sobrevive a reaplicarla. Quitar un permiso a un rol se
-- hace desde la plataforma, que es de donde tiene que hacerse.
--
-- `SUPER_ADMIN` no se toca: en esta base no tiene ninguna asignación —ni de
-- este módulo ni de ningún otro— porque auth-service lo resuelve aparte, y
-- darle setenta y ocho filas aquí rompería esa convención.
--
-- La matriz **no está confirmada**: la propia historia la deja como «matriz
-- definitiva rol × permiso, a validar». Las filas de los diez roles que ya
-- existían las fijaron las historias del módulo actividad por actividad; las
-- cuatro nuevas salen de leer los atributos del anexo.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
  v_creados INT;
  v_asignados INT;
  v_huerfanos INT;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1 · Los cuatro roles del catálogo que faltaban
  --
  -- Con la misma forma que los diez anteriores (015, 025, 038 y 047) para que
  -- el backoffice de roles los liste igual. `id` es uuid sin valor por defecto.
  --
  -- `ADMINISTRADOR_CONTRATACION` y no `ADMINISTRADOR` a secas: `auth.role` es
  -- de toda la plataforma y el rol de la Hoja1 solo administra la
  -- parametrización de Contratación —informes y configurar, nada mas—. Un
  -- `ADMINISTRADOR` sin apellido se leería como administrador de todo, que es
  -- lo que ya es `SUPER_ADMIN`.
  -- --------------------------------------------------------------------------
  INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
  VALUES
    (uuid_generate_v4(),
     'ESTRUCTURADOR_TECNICO',
     'Estructurador Técnico',
     'Enlace de contratación del área: estructura técnicamente el proceso (estudio previo, anexo técnico, estudio de mercado y análisis del sector) y lo pasa a aprobación del jefe de área.',
     'backoffice', 'sistema', true, '#0369A1', 'Ruler', 'Backoffice'),

    (uuid_generate_v4(),
     'APOYO_SUPERVISION',
     'Apoyo a la Supervisión',
     'Personal administrativo y de apoyo: genera informes, estadísticas, certificaciones e indicadores, y hace seguimiento a la supervisión. Su trabajo es enteramente de consulta.',
     'backoffice', 'sistema', true, '#0891B2', 'ClipboardList', 'Backoffice'),

    (uuid_generate_v4(),
     'ENTE_DE_CONTROL',
     'Ente u Organismo de Control',
     'Organismos de control y Oficina de Control Interno: hacen seguimiento y control a la compra pública. Único rol externo del catálogo; entra por la auditoría del expediente y no por el expediente de trabajo.',
     'backoffice', 'sistema', true, '#B91C1C', 'ShieldCheck', 'Backoffice'),

    (uuid_generate_v4(),
     'ADMINISTRADOR_CONTRATACION',
     'Administrador de Contratación',
     'Administra la parametrización del módulo de Contratación y consulta sus informes. No interviene en ningún proceso.',
     'backoffice', 'sistema', true, '#4B5563', 'Settings', 'Backoffice')
  ON CONFLICT (code) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 2 · Los quince permisos que se daban por existentes
  --
  -- Se busca el módulo por los permisos que ya tiene, como hacen la 649 a la
  -- 653: apuntan al módulo correcto y preguntarles evita fallar si el módulo se
  -- llamara de otra forma. Solo si no hubiera ninguno se busca por código.
  -- --------------------------------------------------------------------------
  SELECT id_module INTO v_module_id
  FROM auth.permission
  WHERE code LIKE 'contratacion.%'
  LIMIT 1;

  IF v_module_id IS NULL THEN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'contratacion';
  END IF;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el módulo de contratación en auth.module ni permisos previos suyos en auth.permission: siembra primero el catálogo de módulos.';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'contratacion.proceso.create',
     'Radicar proceso',
     'Crear el proceso de contratación y darle su número de radicado',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.proceso.edit',
     'Editar proceso',
     'Modificar los datos del proceso mientras está en curso',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.proceso.view',
     'Consultar proceso',
     'Abrir los procesos a los que se tiene acceso y seguir su avance',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.proceso.view-all',
     'Visualizar todos los procesos',
     'Consultar cualquier proceso de la entidad, no solo los propios',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.proceso.assign',
     'Asignar o reasignar proceso',
     'Repartir los procesos entre los abogados de la Dirección',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.proceso.archive',
     'Archivar proceso',
     'Retirar de la bandeja activa un proceso que ya no se trabaja',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.proceso.delete',
     'Borrar proceso',
     'Eliminar un proceso creado por error, antes de que produzca actos',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.actividad.edit',
     'Editar actividad',
     'Diligenciar los formularios de una actividad del proceso',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.actividad.send',
     'Enviar actividad a revisión',
     'Dar por terminada una actividad y pasarla a quien la aprueba',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.actividad.approve',
     'Aprobar o devolver actividad',
     'Dar el visto bueno a una actividad enviada, o devolverla con observaciones',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.documento.upload',
     'Adjuntar documento',
     'Cargar documentos al expediente del proceso',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.documento.delete',
     'Eliminar documento',
     'Anular un documento cargado por error en el expediente',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.expediente.view',
     'Consultar expediente',
     'Ver el expediente de trabajo del proceso y sus documentos',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.reporte.view',
     'Generar informes',
     'Consultar informes, estadísticas e indicadores de la gestión contractual',
     v_module_id, true, NOW(), NOW()),
    (gen_random_uuid(), 'contratacion.config.manage',
     'Configurar el módulo',
     'Administrar la parametrización: actividades, umbrales, plazos, tipologías y formatos',
     v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

  GET DIAGNOSTICS v_creados = ROW_COUNT;

  -- --------------------------------------------------------------------------
  -- 3 · La matriz
  --
  -- Cada par es una casilla marcada de la rejilla. Se cruzan por código contra
  -- `auth.role` y `auth.permission`, así que un rol o un permiso que no exista
  -- no revienta la migración: se cuenta abajo y se avisa.
  --
  -- Los tres evaluadores no aparecen: lo que hacen —registrar el resultado de
  -- la evaluación— todavia se autoriza por nombre de rol y por la membresía del
  -- comité del proceso, no por un permiso del catálogo (EFDS-1709). Marcarles
  -- casillas que ningún endpoint mira sería describir un control que no existe.
  -- --------------------------------------------------------------------------
  WITH matriz(rol, permiso) AS (
    VALUES
    -- Estructurador Técnico
    ('ESTRUCTURADOR_TECNICO', 'contratacion.proceso.create'),
    ('ESTRUCTURADOR_TECNICO', 'contratacion.proceso.edit'),
    ('ESTRUCTURADOR_TECNICO', 'contratacion.proceso.view'),
    ('ESTRUCTURADOR_TECNICO', 'contratacion.actividad.edit'),
    ('ESTRUCTURADOR_TECNICO', 'contratacion.actividad.send'),
    ('ESTRUCTURADOR_TECNICO', 'contratacion.documento.upload'),
    ('ESTRUCTURADOR_TECNICO', 'contratacion.expediente.view'),
    -- Estructurador Financiero
    ('ESTRUCTURADOR_FINANCIERO', 'contratacion.alerta.ver'),
    -- Gestor de Contratación
    ('GESTOR_CONTRATACION', 'contratacion.proceso.create'),
    ('GESTOR_CONTRATACION', 'contratacion.proceso.edit'),
    ('GESTOR_CONTRATACION', 'contratacion.proceso.view'),
    ('GESTOR_CONTRATACION', 'contratacion.actividad.edit'),
    ('GESTOR_CONTRATACION', 'contratacion.actividad.send'),
    ('GESTOR_CONTRATACION', 'contratacion.documento.upload'),
    ('GESTOR_CONTRATACION', 'contratacion.documento.delete'),
    ('GESTOR_CONTRATACION', 'contratacion.expediente.view'),
    ('GESTOR_CONTRATACION', 'contratacion.acta-inicio.suscribir'),
    ('GESTOR_CONTRATACION', 'contratacion.seguimiento.cargar'),
    ('GESTOR_CONTRATACION', 'contratacion.seguimiento.ver'),
    ('GESTOR_CONTRATACION', 'contratacion.modificacion.solicitar'),
    ('GESTOR_CONTRATACION', 'contratacion.modificacion.ver'),
    ('GESTOR_CONTRATACION', 'contratacion.incumplimiento.ver'),
    ('GESTOR_CONTRATACION', 'contratacion.incumplimiento.tramitar'),
    ('GESTOR_CONTRATACION', 'contratacion.alerta.ver'),
    -- Revisor de Contratación
    ('REVISOR_CONTRATACION', 'contratacion.proceso.view'),
    ('REVISOR_CONTRATACION', 'contratacion.proceso.view-all'),
    ('REVISOR_CONTRATACION', 'contratacion.actividad.approve'),
    ('REVISOR_CONTRATACION', 'contratacion.expediente.view'),
    ('REVISOR_CONTRATACION', 'contratacion.seguimiento.ver'),
    ('REVISOR_CONTRATACION', 'contratacion.modificacion.ver'),
    ('REVISOR_CONTRATACION', 'contratacion.incumplimiento.ver'),
    ('REVISOR_CONTRATACION', 'contratacion.alerta.ver'),
    -- Director de Contratación
    ('DIRECTOR_CONTRATACION', 'contratacion.proceso.view'),
    ('DIRECTOR_CONTRATACION', 'contratacion.proceso.view-all'),
    ('DIRECTOR_CONTRATACION', 'contratacion.proceso.assign'),
    ('DIRECTOR_CONTRATACION', 'contratacion.proceso.archive'),
    ('DIRECTOR_CONTRATACION', 'contratacion.actividad.approve'),
    ('DIRECTOR_CONTRATACION', 'contratacion.expediente.view'),
    ('DIRECTOR_CONTRATACION', 'contratacion.expediente.auditar'),
    ('DIRECTOR_CONTRATACION', 'contratacion.seguimiento.ver'),
    ('DIRECTOR_CONTRATACION', 'contratacion.modificacion.solicitar'),
    ('DIRECTOR_CONTRATACION', 'contratacion.modificacion.aprobar'),
    ('DIRECTOR_CONTRATACION', 'contratacion.modificacion.ver'),
    ('DIRECTOR_CONTRATACION', 'contratacion.incumplimiento.ver'),
    ('DIRECTOR_CONTRATACION', 'contratacion.incumplimiento.tramitar'),
    ('DIRECTOR_CONTRATACION', 'contratacion.incumplimiento.decidir'),
    ('DIRECTOR_CONTRATACION', 'contratacion.alerta.ver'),
    ('DIRECTOR_CONTRATACION', 'contratacion.reporte.view'),
    ('DIRECTOR_CONTRATACION', 'contratacion.config.manage'),
    -- EVALUADOR_FINANCIERO: sin casilla en la rejilla (ver la nota del catálogo).
    -- EVALUADOR_TECNICO: sin casilla en la rejilla (ver la nota del catálogo).
    -- EVALUADOR_JURIDICO: sin casilla en la rejilla (ver la nota del catálogo).
    -- Archivo de Gestión DC
    ('ARCHIVO_GESTION_DC', 'contratacion.expediente.auditar'),
    -- Ordenador del Gasto
    ('ORDENADOR_GASTO', 'contratacion.expediente.view'),
    ('ORDENADOR_GASTO', 'contratacion.acta-inicio.suscribir'),
    ('ORDENADOR_GASTO', 'contratacion.seguimiento.ver'),
    ('ORDENADOR_GASTO', 'contratacion.supervision.reasignar'),
    ('ORDENADOR_GASTO', 'contratacion.modificacion.aprobar'),
    ('ORDENADOR_GASTO', 'contratacion.modificacion.ver'),
    ('ORDENADOR_GASTO', 'contratacion.incumplimiento.ver'),
    ('ORDENADOR_GASTO', 'contratacion.incumplimiento.decidir'),
    ('ORDENADOR_GASTO', 'contratacion.alerta.ver'),
    -- Supervisor de Contrato
    ('SUPERVISOR_CONTRATO', 'contratacion.expediente.view'),
    ('SUPERVISOR_CONTRATO', 'contratacion.acta-inicio.suscribir'),
    ('SUPERVISOR_CONTRATO', 'contratacion.seguimiento.cargar'),
    ('SUPERVISOR_CONTRATO', 'contratacion.seguimiento.ver'),
    ('SUPERVISOR_CONTRATO', 'contratacion.modificacion.ver'),
    ('SUPERVISOR_CONTRATO', 'contratacion.incumplimiento.reportar'),
    ('SUPERVISOR_CONTRATO', 'contratacion.incumplimiento.ver'),
    ('SUPERVISOR_CONTRATO', 'contratacion.alerta.ver'),
    -- Apoyo a la Supervisión
    ('APOYO_SUPERVISION', 'contratacion.proceso.view'),
    ('APOYO_SUPERVISION', 'contratacion.expediente.view'),
    ('APOYO_SUPERVISION', 'contratacion.seguimiento.ver'),
    ('APOYO_SUPERVISION', 'contratacion.modificacion.ver'),
    ('APOYO_SUPERVISION', 'contratacion.reporte.view'),
    -- Ente u Organismo de Control
    ('ENTE_DE_CONTROL', 'contratacion.expediente.auditar'),
    -- Administrador de Contratación
    ('ADMINISTRADOR_CONTRATACION', 'contratacion.reporte.view'),
    ('ADMINISTRADOR_CONTRATACION', 'contratacion.config.manage')
  ),
  insertadas AS (
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
    SELECT r.id, p.id_permission, true, NOW(), NOW()
    FROM matriz m
    JOIN auth.role r ON r.code = m.rol
    JOIN auth.permission p ON p.code = m.permiso
    ON CONFLICT (id_rol, id_permission) DO NOTHING
    RETURNING 1
  )
  SELECT
    (SELECT count(*) FROM insertadas),
    (SELECT count(*) FROM matriz m
      WHERE NOT EXISTS (SELECT 1 FROM auth.role r WHERE r.code = m.rol)
         OR NOT EXISTS (SELECT 1 FROM auth.permission p WHERE p.code = m.permiso))
  INTO v_asignados, v_huerfanos;

  -- Aborta en vez de avisar: los pasos 1 y 2 crean todo lo que la matriz
  -- nombra, así que una casilla huérfana solo puede ser un código mal escrito,
  -- y aplicar media matriz es peor que no aplicar ninguna. Ya pasó una vez, con
  -- un `contratacion.supervision.reasignar` al que un barrido de tildes le puso
  -- acento.
  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION 'La matriz trae % casillas cuyo rol o permiso no existe en auth: revisa que los códigos coincidan con src/auth/matriz-roles.ts.', v_huerfanos;
  END IF;

  RAISE NOTICE 'Matriz de contratación sembrada (módulo %): % permisos al catálogo, % casillas asignadas.',
    v_module_id, v_creados, v_asignados;
END $$;
