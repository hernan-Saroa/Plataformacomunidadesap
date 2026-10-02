-- ============================================================================
-- 092 · Los roles de Contratación, desde cero
--
-- Los catorce roles del módulo arrastraban dos capas de historia: los permisos
-- viejos que la 084 apagó pero que seguían asignados, y lo que se fue
-- cambiando a mano desde la pantalla de permisos (el Revisor había ganado
-- «ver todos los procesos», por ejemplo). Recorrer el flujo completo con esa
-- mezcla no probaba el modelo, probaba sus accidentes.
--
-- Aquí se define otra vez, completo, qué hace cada rol:
--
--   1. Los catorce roles existen, con su nombre y su descripción. Se crean
--      donde no estén; donde estén se conservan su id, su ícono y su color.
--   2. Sus permisos de contratación se borran y se vuelven a dar: las cuatro
--      acciones que usa cada uno y los transversales que le corresponden.
--   3. Sus alcances vigentes se apagan y se siembran los de abajo.
--
-- Lo que NO se toca, a propósito:
--
--   - Quién tiene cada rol (`auth.user_roles`). Borrar el rol lo quitaría en
--     cascada a todos los usuarios reales, y nadie podría trabajar hasta que
--     alguien los reasignara uno por uno. Reiniciar lo que el rol puede hacer
--     tiene el mismo efecto sobre el flujo sin ese costo.
--   - SUPER_ADMIN, que es de toda la plataforma.
--   - Los permisos de otros módulos: solo se tocan los `contratacion.%`.
--
-- Los alcances se apagan y no se borran, con el criterio de la 068 y de la
-- pantalla: la fila conserva quién la dio y cuándo.
--
-- La siembra parte de la 083, que cruzó cada endpoint con su numeral, y cambia
-- solo esto:
--
--   - Sin la 3.2: la 090 la entregó con la 3.1 y la sacó del riel.
--   - El Ordenador del Gasto ve las etapas 6, 7 y 8. Decide el comité (6.2),
--     la adjudicación (7.4), la firma del contrato (8.1) y el supervisor
--     (8.2), y no podía leer la evaluación ni el contrato que firmaba.
--   - El Supervisor ve la etapa 8: el contrato, las garantías y el acta que
--     vigila empiezan ahí.
--   - El área (Estructurador Técnico) y la Financiera ven la 9 y la 10: el
--     contrato que pidió el área y el presupuesto que comprometió la
--     Financiera se siguen hasta la liquidación.
--   - El Revisor deja de ver todos los procesos: ve los que le reparten, como
--     los demás. Ver toda la entidad es del Director (068).
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

-- -------------------------------------------------------------- los roles --

INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active,
                       created_by, created_at, updated_at, sistema_destino)
SELECT gen_random_uuid(), v.code, v.name, v.description, 'backoffice', v.icon, v.color, 'sistema',
       true, 'migracion-092', now(), now(), 'Backoffice'
FROM (VALUES
  ('ESTRUCTURADOR_TECNICO', 'Estructurador Técnico',
   'Enlace de contratación del área solicitante: redacta el estudio previo, con el análisis del sector y el estudio de mercado, y lo radica en la Dirección de Contratación.',
   'Ruler', '#0369A1'),
  ('GESTOR_CONTRATACION', 'Gestor de Contratación',
   'Profesional de la Dirección de Contratación que recibe el proceso de la bandeja, le asigna abogado y lo adelanta de la etapa 3 a la liquidación.',
   'FileText', '#003DA5'),
  ('REVISOR_CONTRATACION', 'Revisor de Contratación',
   'Abogado de la Dirección de Contratación: revisa el estudio previo que le reparten y aprueba los documentos del proceso de la etapa 3 a la 8.',
   'ClipboardCheck', '#10B981'),
  ('DIRECTOR_CONTRATACION', 'Director de Contratación',
   'Dirección de Contratación: ve todos los procesos, reparte, aprueba lo de la Dirección, concede modificaciones, decide el sancionatorio y parametriza el módulo.',
   'Scale', '#7C3AED'),
  ('ESTRUCTURADOR_FINANCIERO', 'Estructurador Financiero',
   'Dirección Financiera: verifica la disponibilidad y expide el CDP, expide el RP, tramita los pagos, respalda las adiciones y hace el cierre financiero.',
   'Landmark', '#059669'),
  ('ORDENADOR_GASTO', 'Ordenador del Gasto',
   'Compromete el gasto de la entidad: designa el comité evaluador, adjudica, firma el contrato, designa y reasigna al supervisor, concede modificaciones y decide el sancionatorio.',
   'Stamp', '#B45309'),
  ('SUPERVISOR_CONTRATO', 'Supervisor de Contrato',
   'Vigila la ejecución del contrato que le asignan por acto administrativo: acta de inicio, seguimiento, aval de las cuentas, informe final y reporte de incumplimientos.',
   'Eye', '#0F766E'),
  ('APOYO_SUPERVISION', 'Apoyo a la Supervisión',
   'Personal de apoyo: genera informes, estadísticas, certificaciones e indicadores, y consulta la supervisión. Su trabajo es de consulta.',
   'ClipboardList', '#0891B2'),
  ('EVALUADOR_TECNICO', 'Evaluador Técnico',
   'Miembro del comité evaluador: verifica la experiencia y las condiciones técnicas de las ofertas.',
   'Wrench', '#9333EA'),
  ('EVALUADOR_JURIDICO', 'Evaluador Jurídico',
   'Miembro del comité evaluador: verifica los requisitos jurídicos habilitantes de las ofertas.',
   'Gavel', '#1D4ED8'),
  ('EVALUADOR_FINANCIERO', 'Evaluador Financiero',
   'Miembro del comité evaluador: verifica los indicadores y la capacidad financiera de las ofertas.',
   'Calculator', '#047857'),
  ('ARCHIVO_GESTION_DC', 'Archivo de Gestión DC',
   'Custodia los expedientes contractuales: publica el acta de liquidación y archiva el expediente al cierre del proceso.',
   'Archive', '#6D28D9'),
  ('ENTE_DE_CONTROL', 'Ente u Organismo de Control',
   'Organismos de control y Oficina de Control Interno: consultan el expediente completo sin modificar nada.',
   'ShieldCheck', '#B91C1C'),
  ('ADMINISTRADOR_CONTRATACION', 'Administrador de Contratación',
   'Administra la parametrización del módulo y consulta sus informes. No interviene en ningún proceso.',
   'Settings', '#4B5563')
) AS v(code, name, description, icon, color)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_active = true,
       icon = COALESCE(NULLIF(auth.role.icon, ''), EXCLUDED.icon),
       updated_by = 'migracion-092',
       updated_at = now();

-- ------------------------------------------------ los permisos, desde cero --

DELETE FROM auth.role_permissions rp
 USING auth.role r, auth.permission p
 WHERE rp.id_rol = r.id
   AND rp.id_permission = p.id_permission
   AND p.code LIKE 'contratacion.%'
   AND r.code IN ('ESTRUCTURADOR_TECNICO', 'GESTOR_CONTRATACION', 'REVISOR_CONTRATACION',
                  'DIRECTOR_CONTRATACION', 'ESTRUCTURADOR_FINANCIERO', 'ORDENADOR_GASTO',
                  'SUPERVISOR_CONTRATO', 'APOYO_SUPERVISION', 'EVALUADOR_TECNICO',
                  'EVALUADOR_JURIDICO', 'EVALUADOR_FINANCIERO', 'ARCHIVO_GESTION_DC',
                  'ENTE_DE_CONTROL', 'ADMINISTRADOR_CONTRATACION');

-- ------------------------------------------------ los alcances, desde cero --

UPDATE hiring.alcances_permiso a
   SET activo = false, updated_at = now()
  FROM auth.role r
 WHERE a.rol_id = r.id
   AND a.activo
   AND r.code IN ('ESTRUCTURADOR_TECNICO', 'GESTOR_CONTRATACION', 'REVISOR_CONTRATACION',
                  'DIRECTOR_CONTRATACION', 'ESTRUCTURADOR_FINANCIERO', 'ORDENADOR_GASTO',
                  'SUPERVISOR_CONTRATO', 'APOYO_SUPERVISION', 'EVALUADOR_TECNICO',
                  'EVALUADOR_JURIDICO', 'EVALUADOR_FINANCIERO', 'ARCHIVO_GESTION_DC',
                  'ENTE_DE_CONTROL', 'ADMINISTRADOR_CONTRATACION');

INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, tramite, created_by)
SELECT r.id,
       v.accion,
       CASE WHEN v.lugar ~ '^E[0-9]+$' THEN substring(v.lugar FROM 2)::smallint END,
       CASE WHEN v.lugar ~ '^[0-9]+\.[0-9]+$' THEN v.lugar END,
       CASE WHEN v.lugar LIKE 'INC.%' THEN v.lugar END,
       'migracion-092'
FROM (VALUES
  -- Área solicitante: redacta y radica el estudio previo, y sigue el proceso
  -- que pidió hasta la liquidación.
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E1'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E2'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E3'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E4'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E5'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E6'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E7'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E8'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E9'),
  ('ESTRUCTURADOR_TECNICO', 'ver',    'E10'),
  ('ESTRUCTURADOR_TECNICO', 'editar', '3.1'),

  -- Gestor: recibe de la bandeja (3.3) y lleva el trámite corriente. Proyecta
  -- lo que otros deciden: adjudicar, firmar, pagar y conceder no son suyos.
  ('GESTOR_CONTRATACION', 'ver',     'TODO'),
  ('GESTOR_CONTRATACION', 'editar',  '3.1'),
  ('GESTOR_CONTRATACION', 'editar',  '3.3'),
  ('GESTOR_CONTRATACION', 'editar',  '3.5'),
  ('GESTOR_CONTRATACION', 'editar',  '3.6'),
  ('GESTOR_CONTRATACION', 'editar',  '3.7'),
  ('GESTOR_CONTRATACION', 'editar',  '4.1'),
  ('GESTOR_CONTRATACION', 'editar',  '4.4'),
  ('GESTOR_CONTRATACION', 'editar',  'E5'),
  ('GESTOR_CONTRATACION', 'editar',  '6.1'),
  ('GESTOR_CONTRATACION', 'editar',  '6.4'),
  ('GESTOR_CONTRATACION', 'editar',  '6.5'),
  ('GESTOR_CONTRATACION', 'editar',  '6.6'),
  ('GESTOR_CONTRATACION', 'editar',  '6.7'),
  ('GESTOR_CONTRATACION', 'editar',  '6.8'),
  ('GESTOR_CONTRATACION', 'editar',  '6.9'),
  ('GESTOR_CONTRATACION', 'editar',  '6.10'),
  ('GESTOR_CONTRATACION', 'editar',  'E7'),
  ('GESTOR_CONTRATACION', 'editar',  'E8'),
  ('GESTOR_CONTRATACION', 'editar',  '9.1'),
  ('GESTOR_CONTRATACION', 'editar',  '9.2'),
  ('GESTOR_CONTRATACION', 'editar',  '9.4'),
  ('GESTOR_CONTRATACION', 'editar',  '9.5'),
  ('GESTOR_CONTRATACION', 'editar',  '10.2'),
  ('GESTOR_CONTRATACION', 'editar',  '10.4'),
  ('GESTOR_CONTRATACION', 'editar',  'INC.2'),
  ('GESTOR_CONTRATACION', 'decidir', '10.3'),
  ('GESTOR_CONTRATACION', 'decidir', '10.4'),

  -- Abogado: revisa el estudio previo que le reparten (3.4) y aprueba lo de
  -- la Dirección de la 3 a la 8. No diligencia.
  ('REVISOR_CONTRATACION', 'ver',     'TODO'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E3'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E4'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E5'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E6'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E7'),
  ('REVISOR_CONTRATACION', 'aprobar', 'E8'),

  -- Director: ve todo, reparte, aprueba lo de la Dirección y decide lo que la
  -- matriz le reconoce.
  ('DIRECTOR_CONTRATACION', 'ver',     'TODO'),
  ('DIRECTOR_CONTRATACION', 'editar',  '3.3'),
  ('DIRECTOR_CONTRATACION', 'editar',  '9.5'),
  ('DIRECTOR_CONTRATACION', 'editar',  '10.4'),
  ('DIRECTOR_CONTRATACION', 'editar',  'INC.2'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E3'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E4'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E5'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E6'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E7'),
  ('DIRECTOR_CONTRATACION', 'aprobar', 'E8'),
  ('DIRECTOR_CONTRATACION', 'decidir', '9.5'),
  ('DIRECTOR_CONTRATACION', 'decidir', '10.4'),
  ('DIRECTOR_CONTRATACION', 'decidir', 'INC.2'),

  -- Dirección Financiera: el presupuesto de punta a punta.
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E1'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E2'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E3'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E4'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E5'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E6'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E7'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E8'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E9'),
  ('ESTRUCTURADOR_FINANCIERO', 'ver',     'E10'),
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '4.2'),
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '4.3'),
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '4.4'),
  ('ESTRUCTURADOR_FINANCIERO', 'editar',  '10.3'),
  ('ESTRUCTURADOR_FINANCIERO', 'aprobar', '9.5'),
  ('ESTRUCTURADOR_FINANCIERO', 'decidir', '8.3'),
  ('ESTRUCTURADOR_FINANCIERO', 'decidir', '9.4'),

  -- Ordenador del Gasto: los actos que comprometen a la entidad, y lo que
  -- tiene que leer para firmarlos.
  ('ORDENADOR_GASTO', 'ver',     'E6'),
  ('ORDENADOR_GASTO', 'ver',     'E7'),
  ('ORDENADOR_GASTO', 'ver',     'E8'),
  ('ORDENADOR_GASTO', 'ver',     'E9'),
  ('ORDENADOR_GASTO', 'ver',     'E10'),
  ('ORDENADOR_GASTO', 'ver',     'INC.1'),
  ('ORDENADOR_GASTO', 'ver',     'INC.2'),
  ('ORDENADOR_GASTO', 'editar',  '9.1'),
  ('ORDENADOR_GASTO', 'editar',  '9.4'),
  ('ORDENADOR_GASTO', 'decidir', '6.2'),
  ('ORDENADOR_GASTO', 'decidir', '7.4'),
  ('ORDENADOR_GASTO', 'decidir', '8.1'),
  ('ORDENADOR_GASTO', 'decidir', '8.2'),
  ('ORDENADOR_GASTO', 'decidir', '9.3'),
  ('ORDENADOR_GASTO', 'decidir', '9.5'),
  ('ORDENADOR_GASTO', 'decidir', 'INC.2'),

  -- Supervisor: la ejecución que vigila, desde el contrato.
  ('SUPERVISOR_CONTRATO', 'ver',     'E8'),
  ('SUPERVISOR_CONTRATO', 'ver',     'E9'),
  ('SUPERVISOR_CONTRATO', 'ver',     'E10'),
  ('SUPERVISOR_CONTRATO', 'ver',     'INC.2'),
  ('SUPERVISOR_CONTRATO', 'editar',  '9.1'),
  ('SUPERVISOR_CONTRATO', 'editar',  '9.2'),
  ('SUPERVISOR_CONTRATO', 'editar',  '9.4'),
  ('SUPERVISOR_CONTRATO', 'editar',  '10.1'),
  ('SUPERVISOR_CONTRATO', 'editar',  'INC.1'),
  ('SUPERVISOR_CONTRATO', 'aprobar', '9.4'),

  -- Apoyo a la supervisión: consulta.
  ('APOYO_SUPERVISION', 'ver', 'E1'),
  ('APOYO_SUPERVISION', 'ver', 'E2'),
  ('APOYO_SUPERVISION', 'ver', 'E3'),
  ('APOYO_SUPERVISION', 'ver', 'E4'),
  ('APOYO_SUPERVISION', 'ver', 'E5'),
  ('APOYO_SUPERVISION', 'ver', 'E6'),
  ('APOYO_SUPERVISION', 'ver', 'E7'),
  ('APOYO_SUPERVISION', 'ver', 'E8'),
  ('APOYO_SUPERVISION', 'ver', 'E9'),
  ('APOYO_SUPERVISION', 'ver', 'E10'),

  -- Comité evaluador: registra el resultado de la evaluación (6.3) y consulta
  -- lo que sigue. Quién de ellos registra en cada proceso lo decide la
  -- membresía que designa el Ordenador (EFDS-1438).
  ('EVALUADOR_TECNICO',    'editar', '6.3'),
  ('EVALUADOR_TECNICO',    'ver',    '6.4'),
  ('EVALUADOR_TECNICO',    'ver',    '6.5'),
  ('EVALUADOR_TECNICO',    'ver',    '7.1'),
  ('EVALUADOR_TECNICO',    'ver',    '7.3'),
  ('EVALUADOR_TECNICO',    'ver',    '7.4'),
  ('EVALUADOR_JURIDICO',   'editar', '6.3'),
  ('EVALUADOR_JURIDICO',   'ver',    '6.4'),
  ('EVALUADOR_JURIDICO',   'ver',    '6.5'),
  ('EVALUADOR_JURIDICO',   'ver',    '7.1'),
  ('EVALUADOR_JURIDICO',   'ver',    '7.3'),
  ('EVALUADOR_JURIDICO',   'ver',    '7.4'),
  ('EVALUADOR_FINANCIERO', 'editar', '6.3'),
  ('EVALUADOR_FINANCIERO', 'ver',    '6.4'),
  ('EVALUADOR_FINANCIERO', 'ver',    '6.5'),
  ('EVALUADOR_FINANCIERO', 'ver',    '7.1'),
  ('EVALUADOR_FINANCIERO', 'ver',    '7.3'),
  ('EVALUADOR_FINANCIERO', 'ver',    '7.4'),

  -- Archivo de Gestión: custodia y archivo del expediente.
  ('ARCHIVO_GESTION_DC', 'ver',     'TODO'),
  ('ARCHIVO_GESTION_DC', 'editar',  '10.4'),
  ('ARCHIVO_GESTION_DC', 'decidir', '10.4'),

  -- Ente de control: consulta todo, sin modificar nada.
  ('ENTE_DE_CONTROL', 'ver', 'TODO')

  -- ADMINISTRADOR_CONTRATACION no tiene alcance: configura y consulta
  -- informes, y eso lo dan `config.manage` y `reporte.view`.
) AS v(rol, accion, lugar)
JOIN auth.role r ON r.code = v.rol
ON CONFLICT DO NOTHING;

-- -------------------------------------- el permiso que acompaña al alcance --
--
-- Cada rol recibe el permiso de las acciones en las que tiene algún alcance,
-- derivado de la tabla como en la 083 para que las dos capas no discrepen.

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT DISTINCT a.rol_id, p.id_permission, true
  FROM hiring.alcances_permiso a
  JOIN auth.role r ON r.id = a.rol_id
  JOIN auth.permission p ON p.code = 'contratacion.' || a.accion
 WHERE a.activo
   AND a.created_by = 'migracion-092'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

-- ------------------------------------------------------ los transversales --
--
-- Los mismos que declara `ROLES_QUE_OTORGAN` en `auth/permisos.ts`, sin el
-- SUPER_ADMIN. `plazo.terminar` es una llave de pruebas y no va a ningún rol.

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM (VALUES
  ('DIRECTOR_CONTRATACION',      'contratacion.proceso.view-all'),
  ('DIRECTOR_CONTRATACION',      'contratacion.proceso.assign'),
  ('DIRECTOR_CONTRATACION',      'contratacion.config.manage'),
  ('DIRECTOR_CONTRATACION',      'contratacion.reporte.view'),
  ('ADMINISTRADOR_CONTRATACION', 'contratacion.config.manage'),
  ('ADMINISTRADOR_CONTRATACION', 'contratacion.reporte.view'),
  ('APOYO_SUPERVISION',          'contratacion.reporte.view')
) AS v(rol, permiso)
JOIN auth.role r ON r.code = v.rol
JOIN auth.permission p ON p.code = v.permiso
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

COMMIT;
