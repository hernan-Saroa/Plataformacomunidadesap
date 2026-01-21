-- Permissions
DELETE FROM auth.permission WHERE code LIKE 'gestion-legal.%';
INSERT INTO auth.permission (code, name, description, id_module)
SELECT p.code, p.name, p.description, m.id_module
FROM (VALUES
  -- DEFENSA JUDICIAL
  ('gestion-legal.defensa-judicial.manage', 'Gestionar Defensa Judicial', 'Administrar defensas judiciales', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.create', 'Crear nueva demanda', 'Permite crear nueva demanda de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.expediente.doc.upload', 'Subir documento', 'Permite subir un documento del expediente de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.expediente.doc.delete', 'Eliminar documento', 'Permite eliminar un documento del expediente de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.expediente.tarea.create', 'Crear tarea', 'Permite crear una tarea del expediente de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.expediente.tarea.delete', 'Eliminar tarea', 'Permite eliminar una tarea del expediente de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.expediente.nota.create', 'Crear nota', 'Permite crear una nota del expediente de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.expediente.nota.delete', 'Eliminar nota', 'Permite eliminar una tarea del expediente de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.autos.create', 'Crear auto nuevo', 'Permite cargar autos procesales de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.autos.delete', 'Eliminar auto', 'Permite eliminar autos procesales de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.evidencias.create', 'Crear Evidencias y Pruebas', 'Permite cargar evidencias y pruebas documentales de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.evidencias.delete', 'Eliminar Evidencias y Pruebas', 'Permite eliminar evidencias y pruebas documentales de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.evidencias.admitir', 'Admitir Evidencias y Pruebas', 'Permite admitir evidencias y pruebas documentales de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.oficios.create', 'Crear Oficios y Comunicaciones', 'Permite redactar oficios y comunicaciones de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.oficios.delete', 'Eliminar Oficios y Comunicaciones', 'Permite eliminar oficios y comunicaciones de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.oficios.atender', 'Atender Oficios y Comunicaciones', 'Permite atender oficios y comunicaciones de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.actas.create', 'Crear Actas de Audencias', 'Permite crear actas de audencia de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.actas.delete', 'Eliminar Actas de Audencias', 'Permite eliminar actas de audencia de defensa judicial', 'gestion-legal'),
  ('gestion-legal.defensa-judicial.estados.edit', 'Cambiar estado defensa judicial', 'Permite cambiar el estado de defensa judicial', 'gestion-legal'),
  -- JUZGAMIENTO DISCIPLINARIO
  ('gestion-legal.juzgamiento-disciplinario.manage', 'Gestionar Juzgamiento Disciplinario', 'Administrar juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.expediente.edit', 'Editar expediente', 'Permite editar expedientes de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.expediente.prueba', 'Crear prueba', 'Permite crear prueba del expediente de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.expediente.decision', 'Crear excepción', 'Permite crear excepciones del expediente de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.expediente.doc.upload', 'Subir documento', 'Permite subir un documento del expediente de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.autos.create', 'Crear auto nuevo', 'Permite cargar autos procesales de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.autos.delete', 'Eliminar auto', 'Permite eliminar autos procesales de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.evidencias.create', 'Crear Evidencias y Pruebas', 'Permite cargar evidencias y pruebas documentales de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.evidencias.delete', 'Eliminar Evidencias y Pruebas', 'Permite eliminar evidencias y pruebas documentales de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.evidencias.admitir', 'Admitir Evidencias y Pruebas', 'Permite admitir evidencias y pruebas documentales de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.oficios.create', 'Crear Oficios y Comunicaciones', 'Permite redactar oficios y comunicaciones de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.oficios.delete', 'Eliminar Oficios y Comunicaciones', 'Permite eliminar oficios y comunicaciones de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.oficios.atender', 'Atender Oficios y Comunicaciones', 'Permite atender oficios y comunicaciones de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.actas.create', 'Crear Actas de Audencias', 'Permite crear actas de audencia de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.actas.delete', 'Eliminar Actas de Audencias', 'Permite eliminar actas de audencia de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.estados.edit', 'Cambiar estado juzgamiento disciplinario', 'Permite cambiar el estado de juzgamiento disciplinario', 'gestion-legal'),
  -- ASESORIA JURIDICA
  ('gestion-legal.asesoria-juridica.manage', 'Gestionar Asesoría Jurídica', 'Administrar asesoría jurídica', 'gestion-legal'),
  ('gestion-legal.asesoria-juridica.create', 'Crear nueva consulta', 'Permite crear nueva consulta para asesoría jurídica', 'gestion-legal'),
  ('gestion-legal.asesoria-juridica.delete', 'Eliminar consulta', 'Permite eliminar una consulta para asesoría jurídica', 'gestion-legal'),
  ('gestion-legal.asesoria-juridica.expediente.doc.upload', 'Subir documento', 'Permite subir un documento del expediente para la asesoría jurídica', 'gestion-legal'),
  ('gestion-legal.asesoria-juridica.expediente.doc.delete', 'Eliminar documento', 'Permite eliminar un documento del expediente para la asesoría jurídica', 'gestion-legal'),
  -- CENTRO DE COMUNICACIONES JURIDICAS
  ('gestion-legal.comunicaciones.manage', 'Gestionar Comunicaciones Jurídicas', 'Administrar centro de comunicaciones jurídicas', 'gestion-legal'),
  ('gestion-legal.comunicaciones.create', 'Crear nueva comunicación', 'Permite crear nueva comunicación jurídica', 'gestion-legal'),
  ('gestion-legal.comunicaciones.leido', 'Marcar como Leída', 'Permite marcar como leída una comunicación jurídica', 'gestion-legal'),
  ('gestion-legal.comunicaciones.archivar', 'Archivar comunicación', 'Permite archivar una comunicación jurídica', 'gestion-legal'),
  -- TERMINOS E INFORMACIONES
  ('gestion-legal.terminos.manage', 'Gestionar Terminos', 'Administrar terminos e informaciones', 'gestion-legal'),
-- ORGANOS DE CONTROL
  ('gestion-legal.organos-control.manage', 'Gestionar Órganos de Control', 'Administrar órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.create', 'Crear nuevo requerimiento', 'Permite crear nuevo requerimiento para órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.elaborar', 'Elaborar respuesta', 'Permite elaborar respuesta del requerimiento para órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.delete', 'Eliminar respuesta', 'Permite eliminar respuesta del requerimiento para órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.doc.upload', 'Subir documento', 'Permite subir un documento del requerimiento para órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.respuesta.send', 'Enviar respuesta', 'Permite enviar una respuesta del requerimiento para órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.respuesta.erase', 'Borrador respuesta', 'Permite guardar borrador de una respuesta del requerimiento para órganos de control', 'gestion-legal'),
  ('gestion-legal.organos-control.solicitar-insumo', 'Solicitar insumos', 'Permite soliciar insumos a otra área para el requerimiento de órganos de control', 'gestion-legal'),
  -- PROCESOS COACTIVOS
  ('gestion-legal.procesos-coactivos.manage', 'Gestionar Procesos Coactivos', 'Administrar procesos coactivos', 'gestion-legal'),
  ('gestion-legal.procesos-coactivos.create', 'Crear nuevo proceso', 'Permite crear nuevo proceso para procesos coactivos', 'gestion-legal'),
  ('gestion-legal.procesos-coactivos.edit', 'Editar proceso', 'Permite editar un proceso coactivo', 'gestion-legal'),
  ('gestion-legal.procesos-coactivos.delete', 'Eliminar proceso', 'Permite eliminar un proceso coactivo', 'gestion-legal'),
  -- EXPEDIENTES ELECTRONICOS
  ('gestion-legal.expedientes-electronicos.manage', 'Gestionar Expedientes Electrónicos', 'Administrar expedientes electrónicos', 'gestion-legal'),
  ('gestion-legal.expedientes-electronicos.upload', 'Subir documentos', 'Permite subir documentos para expedientes electrónicos', 'gestion-legal'),
  -- PLAN DE ACCION
  ('gestion-legal.plan-accion.manage', 'Gestionar Plan de Acción', 'Administrar plan de acción', 'gestion-legal'),
  ('gestion-legal.plan-accion.create', 'Crear nuevo indicador', 'Permite crear nuevo indicador para plan de acción', 'gestion-legal'),
  -- GESTIÓN DE RIESGOS
  ('gestion-legal.riesgos.manage', 'Gestionar Riesgos', 'Administrar riesgos', 'gestion-legal'),
  ('gestion-legal.riesgos.create', 'Crear nuevo riesgo', 'Permite crear nuevo riesgo', 'gestion-legal'),
  ('gestion-legal.riesgos.edit', 'Editar riesgo', 'Permite editar un riesgo', 'gestion-legal'),
  ('gestion-legal.riesgos.delete', 'Eliminar riesgo', 'Permite eliminar un riesgo', 'gestion-legal'),
  -- PLANES DE MEJORAMIENTO
  ('gestion-legal.planes-mejoramiento.manage', 'Gestionar Planes de Mejoramiento', 'Administrar planes de mejoramiento', 'gestion-legal'),
  ('gestion-legal.planes-mejoramiento.create', 'Crear nuevo plan de mejoramiento', 'Permite crear nuevo plan de mejoramiento', 'gestion-legal'),
  -- CONFIGURACIONES
  ('gestion-legal.configuraciones.manage', 'Gestionar Configuraciones', 'Administrar configuraciones', 'gestion-legal'),
  ('gestion-legal.configuraciones.create', 'Crear nueva configuración', 'Permite crear nueva configuración', 'gestion-legal'),
  ('gestion-legal.configuraciones.edit', 'Editar configuración', 'Permite editar configuración', 'gestion-legal'),
  ('gestion-legal.configuraciones.delete', 'Elimiar configuración', 'Permite eliminar configuración', 'gestion-legal')
) AS p(code,name,description,module_code)
JOIN auth.module m ON m.code = p.module_code;