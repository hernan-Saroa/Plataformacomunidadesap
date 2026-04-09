-- ============================================================
-- Migración 182: Agregar permisos faltantes de Control Interno
-- ============================================================
-- Problema: El módulo 'control-interno' tiene permisos definidos en el
-- código (frontend y backend) que NO existen en auth.permission,
-- por eso al asignar esos permisos a un rol el guard los rechaza.
--
-- Módulo ID: d148ea73-0b34-4988-b991-06c939ac598d (control-interno)
--
-- Permisos YA EXISTENTES en DB (del seed 009 / migración 085, no se repiten):
--   control-interno.auditoria.manage / edit / add.ampliacion / state.change
--   control-interno.auditoria.audit / approve / export / archive / delete
--   control-interno.auditoria.notas.create
--   control-interno.planeacion.manage / create / area.create / area.state.change
--   control-interno.planeacion.area.edit / plan.create / plan.edit
--   control-interno.planes-mejoramiento.manage / create
--   control-interno.informes-de-ley.manage / generate
--   control-interno.expedientes.manage / upload
--   control-interno.configuraciones.manage / config-audit.tipo.create
--   control-interno.configuraciones.config-audit.lista.create
--   control-interno.configuraciones.kanban.create / kanban.audit.edit
--   control-interno.configuraciones.kanban.audit.delete / kanban.plan.edit / kanban.plan.delete
-- ============================================================

INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
VALUES
  -- Auditorías (nuevos: view, create, notas.delete)
  (gen_random_uuid(), 'control-interno.auditoria.view',               'Ver Auditorías',                        'Permite ver la lista y detalle de auditorías',                  'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.auditoria.create',             'Crear Auditoría',                       'Permite crear una nueva auditoría',                              'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.auditoria.notas.delete',       'Eliminar Nota de Auditoría',            'Permite eliminar una nota de auditoría',                         'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Hallazgos (todos nuevos)
  (gen_random_uuid(), 'control-interno.hallazgos.manage',             'Gestionar Hallazgos',                   'Administrar hallazgos de auditoría',                             'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.hallazgos.view',               'Ver Hallazgos',                         'Permite consultar hallazgos detectados',                         'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.hallazgos.create',             'Crear Hallazgo',                        'Permite registrar un nuevo hallazgo',                            'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.hallazgos.edit',               'Editar Hallazgo',                       'Permite modificar un hallazgo existente',                        'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.hallazgos.delete',             'Eliminar Hallazgo',                     'Permite eliminar un hallazgo',                                   'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.hallazgos.approve',            'Aprobar Hallazgo',                      'Permite aprobar un hallazgo',                                    'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Evidencias (todos nuevos)
  (gen_random_uuid(), 'control-interno.evidencias.view',              'Ver Evidencias',                        'Permite consultar evidencias cargadas',                          'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.evidencias.create',            'Cargar Evidencia',                      'Permite subir una nueva evidencia',                              'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.evidencias.delete',            'Eliminar Evidencia',                    'Permite eliminar una evidencia',                                 'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.evidencias.validate',          'Validar Evidencia',                     'Permite validar una evidencia',                                  'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Aprobaciones (todos nuevos)
  (gen_random_uuid(), 'control-interno.aprobaciones.view',            'Ver Aprobaciones',                      'Permite consultar aprobaciones',                                 'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.aprobaciones.create',          'Crear Aprobación',                      'Permite crear una aprobación',                                   'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.aprobaciones.edit',            'Editar Aprobación',                     'Permite editar una aprobación',                                  'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.aprobaciones.delete',          'Eliminar Aprobación',                   'Permite eliminar una aprobación',                                'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Documentos (todos nuevos)
  (gen_random_uuid(), 'control-interno.documentos.view',              'Ver Documentos',                        'Permite consultar documentos',                                   'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.documentos.create',            'Crear Documento',                       'Permite crear un documento',                                     'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.documentos.edit',              'Editar Documento',                      'Permite editar un documento',                                    'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.documentos.delete',            'Eliminar Documento',                    'Permite eliminar un documento',                                  'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Plan Anual (todos nuevos)
  (gen_random_uuid(), 'control-interno.plan-anual.view',              'Ver Plan Anual',                        'Permite consultar el Plan Anual de Auditoría',                   'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.create',            'Crear Plan Anual',                      'Permite crear un nuevo Plan Anual',                              'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.edit',              'Editar Plan Anual',                     'Permite modificar un Plan Anual existente',                      'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.delete',            'Eliminar Plan Anual',                   'Permite eliminar un Plan Anual',                                 'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.approve',           'Aprobar Plan Anual',                    'Permite aprobar un Plan Anual para ejecución',                   'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.activate',          'Activar Plan Anual',                    'Permite activar un Plan Anual',                                  'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.export',            'Exportar Plan Anual',                   'Permite descargar el Plan Anual',                                'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.assign',            'Asignar Responsable Plan Anual',        'Permite asignar responsables al Plan Anual',                     'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.plan-anual.follow-up',         'Seguimiento Plan Anual',                'Permite hacer seguimiento al Plan Anual',                        'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Planes de Mejoramiento (nuevos: view, edit, delete, approve, follow-up)
  (gen_random_uuid(), 'control-interno.planes-mejoramiento.view',     'Ver Planes de Mejoramiento',            'Permite consultar planes de mejoramiento',                       'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.planes-mejoramiento.edit',     'Editar Plan de Mejoramiento',           'Permite modificar un plan de mejoramiento',                      'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.planes-mejoramiento.delete',   'Eliminar Plan de Mejoramiento',         'Permite eliminar un plan de mejoramiento',                       'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.planes-mejoramiento.approve',  'Aprobar Plan de Mejoramiento',          'Permite aprobar un plan de mejoramiento',                        'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.planes-mejoramiento.follow-up','Seguimiento Plan de Mejoramiento',      'Permite hacer seguimiento al plan de mejoramiento',              'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Informes de Ley (nuevos: view, create, edit, delete, approve, export)
  (gen_random_uuid(), 'control-interno.informes-de-ley.view',         'Ver Informes de Ley',                   'Permite consultar informes de ley',                              'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.informes-de-ley.create',       'Crear Informe de Ley',                  'Permite crear un informe de ley',                               'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.informes-de-ley.edit',         'Editar Informe de Ley',                 'Permite editar un informe de ley',                              'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.informes-de-ley.delete',       'Eliminar Informe de Ley',               'Permite eliminar un informe de ley',                            'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.informes-de-ley.approve',      'Aprobar Informe de Ley',                'Permite aprobar un informe de ley',                             'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.informes-de-ley.export',       'Exportar Informe de Ley',               'Permite exportar/descargar un informe de ley',                  'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Expedientes (nuevo: download)
  (gen_random_uuid(), 'control-interno.expedientes.download',         'Descargar Documentos',                  'Permite descargar documentos de expedientes',                    'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),

  -- Biblioteca / Listas de Chequeo (todos nuevos)
  (gen_random_uuid(), 'control-interno.listas-chequeo.view',          'Ver Listas de Chequeo',                 'Permite consultar la biblioteca de listas de chequeo',           'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.listas-chequeo.create',        'Crear Lista de Chequeo',                'Permite crear una nueva lista de chequeo',                       'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.listas-chequeo.edit',          'Editar Lista de Chequeo',               'Permite modificar una lista de chequeo existente',               'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.listas-chequeo.delete',        'Eliminar Lista de Chequeo',             'Permite eliminar una lista de chequeo',                          'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.listas-chequeo.apply',         'Aplicar Lista de Chequeo',              'Permite aplicar una lista de chequeo a una auditoría',           'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW()),
  (gen_random_uuid(), 'control-interno.listas-chequeo.export',        'Exportar Lista de Chequeo',             'Permite exportar una lista de chequeo',                          'd148ea73-0b34-4988-b991-06c939ac598d', true, NOW(), NOW())

ON CONFLICT (code) DO NOTHING;
