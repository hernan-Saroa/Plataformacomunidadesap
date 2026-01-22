/**
 * ============================================
 * PERMISOS GRANULARES - CERTIFICADOS LABORALES Y REGISTRO ACADÉMICO
 * ============================================
 * 
 * Extensión de permisos detallados para:
 * - Certificados Laborales (65 permisos)
 * - Registro Académico (90 permisos)
 * 
 * TOTAL: 155 permisos nuevos granulares
 * 
 * Fecha: Enero 22, 2025
 * Versión: 1.0
 */

import {
  FileCheck, Briefcase, Award, GraduationCap, BookOpen, ClipboardCheck,
  FileText, User, Mail, Download, Upload, Eye, Edit, Trash2, Check, X,
  AlertCircle, Clock, Calendar, Shield, Lock, Unlock, Send, Archive,
  Printer, Copy, RefreshCw, UserCheck, UserX, Search, Filter, BarChart3,
  Settings, Database, FileSignature, Stamp, Users, Building2, MapPin
} from 'lucide-react';

export interface PermissionDetallado {
  id: string;
  name: string;
  description: string;
  module: string;
  criticidad: 'baja' | 'media' | 'alta' | 'critica';
  categoria?: string;
}

// ============================================================================
// CERTIFICADOS LABORALES (65 PERMISOS GRANULARES)
// ============================================================================

export const PERMISOS_CERTIFICADOS_LABORALES: PermissionDetallado[] = [
  // ========== DASHBOARD Y VISUALIZACIÓN (5) ==========
  {
    id: 'cl.dashboard.view',
    name: 'Ver Dashboard',
    description: 'Acceso al panel principal de certificados laborales',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'cl.dashboard.view_stats',
    name: 'Ver Estadísticas Generales',
    description: 'Visualizar KPIs y métricas del módulo',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'cl.dashboard.view_pending',
    name: 'Ver Pendientes',
    description: 'Consultar certificados pendientes de procesamiento',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'cl.dashboard.view_metrics',
    name: 'Ver Métricas de Productividad',
    description: 'Consultar tiempos de procesamiento y eficiencia',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Dashboard'
  },
  {
    id: 'cl.dashboard.view_alerts',
    name: 'Ver Alertas del Sistema',
    description: 'Consultar alertas de vencimiento y pendientes',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },

  // ========== SOLICITUDES (15) ==========
  {
    id: 'cl.solicitud.view',
    name: 'Ver Solicitudes',
    description: 'Consultar listado de solicitudes de certificados',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.view_all',
    name: 'Ver Todas las Solicitudes',
    description: 'Acceso a todas las solicitudes sin filtro',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.view_own',
    name: 'Ver Solicitudes Propias',
    description: 'Ver solo solicitudes asignadas al usuario',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.create',
    name: 'Crear Solicitud',
    description: 'Registrar nueva solicitud de certificado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.create_behalf',
    name: 'Crear en Nombre de Tercero',
    description: 'Crear solicitud en nombre de otro empleado',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.edit',
    name: 'Editar Solicitud',
    description: 'Modificar datos de solicitud existente',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.cancel',
    name: 'Cancelar Solicitud',
    description: 'Anular solicitud antes de procesamiento',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.delete',
    name: 'Eliminar Solicitud',
    description: 'Borrar solicitud del sistema',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.assign',
    name: 'Asignar Solicitud',
    description: 'Asignar solicitud a coordinador para procesamiento',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.reassign',
    name: 'Reasignar Solicitud',
    description: 'Cambiar responsable de procesamiento',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.priority',
    name: 'Marcar como Urgente',
    description: 'Priorizar solicitud para procesamiento inmediato',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.attach_docs',
    name: 'Adjuntar Documentos',
    description: 'Subir documentos de soporte a la solicitud',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.view_history',
    name: 'Ver Historial de Solicitud',
    description: 'Consultar historial completo de cambios',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.add_comment',
    name: 'Comentar Solicitud',
    description: 'Agregar comentarios o observaciones',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Solicitudes'
  },
  {
    id: 'cl.solicitud.export',
    name: 'Exportar Solicitudes',
    description: 'Descargar listado de solicitudes en Excel/PDF',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Solicitudes'
  },

  // ========== APROBACIÓN (8) ==========
  {
    id: 'cl.aprobacion.view_pending',
    name: 'Ver Pendientes de Aprobación',
    description: 'Consultar solicitudes pendientes de aprobación',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.approve',
    name: 'Aprobar Solicitud',
    description: 'Aprobar solicitud para generación',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.reject',
    name: 'Rechazar Solicitud',
    description: 'Rechazar solicitud con motivo',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.approve_batch',
    name: 'Aprobar en Lote',
    description: 'Aprobar múltiples solicitudes simultáneamente',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.add_observation',
    name: 'Agregar Observaciones',
    description: 'Añadir comentarios de aprobador',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.require_docs',
    name: 'Solicitar Documentación',
    description: 'Requerir documentos adicionales al solicitante',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.delegate',
    name: 'Delegar Aprobación',
    description: 'Delegar decisión a otro aprobador',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Aprobación'
  },
  {
    id: 'cl.aprobacion.view_history',
    name: 'Ver Historial de Aprobaciones',
    description: 'Consultar histórico de decisiones',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Aprobación'
  },

  // ========== GENERACIÓN (10) ==========
  {
    id: 'cl.generacion.create',
    name: 'Generar Certificado',
    description: 'Emitir nuevo certificado laboral',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.regenerate',
    name: 'Regenerar Certificado',
    description: 'Volver a generar certificado con correcciones',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.select_template',
    name: 'Seleccionar Plantilla',
    description: 'Elegir plantilla para generación',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.customize',
    name: 'Personalizar Contenido',
    description: 'Editar texto del certificado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.preview',
    name: 'Vista Previa',
    description: 'Previsualizar certificado antes de generar',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.include_salary',
    name: 'Incluir Salario',
    description: 'Generar certificado con información salarial',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.generate_qr',
    name: 'Generar Código QR',
    description: 'Incluir QR de validación en certificado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.number',
    name: 'Asignar Número Consecutivo',
    description: 'Generar número único de certificado',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.generate_batch',
    name: 'Generar en Lote',
    description: 'Generar múltiples certificados simultáneamente',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Generación'
  },
  {
    id: 'cl.generacion.cancel',
    name: 'Cancelar Generación',
    description: 'Anular certificado generado antes de firma',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Generación'
  },

  // ========== FIRMA (8) ==========
  {
    id: 'cl.firma.view_pending',
    name: 'Ver Pendientes de Firma',
    description: 'Consultar certificados pendientes de firma',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.sign_simple',
    name: 'Firmar Electrónicamente',
    description: 'Firmar con firma electrónica simple',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.sign_qualified',
    name: 'Firmar Digitalmente',
    description: 'Firmar con certificado digital cualificado',
    module: 'certificados_laborales',
    criticidad: 'critica',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.sign_batch',
    name: 'Firmar en Lote',
    description: 'Firmar múltiples certificados simultáneamente',
    module: 'certificados_laborales',
    criticidad: 'critica',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.reject',
    name: 'Rechazar para Firma',
    description: 'Devolver certificado para correcciones',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.verify',
    name: 'Verificar Firma',
    description: 'Validar autenticidad de firma digital',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.delegate',
    name: 'Delegar Firma',
    description: 'Delegar firma a otro funcionario autorizado',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Firma'
  },
  {
    id: 'cl.firma.view_certificate',
    name: 'Ver Certificado de Firma',
    description: 'Consultar detalles del certificado digital',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Firma'
  },

  // ========== ENTREGA (9) ==========
  {
    id: 'cl.entrega.send_email',
    name: 'Enviar por Email',
    description: 'Enviar certificado al correo del empleado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.send_batch',
    name: 'Enviar en Lote',
    description: 'Enviar múltiples certificados por email',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.mark_delivered',
    name: 'Marcar como Entregado',
    description: 'Registrar entrega física del certificado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.print',
    name: 'Imprimir Certificado',
    description: 'Generar versión impresa',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.download',
    name: 'Descargar Certificado',
    description: 'Descargar PDF del certificado',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.resend',
    name: 'Reenviar Certificado',
    description: 'Volver a enviar certificado por email',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.notify',
    name: 'Notificar Disponibilidad',
    description: 'Notificar al empleado que el certificado está listo',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.track',
    name: 'Rastrear Entrega',
    description: 'Consultar estado de entrega del certificado',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Entrega'
  },
  {
    id: 'cl.entrega.confirm',
    name: 'Confirmar Recepción',
    description: 'Registrar confirmación de recepción por parte del empleado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Entrega'
  },

  // ========== VALIDACIÓN (5) ==========
  {
    id: 'cl.validacion.verify_qr',
    name: 'Validar por QR',
    description: 'Verificar autenticidad mediante código QR',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'cl.validacion.verify_number',
    name: 'Validar por Número',
    description: 'Verificar autenticidad por número de certificado',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'cl.validacion.revoke',
    name: 'Revocar Certificado',
    description: 'Anular certificado emitido',
    module: 'certificados_laborales',
    criticidad: 'critica',
    categoria: 'Validación'
  },
  {
    id: 'cl.validacion.view_history',
    name: 'Ver Historial de Validaciones',
    description: 'Consultar histórico de validaciones realizadas',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Validación'
  },
  {
    id: 'cl.validacion.export_log',
    name: 'Exportar Log de Validaciones',
    description: 'Descargar registro de validaciones',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Validación'
  },

  // ========== PLANTILLAS (5) ==========
  {
    id: 'cl.plantilla.view',
    name: 'Ver Plantillas',
    description: 'Consultar plantillas disponibles',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Plantillas'
  },
  {
    id: 'cl.plantilla.create',
    name: 'Crear Plantilla',
    description: 'Diseñar nueva plantilla de certificado',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Plantillas'
  },
  {
    id: 'cl.plantilla.edit',
    name: 'Editar Plantilla',
    description: 'Modificar plantilla existente',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Plantillas'
  },
  {
    id: 'cl.plantilla.delete',
    name: 'Eliminar Plantilla',
    description: 'Borrar plantilla del sistema',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Plantillas'
  },
  {
    id: 'cl.plantilla.set_default',
    name: 'Establecer como Predeterminada',
    description: 'Configurar plantilla por defecto',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Plantillas'
  },

  // ========== CONFIGURACIÓN Y REPORTES (5) ==========
  {
    id: 'cl.config.view',
    name: 'Ver Configuraciones',
    description: 'Consultar configuraciones del módulo',
    module: 'certificados_laborales',
    criticidad: 'baja',
    categoria: 'Configuración'
  },
  {
    id: 'cl.config.edit',
    name: 'Editar Configuraciones',
    description: 'Modificar parámetros del sistema',
    module: 'certificados_laborales',
    criticidad: 'alta',
    categoria: 'Configuración'
  },
  {
    id: 'cl.reporte.general',
    name: 'Generar Reportes',
    description: 'Generar informes estadísticos',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Reportes'
  },
  {
    id: 'cl.reporte.export',
    name: 'Exportar Reportes',
    description: 'Descargar reportes en Excel/PDF',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Reportes'
  },
  {
    id: 'cl.auditoria.view',
    name: 'Ver Auditoría',
    description: 'Consultar log de cambios y acciones',
    module: 'certificados_laborales',
    criticidad: 'media',
    categoria: 'Auditoría'
  }
];

// ============================================================================
// REGISTRO ACADÉMICO (90 PERMISOS GRANULARES)
// ============================================================================

export const PERMISOS_REGISTRO_ACADEMICO: PermissionDetallado[] = [
  // ========== DASHBOARD Y VISUALIZACIÓN (5) ==========
  {
    id: 'ra.dashboard.view',
    name: 'Ver Dashboard',
    description: 'Acceso al panel principal de registro académico',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'ra.dashboard.view_stats',
    name: 'Ver Estadísticas Generales',
    description: 'Visualizar KPIs y métricas académicas',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'ra.dashboard.view_enrollment',
    name: 'Ver Matrícula Activa',
    description: 'Consultar estadísticas de matrícula actual',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'ra.dashboard.view_graduates',
    name: 'Ver Graduados',
    description: 'Consultar estadísticas de graduados',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },
  {
    id: 'ra.dashboard.view_alerts',
    name: 'Ver Alertas Académicas',
    description: 'Consultar alertas de fechas límite y pendientes',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Dashboard'
  },

  // ========== INSCRIPCIONES (12) ==========
  {
    id: 'ra.inscripcion.view',
    name: 'Ver Inscripciones',
    description: 'Consultar listado de inscripciones',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.view_all',
    name: 'Ver Todas las Inscripciones',
    description: 'Acceso a todas las inscripciones sin filtro',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.create',
    name: 'Crear Inscripción',
    description: 'Registrar nueva inscripción de estudiante',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.create_behalf',
    name: 'Inscribir en Nombre de Tercero',
    description: 'Registrar inscripción en nombre de aspirante',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.edit',
    name: 'Editar Inscripción',
    description: 'Modificar datos de inscripción',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.approve',
    name: 'Aprobar Inscripción',
    description: 'Aprobar inscripción para matrícula',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.reject',
    name: 'Rechazar Inscripción',
    description: 'Rechazar inscripción con motivo',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.cancel',
    name: 'Cancelar Inscripción',
    description: 'Anular inscripción registrada',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.import',
    name: 'Importar Inscripciones',
    description: 'Carga masiva de inscripciones desde Excel',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.export',
    name: 'Exportar Inscripciones',
    description: 'Descargar listado de inscripciones',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.validate_docs',
    name: 'Validar Documentos',
    description: 'Revisar y aprobar documentación adjunta',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Inscripciones'
  },
  {
    id: 'ra.inscripcion.send_notification',
    name: 'Notificar Aspirante',
    description: 'Enviar notificaciones sobre estado de inscripción',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Inscripciones'
  },

  // ========== MATRÍCULAS (15) ==========
  {
    id: 'ra.matricula.view',
    name: 'Ver Matrículas',
    description: 'Consultar listado de matrículas',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.view_all',
    name: 'Ver Todas las Matrículas',
    description: 'Acceso a todas las matrículas sin filtro',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.create',
    name: 'Generar Matrícula',
    description: 'Registrar nueva matrícula académica',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.edit',
    name: 'Editar Matrícula',
    description: 'Modificar datos de matrícula',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.approve',
    name: 'Aprobar Matrícula',
    description: 'Aprobar matrícula para activación',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.cancel',
    name: 'Cancelar Matrícula',
    description: 'Anular matrícula académica',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.renew',
    name: 'Renovar Matrícula',
    description: 'Renovar matrícula para siguiente periodo',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.verify_payment',
    name: 'Verificar Pago',
    description: 'Validar pago de matrícula',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.assign_subjects',
    name: 'Asignar Materias',
    description: 'Asignar materias al estudiante',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.modify_subjects',
    name: 'Modificar Materias',
    description: 'Cambiar materias de la matrícula',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.add_credits',
    name: 'Agregar Créditos',
    description: 'Incrementar número de créditos matriculados',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.remove_credits',
    name: 'Eliminar Créditos',
    description: 'Reducir número de créditos matriculados',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.generate_certificate',
    name: 'Generar Certificado de Matrícula',
    description: 'Emitir certificado de estudiante activo',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.import',
    name: 'Importar Matrículas',
    description: 'Carga masiva de matrículas',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Matrículas'
  },
  {
    id: 'ra.matricula.export',
    name: 'Exportar Matrículas',
    description: 'Descargar listado de matrículas',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Matrículas'
  },

  // ========== CALIFICACIONES (13) ==========
  {
    id: 'ra.calificacion.view',
    name: 'Ver Calificaciones',
    description: 'Consultar calificaciones de estudiantes',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.view_all',
    name: 'Ver Todas las Calificaciones',
    description: 'Acceso a todas las calificaciones sin filtro',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.view_own',
    name: 'Ver Calificaciones Propias',
    description: 'Ver solo calificaciones de materias asignadas',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.create',
    name: 'Registrar Calificación',
    description: 'Ingresar calificación de estudiante',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.edit',
    name: 'Editar Calificación',
    description: 'Modificar calificación registrada',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.import',
    name: 'Importar Calificaciones',
    description: 'Carga masiva de calificaciones desde Excel',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.approve',
    name: 'Aprobar Acta de Notas',
    description: 'Aprobar acta definitiva de calificaciones',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.close',
    name: 'Cerrar Acta',
    description: 'Cerrar acta para no permitir modificaciones',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.reopen',
    name: 'Reabrir Acta',
    description: 'Reactivar acta cerrada para modificaciones',
    module: 'registro_academico',
    criticidad: 'critica',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.generate_transcript',
    name: 'Generar Certificado de Notas',
    description: 'Emitir certificado de calificaciones',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.calculate_average',
    name: 'Calcular Promedios',
    description: 'Calcular promedio ponderado del estudiante',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.export',
    name: 'Exportar Calificaciones',
    description: 'Descargar calificaciones en Excel/PDF',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Calificaciones'
  },
  {
    id: 'ra.calificacion.send_notification',
    name: 'Notificar Calificaciones',
    description: 'Notificar a estudiantes sobre calificaciones',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Calificaciones'
  },

  // ========== CERTIFICADOS DE GRADO (15) ==========
  {
    id: 'ra.titulo.view',
    name: 'Ver Certificados de Grado',
    description: 'Consultar certificados emitidos',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.view_all',
    name: 'Ver Todos los Certificados',
    description: 'Acceso a todos los certificados sin filtro',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.create',
    name: 'Generar Certificado de Grado',
    description: 'Emitir nuevo certificado de título',
    module: 'registro_academico',
    criticidad: 'critica',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.edit',
    name: 'Editar Certificado',
    description: 'Modificar datos del certificado antes de firma',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.sign',
    name: 'Firmar Certificado',
    description: 'Firmar digitalmente certificado de grado',
    module: 'registro_academico',
    criticidad: 'critica',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.assign_folio',
    name: 'Asignar Folio de Registro',
    description: 'Registrar en libro de graduados',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.register_book',
    name: 'Registrar en Libro',
    description: 'Registrar en libro oficial de graduados',
    module: 'registro_academico',
    criticidad: 'critica',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.print',
    name: 'Imprimir Certificado',
    description: 'Generar certificado físico',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.deliver',
    name: 'Entregar Certificado',
    description: 'Registrar entrega física del certificado',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.send_email',
    name: 'Enviar por Email',
    description: 'Enviar versión digital del certificado',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.duplicate',
    name: 'Duplicar Certificado',
    description: 'Emitir duplicado de certificado',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.revoke',
    name: 'Revocar Certificado',
    description: 'Anular certificado emitido',
    module: 'registro_academico',
    criticidad: 'critica',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.generate_qr',
    name: 'Generar Código QR',
    description: 'Incluir QR de validación en certificado',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.apostille',
    name: 'Gestionar Apostilla',
    description: 'Procesar apostilla del certificado',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Certificados de Grado'
  },
  {
    id: 'ra.titulo.add_honors',
    name: 'Agregar Menciones de Honor',
    description: 'Incluir menciones honoríficas en el certificado',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Certificados de Grado'
  },

  // ========== VALIDACIÓN DE TÍTULOS (8) ==========
  {
    id: 'ra.validacion.verify_qr',
    name: 'Validar por QR',
    description: 'Verificar autenticidad mediante código QR',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.verify_folio',
    name: 'Validar por Folio',
    description: 'Verificar autenticidad por número de folio',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.verify_book',
    name: 'Validar en Libro',
    description: 'Consultar registro en libro de graduados',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.generate_constancy',
    name: 'Generar Constancia de Validación',
    description: 'Emitir constancia de autenticidad',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.view_history',
    name: 'Ver Historial de Validaciones',
    description: 'Consultar histórico de validaciones',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.export_log',
    name: 'Exportar Log de Validaciones',
    description: 'Descargar registro de validaciones',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.notify_validation',
    name: 'Notificar Validación',
    description: 'Notificar resultado de validación',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Validación'
  },
  {
    id: 'ra.validacion.verify_signature',
    name: 'Verificar Firma Digital',
    description: 'Validar autenticidad de firma digital',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Validación'
  },

  // ========== PROGRAMAS ACADÉMICOS (10) ==========
  {
    id: 'ra.programa.view',
    name: 'Ver Programas Académicos',
    description: 'Consultar programas ofertados',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.create',
    name: 'Crear Programa',
    description: 'Registrar nuevo programa académico',
    module: 'registro_academico',
    criticidad: 'critica',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.edit',
    name: 'Editar Programa',
    description: 'Modificar datos del programa',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.activate',
    name: 'Activar/Desactivar Programa',
    description: 'Cambiar estado de programa',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.update_curriculum',
    name: 'Actualizar Plan de Estudios',
    description: 'Modificar malla curricular',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.add_subject',
    name: 'Agregar Materia',
    description: 'Incluir nueva materia al programa',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.remove_subject',
    name: 'Eliminar Materia',
    description: 'Quitar materia del programa',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.update_credits',
    name: 'Actualizar Créditos',
    description: 'Modificar número de créditos del programa',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.view_stats',
    name: 'Ver Estadísticas del Programa',
    description: 'Consultar métricas de matrícula y graduación',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Programas'
  },
  {
    id: 'ra.programa.export',
    name: 'Exportar Programas',
    description: 'Descargar listado de programas',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Programas'
  },

  // ========== GESTIÓN DE GRADUADOS (12) ==========
  {
    id: 'ra.graduado.view',
    name: 'Ver Graduados',
    description: 'Consultar base de datos de graduados',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.view_all',
    name: 'Ver Todos los Graduados',
    description: 'Acceso a todos los graduados sin filtro',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.register',
    name: 'Registrar Graduado',
    description: 'Registrar nuevo graduado en el sistema',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.edit',
    name: 'Editar Graduado',
    description: 'Modificar datos de graduado',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.update_employment',
    name: 'Actualizar Estado Laboral',
    description: 'Registrar información laboral del graduado',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.update_contact',
    name: 'Actualizar Datos de Contacto',
    description: 'Modificar información de contacto',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.export',
    name: 'Exportar Graduados',
    description: 'Descargar base de datos de graduados',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.export_snies',
    name: 'Exportar para SNIES',
    description: 'Generar reporte para SNIES',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.send_survey',
    name: 'Enviar Encuesta',
    description: 'Enviar encuesta de seguimiento a graduados',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.view_stats',
    name: 'Ver Estadísticas',
    description: 'Consultar métricas de graduados',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.send_notification',
    name: 'Notificar Graduados',
    description: 'Enviar notificaciones masivas',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },
  {
    id: 'ra.graduado.manage_alumni',
    name: 'Gestionar Red Alumni',
    description: 'Administrar red de egresados',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Graduados'
  },

  // ========== CONFIGURACIÓN Y REPORTES (5) ==========
  {
    id: 'ra.config.view',
    name: 'Ver Configuraciones',
    description: 'Consultar configuraciones del módulo',
    module: 'registro_academico',
    criticidad: 'baja',
    categoria: 'Configuración'
  },
  {
    id: 'ra.config.edit',
    name: 'Editar Configuraciones',
    description: 'Modificar parámetros del sistema',
    module: 'registro_academico',
    criticidad: 'alta',
    categoria: 'Configuración'
  },
  {
    id: 'ra.reporte.general',
    name: 'Generar Reportes',
    description: 'Generar informes estadísticos',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Reportes'
  },
  {
    id: 'ra.reporte.export',
    name: 'Exportar Reportes',
    description: 'Descargar reportes en Excel/PDF',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Reportes'
  },
  {
    id: 'ra.auditoria.view',
    name: 'Ver Auditoría',
    description: 'Consultar log de cambios y acciones',
    module: 'registro_academico',
    criticidad: 'media',
    categoria: 'Auditoría'
  }
];

// ============================================================================
// CONSOLIDADO TOTAL
// ============================================================================

export const PERMISOS_CERTIFICADOS_Y_REGISTRO = [
  ...PERMISOS_CERTIFICADOS_LABORALES,
  ...PERMISOS_REGISTRO_ACADEMICO
];

// Total: 155 permisos granulares
console.log(`✅ Certificados Laborales: ${PERMISOS_CERTIFICADOS_LABORALES.length} permisos`);
console.log(`✅ Registro Académico: ${PERMISOS_REGISTRO_ACADEMICO.length} permisos`);
console.log(`✅ TOTAL: ${PERMISOS_CERTIFICADOS_Y_REGISTRO.length} permisos granulares`);
