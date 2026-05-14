-- Update notification type constraint to include all event codes used in the system
ALTER TABLE control_interno.notificacion DROP CONSTRAINT IF EXISTS notificacion_tipo_notificacion_check;

ALTER TABLE control_interno.notificacion
ADD CONSTRAINT notificacion_tipo_notificacion_check 
CHECK (tipo_notificacion IN (
  'anuncio_auditoria', 
  'recordatorio_plazo', 
  'alerta_vencimiento',
  'hallazgo_identificado', 
  'solicitud_evidencia', 
  'recepcion_documento',
  'aprobacion_plan', 
  'rechazo_plan', 
  'controversia_hallazgo',
  'validacion_evidencia', 
  'solicitud_ampliacion_plazo',
  'ampliacion_plazo_aprobada', 
  'ampliacion_plazo_rechazada', 
  'otro',
  'EVT-AUD-001', 
  'EVT-AUD-002', 
  'EVT-AUD-003', 
  'EVT-AUD-004',
  'EVT-AUD-DEADLINE',
  'EVT-AUD-CREATED',
  'EVT-KANBAN-001', 
  'EVT-KANBAN-002', 
  'EVT-KANBAN-003',
  'EVT-KANBAN-004',
  'EVT-KANBAN-MOV',
  'EVT-PM-001', 
  'EVT-PM-002',
  'EVT-PM-003',
  'EVT-APR-001', 
  'EVT-APR-002',
  'EVT-SYS-001',
  'EVT-SYS-002',
  'EVT-DOC-001',
  'EVT-PA-001'
));

COMMENT ON CONSTRAINT notificacion_tipo_notificacion_check ON control_interno.notificacion 
IS 'Restringe los tipos de notificación permitidos, incluyendo todos los códigos de evento EVT-* identificados en el frontend, backend y base de datos';
