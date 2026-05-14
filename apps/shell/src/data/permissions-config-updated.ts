/**
 * ============================================
 * CONFIGURACIÓN COMPLETA DE PERMISOS v2.0
 * ============================================
 * 
 * Sistema de Permisos Granulares para TODOS los módulos implementados
 * Backoffice Administrativo ESAP
 * 
 * ÚLTIMA ACTUALIZACIÓN: 14 Enero 2026
 * 
 * MÓDULOS INCLUIDOS (21 módulos):
 * ✅ Control Interno (80+ permisos)
 * ✅ Control Disciplinario (45+ permisos)
 * ✅ Gestión Legal (40+ permisos)
 * ✅ Certificados Laborales (15+ permisos)
 * ✅ Firma Electrónica (12+ permisos)
 * ✅ Gestión de Usuarios y Personas (20+ permisos)
 * ✅ Carpeta Digital (10+ permisos)
 * ✅ Roles y Permisos (10+ permisos)
 * ✅ Graduados y Registro Académico (15+ permisos)
 * ✅ Enrolamiento (10+ permisos)
 * ✅ Comunidad (Publicaciones, Eventos, Anuncios) (20+ permisos)
 * ✅ Bolsa de Empleo (12+ permisos)
 * ✅ Estructura Organizacional (15+ permisos)
 * ✅ Programas Académicos (12+ permisos)
 * ✅ Arquitectura Empresarial (15+ permisos)
 * ✅ Gestión Profesoral (15+ permisos)
 * ✅ Gestión de Passwords (8+ permisos)
 * ✅ Informes y Reportes (10+ permisos)
 * ✅ Auditoría de Cambios (10+ permisos)
 * 
 * TOTAL: 350+ permisos granulares
 */

import {
  Users, GraduationCap, Award, FileText, MessageSquare, Briefcase,
  ClipboardList, FolderOpen, BarChart3, ScrollText, Cog, Shield,
  TrendingUp, Building2, BookOpen, CalendarDays, FileCheck, UserPlus,
  Activity, Database, Settings, Bell, Scale, CheckCircle, Clock,
  Pen, Lock, Mail, Search, Download, Eye, Edit, Trash2, Plus,
  XCircle, AlertCircle, CheckSquare, Globe, Hash, Layers,
  Server, GitBranch, Box, Code, Zap, Target, Network, Map
} from 'lucide-react';

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  criticidad?: 'baja' | 'media' | 'alta' | 'critica';
}

export interface PermissionModule {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  permissions: Permission[];
  permissionGroups?: {group: string, permissions: Permission[]}[];
}

// ============================================================================
// CONFIGURACIÓN COMPLETA - TODOS LOS MÓDULOS
// ============================================================================

export const PERMISSION_MODULES: PermissionModule[] = [
  
  // ==========================================================================
  // 1. CONTROL INTERNO DE GESTIÓN (80 permisos)
  // ==========================================================================
  {
    id: 'control_interno',
    name: 'Control Interno de Gestión',
    icon: ClipboardList,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    permissions: [
      // Dashboard y General
      { id: 'ci.dashboard.view', name: 'Ver Dashboard', description: 'Acceso al panel principal de Control Interno', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.export.reports', name: 'Exportar Reportes', description: 'Descargar informes en Excel/PDF', module: 'control_interno', criticidad: 'media' },
      
      // Planificación (Plan Anual)
      { id: 'ci.plan.view', name: 'Ver Plan Anual', description: 'Consultar Plan Anual de Auditoría', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.plan.create', name: 'Crear Plan Anual', description: 'Generar nuevo Plan Anual', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.plan.edit', name: 'Editar Plan Anual', description: 'Modificar Plan Anual existente', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.plan.approve', name: 'Aprobar Plan Anual', description: 'Aprobar Plan Anual para ejecución', module: 'control_interno', criticidad: 'critica' },
      { id: 'ci.plan.export', name: 'Exportar Plan', description: 'Descargar Plan Anual', module: 'control_interno', criticidad: 'media' },
      
      // Auditorías
      { id: 'ci.audit.view', name: 'Ver Auditorías', description: 'Consultar auditorías registradas', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.audit.create', name: 'Crear Auditoría', description: 'Registrar nueva auditoría', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.audit.edit', name: 'Editar Auditoría', description: 'Modificar auditoría existente', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.audit.delete', name: 'Eliminar Auditoría', description: 'Eliminar auditoría del sistema', module: 'control_interno', criticidad: 'critica' },
      { id: 'ci.audit.assign', name: 'Asignar Equipo Auditor', description: 'Asignar auditores a procesos', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.audit.close', name: 'Cerrar Auditoría', description: 'Finalizar y cerrar auditoría', module: 'control_interno', criticidad: 'alta' },
      
      // Hallazgos
      { id: 'ci.finding.view', name: 'Ver Hallazgos', description: 'Consultar hallazgos detectados', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.finding.create', name: 'Crear Hallazgo', description: 'Registrar nuevo hallazgo', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.finding.edit', name: 'Editar Hallazgo', description: 'Modificar hallazgo existente', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.finding.classify', name: 'Clasificar Hallazgo', description: 'Categorizar criticidad de hallazgo', module: 'control_interno', criticidad: 'alta' },
      
      // Planes de Mejoramiento
      { id: 'ci.improvement.view', name: 'Ver Planes de Mejoramiento', description: 'Consultar planes de mejoramiento', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.improvement.create', name: 'Crear Plan de Mejoramiento', description: 'Generar nuevo plan de mejoramiento', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.improvement.edit', name: 'Editar Plan', description: 'Modificar plan de mejoramiento', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.improvement.approve', name: 'Aprobar Plan', description: 'Aprobar plan de mejoramiento', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.improvement.track', name: 'Hacer Seguimiento', description: 'Actualizar avance de plan', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.improvement.close', name: 'Cerrar Plan', description: 'Finalizar plan completado', module: 'control_interno', criticidad: 'alta' },
      
      // Evidencias
      { id: 'ci.evidence.view', name: 'Ver Evidencias', description: 'Consultar evidencias cargadas', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.evidence.upload', name: 'Cargar Evidencias', description: 'Subir documentos de evidencia', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.evidence.validate', name: 'Validar Evidencias', description: 'Aprobar/Rechazar evidencias', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.evidence.delete', name: 'Eliminar Evidencias', description: 'Borrar evidencias del sistema', module: 'control_interno', criticidad: 'critica' },
      
      // Informes de Ley
      { id: 'ci.legal_report.view', name: 'Ver Informes de Ley', description: 'Consultar informes pormenorizados', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.legal_report.create', name: 'Crear Informe de Ley', description: 'Generar informe pormenorizado', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.legal_report.edit', name: 'Editar Informe', description: 'Modificar informe de ley', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.legal_report.approve', name: 'Aprobar Informe', description: 'Aprobar informe para publicación', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.legal_report.publish', name: 'Publicar Informe', description: 'Publicar en portal web', module: 'control_interno', criticidad: 'critica' },
      { id: 'ci.legal_report.send', name: 'Enviar a Entidades', description: 'Enviar a entes de control', module: 'control_interno', criticidad: 'critica' },
      
      // Matriz de Riesgos
      { id: 'ci.risk.view', name: 'Ver Mapa de Riesgos', description: 'Consultar matriz de riesgos', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.risk.create', name: 'Crear Riesgo', description: 'Registrar nuevo riesgo', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.risk.edit', name: 'Editar Riesgo', description: 'Modificar riesgo existente', module: 'control_interno', criticidad: 'media' },
      { id: 'ci.risk.assess', name: 'Evaluar Riesgo', description: 'Calcular probabilidad e impacto', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.risk.mitigate', name: 'Crear Plan de Mitigación', description: 'Definir controles de mitigación', module: 'control_interno', criticidad: 'alta' },
      
      // Configuraciones
      { id: 'ci.config.view', name: 'Ver Configuraciones', description: 'Consultar configuraciones del módulo', module: 'control_interno', criticidad: 'baja' },
      { id: 'ci.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros del sistema', module: 'control_interno', criticidad: 'alta' },
      { id: 'ci.config.users', name: 'Gestionar Usuarios CIG', description: 'Administrar usuarios de Control Interno', module: 'control_interno', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 2. CONTROL DISCIPLINARIO (95+ permisos granulares parametrizables)
  // ==========================================================================
  {
    id: 'control_disciplinario',
    name: 'Control Disciplinario',
    icon: Scale,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    permissions: [
      // ============ DASHBOARD Y VISUALIZACIÓN ============
      { id: 'cd.dashboard.view', name: 'Ver Dashboard', description: 'Acceso al panel principal de Control Disciplinario', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.dashboard.view_stats', name: 'Ver Estadísticas Generales', description: 'Visualizar KPIs y métricas del módulo', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.dashboard.view_kanban', name: 'Ver Vista Kanban', description: 'Acceso a dashboard operativo Kanban', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.dashboard.view_executive', name: 'Ver Dashboard Ejecutivo', description: 'Acceso a dashboard ejecutivo integrado', module: 'control_disciplinario', criticidad: 'media' },
      
      // ============ NOTICIAS/QUEJAS (Recepción) ============
      { id: 'cd.noticia.view', name: 'Ver Noticias/Quejas', description: 'Consultar quejas y denuncias recibidas', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.noticia.view_all', name: 'Ver Todas las Noticias', description: 'Acceso a todas las noticias (sin filtro territorial)', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.noticia.view_own', name: 'Ver Noticias Propias', description: 'Ver solo noticias asignadas al usuario', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.noticia.create', name: 'Crear Noticia', description: 'Registrar nueva queja o denuncia', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.noticia.edit', name: 'Editar Noticia', description: 'Modificar datos de noticia existente', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.noticia.delete', name: 'Eliminar Noticia', description: 'Borrar noticia del sistema', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.noticia.classify', name: 'Clasificar Noticia', description: 'Categorizar tipo y gravedad de noticia', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.noticia.archive', name: 'Archivar Noticia', description: 'Archivar noticia sin iniciar proceso', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.noticia.assign', name: 'Asignar Noticia', description: 'Asignar noticia a profesional', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.noticia.convert_to_process', name: 'Convertir a Proceso', description: 'Iniciar proceso disciplinario desde noticia', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.noticia.remit_competence', name: 'Remitir por Competencia', description: 'Remitir noticia a otra entidad competente', module: 'control_disciplinario', criticidad: 'alta' },
      
      // ============ PROCESOS DISCIPLINARIOS ============
      { id: 'cd.process.view', name: 'Ver Procesos', description: 'Consultar procesos disciplinarios', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.process.view_all', name: 'Ver Todos los Procesos', description: 'Acceso a todos los procesos (sin filtro)', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.process.view_own', name: 'Ver Procesos Propios', description: 'Ver solo procesos asignados al usuario', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.process.view_details', name: 'Ver Detalles Completos', description: 'Acceder a información detallada del proceso', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.process.create', name: 'Iniciar Proceso', description: 'Abrir nuevo proceso disciplinario', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.process.edit', name: 'Editar Proceso', description: 'Modificar datos del proceso', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.process.delete', name: 'Eliminar Proceso', description: 'Borrar proceso del sistema', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.process.assign', name: 'Asignar Profesional', description: 'Asignar o reasignar proceso a profesional', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.process.change_stage', name: 'Cambiar Etapa', description: 'Mover proceso a siguiente etapa procesal', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.process.close', name: 'Cerrar Proceso', description: 'Finalizar proceso disciplinario', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.process.archive', name: 'Archivar Proceso', description: 'Archivar proceso sin sanción', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.process.reopen', name: 'Reabrir Proceso', description: 'Reactivar proceso cerrado', module: 'control_disciplinario', criticidad: 'critica' },
      
      // ============ ETAPAS PROCESALES ============
      { id: 'cd.stage.valoracion', name: 'Gestionar Valoración', description: 'Administrar etapa de valoración inicial', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.stage.indagacion', name: 'Gestionar Indagación', description: 'Administrar indagación preliminar', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.stage.investigacion', name: 'Gestionar Investigación', description: 'Administrar investigación formal', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.stage.juzgamiento', name: 'Gestionar Juzgamiento', description: 'Administrar etapa de juzgamiento', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.stage.fallo', name: 'Gestionar Fallo', description: 'Administrar emisión de fallo', module: 'control_disciplinario', criticidad: 'critica' },
      
      // ============ AUTOS Y PROVIDENCIAS ============
      { id: 'cd.auto.view', name: 'Ver Autos', description: 'Consultar autos emitidos', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.auto.create', name: 'Crear Auto', description: 'Generar auto disciplinario', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.auto.edit', name: 'Editar Auto', description: 'Modificar auto antes de firma', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.auto.delete', name: 'Eliminar Auto', description: 'Borrar auto no firmado', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.auto.sign', name: 'Firmar Auto', description: 'Firmar digitalmente auto', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.auto.notify', name: 'Notificar Auto', description: 'Notificar formalmente al investigado', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.auto.download', name: 'Descargar Auto', description: 'Descargar auto en PDF', module: 'control_disciplinario', criticidad: 'baja' },
      
      // ============ RESOLUCIONES Y FALLOS ============
      { id: 'cd.resolution.view', name: 'Ver Resoluciones', description: 'Consultar resoluciones emitidas', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.resolution.create', name: 'Crear Resolución', description: 'Generar resolución sancionatoria', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.resolution.edit', name: 'Editar Resolución', description: 'Modificar resolución antes de firma', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.resolution.sign', name: 'Firmar Resolución', description: 'Firmar digitalmente resolución', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.resolution.notify', name: 'Notificar Resolución', description: 'Notificar formalmente resolución', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.fallo.sancionatorio', name: 'Emitir Fallo Sancionatorio', description: 'Generar fallo con sanción', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.fallo.absolutorio', name: 'Emitir Fallo Absolutorio', description: 'Generar fallo absolutorio', module: 'control_disciplinario', criticidad: 'critica' },
      
      // ============ SANCIONES ============
      { id: 'cd.sanction.view', name: 'Ver Sanciones', description: 'Consultar sanciones impuestas', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.sanction.apply', name: 'Aplicar Sanción', description: 'Imponer sanción disciplinaria', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.sanction.modify', name: 'Modificar Sanción', description: 'Ajustar términos de sanción', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.sanction.track', name: 'Hacer Seguimiento', description: 'Monitorear cumplimiento de sanción', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.sanction.close', name: 'Cerrar Sanción', description: 'Finalizar sanción cumplida', module: 'control_disciplinario', criticidad: 'alta' },
      
      // ============ EXPEDIENTE ELECTRÓNICO ============
      { id: 'cd.expediente.view', name: 'Ver Expediente', description: 'Consultar expediente electrónico', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.expediente.upload', name: 'Cargar Documentos', description: 'Subir documentos al expediente', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.expediente.download', name: 'Descargar Documentos', description: 'Descargar documentos del expediente', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.expediente.delete', name: 'Eliminar Documentos', description: 'Borrar documentos del expediente', module: 'control_disciplinario', criticidad: 'critica' },
      { id: 'cd.expediente.organize', name: 'Organizar Expediente', description: 'Gestionar estructura del expediente', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.expediente.export', name: 'Exportar Expediente', description: 'Descargar expediente completo', module: 'control_disciplinario', criticidad: 'media' },
      
      // ============ EDITOR DE DOCUMENTOS ============
      { id: 'cd.editor.access', name: 'Acceder a Editor', description: 'Usar editor de documentos procesales', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.editor.create', name: 'Crear Documento', description: 'Generar nuevo documento procesal', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.editor.edit', name: 'Editar Documento', description: 'Modificar documento existente', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.editor.use_templates', name: 'Usar Plantillas', description: 'Acceder a plantillas predefinidas', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.editor.save_template', name: 'Guardar como Plantilla', description: 'Crear plantilla desde documento', module: 'control_disciplinario', criticidad: 'media' },
      
      // ============ GESTIÓN DE PROFESIONALES ============
      { id: 'cd.professional.view', name: 'Ver Profesionales', description: 'Consultar equipo disciplinario', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.professional.add', name: 'Agregar Profesional', description: 'Vincular profesional al equipo', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.professional.remove', name: 'Remover Profesional', description: 'Desvincular profesional del equipo', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.professional.edit_capacity', name: 'Editar Capacidad', description: 'Modificar capacidad máxima de procesos', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.professional.view_load', name: 'Ver Carga de Trabajo', description: 'Consultar carga de procesos asignados', module: 'control_disciplinario', criticidad: 'baja' },
      
      // ============ TÉRMINOS Y ALERTAS ============
      { id: 'cd.terms.view', name: 'Ver Términos', description: 'Consultar calendario de términos', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.terms.create', name: 'Crear Término', description: 'Registrar nuevo término procesal', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.terms.edit', name: 'Editar Término', description: 'Modificar término existente', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.terms.delete', name: 'Eliminar Término', description: 'Borrar término registrado', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.alerts.view', name: 'Ver Alertas', description: 'Consultar alertas de vencimiento', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.alerts.configure', name: 'Configurar Alertas', description: 'Ajustar parámetros de alertas', module: 'control_disciplinario', criticidad: 'media' },
      
      // ============ REVISIÓN Y APROBACIÓN DE JEFE ============
      { id: 'cd.review.access', name: 'Acceder a Revisión', description: 'Acceso al módulo de revisión de jefe', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.review.approve', name: 'Aprobar Documento', description: 'Aprobar documento para firma', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.review.reject', name: 'Rechazar Documento', description: 'Devolver documento con observaciones', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.review.add_comments', name: 'Agregar Comentarios', description: 'Añadir observaciones de revisión', module: 'control_disciplinario', criticidad: 'media' },
      
      // ============ REPORTES Y EXPORTACIÓN ============
      { id: 'cd.export.general', name: 'Exportar Reportes Generales', description: 'Generar informes en PDF/Excel', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.export.statistics', name: 'Exportar Estadísticas', description: 'Descargar datos estadísticos', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.export.processes', name: 'Exportar Procesos', description: 'Descargar listado de procesos', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.export.advanced', name: 'Reportes Avanzados', description: 'Generar reportes con filtros avanzados', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas del módulo', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.stats.executive', name: 'Estadísticas Ejecutivas', description: 'Acceso a métricas de alta gerencia', module: 'control_disciplinario', criticidad: 'alta' },
      
      // ============ AUDITORÍA Y TRAZABILIDAD ============
      { id: 'cd.audit.view', name: 'Ver Auditoría', description: 'Consultar log de auditoría de cambios', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.audit.export', name: 'Exportar Auditoría', description: 'Descargar registros de auditoría', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.tracking.view', name: 'Ver Trazabilidad', description: 'Consultar historial de acciones', module: 'control_disciplinario', criticidad: 'baja' },
      
      // ============ CONFIGURACIÓN DEL MÓDULO ============
      { id: 'cd.config.view', name: 'Ver Configuraciones', description: 'Consultar configuraciones del módulo', module: 'control_disciplinario', criticidad: 'baja' },
      { id: 'cd.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros del sistema', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.config.stages', name: 'Configurar Etapas', description: 'Administrar etapas procesales y tiempos', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.config.capacity', name: 'Configurar Capacidades', description: 'Ajustar capacidades por cargo', module: 'control_disciplinario', criticidad: 'alta' },
      { id: 'cd.config.notifications', name: 'Configurar Notificaciones', description: 'Ajustar alertas y notificaciones', module: 'control_disciplinario', criticidad: 'media' },
      { id: 'cd.config.templates', name: 'Gestionar Plantillas', description: 'Administrar plantillas de documentos', module: 'control_disciplinario', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 3. GESTIÓN LEGAL (SIGL) (40 permisos)
  // ==========================================================================
  {
    id: 'gestion_legal',
    name: 'Gestión Legal (SIGL)',
    icon: ScrollText,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    permissions: [
      // Dashboard
      { id: 'gl.dashboard.view', name: 'Ver Dashboard', description: 'Panel principal de Gestión Legal', module: 'gestion_legal', criticidad: 'baja' },
      
      // Expedientes
      { id: 'gl.expediente.view', name: 'Ver Expedientes', description: 'Consultar expedientes legales', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.expediente.create', name: 'Crear Expediente', description: 'Registrar nuevo expediente legal', module: 'gestion_legal', criticidad: 'alta' },
      { id: 'gl.expediente.edit', name: 'Editar Expediente', description: 'Modificar expediente existente', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.expediente.close', name: 'Cerrar Expediente', description: 'Finalizar expediente', module: 'gestion_legal', criticidad: 'alta' },
      { id: 'gl.expediente.assign', name: 'Asignar Abogado', description: 'Asignar responsable legal', module: 'gestion_legal', criticidad: 'alta' },
      
      // Tipos de Procesos
      { id: 'gl.tutela.manage', name: 'Gestionar Tutelas', description: 'Administrar acciones de tutela', module: 'gestion_legal', criticidad: 'critica' },
      { id: 'gl.demanda.manage', name: 'Gestionar Demandas', description: 'Administrar demandas', module: 'gestion_legal', criticidad: 'alta' },
      { id: 'gl.conciliacion.manage', name: 'Gestionar Conciliaciones', description: 'Administrar conciliaciones', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.proceso_coactivo.manage', name: 'Gestionar Procesos Coactivos', description: 'Administrar cobro coactivo', module: 'gestion_legal', criticidad: 'alta' },
      
      // Conceptos Jurídicos
      { id: 'gl.concepto.view', name: 'Ver Conceptos Jurídicos', description: 'Consultar conceptos emitidos', module: 'gestion_legal', criticidad: 'baja' },
      { id: 'gl.concepto.create', name: 'Crear Concepto Jurídico', description: 'Emitir concepto jurídico', module: 'gestion_legal', criticidad: 'alta' },
      { id: 'gl.concepto.edit', name: 'Editar Concepto', description: 'Modificar concepto jurídico', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.concepto.approve', name: 'Aprobar Concepto', description: 'Aprobar concepto para notificación', module: 'gestion_legal', criticidad: 'alta' },
      
      // Contratos
      { id: 'gl.contract.view', name: 'Ver Contratos', description: 'Consultar contratos registrados', module: 'gestion_legal', criticidad: 'baja' },
      { id: 'gl.contract.create', name: 'Crear Contrato', description: 'Registrar nuevo contrato', module: 'gestion_legal', criticidad: 'alta' },
      { id: 'gl.contract.edit', name: 'Editar Contrato', description: 'Modificar contrato existente', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.contract.approve', name: 'Aprobar Contrato', description: 'Aprobar contrato para firma', module: 'gestion_legal', criticidad: 'alta' },
      
      // Documentación
      { id: 'gl.docs.upload', name: 'Cargar Documentos', description: 'Subir documentos al expediente', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.docs.download', name: 'Descargar Documentos', description: 'Descargar documentos', module: 'gestion_legal', criticidad: 'baja' },
      { id: 'gl.docs.delete', name: 'Eliminar Documentos', description: 'Borrar documentos', module: 'gestion_legal', criticidad: 'critica' },
      
      // Trazabilidad y Auditoría
      { id: 'gl.tracking.view', name: 'Ver Trazabilidad', description: 'Consultar historial de acciones', module: 'gestion_legal', criticidad: 'baja' },
      
      // Reportes
      { id: 'gl.export.report', name: 'Exportar Reportes', description: 'Generar informes en PDF/Excel', module: 'gestion_legal', criticidad: 'media' },
      { id: 'gl.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas del módulo', module: 'gestion_legal', criticidad: 'baja' },
      
      // Configuración
      { id: 'gl.config.view', name: 'Ver Configuraciones', description: 'Consultar configuraciones', module: 'gestion_legal', criticidad: 'baja' },
      { id: 'gl.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'gestion_legal', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 4. CERTIFICADOS LABORALES (15 permisos)
  // ==========================================================================
  {
    id: 'certificados_laborales',
    name: 'Certificados Laborales',
    icon: FileCheck,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    permissions: [
      { id: 'cl.dashboard.view', name: 'Ver Dashboard', description: 'Panel principal de certificados', module: 'certificados_laborales', criticidad: 'baja' },
      { id: 'cl.request.view', name: 'Ver Solicitudes', description: 'Consultar solicitudes de certificados', module: 'certificados_laborales', criticidad: 'baja' },
      { id: 'cl.request.create', name: 'Crear Solicitud', description: 'Generar nueva solicitud', module: 'certificados_laborales', criticidad: 'media' },
      { id: 'cl.certificate.generate', name: 'Generar Certificado', description: 'Emitir certificado laboral', module: 'certificados_laborales', criticidad: 'alta' },
      { id: 'cl.certificate.approve', name: 'Aprobar Certificado', description: 'Aprobar certificado para entrega', module: 'certificados_laborales', criticidad: 'alta' },
      { id: 'cl.certificate.sign', name: 'Firmar Certificado', description: 'Firmar digitalmente certificado', module: 'certificados_laborales', criticidad: 'critica' },
      { id: 'cl.certificate.deliver', name: 'Reenviar Certificado', description: 'Reenviar certificado al correo del solicitante', module: 'certificados_laborales', criticidad: 'media' },
      { id: 'cl.certificate.verify', name: 'Verificar Certificado', description: 'Validar autenticidad mediante QR', module: 'certificados_laborales', criticidad: 'media' },
      { id: 'cl.certificate.revoke', name: 'Revocar Certificado', description: 'Anular certificado emitido', module: 'certificados_laborales', criticidad: 'critica' },
      { id: 'cl.template.manage', name: 'Gestionar Plantillas', description: 'Administrar plantillas de certificados', module: 'certificados_laborales', criticidad: 'alta' },
      { id: 'cl.export.report', name: 'Exportar Reportes', description: 'Generar informes', module: 'certificados_laborales', criticidad: 'media' },
      { id: 'cl.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas', module: 'certificados_laborales', criticidad: 'baja' },
      { id: 'cl.notification.send', name: 'Enviar Notificaciones', description: 'Notificar al solicitante', module: 'certificados_laborales', criticidad: 'media' },
      { id: 'cl.history.view', name: 'Ver Histórico', description: 'Consultar histórico de validaciones', module: 'certificados_laborales', criticidad: 'baja' },
      { id: 'cl.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'certificados_laborales', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 5. FIRMA ELECTRÓNICA (12 permisos)
  // ==========================================================================
  {
    id: 'firma_electronica',
    name: 'Firma Electrónica',
    icon: Pen,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    permissions: [
      { id: 'fe.dashboard.view', name: 'Ver Dashboard', description: 'Panel principal de firma electrónica', module: 'firma_electronica', criticidad: 'baja' },
      { id: 'fe.document.upload', name: 'Cargar Documento', description: 'Subir documento para firma', module: 'firma_electronica', criticidad: 'media' },
      { id: 'fe.signature.request', name: 'Solicitar Firma', description: 'Enviar solicitud de firma', module: 'firma_electronica', criticidad: 'alta' },
      { id: 'fe.signature.sign', name: 'Firmar Documento', description: 'Firmar digitalmente documento', module: 'firma_electronica', criticidad: 'alta' },
      { id: 'fe.signature.reject', name: 'Rechazar Firma', description: 'Rechazar solicitud de firma', module: 'firma_electronica', criticidad: 'media' },
      { id: 'fe.signature.verify', name: 'Verificar Firma', description: 'Validar autenticidad de firma', module: 'firma_electronica', criticidad: 'media' },
      { id: 'fe.document.download', name: 'Descargar Documento', description: 'Descargar documento firmado', module: 'firma_electronica', criticidad: 'baja' },
      { id: 'fe.workflow.view', name: 'Ver Flujos de Firma', description: 'Consultar workflows de firma', module: 'firma_electronica', criticidad: 'baja' },
      { id: 'fe.workflow.create', name: 'Crear Flujo', description: 'Configurar workflow de firma', module: 'firma_electronica', criticidad: 'alta' },
      { id: 'fe.history.view', name: 'Ver Histórico', description: 'Consultar histórico de firmas', module: 'firma_electronica', criticidad: 'baja' },
      { id: 'fe.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas', module: 'firma_electronica', criticidad: 'baja' },
      { id: 'fe.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'firma_electronica', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 6. GESTIÓN DE USUARIOS Y PERSONAS (20 permisos)
  // ==========================================================================
  {
    id: 'usuarios',
    name: 'Gestión de Usuarios',
    icon: Users,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    permissions: [
      { id: 'users.view', name: 'Ver Usuarios', description: 'Consultar lista de usuarios', module: 'usuarios', criticidad: 'baja' },
      { id: 'users.create', name: 'Crear Usuario', description: 'Registrar nuevo usuario', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.edit', name: 'Editar Usuario', description: 'Modificar datos de usuario', module: 'usuarios', criticidad: 'media' },
      { id: 'users.delete', name: 'Eliminar Usuario', description: 'Dar de baja usuario', module: 'usuarios', criticidad: 'critica' },
      { id: 'users.activate', name: 'Activar/Desactivar', description: 'Cambiar estado de usuario', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.reset_password', name: 'Restablecer Contraseña', description: 'Resetear contraseña de usuario', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.assign_role', name: 'Asignar Rol', description: 'Asignar roles a usuario', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.remove_role', name: 'Revocar Rol', description: 'Quitar roles de usuario', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.assign_territorial', name: 'Asignar Territorial', description: 'Vincular a dirección territorial', module: 'usuarios', criticidad: 'media' },
      { id: 'users.assign_sede', name: 'Asignar Sede', description: 'Vincular a sede específica', module: 'usuarios', criticidad: 'media' },
      { id: 'users.view_persona', name: 'Ver Modelo Persona', description: 'Consultar modelo Usuario Persona', module: 'usuarios', criticidad: 'baja' },
      { id: 'users.manage_persona', name: 'Gestionar Persona', description: 'Administrar múltiples roles por persona', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.view_enrollment', name: 'Ver Vinculaciones', description: 'Consultar vinculaciones académicas', module: 'usuarios', criticidad: 'baja' },
      { id: 'users.export', name: 'Exportar Usuarios', description: 'Descargar datos en Excel/CSV', module: 'usuarios', criticidad: 'media' },
      { id: 'users.import', name: 'Importar Usuarios', description: 'Carga masiva de usuarios', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.view_audit', name: 'Ver Auditoría', description: 'Consultar log de cambios', module: 'usuarios', criticidad: 'baja' },
      { id: 'users.manage_2fa', name: 'Gestionar 2FA', description: 'Administrar autenticación de dos factores', module: 'usuarios', criticidad: 'alta' },
      { id: 'users.view_stats', name: 'Ver Estadísticas', description: 'Consultar métricas de usuarios', module: 'usuarios', criticidad: 'baja' },
      { id: 'users.send_notification', name: 'Enviar Notificaciones', description: 'Notificar a usuarios', module: 'usuarios', criticidad: 'media' },
      { id: 'users.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros del módulo', module: 'usuarios', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 7. CARPETA DIGITAL (10 permisos)
  // ==========================================================================
  {
    id: 'carpeta_digital',
    name: 'Carpeta Digital',
    icon: FolderOpen,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    permissions: [
      { id: 'cd.view', name: 'Ver Carpeta Digital', description: 'Consultar carpeta digital de usuarios', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.upload', name: 'Cargar Documentos', description: 'Subir documentos a carpeta digital', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.download', name: 'Descargar Documentos', description: 'Descargar documentos de carpeta', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.delete', name: 'Eliminar Documentos', description: 'Borrar documentos de carpeta', module: 'carpeta_digital', criticidad: 'alta' },
      { id: 'cd.organize', name: 'Organizar Carpetas', description: 'Crear y gestionar categorías', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.validate', name: 'Validar Documentos', description: 'Aprobar/Rechazar documentos', module: 'carpeta_digital', criticidad: 'alta' },
      { id: 'cd.share', name: 'Compartir Documentos', description: 'Compartir documentos con otros usuarios', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.version_control', name: 'Control de Versiones', description: 'Gestionar versiones de documentos', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.export', name: 'Exportar Carpeta', description: 'Descargar carpeta completa', module: 'carpeta_digital', criticidad: 'media' },
      { id: 'cd.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'carpeta_digital', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 8. ROLES Y PERMISOS (10 permisos)
  // ==========================================================================
  {
    id: 'roles_permisos',
    name: 'Roles y Permisos',
    icon: Shield,
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    permissions: [
      { id: 'roles.view', name: 'Ver Roles', description: 'Consultar roles del sistema', module: 'roles_permisos', criticidad: 'baja' },
      { id: 'roles.create', name: 'Crear Rol', description: 'Registrar nuevo rol', module: 'roles_permisos', criticidad: 'critica' },
      { id: 'roles.edit', name: 'Editar Rol', description: 'Modificar rol existente', module: 'roles_permisos', criticidad: 'critica' },
      { id: 'roles.delete', name: 'Eliminar Rol', description: 'Borrar rol del sistema', module: 'roles_permisos', criticidad: 'critica' },
      { id: 'roles.assign_permissions', name: 'Asignar Permisos', description: 'Configurar permisos granulares', module: 'roles_permisos', criticidad: 'critica' },
      { id: 'roles.revoke_permissions', name: 'Revocar Permisos', description: 'Quitar permisos de rol', module: 'roles_permisos', criticidad: 'critica' },
      { id: 'roles.clone', name: 'Clonar Rol', description: 'Duplicar rol existente', module: 'roles_permisos', criticidad: 'alta' },
      { id: 'roles.view_users', name: 'Ver Usuarios del Rol', description: 'Consultar usuarios asignados', module: 'roles_permisos', criticidad: 'baja' },
      { id: 'roles.export', name: 'Exportar Roles', description: 'Descargar configuración de roles', module: 'roles_permisos', criticidad: 'media' },
      { id: 'roles.audit', name: 'Ver Auditoría', description: 'Consultar cambios en roles y permisos', module: 'roles_permisos', criticidad: 'media' },
    ]
  },

  // ==========================================================================
  // 9. GRADUADOS Y REGISTRO ACADÉMICO (15 permisos)
  // ==========================================================================
  {
    id: 'graduados',
    name: 'Graduados',
    icon: Award,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    permissions: [
      { id: 'grad.view', name: 'Ver Graduados', description: 'Consultar base de datos de graduados', module: 'graduados', criticidad: 'baja' },
      { id: 'grad.create', name: 'Registrar Graduado', description: 'Registrar nuevo graduado', module: 'graduados', criticidad: 'alta' },
      { id: 'grad.edit', name: 'Editar Graduado', description: 'Modificar datos de graduado', module: 'graduados', criticidad: 'media' },
      { id: 'grad.delete', name: 'Eliminar Graduado', description: 'Dar de baja graduado', module: 'graduados', criticidad: 'critica' },
      { id: 'grad.generate_diploma', name: 'Generar Diploma', description: 'Emitir diploma de grado', module: 'graduados', criticidad: 'critica' },
      { id: 'grad.generate_certificate', name: 'Generar Certificado', description: 'Emitir certificado de título', module: 'graduados', criticidad: 'alta' },
      { id: 'grad.verify_certificate', name: 'Verificar Certificado', description: 'Validar autenticidad mediante QR', module: 'graduados', criticidad: 'media' },
      { id: 'grad.revoke_certificate', name: 'Revocar Certificado', description: 'Anular certificado emitido', module: 'graduados', criticidad: 'critica' },
      { id: 'grad.view_academic_record', name: 'Ver Registro Académico', description: 'Consultar historial académico', module: 'graduados', criticidad: 'baja' },
      { id: 'grad.edit_academic_record', name: 'Editar Registro', description: 'Modificar datos académicos', module: 'graduados', criticidad: 'alta' },
      { id: 'grad.export', name: 'Exportar Graduados', description: 'Descargar datos de graduados', module: 'graduados', criticidad: 'media' },
      { id: 'grad.view_stats', name: 'Ver Estadísticas', description: 'Consultar métricas de graduados', module: 'graduados', criticidad: 'baja' },
      { id: 'grad.send_notification', name: 'Enviar Notificaciones', description: 'Notificar a graduados', module: 'graduados', criticidad: 'media' },
      { id: 'grad.manage_honors', name: 'Gestionar Honores', description: 'Asignar menciones y reconocimientos', module: 'graduados', criticidad: 'alta' },
      { id: 'grad.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'graduados', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 10. ENROLAMIENTO (10 permisos)
  // ==========================================================================
  {
    id: 'enrolamiento',
    name: 'Enrolamiento',
    icon: UserPlus,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    permissions: [
      { id: 'enroll.view', name: 'Ver Enrolamientos', description: 'Consultar procesos de enrolamiento', module: 'enrolamiento', criticidad: 'baja' },
      { id: 'enroll.individual', name: 'Enrolar Individual', description: 'Enrolar usuario individualmente', module: 'enrolamiento', criticidad: 'alta' },
      { id: 'enroll.massive', name: 'Enrolar Masivo', description: 'Enrolar usuarios en lote', module: 'enrolamiento', criticidad: 'alta' },
      { id: 'enroll.import', name: 'Importar Excel', description: 'Cargar archivo de enrolamiento masivo', module: 'enrolamiento', criticidad: 'alta' },
      { id: 'enroll.validate', name: 'Validar Enrolamiento', description: 'Aprobar/Rechazar enrolamiento', module: 'enrolamiento', criticidad: 'alta' },
      { id: 'enroll.cancel', name: 'Cancelar Enrolamiento', description: 'Anular proceso de enrolamiento', module: 'enrolamiento', criticidad: 'alta' },
      { id: 'enroll.view_history', name: 'Ver Histórico', description: 'Consultar histórico de enrolamientos', module: 'enrolamiento', criticidad: 'baja' },
      { id: 'enroll.export', name: 'Exportar Enrolamientos', description: 'Descargar reportes', module: 'enrolamiento', criticidad: 'media' },
      { id: 'enroll.view_stats', name: 'Ver Estadísticas', description: 'Consultar métricas', module: 'enrolamiento', criticidad: 'baja' },
      { id: 'enroll.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'enrolamiento', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 11. COMUNIDAD - PUBLICACIONES (12 permisos)
  // ==========================================================================
  {
    id: 'comunidad_posts',
    name: 'Comunidad - Publicaciones',
    icon: MessageSquare,
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    permissions: [
      { id: 'posts.view', name: 'Ver Publicaciones', description: 'Consultar publicaciones de comunidad', module: 'comunidad_posts', criticidad: 'baja' },
      { id: 'posts.create', name: 'Crear Publicación', description: 'Publicar contenido en comunidad', module: 'comunidad_posts', criticidad: 'media' },
      { id: 'posts.edit', name: 'Editar Publicación', description: 'Modificar publicación existente', module: 'comunidad_posts', criticidad: 'media' },
      { id: 'posts.delete', name: 'Eliminar Publicación', description: 'Borrar publicación', module: 'comunidad_posts', criticidad: 'alta' },
      { id: 'posts.moderate', name: 'Moderar Publicaciones', description: 'Aprobar/Rechazar publicaciones', module: 'comunidad_posts', criticidad: 'alta' },
      { id: 'posts.pin', name: 'Fijar Publicación', description: 'Destacar publicación importante', module: 'comunidad_posts', criticidad: 'media' },
      { id: 'posts.comment', name: 'Comentar', description: 'Comentar en publicaciones', module: 'comunidad_posts', criticidad: 'baja' },
      { id: 'posts.react', name: 'Reaccionar', description: 'Dar me gusta/reacciones', module: 'comunidad_posts', criticidad: 'baja' },
      { id: 'posts.share', name: 'Compartir', description: 'Compartir publicaciones', module: 'comunidad_posts', criticidad: 'baja' },
      { id: 'posts.report', name: 'Reportar', description: 'Reportar contenido inapropiado', module: 'comunidad_posts', criticidad: 'media' },
      { id: 'posts.export', name: 'Exportar Publicaciones', description: 'Descargar reportes', module: 'comunidad_posts', criticidad: 'media' },
      { id: 'posts.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas de engagement', module: 'comunidad_posts', criticidad: 'baja' },
    ]
  },

  // ==========================================================================
  // 12. COMUNIDAD - EVENTOS (10 permisos)
  // ==========================================================================
  {
    id: 'comunidad_events',
    name: 'Comunidad - Eventos',
    icon: CalendarDays,
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    permissions: [
      { id: 'events.view', name: 'Ver Eventos', description: 'Consultar eventos publicados', module: 'comunidad_events', criticidad: 'baja' },
      { id: 'events.create', name: 'Crear Evento', description: 'Publicar nuevo evento', module: 'comunidad_events', criticidad: 'media' },
      { id: 'events.edit', name: 'Editar Evento', description: 'Modificar evento existente', module: 'comunidad_events', criticidad: 'media' },
      { id: 'events.delete', name: 'Eliminar Evento', description: 'Borrar evento', module: 'comunidad_events', criticidad: 'alta' },
      { id: 'events.publish', name: 'Publicar Evento', description: 'Publicar evento para comunidad', module: 'comunidad_events', criticidad: 'media' },
      { id: 'events.cancel', name: 'Cancelar Evento', description: 'Cancelar evento programado', module: 'comunidad_events', criticidad: 'alta' },
      { id: 'events.manage_attendees', name: 'Gestionar Asistentes', description: 'Administrar confirmaciones de asistencia', module: 'comunidad_events', criticidad: 'media' },
      { id: 'events.send_reminders', name: 'Enviar Recordatorios', description: 'Notificar a asistentes registrados', module: 'comunidad_events', criticidad: 'media' },
      { id: 'events.export', name: 'Exportar Eventos', description: 'Descargar reportes', module: 'comunidad_events', criticidad: 'media' },
      { id: 'events.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas de eventos', module: 'comunidad_events', criticidad: 'baja' },
    ]
  },

  // ==========================================================================
  // 13. COMUNIDAD - ANUNCIOS (8 permisos)
  // ==========================================================================
  {
    id: 'comunidad_announcements',
    name: 'Comunidad - Anuncios',
    icon: Bell,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    permissions: [
      { id: 'announce.view', name: 'Ver Anuncios', description: 'Consultar anuncios publicados', module: 'comunidad_announcements', criticidad: 'baja' },
      { id: 'announce.create', name: 'Crear Anuncio', description: 'Publicar nuevo anuncio', module: 'comunidad_announcements', criticidad: 'alta' },
      { id: 'announce.edit', name: 'Editar Anuncio', description: 'Modificar anuncio existente', module: 'comunidad_announcements', criticidad: 'media' },
      { id: 'announce.delete', name: 'Eliminar Anuncio', description: 'Borrar anuncio', module: 'comunidad_announcements', criticidad: 'alta' },
      { id: 'announce.publish', name: 'Publicar Anuncio', description: 'Publicar para toda la comunidad', module: 'comunidad_announcements', criticidad: 'alta' },
      { id: 'announce.target', name: 'Segmentar Audiencia', description: 'Enviar a grupos específicos', module: 'comunidad_announcements', criticidad: 'alta' },
      { id: 'announce.schedule', name: 'Programar Anuncio', description: 'Programar publicación futura', module: 'comunidad_announcements', criticidad: 'media' },
      { id: 'announce.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas de alcance', module: 'comunidad_announcements', criticidad: 'baja' },
    ]
  },

  // ==========================================================================
  // 14. BOLSA DE EMPLEO (12 permisos)
  // ==========================================================================
  {
    id: 'bolsa_empleo',
    name: 'Bolsa de Empleo',
    icon: Briefcase,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    permissions: [
      { id: 'jobs.view', name: 'Ver Ofertas', description: 'Consultar ofertas de empleo', module: 'bolsa_empleo', criticidad: 'baja' },
      { id: 'jobs.create', name: 'Publicar Oferta', description: 'Crear nueva oferta de empleo', module: 'bolsa_empleo', criticidad: 'media' },
      { id: 'jobs.edit', name: 'Editar Oferta', description: 'Modificar oferta existente', module: 'bolsa_empleo', criticidad: 'media' },
      { id: 'jobs.delete', name: 'Eliminar Oferta', description: 'Borrar oferta de empleo', module: 'bolsa_empleo', criticidad: 'alta' },
      { id: 'jobs.activate', name: 'Activar/Desactivar', description: 'Cambiar estado de oferta', module: 'bolsa_empleo', criticidad: 'media' },
      { id: 'jobs.view_applications', name: 'Ver Postulaciones', description: 'Consultar candidatos postulados', module: 'bolsa_empleo', criticidad: 'media' },
      { id: 'jobs.review_application', name: 'Revisar Postulación', description: 'Evaluar candidato', module: 'bolsa_empleo', criticidad: 'alta' },
      { id: 'jobs.contact_candidate', name: 'Contactar Candidato', description: 'Enviar mensaje a postulante', module: 'bolsa_empleo', criticidad: 'media' },
      { id: 'jobs.manage_companies', name: 'Gestionar Empresas', description: 'Administrar empresas registradas', module: 'bolsa_empleo', criticidad: 'alta' },
      { id: 'jobs.export', name: 'Exportar Reportes', description: 'Descargar datos de ofertas', module: 'bolsa_empleo', criticidad: 'media' },
      { id: 'jobs.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas de empleabilidad', module: 'bolsa_empleo', criticidad: 'baja' },
      { id: 'jobs.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'bolsa_empleo', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 15. ESTRUCTURA ORGANIZACIONAL (15 permisos)
  // ==========================================================================
  {
    id: 'estructura',
    name: 'Estructura Organizacional',
    icon: Building2,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    permissions: [
      { id: 'org.view', name: 'Ver Estructura', description: 'Consultar estructura organizacional', module: 'estructura', criticidad: 'baja' },
      { id: 'org.view_territorial', name: 'Ver Territoriales', description: 'Consultar 17 direcciones territoriales', module: 'estructura', criticidad: 'baja' },
      { id: 'org.view_sedes', name: 'Ver Sedes', description: 'Consultar 71+ sedes ESAP', module: 'estructura', criticidad: 'baja' },
      { id: 'org.create_dependencia', name: 'Crear Dependencia', description: 'Registrar nueva dependencia', module: 'estructura', criticidad: 'alta' },
      { id: 'org.edit_dependencia', name: 'Editar Dependencia', description: 'Modificar dependencia existente', module: 'estructura', criticidad: 'media' },
      { id: 'org.delete_dependencia', name: 'Eliminar Dependencia', description: 'Borrar dependencia', module: 'estructura', criticidad: 'critica' },
      { id: 'org.create_cargo', name: 'Crear Cargo', description: 'Registrar nuevo cargo', module: 'estructura', criticidad: 'alta' },
      { id: 'org.edit_cargo', name: 'Editar Cargo', description: 'Modificar cargo existente', module: 'estructura', criticidad: 'media' },
      { id: 'org.delete_cargo', name: 'Eliminar Cargo', description: 'Borrar cargo', module: 'estructura', criticidad: 'alta' },
      { id: 'org.assign_users', name: 'Asignar Usuarios', description: 'Vincular usuarios a dependencias', module: 'estructura', criticidad: 'alta' },
      { id: 'org.view_hierarchy', name: 'Ver Jerarquía', description: 'Visualizar organigrama completo', module: 'estructura', criticidad: 'baja' },
      { id: 'org.view_map', name: 'Ver Mapa', description: 'Ver sedes en mapa de Colombia', module: 'estructura', criticidad: 'baja' },
      { id: 'org.export', name: 'Exportar Estructura', description: 'Descargar organigrama', module: 'estructura', criticidad: 'media' },
      { id: 'org.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas organizacionales', module: 'estructura', criticidad: 'baja' },
      { id: 'org.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'estructura', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 16. PROGRAMAS ACADÉMICOS (12 permisos)
  // ==========================================================================
  {
    id: 'programas',
    name: 'Programas Académicos',
    icon: GraduationCap,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    permissions: [
      { id: 'prog.view', name: 'Ver Programas', description: 'Consultar programas académicos', module: 'programas', criticidad: 'baja' },
      { id: 'prog.create', name: 'Crear Programa', description: 'Registrar nuevo programa', module: 'programas', criticidad: 'critica' },
      { id: 'prog.edit', name: 'Editar Programa', description: 'Modificar programa existente', module: 'programas', criticidad: 'alta' },
      { id: 'prog.delete', name: 'Eliminar Programa', description: 'Borrar programa académico', module: 'programas', criticidad: 'critica' },
      { id: 'prog.view_curriculum', name: 'Ver Pensum', description: 'Consultar plan de estudios', module: 'programas', criticidad: 'baja' },
      { id: 'prog.edit_curriculum', name: 'Editar Pensum', description: 'Modificar plan de estudios', module: 'programas', criticidad: 'alta' },
      { id: 'prog.assign_sede', name: 'Asignar Sede', description: 'Vincular programa a sedes', module: 'programas', criticidad: 'alta' },
      { id: 'prog.view_students', name: 'Ver Estudiantes', description: 'Consultar estudiantes matriculados', module: 'programas', criticidad: 'baja' },
      { id: 'prog.activate', name: 'Activar/Desactivar', description: 'Cambiar estado de programa', module: 'programas', criticidad: 'alta' },
      { id: 'prog.export', name: 'Exportar Programas', description: 'Descargar datos de programas', module: 'programas', criticidad: 'media' },
      { id: 'prog.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas académicas', module: 'programas', criticidad: 'baja' },
      { id: 'prog.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'programas', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 17. ARQUITECTURA EMPRESARIAL (15 permisos)
  // ==========================================================================
  {
    id: 'arquitectura',
    name: 'Arquitectura Empresarial',
    icon: Layers,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    permissions: [
      { id: 'arch.view', name: 'Ver Arquitectura', description: 'Consultar arquitectura empresarial', module: 'arquitectura', criticidad: 'baja' },
      { id: 'arch.view_capabilities', name: 'Ver Capacidades', description: 'Consultar mapa de capacidades', module: 'arquitectura', criticidad: 'baja' },
      { id: 'arch.create_capability', name: 'Crear Capacidad', description: 'Documentar nueva capacidad', module: 'arquitectura', criticidad: 'alta' },
      { id: 'arch.edit_capability', name: 'Editar Capacidad', description: 'Modificar capacidad existente', module: 'arquitectura', criticidad: 'media' },
      { id: 'arch.view_processes', name: 'Ver Procesos', description: 'Consultar procesos de negocio', module: 'arquitectura', criticidad: 'baja' },
      { id: 'arch.create_process', name: 'Crear Proceso', description: 'Documentar nuevo proceso', module: 'arquitectura', criticidad: 'alta' },
      { id: 'arch.edit_process', name: 'Editar Proceso', description: 'Modificar proceso existente', module: 'arquitectura', criticidad: 'media' },
      { id: 'arch.view_systems', name: 'Ver Sistemas', description: 'Consultar sistemas de información', module: 'arquitectura', criticidad: 'baja' },
      { id: 'arch.create_system', name: 'Crear Sistema', description: 'Registrar nuevo sistema', module: 'arquitectura', criticidad: 'alta' },
      { id: 'arch.edit_system', name: 'Editar Sistema', description: 'Modificar sistema existente', module: 'arquitectura', criticidad: 'media' },
      { id: 'arch.view_applications', name: 'Ver Aplicaciones', description: 'Consultar portafolio de aplicaciones', module: 'arquitectura', criticidad: 'baja' },
      { id: 'arch.create_application', name: 'Crear Aplicación', description: 'Registrar nueva aplicación', module: 'arquitectura', criticidad: 'alta' },
      { id: 'arch.export', name: 'Exportar Arquitectura', description: 'Descargar documentación', module: 'arquitectura', criticidad: 'media' },
      { id: 'arch.view_roadmap', name: 'Ver Roadmap', description: 'Consultar hoja de ruta tecnológica', module: 'arquitectura', criticidad: 'baja' },
      { id: 'arch.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'arquitectura', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 18. GESTIÓN PROFESORAL (15 permisos)
  // ==========================================================================
  {
    id: 'profesoral',
    name: 'Gestión Profesoral',
    icon: BookOpen,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    permissions: [
      { id: 'prof.view', name: 'Ver Docentes', description: 'Consultar información de docentes', module: 'profesoral', criticidad: 'baja' },
      { id: 'prof.create', name: 'Crear Docente', description: 'Registrar nuevo docente', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.edit', name: 'Editar Docente', description: 'Modificar datos de docente', module: 'profesoral', criticidad: 'media' },
      { id: 'prof.delete', name: 'Eliminar Docente', description: 'Dar de baja docente', module: 'profesoral', criticidad: 'critica' },
      { id: 'prof.view_convocatoria', name: 'Ver Convocatorias', description: 'Consultar convocatorias docentes', module: 'profesoral', criticidad: 'baja' },
      { id: 'prof.create_convocatoria', name: 'Crear Convocatoria', description: 'Publicar convocatoria docente', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.evaluate_postulation', name: 'Evaluar Postulación', description: 'Evaluar candidatos docentes', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.assign_load', name: 'Asignar Carga Académica', description: 'Gestionar horas y materias', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.view_schedule', name: 'Ver Horarios', description: 'Consultar horarios docentes', module: 'profesoral', criticidad: 'baja' },
      { id: 'prof.create_schedule', name: 'Crear Horarios', description: 'Generar horarios académicos', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.evaluate_performance', name: 'Evaluar Desempeño', description: 'Realizar evaluación docente', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.manage_contracts', name: 'Gestionar Contratos', description: 'Administrar contratos laborales', module: 'profesoral', criticidad: 'alta' },
      { id: 'prof.export', name: 'Exportar Docentes', description: 'Descargar datos de docentes', module: 'profesoral', criticidad: 'media' },
      { id: 'prof.stats.view', name: 'Ver Estadísticas', description: 'Consultar métricas docentes', module: 'profesoral', criticidad: 'baja' },
      { id: 'prof.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'profesoral', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 19. GESTIÓN DE PASSWORDS (8 permisos)
  // ==========================================================================
  {
    id: 'passwords',
    name: 'Gestión de Passwords',
    icon: Lock,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    permissions: [
      { id: 'pwd.view', name: 'Ver Políticas', description: 'Consultar políticas de contraseñas', module: 'passwords', criticidad: 'baja' },
      { id: 'pwd.edit_policies', name: 'Editar Políticas', description: 'Modificar políticas de seguridad', module: 'passwords', criticidad: 'critica' },
      { id: 'pwd.reset_user', name: 'Resetear Contraseña', description: 'Restablecer contraseña de usuario', module: 'passwords', criticidad: 'alta' },
      { id: 'pwd.force_change', name: 'Forzar Cambio', description: 'Obligar cambio de contraseña', module: 'passwords', criticidad: 'alta' },
      { id: 'pwd.view_history', name: 'Ver Histórico', description: 'Consultar histórico de cambios', module: 'passwords', criticidad: 'media' },
      { id: 'pwd.view_expiration', name: 'Ver Expiración', description: 'Consultar contraseñas por vencer', module: 'passwords', criticidad: 'baja' },
      { id: 'pwd.send_reminder', name: 'Enviar Recordatorio', description: 'Notificar cambio de contraseña', module: 'passwords', criticidad: 'media' },
      { id: 'pwd.view_audit', name: 'Ver Auditoría', description: 'Consultar log de seguridad', module: 'passwords', criticidad: 'media' },
    ]
  },

  // ==========================================================================
  // 20. INFORMES Y REPORTES (10 permisos)
  // ==========================================================================
  {
    id: 'reportes',
    name: 'Informes y Reportes',
    icon: BarChart3,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    permissions: [
      { id: 'reports.view', name: 'Ver Reportes', description: 'Consultar reportes del sistema', module: 'reportes', criticidad: 'baja' },
      { id: 'reports.create', name: 'Crear Reporte', description: 'Generar nuevo reporte', module: 'reportes', criticidad: 'media' },
      { id: 'reports.customize', name: 'Personalizar Reporte', description: 'Configurar filtros y parámetros', module: 'reportes', criticidad: 'media' },
      { id: 'reports.export_excel', name: 'Exportar a Excel', description: 'Descargar reporte en Excel', module: 'reportes', criticidad: 'media' },
      { id: 'reports.export_pdf', name: 'Exportar a PDF', description: 'Descargar reporte en PDF', module: 'reportes', criticidad: 'media' },
      { id: 'reports.export_csv', name: 'Exportar a CSV', description: 'Descargar reporte en CSV', module: 'reportes', criticidad: 'media' },
      { id: 'reports.schedule', name: 'Programar Reporte', description: 'Automatizar generación de reportes', module: 'reportes', criticidad: 'alta' },
      { id: 'reports.share', name: 'Compartir Reporte', description: 'Compartir con otros usuarios', module: 'reportes', criticidad: 'media' },
      { id: 'reports.view_dashboard', name: 'Ver Dashboards', description: 'Consultar dashboards analíticos', module: 'reportes', criticidad: 'baja' },
      { id: 'reports.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros', module: 'reportes', criticidad: 'alta' },
    ]
  },

  // ==========================================================================
  // 21. AUDITORÍA DE CAMBIOS (10 permisos)
  // ==========================================================================
  {
    id: 'auditoria',
    name: 'Auditoría de Cambios',
    icon: Activity,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    permissions: [
      { id: 'audit.view', name: 'Ver Logs de Auditoría', description: 'Consultar registros de auditoría', module: 'auditoria', criticidad: 'media' },
      { id: 'audit.view_details', name: 'Ver Detalles', description: 'Consultar detalles completos de logs', module: 'auditoria', criticidad: 'media' },
      { id: 'audit.filter', name: 'Filtrar Logs', description: 'Aplicar filtros avanzados', module: 'auditoria', criticidad: 'baja' },
      { id: 'audit.search', name: 'Buscar Logs', description: 'Buscar en registros de auditoría', module: 'auditoria', criticidad: 'baja' },
      { id: 'audit.export_excel', name: 'Exportar a Excel', description: 'Descargar logs en Excel', module: 'auditoria', criticidad: 'alta' },
      { id: 'audit.export_pdf', name: 'Exportar a PDF', description: 'Descargar logs en PDF', module: 'auditoria', criticidad: 'alta' },
      { id: 'audit.view_stats', name: 'Ver Estadísticas', description: 'Consultar métricas de auditoría', module: 'auditoria', criticidad: 'baja' },
      { id: 'audit.view_by_user', name: 'Ver por Usuario', description: 'Filtrar logs por usuario', module: 'auditoria', criticidad: 'media' },
      { id: 'audit.view_by_module', name: 'Ver por Módulo', description: 'Filtrar logs por módulo', module: 'auditoria', criticidad: 'media' },
      { id: 'audit.config.edit', name: 'Editar Configuraciones', description: 'Modificar parámetros de auditoría', module: 'auditoria', criticidad: 'critica' },
    ]
  },
];

// ============================================================================
// ESTADÍSTICAS DE PERMISOS
// ============================================================================

export const PERMISSIONS_STATS = {
  totalModules: PERMISSION_MODULES.length,
  totalPermissions: PERMISSION_MODULES.reduce((acc, module) => acc + module.permissions.length, 0),
  permissionsByModule: PERMISSION_MODULES.map(module => ({
    moduleName: module.name,
    permissionsCount: module.permissions.length
  }))
};
