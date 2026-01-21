export enum Permissions {
  // Gestión Legal - Defensa Judicial
  GESTION_LEGAL_DEFENSA_JUDICIAL_MANAGE = 'gestion-legal.defensa-judicial.manage',
  GESTION_LEGAL_DEFENSA_JUDICIAL_CREATE = 'gestion-legal.defensa-judicial.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_DOC_UPLOAD = 'gestion-legal.defensa-judicial.expediente.doc.upload',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_DOC_DELETE = 'gestion-legal.defensa-judicial.expediente.doc.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_ACTUACION_CREATE = 'gestion-legal.defensa-judicial.expediente.actuacion.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_ACTUACION_AUDIENCIA_CREATE = 'gestion-legal.defensa-judicial.expediente.actuacion.audiencia.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_TAREA_CREATE = 'gestion-legal.defensa-judicial.expediente.tarea.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_TAREA_DELETE = 'gestion-legal.defensa-judicial.expediente.tarea.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_NOTA_CREATE = 'gestion-legal.defensa-judicial.expediente.nota.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_NOTA_DELETE = 'gestion-legal.defensa-judicial.expediente.nota.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_AUTOS_CREATE = 'gestion-legal.defensa-judicial.autos.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_AUTOS_DELETE = 'gestion-legal.defensa-judicial.autos.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EVIDENCIAS_CREATE = 'gestion-legal.defensa-judicial.evidencias.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EVIDENCIAS_DELETE = 'gestion-legal.defensa-judicial.evidencias.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_EVIDENCIAS_ADMITIR = 'gestion-legal.defensa-judicial.evidencias.admitir',
  GESTION_LEGAL_DEFENSA_JUDICIAL_OFICIOS_CREATE = 'gestion-legal.defensa-judicial.oficios.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_OFICIOS_DELETE = 'gestion-legal.defensa-judicial.oficios.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_OFICIOS_ATENDER = 'gestion-legal.defensa-judicial.oficios.atender',
  GESTION_LEGAL_DEFENSA_JUDICIAL_ACTAS_CREATE = 'gestion-legal.defensa-judicial.actas.create',
  GESTION_LEGAL_DEFENSA_JUDICIAL_ACTAS_DELETE = 'gestion-legal.defensa-judicial.actas.delete',
  GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT = 'gestion-legal.defensa-judicial.estados.edit',

  // Gestión Legal - Juzgamiento Disciplinario
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_MANAGE = 'gestion-legal.juzgamiento-disciplinario.manage',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_EDIT = 'gestion-legal.juzgamiento-disciplinario.expediente.edit',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_PRUEBA = 'gestion-legal.juzgamiento-disciplinario.expediente.prueba',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_DECISION = 'gestion-legal.juzgamiento-disciplinario.expediente.decision',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_DOC_UPLOAD = 'gestion-legal.juzgamiento-disciplinario.expediente.doc.upload',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_AUTOS_CREATE = 'gestion-legal.juzgamiento-disciplinario.autos.create',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_AUTOS_DELETE = 'gestion-legal.juzgamiento-disciplinario.autos.delete',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EVIDENCIAS_CREATE = 'gestion-legal.juzgamiento-disciplinario.evidencias.create',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EVIDENCIAS_DELETE = 'gestion-legal.juzgamiento-disciplinario.evidencias.delete',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EVIDENCIAS_ADMITIR = 'gestion-legal.juzgamiento-disciplinario.evidencias.admitir',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_OFICIOS_CREATE = 'gestion-legal.juzgamiento-disciplinario.oficios.create',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_OFICIOS_DELETE = 'gestion-legal.juzgamiento-disciplinario.oficios.delete',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_OFICIOS_ATENDER = 'gestion-legal.juzgamiento-disciplinario.oficios.atender',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_ACTAS_CREATE = 'gestion-legal.juzgamiento-disciplinario.actas.create',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_ACTAS_DELETE = 'gestion-legal.juzgamiento-disciplinario.actas.delete',
  GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_ESTADOS_EDIT = 'gestion-legal.juzgamiento-disciplinario.estados.edit',

  // Gestión Legal - Asesoría Jurídica
  GESTION_LEGAL_ASESORIA_JURIDICA_MANAGE = 'gestion-legal.asesoria-juridica.manage',
  GESTION_LEGAL_ASESORIA_JURIDICA_CREATE = 'gestion-legal.asesoria-juridica.create',
  GESTION_LEGAL_ASESORIA_JURIDICA_DELETE = 'gestion-legal.asesoria-juridica.delete',
  GESTION_LEGAL_ASESORIA_JURIDICA_EXPEDIENTE_DOC_UPLOAD = 'gestion-legal.asesoria-juridica.expediente.doc.upload',
  GESTION_LEGAL_ASESORIA_JURIDICA_EXPEDIENTE_DOC_DELETE = 'gestion-legal.asesoria-juridica.expediente.doc.delete',

  // Gestión Legal - Centro de Comunicaciones
  GESTION_LEGAL_COMUNICACIONES_MANAGE = 'gestion-legal.comunicaciones.manage',
  GESTION_LEGAL_COMUNICACIONES_CREATE = 'gestion-legal.comunicaciones.create',
  GESTION_LEGAL_COMUNICACIONES_LEIDO = 'gestion-legal.comunicaciones.leido',
  GESTION_LEGAL_COMUNICACIONES_ARCHIVAR = 'gestion-legal.comunicaciones.archivar',

  // Gestión Legal - Términos e Informaciones
  GESTION_LEGAL_TERMINOS_MANAGE = 'gestion-legal.terminos.manage',

  // Gestión Legal - Órganos de Control
  GESTION_LEGAL_ORGANOS_CONTROL_MANAGE = 'gestion-legal.organos-control.manage',
  GESTION_LEGAL_ORGANOS_CONTROL_CREATE = 'gestion-legal.organos-control.create',
  GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR = 'gestion-legal.organos-control.elaborar',
  GESTION_LEGAL_ORGANOS_CONTROL_DELETE = 'gestion-legal.organos-control.delete',
  GESTION_LEGAL_ORGANOS_CONTROL_DOC_UPLOAD = 'gestion-legal.organos-control.doc.upload',
  GESTION_LEGAL_ORGANOS_CONTROL_RESPUESTA_SEND = 'gestion-legal.organos-control.respuesta.send',
  GESTION_LEGAL_ORGANOS_CONTROL_RESPUESTA_ERASE = 'gestion-legal.organos-control.respuesta.erase',
  GESTION_LEGAL_ORGANOS_CONTROL_SOLICITAR_INSUMO = 'gestion-legal.organos-control.solicitar-insumo',

  // Gestión Legal - Procesos Coactivos
  GESTION_LEGAL_PROCESOS_COACTIVOS_MANAGE = 'gestion-legal.procesos-coactivos.manage',
  GESTION_LEGAL_PROCESOS_COACTIVOS_CREATE = 'gestion-legal.procesos-coactivos.create',
  GESTION_LEGAL_PROCESOS_COACTIVOS_EDIT = 'gestion-legal.procesos-coactivos.edit',
  GESTION_LEGAL_PROCESOS_COACTIVOS_DELETE = 'gestion-legal.procesos-coactivos.delete',

  // Gestión Legal - Expedientes Electrónicos
  GESTION_LEGAL_EXPEDIENTES_ELECTRONICOS_MANAGE = 'gestion-legal.expedientes-electronicos.manage',
  GESTION_LEGAL_EXPEDIENTES_ELECTRONICOS_UPLOAD = 'gestion-legal.expedientes-electronicos.upload',

  // Gestión Legal - Plan de Acción
  GESTION_LEGAL_PLAN_ACCION_MANAGE = 'gestion-legal.plan-accion.manage',
  GESTION_LEGAL_PLAN_ACCION_CREATE = 'gestion-legal.plan-accion.create',

  // Gestión Legal - Riesgos
  GESTION_LEGAL_RIESGOS_MANAGE = 'gestion-legal.riesgos.manage',
  GESTION_LEGAL_RIESGOS_CREATE = 'gestion-legal.riesgos.create',
  GESTION_LEGAL_RIESGOS_EDIT = 'gestion-legal.riesgos.edit',
  GESTION_LEGAL_RIESGOS_DELETE = 'gestion-legal.riesgos.delete',

  // Gestión Legal - Planes de Mejoramiento
  GESTION_LEGAL_PLANES_MEJORAMIENTO_MANAGE = 'gestion-legal.planes-mejoramiento.manage',
  GESTION_LEGAL_PLANES_MEJORAMIENTO_CREATE = 'gestion-legal.planes-mejoramiento.create',

  // Gestión Legal - Configuraciones
  GESTION_LEGAL_CONFIGURACIONES_MANAGE = 'gestion-legal.configuraciones.manage',
  GESTION_LEGAL_CONFIGURACIONES_CREATE = 'gestion-legal.configuraciones.create',
  GESTION_LEGAL_CONFIGURACIONES_EDIT = 'gestion-legal.configuraciones.edit',
  GESTION_LEGAL_CONFIGURACIONES_DELETE = 'gestion-legal.configuraciones.delete',

}
