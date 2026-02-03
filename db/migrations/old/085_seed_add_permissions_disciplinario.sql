-- Permissions
DELETE FROM auth.permission WHERE code LIKE 'control-disciplinario.%';
INSERT INTO auth.permission (code, name, description, id_module)
SELECT p.code, p.name, p.description, m.id_module
FROM (VALUES
  -- Procesos
  ('control-disciplinario.procesos.manage', 'Gestionar Procesos', 'Administrar procesos', 'control-disciplinario'),
  ('control-disciplinario.procesos.create', 'Crear nueva Noticia', 'Permite crear nueva noticia para procesos', 'control-disciplinario'),
  ('control-disciplinario.procesos.convertir', 'Convertir Proceso', 'Permite convertir un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.devolver', 'Devolver Proceso', 'Permite devolver un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.redimir', 'Redimir Proceso', 'Permite redimir un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.archivar', 'Archivar Proceso', 'Permite archivar un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.expidiente', 'Ver Expediente', 'Permite ver expediente de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.autos.create', 'Crear auto', 'Permite crear un auto de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.autos.edit', 'Editar auto', 'Permite editar un auto de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.autos.delete', 'Eliminar auto', 'Permite eliminar un auto de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.evidencia.create', 'Crear evidencia', 'Permite crear evidencia de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.evidencia.delete', 'Eliminar evidencia', 'Permite eliminar evidencia de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.evidencia.admitir', 'Admitir evidencia', 'Permite admitir evidencia de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.oficio.create', 'Crear Oficio', 'Permite crear oficio de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.oficio.delete', 'Eliminar Oficio', 'Permite eliminar oficios de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.acta.create', 'Crear Acta', 'Permite crear actas de un proceso', 'control-disciplinario'),
  ('control-disciplinario.procesos.acta.delete', 'Eliminar Acta', 'Permite eliminar actas de un proceso', 'control-disciplinario'),
  -- Noticia disciplinaria
  ('control-disciplinario.noticia-disciplinaria.manage', 'Gestionar Noticias Disciplinarias', 'Administrar noticias disciplinarias', 'control-disciplinario'),
  ('control-disciplinario.noticia-disciplinaria.create', 'Crear nueva Noticia', 'Permite crear nueva noticia disciplinaria', 'control-disciplinario'),
  ('control-disciplinario.noticia-disciplinaria.edit', 'Editar noticia', 'Permite editar una noticia disciplinaria', 'control-disciplinario'),
  ('control-disciplinario.noticia-disciplinaria.delete', 'Eliminar noticia', 'Permite eliminar una noticia disciplinaria', 'control-disciplinario'),
  ('control-disciplinario.noticia-disciplinaria.asignar', 'Asignar noticia', 'Permite asignar una noticia disciplinaria', 'control-disciplinario'),
  ('control-disciplinario.noticia-disciplinaria.devolver', 'Devolver noticia', 'Permite devolver una noticia disciplinaria', 'control-disciplinario'),
  ('control-disciplinario.noticia-disciplinaria.redimir', 'Redimir noticia', 'Permite redimir una noticia disciplinaria', 'control-disciplinario'),
  -- Revisión y Aprobación
  ('control-disciplinario.revision-aprobacion.manage', 'Gestionar Revisión y Aprobación', 'Administrar revisión y aprobación', 'control-disciplinario'),
  ('control-disciplinario.revision-aprobacion.devolver', 'Devolver Revisión y Aprobación', 'Permite devolver una revisión y aprobación', 'control-disciplinario'),
  ('control-disciplinario.revision-aprobacion.aprobar', 'Aprobar Revisión y Aprobación', 'Permite aprobar una revisión y aprobación', 'control-disciplinario'),
  -- Expidente electrónico
  ('control-disciplinario.expediente-electronico.manage', 'Gestionar Expediente Electrónico', 'Administrar expediente electrónico', 'control-disciplinario'),
  ('control-disciplinario.expediente-electronico.doc.upload', 'Cargar documento', 'Permite subir un documento para expediente electrónico', 'control-disciplinario'),
  -- Terminos y alertas
  ('control-disciplinario.terminos.manage', 'Gestionar Terminos', 'Administrar terminos y alertas', 'control-disciplinario'),
  ('control-disciplinario.terminos.termino.create', 'Crear Termino', 'Permite crear un nuevo termino', 'control-disciplinario'),
  ('control-disciplinario.terminos.termino.finish', 'Marcar como cumplido', 'Permite marcar un termino como cumplido', 'control-disciplinario'),
  ('control-disciplinario.terminos.festivo.create', 'Crear Festivo', 'Permite crear un nuevo festivo', 'control-disciplinario'),
  ('control-disciplinario.terminos.festivo.edit', 'Editar Festivo', 'Permite editar un festivo', 'control-disciplinario'),
  ('control-disciplinario.terminos.festivo.delete', 'Eliminar Festivo', 'Permite eliminar un festivo', 'control-disciplinario'),
  ('control-disciplinario.terminos.regla.edit', 'Editar Alerta', 'Permite editar una regla de alerta', 'control-disciplinario'),
  ('control-disciplinario.terminos.regla.delete', 'Eliminar Alerta', 'Permite eliminar una regla de alerta', 'control-disciplinario'),
-- Profesionales
  ('control-disciplinario.profesionales.manage', 'Gestionar Profesionales', 'Administrar profesionales', 'control-disciplinario'),
  ('control-disciplinario.profesionales.create', 'Asignar Profesional', 'Permite asignar un nuevo profesional', 'control-disciplinario'),
  ('control-disciplinario.profesionales.edit', 'Editar Profesional', 'Permite editar un profesional', 'control-disciplinario'),
  ('control-disciplinario.profesionales.delete', 'Eliminar Profesional', 'Permite eliminar un profesional', 'control-disciplinario'),
  -- Configuraciones
  ('control-disciplinario.configuraciones.manage', 'Gestionar Configuraciones', 'Administrar configuraciones', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.edit', 'Editar Configuraciones', 'Permite editar configuraciones', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.reset', 'Restablecer Configuraciones', 'Permite restablecer configuraciones', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.etapa.create', 'Crear nueva etapa', 'Permite crear nueva etapa', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.etapa.edit', 'Editar etapa', 'Permite editar una etapa', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.etapa.delete', 'Elimiar etapa', 'Permite eliminar una etapa', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.cargo.create', 'Crear nuevo cargo', 'Permite crear nuevo cargo', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.cargo.edit', 'Editar cargo', 'Permite editar un cargo', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.cargo.delete', 'Elimiar cargo', 'Permite eliminar un cargo', 'control-disciplinario'),
  ('control-disciplinario.configuraciones.firma.upload', 'Cargar firma', 'Permite cargar una firma digital', 'control-disciplinario')
) AS p(code,name,description,module_code)
JOIN auth.module m ON m.code = p.module_code;