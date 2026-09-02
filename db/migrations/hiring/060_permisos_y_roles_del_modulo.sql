-- ============================================================================
-- 060 · Los permisos del módulo en auth.permission, y los roles que faltaban
--
-- `permisos.ts` dice que los códigos de contratación «ya viven en
-- auth.permission», y no es cierto: el módulo es el único de la plataforma con
-- cero permisos sembrados —control-disciplinario tiene 109, gestión legal 92,
-- PTA 53— y hasta hoy la autorización se resolvía en el mapa de respaldo
-- `ROLES_QUE_OTORGAN`, que traduce cada permiso a los roles del catálogo A4.
--
-- Ese mapa es deuda declarada: existe porque el JWT no traía `permissions`, y
-- `permisosDelUsuario` ya prefiere los del token cuando llegan. Sembrarlos aquí
-- es lo que hace que el administrador pueda de verdad crear un rol nuevo desde
-- la plataforma y darle una facultad, en vez de depender de que el código
-- nombre su rol.
--
-- Los 25 códigos y a qué rol pertenece cada uno no se inventan aquí: se copian
-- de `permisos.ts`, que es donde se razonó cada separación —solicitar frente a
-- aprobar una modificación, instruir frente a decidir un sancionatorio—. Si los
-- dos sitios discrepan, manda el código: el guard es quien niega el acceso.
--
-- Idempotente por las mismas razones que el resto del directorio: no hay tabla
-- de control y una reaplicación tiene que converger en vez de fallar.
-- ============================================================================

-- ------------------------------------------------------- los tres roles ----
--
-- Del «Formato usuario roles permisos Contratación Jun2026», que lista catorce
-- roles. Faltaban estos tres:
--
--   ESTRUCTURADOR_TECNICO  el enlace de contratación del área, que elabora el
--                          estudio previo: es quien arranca el flujo.
--   ENTE_DE_CONTROL        consulta externa. `permisos.ts` ya lo nombra en
--                          PERMISO_EXPEDIENTE_AUDITAR, así que el módulo lo
--                          daba por existente y no estaba en auth.role.
--   ADMINISTRADOR_CONTRATACION  la fila «Administrador» del formato, con
--                          «Generar informes» y «Configurar».
--
-- Con la misma forma que GESTOR_CONTRATACION (015) para que el backoffice de
-- roles los liste igual que los demás.
INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
VALUES
  (uuid_generate_v4(),
   'ESTRUCTURADOR_TECNICO',
   'Estructurador Técnico',
   'Enlace de contratación del área: elabora el estudio previo, el anexo técnico y el análisis del sector, y lo pasa a aprobación del jefe de área.',
   'backoffice', 'sistema', true, '#0891B2', 'PencilRuler', 'Backoffice'),

  (uuid_generate_v4(),
   'ENTE_DE_CONTROL',
   'Ente u Organismo de Control',
   'Consulta externa: realiza seguimiento y control a la compra pública sobre el expediente electrónico, sin poder modificarlo.',
   'backoffice', 'sistema', true, '#64748B', 'Landmark', 'Backoffice'),

  (uuid_generate_v4(),
   'ADMINISTRADOR_CONTRATACION',
   'Administrador de Contratación',
   'Administra la parametrización del módulo y genera los informes; no interviene en el trámite de los procesos.',
   'backoffice', 'sistema', true, '#7C3AED', 'Settings', 'Backoffice')
ON CONFLICT (code) DO NOTHING;

-- --------------------------------------------------------- los permisos ----
--
-- `id_module` es NOT NULL y apunta a auth.module: los permisos cuelgan del
-- módulo, así que se resuelve por su código en vez de escribir el uuid.
INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT v.code, v.name, v.description, m.id_module, true
FROM auth.module m
CROSS JOIN (VALUES
  -- Los diez del catálogo original (EFDS-1183).
  ('contratacion.proceso.create',        'Crear proceso',                'Radicar un proceso de contratación nuevo.'),
  ('contratacion.proceso.edit',          'Editar proceso',               'Modificar los datos del proceso.'),
  ('contratacion.proceso.view',          'Ver proceso',                  'Consultar los procesos propios.'),
  ('contratacion.proceso.view-all',      'Ver todos los procesos',       'Consultar cualquier proceso del módulo.'),
  ('contratacion.proceso.assign',        'Asignar o reasignar proceso',  'Repartir el proceso entre los profesionales de la Dirección.'),
  ('contratacion.proceso.archive',       'Archivar proceso',             'Archivar el expediente contractual.'),
  ('contratacion.proceso.delete',        'Borrar proceso',               'Eliminar un proceso.'),
  ('contratacion.actividad.edit',        'Editar actividad',             'Diligenciar una actividad del riel.'),
  ('contratacion.actividad.send',        'Enviar actividad',             'Enviar la actividad a revisión.'),
  ('contratacion.actividad.approve',     'Aprobar actividad',            'Aprobar o devolver la actividad revisada.'),
  ('contratacion.documento.upload',      'Adjuntar documento',           'Cargar documentos al expediente.'),
  ('contratacion.documento.delete',      'Eliminar documento',           'Retirar un documento del expediente.'),
  ('contratacion.config.manage',         'Configurar el módulo',         'Administrar la matriz de actividades, las tipologías y los umbrales.'),
  ('contratacion.reporte.view',          'Generar informes',             'Consultar los informes y las estadísticas del módulo.'),
  ('contratacion.expediente.view',       'Ver expediente',               'Consultar el expediente del proceso.'),

  -- Etapa 9 y siguientes.
  ('contratacion.acta-inicio.suscribir', 'Suscribir acta de inicio',     'Dar comienzo a la ejecución del contrato (EFDS-1167).'),
  ('contratacion.supervision.reasignar', 'Reasignar supervisión',        'Relevar al supervisor durante la ejecución (EFDS-1169).'),
  ('contratacion.seguimiento.cargar',    'Cargar seguimiento',           'Subir informes, actas y soportes de la ejecución (EFDS-1168).'),
  ('contratacion.seguimiento.ver',       'Ver seguimiento',              'Consultar el seguimiento de la ejecución (EFDS-1168).'),

  -- Modificaciones contractuales (EFDS-1177).
  ('contratacion.modificacion.solicitar','Solicitar modificación',       'Pedir una prórroga, adición, cesión, suspensión o aclaración.'),
  ('contratacion.modificacion.aprobar',  'Aprobar modificación',         'Conceder o negar la modificación solicitada.'),
  ('contratacion.modificacion.ver',      'Ver modificaciones',           'Consultar las modificaciones del contrato.'),

  -- Incumplimiento y trámite sancionatorio (EFDS-1180, EFDS-1181).
  ('contratacion.incumplimiento.reportar','Reportar incumplimiento',     'Reportar el presunto incumplimiento del contrato.'),
  ('contratacion.incumplimiento.ver',    'Ver incumplimientos',          'Consultar los reportes de presunto incumplimiento.'),
  ('contratacion.incumplimiento.tramitar','Instruir el sancionatorio',   'Abrir el trámite, citar audiencias y notificar resoluciones.'),
  ('contratacion.incumplimiento.decidir','Decidir el sancionatorio',     'Archivar, declarar el incumplimiento o la caducidad, y revocar.'),

  -- Alertas y auditoría (EFDS-1185, EFDS-1186).
  ('contratacion.alerta.ver',            'Ver alertas de vencimiento',   'Consultar los vencimientos próximos y cumplidos.'),
  ('contratacion.expediente.auditar',    'Auditar expediente',           'Consultar el expediente completo con su trazabilidad e historial.'),

  -- ------------------------------------- las competencias que no son del gestor --
  --
  -- Los seis que faltaban para que ningún endpoint tenga que nombrar un rol.
  -- Cada uno existe porque su composición de roles es distinta de las demás: no
  -- se parte lo que ya cubre `actividad.edit`, que es el trámite corriente del
  -- proceso —publicar el pliego, emitir adendas, liquidar—, sino lo que la
  -- matriz encarga a alguien más.

  -- Dirección Financiera: es ella la que compromete el presupuesto. Un mismo
  -- permiso para el CDP, el pago y el cierre financiero porque es la misma
  -- competencia —mover plata de la entidad— en tres momentos del contrato.
  ('contratacion.presupuesto.gestionar', 'Gestionar el presupuesto',     'Expedir el CDP y el RP, tramitar los pagos avalados y cerrar financieramente el contrato.'),

  -- Ordenador del Gasto: designar y adjudicar comprometen a la entidad frente
  -- a terceros, y responde de ello quien ordena el gasto.
  ('contratacion.designacion.ordenar',   'Designar comité y supervisor', 'Designar el comité evaluador y al supervisor del contrato.'),
  ('contratacion.adjudicacion.decidir',  'Adjudicar el proceso',         'Emitir el acto de adjudicación que compromete a la entidad con el proponente.'),

  -- El comité evaluador. El rol solo abre la puerta: quién puede registrar lo
  -- decide además la membresía del comité de ese proceso (EFDS-1438).
  ('contratacion.evaluacion.registrar',  'Registrar la evaluación',      'Cargar el resultado de la evaluación jurídica, financiera o técnica de las ofertas.'),

  -- Supervisión: avalar la cuenta y concluir sobre la ejecución que se vigiló.
  -- Aparte de `seguimiento.cargar` a propósito: cargar un informe documenta,
  -- avalar decide, y quien radica la cuenta no puede avalarla.
  ('contratacion.supervision.avalar',    'Avalar como supervisor',       'Dar el aval a la cuenta de cobro y suscribir el informe final de ejecución.'),

  -- Archivo de Gestión: la custodia del expediente no es del gestor ni de la
  -- Dirección Financiera, y reabrir uno archivado toca algo ya declarado
  -- completo ante entes de control.
  ('contratacion.expediente.archivar',   'Archivar el expediente',       'Archivar y reabrir el expediente contractual, y registrar la publicación del acta.')
) AS v(code, name, description)
WHERE m.code = 'contratacion'
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------ qué rol otorga cada permiso ----
--
-- Copiado de ROLES_QUE_OTORGAN. Se escribe como pares (permiso, rol) y se
-- resuelven los uuid por código: así la tabla puente no depende de en qué orden
-- se sembraron ni de qué uuid le tocó a cada fila.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM (VALUES
  -- Trámite del proceso: lo lleva el gestor.
  ('contratacion.proceso.create',        'GESTOR_CONTRATACION'),
  ('contratacion.proceso.edit',          'GESTOR_CONTRATACION'),
  ('contratacion.actividad.edit',        'GESTOR_CONTRATACION'),
  ('contratacion.actividad.send',        'GESTOR_CONTRATACION'),
  ('contratacion.documento.upload',      'GESTOR_CONTRATACION'),
  ('contratacion.documento.delete',      'GESTOR_CONTRATACION'),

  -- El estructurador técnico elabora el estudio previo y lo pasa a aprobación:
  -- edita y adjunta, no radica ni aprueba.
  ('contratacion.actividad.edit',        'ESTRUCTURADOR_TECNICO'),
  ('contratacion.documento.upload',      'ESTRUCTURADOR_TECNICO'),
  ('contratacion.proceso.view',          'ESTRUCTURADOR_TECNICO'),

  -- Aprobar es de quien revisa y de la Dirección, nunca de quien diligenció.
  ('contratacion.actividad.approve',     'REVISOR_CONTRATACION'),
  ('contratacion.actividad.approve',     'DIRECTOR_CONTRATACION'),

  -- Lectura del proceso.
  ('contratacion.proceso.view',          'GESTOR_CONTRATACION'),
  ('contratacion.proceso.view',          'REVISOR_CONTRATACION'),
  ('contratacion.proceso.view',          'DIRECTOR_CONTRATACION'),
  ('contratacion.proceso.view-all',      'REVISOR_CONTRATACION'),
  ('contratacion.proceso.view-all',      'DIRECTOR_CONTRATACION'),

  -- Reparto, archivo y parametrización: Dirección.
  ('contratacion.proceso.assign',        'DIRECTOR_CONTRATACION'),
  ('contratacion.proceso.archive',       'DIRECTOR_CONTRATACION'),
  ('contratacion.config.manage',         'DIRECTOR_CONTRATACION'),
  ('contratacion.reporte.view',          'DIRECTOR_CONTRATACION'),

  -- El administrador del formato: informes y parametrización, sin trámite.
  ('contratacion.config.manage',         'ADMINISTRADOR_CONTRATACION'),
  ('contratacion.reporte.view',          'ADMINISTRADOR_CONTRATACION'),

  -- Expediente de trabajo.
  ('contratacion.expediente.view',       'GESTOR_CONTRATACION'),
  ('contratacion.expediente.view',       'REVISOR_CONTRATACION'),
  ('contratacion.expediente.view',       'DIRECTOR_CONTRATACION'),
  ('contratacion.expediente.view',       'ORDENADOR_GASTO'),
  ('contratacion.expediente.view',       'SUPERVISOR_CONTRATO'),

  -- Acta de inicio y supervisión.
  ('contratacion.acta-inicio.suscribir', 'SUPERVISOR_CONTRATO'),
  ('contratacion.acta-inicio.suscribir', 'ORDENADOR_GASTO'),
  ('contratacion.acta-inicio.suscribir', 'GESTOR_CONTRATACION'),
  ('contratacion.supervision.reasignar', 'ORDENADOR_GASTO'),
  ('contratacion.seguimiento.cargar',    'SUPERVISOR_CONTRATO'),
  ('contratacion.seguimiento.cargar',    'GESTOR_CONTRATACION'),
  ('contratacion.seguimiento.ver',       'SUPERVISOR_CONTRATO'),
  ('contratacion.seguimiento.ver',       'GESTOR_CONTRATACION'),
  ('contratacion.seguimiento.ver',       'REVISOR_CONTRATACION'),
  ('contratacion.seguimiento.ver',       'DIRECTOR_CONTRATACION'),
  ('contratacion.seguimiento.ver',       'ORDENADOR_GASTO'),

  -- Modificaciones: quien la pide no la concede.
  ('contratacion.modificacion.solicitar','GESTOR_CONTRATACION'),
  ('contratacion.modificacion.solicitar','DIRECTOR_CONTRATACION'),
  ('contratacion.modificacion.aprobar',  'ORDENADOR_GASTO'),
  ('contratacion.modificacion.aprobar',  'DIRECTOR_CONTRATACION'),
  ('contratacion.modificacion.ver',      'GESTOR_CONTRATACION'),
  ('contratacion.modificacion.ver',      'REVISOR_CONTRATACION'),
  ('contratacion.modificacion.ver',      'DIRECTOR_CONTRATACION'),
  ('contratacion.modificacion.ver',      'ORDENADOR_GASTO'),
  ('contratacion.modificacion.ver',      'SUPERVISOR_CONTRATO'),

  -- Incumplimiento: reporta quien vigila, instruye el jurídico, decide quien obliga.
  ('contratacion.incumplimiento.reportar','SUPERVISOR_CONTRATO'),
  ('contratacion.incumplimiento.ver',    'SUPERVISOR_CONTRATO'),
  ('contratacion.incumplimiento.ver',    'GESTOR_CONTRATACION'),
  ('contratacion.incumplimiento.ver',    'REVISOR_CONTRATACION'),
  ('contratacion.incumplimiento.ver',    'DIRECTOR_CONTRATACION'),
  ('contratacion.incumplimiento.ver',    'ORDENADOR_GASTO'),
  ('contratacion.incumplimiento.tramitar','GESTOR_CONTRATACION'),
  ('contratacion.incumplimiento.tramitar','DIRECTOR_CONTRATACION'),
  ('contratacion.incumplimiento.decidir','DIRECTOR_CONTRATACION'),
  ('contratacion.incumplimiento.decidir','ORDENADOR_GASTO'),

  -- Alertas de vencimiento.
  ('contratacion.alerta.ver',            'GESTOR_CONTRATACION'),
  ('contratacion.alerta.ver',            'SUPERVISOR_CONTRATO'),
  ('contratacion.alerta.ver',            'REVISOR_CONTRATACION'),
  ('contratacion.alerta.ver',            'DIRECTOR_CONTRATACION'),
  ('contratacion.alerta.ver',            'ORDENADOR_GASTO'),
  ('contratacion.alerta.ver',            'ESTRUCTURADOR_FINANCIERO'),

  -- Auditoría del expediente: los organismos de control entran por aquí.
  ('contratacion.expediente.auditar',    'ENTE_DE_CONTROL'),
  ('contratacion.expediente.auditar',    'DIRECTOR_CONTRATACION'),
  ('contratacion.expediente.auditar',    'ARCHIVO_GESTION_DC'),

  -- ------------------------------ las competencias que no son del gestor ----
  --
  -- Listas estrechas a propósito, y cada una con su razón:

  -- Solo la Dirección Financiera. Ni el gestor que liquidó ni el supervisor que
  -- vigiló: cada uno hizo lo suyo, pero ninguno mueve presupuesto.
  ('contratacion.presupuesto.gestionar', 'ESTRUCTURADOR_FINANCIERO'),

  -- Solo el Ordenador del Gasto. El gestor lleva el proceso, pero no elige a
  -- los evaluadores ni al supervisor, ni compromete a la entidad al adjudicar.
  ('contratacion.designacion.ordenar',   'ORDENADOR_GASTO'),
  ('contratacion.adjudicacion.decidir',  'ORDENADOR_GASTO'),

  -- Las tres dimensiones del comité (RF-SIS-02). El gestor queda fuera: no
  -- evaluó.
  ('contratacion.evaluacion.registrar',  'EVALUADOR_JURIDICO'),
  ('contratacion.evaluacion.registrar',  'EVALUADOR_FINANCIERO'),
  ('contratacion.evaluacion.registrar',  'EVALUADOR_TECNICO'),

  -- Solo el supervisor: si quien presenta la cuenta pudiera avalarla, el aval
  -- dejaría de ser una revisión.
  ('contratacion.supervision.avalar',    'SUPERVISOR_CONTRATO'),

  -- La custodia es del Archivo de Gestión. Se le suman el gestor y la Dirección
  -- solo para la publicación del acta, que en este módulo ha sido siempre del
  -- gestor (actividades 5.2 y 8.8); tensión anotada en EFDS-1174, no resuelta.
  ('contratacion.expediente.archivar',   'ARCHIVO_GESTION_DC'),
  ('contratacion.expediente.archivar',   'GESTOR_CONTRATACION'),
  ('contratacion.expediente.archivar',   'DIRECTOR_CONTRATACION')
) AS v(permiso, rol)
JOIN auth.role r ON r.code = v.rol
JOIN auth.permission p ON p.code = v.permiso
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- ---------------------------------------------------------- SUPER_ADMIN ----
--
-- Todos los permisos de la plataforma, no solo los de contratación.
--
-- El rol es transversal y hasta ahora no tenía casi ninguno sembrado: funcionaba
-- por atajos en el código de cada módulo (`if roles.includes('SUPER_ADMIN')`).
-- Sembrarle solo los treinta y cuatro de aquí lo dejaba peor que antes: el
-- backoffice deriva del conteo de permisos qué módulos ve un usuario, así que un
-- superadministrador con permisos únicamente de contratación desaparecía del
-- menú de los demás módulos —los tenía por atajo, pero no por dato—.
--
-- Se le dan todos y no un comodín porque la tabla no tiene uno: `auth.permission`
-- es un catálogo cerrado, y el producto cartesiano es la forma en que este
-- esquema expresa «todos». Reaplicar la migración lo pone al día con los
-- permisos que hayan aparecido entretanto.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'SUPER_ADMIN'
  AND p.is_active = true
ON CONFLICT (id_rol, id_permission) DO NOTHING;
