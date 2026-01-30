-- Permissions
DELETE FROM auth.permission WHERE code LIKE 'control-interno.%';
INSERT INTO auth.permission (code, name, description, id_module)
SELECT p.code, p.name, p.description, m.id_module
FROM (VALUES
  -- Auditoría OCIG
  ('control-interno.auditoria.manage', 'Gestionar Auditoría', 'Administrar auditoría', 'control-interno'),
  ('control-interno.auditoria.edit', 'Editar Auditoría', 'Permite editar auditoría', 'control-interno'),
  ('control-interno.auditoria.add.ampliacion', 'Solicitar Ampliación', 'Permite solicitar una ampliación de auditoría', 'control-interno'),
  ('control-interno.auditoria.state.change', 'Cambiar Estado Auditoría', 'Permite cambiar el estado de una auditoría', 'control-interno'),
  ('control-interno.auditoria.audit', 'Asignar Auditores Auditoría', 'Permite asignar auditores a una auditoría', 'control-interno'),
  ('control-interno.auditoria.approve', 'Aprobar Auditoría', 'Permite aprobar una auditoría', 'control-interno'),
  ('control-interno.auditoria.export', 'Exportar Auditoría', 'Permite exportar auditoría', 'control-interno'),
  ('control-interno.auditoria.archive', 'Archivar Auditoría', 'Permite archivar auditoría', 'control-interno'),
  ('control-interno.auditoria.delete', 'Eliminar Auditoría', 'Permite eliminar auditoría', 'control-interno'),
  ('control-interno.auditoria.notas.create', 'Crear Nota de Auditoría', 'Permite crear nota de auditoría', 'control-interno'),

  -- Planeación OCIG
  ('control-interno.planeacion.manage', 'Gestionar Planeación', 'Administrar planeación', 'control-interno'),
  ('control-interno.planeacion.create', 'Crear Auditoría', 'Permite crear una nueva auditoría', 'control-interno'),
  ('control-interno.planeacion.area.create', 'Crear Área', 'Permite crear una nueva área', 'control-interno'),
  ('control-interno.planeacion.area.state.change', 'Cambiar Estado Área', 'Permite cambiar el estado de una área', 'control-interno'),
  ('control-interno.planeacion.area.edit', 'Editar Área', 'Permite editar una área', 'control-interno'),
  ('control-interno.planeacion.plan.create', 'Crear Plan', 'Permite crear un nuevo plan', 'control-interno'),
  ('control-interno.planeacion.plan.edit', 'Editar Plan', 'Permite editar un plan', 'control-interno'),

  -- Planes de Mejoramiento
  ('control-interno.planes-mejoramiento.manage', 'Gestionar Planes de Mejoramiento', 'Administrar planes de mejoramiento', 'control-interno'),
  ('control-interno.planes-mejoramiento.create', 'Crear Plan desde auditoría', 'Permite crear un nuevo plane desde una auditoría', 'control-interno'),

  -- Informes de Ley
  ('control-interno.informes-de-ley.manage', 'Gestionar Informes de Ley', 'Administrar informes de ley', 'control-interno'),
  ('control-interno.informes-de-ley.generate', 'Generar Informe de Ley', 'Permite generar un informe de ley', 'control-interno'),

  -- Expidientes
  ('control-interno.expedientes.manage', 'Gestionar Expedientes', 'Administrar expedientes', 'control-interno'),
  ('control-interno.expedientes.upload', 'Cargar Documentos', 'Permite subir documentos para expedientes', 'control-interno'),
  
  -- Configuraciones
  ('control-interno.configuraciones.manage', 'Gestionar Configuraciones', 'Administrar configuraciones', 'control-interno'),
  ('control-interno.configuraciones.config-audit.tipo.create', 'Crear Tipo de Auditoría', 'Permite crear un nuevo tipo de auditoría', 'control-interno'),
  ('control-interno.configuraciones.config-audit.lista.create', 'Crear Lista de Auditoría', 'Permite crear una nueva lista de auditoría', 'control-interno'),
  ('control-interno.configuraciones.kanban.create', 'Crear Nueva Etapa', 'Permite crear una nueva etapa de kanban', 'control-interno'),
  ('control-interno.configuraciones.kanban.audit.edit', 'Editar Auditoría', 'Permite editar una auditoría de kanban', 'control-interno'),
  ('control-interno.configuraciones.kanban.audit.delete', 'Eliminar Auditoría', 'Permite eliminar una auditoría de kanban', 'control-interno'),
  ('control-interno.configuraciones.kanban.plan.edit', 'Editar Plan', 'Permite editar un plan de kanban', 'control-interno'),
  ('control-interno.configuraciones.kanban.plan.delete', 'Eliminar Plan', 'Permite eliminar un plan de kanban', 'control-interno')
  
) AS p(code,name,description,module_code)
JOIN auth.module m ON m.code = p.module_code;