-- ============================================================
-- Migración 662: eventos de notificación que además salen por correo (EFDS-873)
-- ============================================================
-- QA pidió que las alertas del flujo de auditorías no se queden en la campana
-- y también lleguen al correo de los implicados. El canal de cada evento se
-- decide en Configuraciones > Notificaciones, que lee la fila GLOBAL_CONFIG de
-- preferencia_notificacion; aquí se registran los eventos para que aparezcan
-- ahí y se puedan apagar sin tocar código.
--
-- Los eventos que ya estén configurados no se modifican: manda lo que haya
-- dejado el administrador.
-- ============================================================

INSERT INTO control_interno.preferencia_notificacion (usuario_id, tipos_notificacion)
VALUES ('GLOBAL_CONFIG', '{}'::jsonb)
ON CONFLICT (usuario_id) DO NOTHING;

UPDATE control_interno.preferencia_notificacion
SET tipos_notificacion = COALESCE(nuevos.eventos, '{}'::jsonb) || COALESCE(tipos_notificacion, '{}'::jsonb)
FROM (
  SELECT jsonb_object_agg(codigo, jsonb_build_object(
    'activo', true,
    'sistema', true,
    'email', true,
    'categoria', categoria,
    'nombre', nombre,
    'descripcion', descripcion
  )) AS eventos
  FROM (VALUES
    ('EVT-AUD-AUDITOR',      'Auditorías',          'Auditor asignado a una auditoría',        'Avisa al auditor que quedó vinculado a una auditoría, con la vigencia y el proceso.'),
    ('EVT-PM-CIERRE',        'Planes de mejoramiento', 'Plan de mejoramiento completado',      'Avisa a los Jefes OCIG y al área auditada cuando el plan de mejoramiento se cierra.'),
    ('EVT-PAI-CREADO',       'Plan Anual',          'Plan Anual creado',                       'Avisa a los Jefes OCIG cuando se crea el Plan Anual de Auditoría de una vigencia.'),
    ('EVT-PAI-ENVIO-COMITE', 'Plan Anual',          'Plan Anual pendiente de envío al comité',  'Le recuerda al responsable que debe enviar el plan al comité.'),
    ('EVT-PAI-COMITE',       'Plan Anual',          'Plan Anual pendiente de aprobación',      'Avisa al miembro del comité al que le corresponde aprobar.'),
    ('EVT-PAI-DEVUELTO',     'Plan Anual',          'Plan Anual devuelto por el comité',       'Avisa al responsable y a los Jefes OCIG con las observaciones del comité.'),
    ('EVT-PAI-APROBADO',     'Plan Anual',          'Plan Anual aprobado',                     'Avisa al responsable y a los Jefes OCIG que el plan quedó aprobado.'),
    ('EVT-PAI-VIGENTE',      'Plan Anual',          'Vigencia activada',                       'Avisa al responsable y a los Jefes OCIG que la vigencia quedó activa.'),
    ('EVT-PAI-TAREA',        'Plan Anual',          'Tarea asignada a un auditor',             'Avisa al auditor que le asignaron una tarea del Plan Anual, con la fecha límite.')
  ) AS e(codigo, categoria, nombre, descripcion)
) AS nuevos
WHERE usuario_id = 'GLOBAL_CONFIG';
