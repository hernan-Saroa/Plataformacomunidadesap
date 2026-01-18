/**
 * CONFIGURACIÓN COMPLETA DE PERMISOS - BACKOFFICE ESAP
 * 
 * Este archivo centraliza TODOS los permisos del sistema
 * Actualizado: 4 de Enero, 2026
 * 
 * IMPORTANTE: Mantener sincronizado con módulos activos en SidebarPremium.tsx
 * 
 * MÓDULO CONTROL INTERNO: Actualizado con 80 permisos granulares
 * - Auditorías: 15 permisos
 * - Plan de Mejoramiento: 12 permisos
 * - Informes de Ley: 10 permisos
 * - Expedientes: 10 permisos
 * - Mapa de Riesgos: 12 permisos
 * - Roles y Permisos CIG: 8 permisos
 * - Configuraciones: 8 permisos
 * - Dashboard y Reportes: 5 permisos
 */

import {
  Users,
  GraduationCap,
  Award,
  FileText,
  MessageSquare,
  Briefcase,
  ClipboardList,
  FolderOpen,
  BarChart3,
  ScrollText,
  Cog,
  Shield,
  TrendingUp,
  Building2,
  BookOpen,
  CalendarDays,
  FileCheck,
  UserPlus,
  Activity,
  Database,
  Settings,
  Bell,
  Scale,
  CheckCircle,
  Clock
} from 'lucide-react';

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  permissions: Permission[];
}

// ============================================================================
// CONFIGURACIÓN COMPLETA DE MÓDULOS Y PERMISOS
// ============================================================================

export const PERMISSION_MODULES: PermissionModule[] = [
  // ==========================================================================
  // 0. ACCESO A SISTEMAS (3 permisos) - CATEGORÍA ESPECIAL
  // ==========================================================================
  {
    id: 'system_access',
    name: '🔐 Acceso a Sistemas',
    icon: Database,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    permissions: [
      { 
        id: 'system.access_backoffice', 
        name: '🏢 Acceso al Backoffice', 
        description: 'Permite ingresar al sistema administrativo ESAP (gestión interna)', 
        module: 'system_access' 
      },
      { 
        id: 'system.access_portal', 
        name: '📱 Acceso al Portal Transaccional', 
        description: 'Permite ingresar a la red social universitaria ESAP', 
        module: 'system_access' 
      },
      { 
        id: 'system.access_both', 
        name: '🔄 Acceso a Ambos Sistemas', 
        description: 'Acceso completo tanto a Backoffice como Portal Transaccional', 
        module: 'system_access' 
      },
    ]
  },

  // ==========================================================================
  // 1. USUARIOS Y PERSONAS (12 permisos)
  // ==========================================================================
  {
    id: 'users',
    name: 'Usuarios y Personas',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    permissions: [
      { 
        id: 'users.view', 
        name: 'Ver Usuarios', 
        description: 'Consultar lista de usuarios del sistema', 
        module: 'users' 
      },
      { 
        id: 'users.create', 
        name: 'Crear Usuarios', 
        description: 'Registrar nuevos usuarios en el sistema', 
        module: 'users' 
      },
      { 
        id: 'users.edit', 
        name: 'Editar Usuarios', 
        description: 'Modificar datos de usuarios existentes', 
        module: 'users' 
      },
      { 
        id: 'users.delete', 
        name: 'Eliminar Usuarios', 
        description: 'Dar de baja usuarios del sistema', 
        module: 'users' 
      },
      { 
        id: 'users.export', 
        name: 'Exportar Usuarios', 
        description: 'Descargar datos de usuarios en Excel/CSV', 
        module: 'users' 
      },
      { 
        id: 'users.assign_roles', 
        name: 'Asignar Roles', 
        description: 'Gestionar roles de usuarios (modelo Usuario Persona)', 
        module: 'users' 
      },
      { 
        id: 'users.assign_territorial', 
        name: 'Asignar Territorial', 
        description: 'Vincular usuario a dirección territorial', 
        module: 'users' 
      },
      { 
        id: 'users.assign_sede', 
        name: 'Asignar Sede', 
        description: 'Vincular usuario a sede específica', 
        module: 'users' 
      },
      { 
        id: 'users.manage_persona', 
        name: 'Gestionar Persona', 
        description: 'Administrar modelo Usuario Persona (múltiples roles)', 
        module: 'users' 
      },
      { 
        id: 'users.view_enrollment', 
        name: 'Ver Vinculaciones', 
        description: 'Consultar vinculaciones académicas', 
        module: 'users' 
      },
      { 
        id: 'users.activate_deactivate', 
        name: 'Activar/Desactivar', 
        description: 'Cambiar estado de usuarios', 
        module: 'users' 
      },
      { 
        id: 'users.import', 
        name: 'Importar Usuarios', 
        description: 'Carga masiva de usuarios', 
        module: 'users' 
      },
    ]
  },

  // ==========================================================================
  // 2. ESTRUCTURA ORGANIZACIONAL (10 permisos)
  // ==========================================================================
  {
    id: 'organization',
    name: 'Estructura Organizacional',
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    permissions: [
      { 
        id: 'org.view_territorial', 
        name: 'Ver Territoriales', 
        description: 'Consultar 17 direcciones territoriales de Colombia', 
        module: 'organization' 
      },
      { 
        id: 'org.view_sedes', 
        name: 'Ver Sedes', 
        description: 'Consultar 71+ sedes y puntos de atención', 
        module: 'organization' 
      },
      { 
        id: 'org.create_sede', 
        name: 'Crear Sede', 
        description: 'Registrar nuevas sedes en el sistema', 
        module: 'organization' 
      },
      { 
        id: 'org.edit_sede', 
        name: 'Editar Sede', 
        description: 'Modificar información de sedes existentes', 
        module: 'organization' 
      },
      { 
        id: 'org.delete_sede', 
        name: 'Eliminar Sede', 
        description: 'Dar de baja sedes del sistema', 
        module: 'organization' 
      },
      { 
        id: 'org.assign_users', 
        name: 'Asignar Usuarios a Sede', 
        description: 'Vincular personal a sedes específicas', 
        module: 'organization' 
      },
      { 
        id: 'org.view_hierarchy', 
        name: 'Ver Jerarquía', 
        description: 'Visualizar estructura Nacional > Territorial > Sede', 
        module: 'organization' 
      },
      { 
        id: 'org.export_structure', 
        name: 'Exportar Estructura', 
        description: 'Descargar organigrama completo', 
        module: 'organization' 
      },
      { 
        id: 'org.manage_territorial', 
        name: 'Gestionar Territoriales', 
        description: 'Administrar direcciones territoriales', 
        module: 'organization' 
      },
      { 
        id: 'org.view_map', 
        name: 'Ver Mapa', 
        description: 'Visualizar sedes en mapa geográfico de Colombia', 
        module: 'organization' 
      },
    ]
  },

  // ==========================================================================
  // 3. PROGRAMAS ACADÉMICOS (10 permisos)
  // ==========================================================================
  {
    id: 'programs',
    name: 'Programas Académicos',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    permissions: [
      { 
        id: 'programs.view', 
        name: 'Ver Programas', 
        description: 'Consultar programas académicos', 
        module: 'programs' 
      },
      { 
        id: 'programs.create', 
        name: 'Crear Programa', 
        description: 'Registrar nuevo programa académico', 
        module: 'programs' 
      },
      { 
        id: 'programs.edit', 
        name: 'Editar Programa', 
        description: 'Modificar programa existente', 
        module: 'programs' 
      },
      { 
        id: 'programs.delete', 
        name: 'Eliminar Programa', 
        description: 'Dar de baja programa académico', 
        module: 'programs' 
      },
      { 
        id: 'programs.view_students', 
        name: 'Ver Estudiantes', 
        description: 'Ver estudiantes matriculados por programa', 
        module: 'programs' 
      },
      { 
        id: 'programs.assign_sede', 
        name: 'Asignar Sede', 
        description: 'Vincular programa a sede específica', 
        module: 'programs' 
      },
      { 
        id: 'programs.view_curriculum', 
        name: 'Ver Pensum', 
        description: 'Consultar plan de estudios', 
        module: 'programs' 
      },
      { 
        id: 'programs.edit_curriculum', 
        name: 'Editar Pensum', 
        description: 'Modificar plan de estudios', 
        module: 'programs' 
      },
      { 
        id: 'programs.export', 
        name: 'Exportar Programas', 
        description: 'Descargar datos de programas', 
        module: 'programs' 
      },
      { 
        id: 'programs.view_stats', 
        name: 'Ver Estadísticas', 
        description: 'Consultar métricas por programa', 
        module: 'programs' 
      },
    ]
  },

  // ==========================================================================
  // 4. ESTUDIANTES (8 permisos)
  // ==========================================================================
  {
    id: 'students',
    name: 'Estudiantes',
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    permissions: [
      { 
        id: 'students.view', 
        name: 'Ver Estudiantes', 
        description: 'Consultar información estudiantil', 
        module: 'students' 
      },
      { 
        id: 'students.enroll', 
        name: 'Matricular', 
        description: 'Gestionar matrículas de estudiantes', 
        module: 'students' 
      },
      { 
        id: 'students.grades', 
        name: 'Calificaciones', 
        description: 'Gestionar calificaciones y notas', 
        module: 'students' 
      },
      { 
        id: 'students.attendance', 
        name: 'Asistencia', 
        description: 'Registrar y consultar asistencia', 
        module: 'students' 
      },
      { 
        id: 'students.export', 
        name: 'Exportar Estudiantes', 
        description: 'Descargar datos de estudiantes', 
        module: 'students' 
      },
      { 
        id: 'students.academic_programs', 
        name: 'Ver Programas', 
        description: 'Consultar programas académicos vinculados', 
        module: 'students' 
      },
      { 
        id: 'students.financial_status', 
        name: 'Estado Financiero', 
        description: 'Ver estado de pagos y cartera', 
        module: 'students' 
      },
      { 
        id: 'students.disciplinary', 
        name: 'Registro Disciplinario', 
        description: 'Ver y crear anotaciones disciplinarias', 
        module: 'students' 
      },
    ]
  },

  // ==========================================================================
  // 5. GRADUADOS (7 permisos)
  // ==========================================================================
  {
    id: 'graduates',
    name: 'Graduados',
    icon: Award,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    permissions: [
      { 
        id: 'graduates.view', 
        name: 'Ver Graduados', 
        description: 'Consultar base de datos de graduados', 
        module: 'graduates' 
      },
      { 
        id: 'graduates.manage', 
        name: 'Gestionar Graduados', 
        description: 'Administrar registros de graduados', 
        module: 'graduates' 
      },
      { 
        id: 'graduates.verify', 
        name: 'Verificar Títulos', 
        description: 'Generar certificados de verificación de títulos', 
        module: 'graduates' 
      },
      { 
        id: 'graduates.export', 
        name: 'Exportar Graduados', 
        description: 'Descargar datos de graduados', 
        module: 'graduates' 
      },
      { 
        id: 'graduates.certificates', 
        name: 'Certificados de Título', 
        description: 'Emitir certificados de graduación', 
        module: 'graduates' 
      },
      { 
        id: 'graduates.view_stats', 
        name: 'Ver Estadísticas', 
        description: 'Consultar métricas de graduados', 
        module: 'graduates' 
      },
      { 
        id: 'graduates.verify_qr', 
        name: 'Verificar con QR', 
        description: 'Validar títulos mediante código QR', 
        module: 'graduates' 
      },
    ]
  },

  // ==========================================================================
  // 6. GESTIÓN PROFESORAL (12 permisos)
  // ==========================================================================
  {
    id: 'professors',
    name: 'Gestión Profesoral',
    icon: BookOpen,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    permissions: [
      { 
        id: 'professors.view', 
        name: 'Ver Profesores', 
        description: 'Consultar información de docentes', 
        module: 'professors' 
      },
      { 
        id: 'professors.create', 
        name: 'Crear Profesor', 
        description: 'Registrar nuevos docentes en el sistema', 
        module: 'professors' 
      },
      { 
        id: 'professors.edit', 
        name: 'Editar Profesor', 
        description: 'Modificar información de docentes', 
        module: 'professors' 
      },
      { 
        id: 'professors.delete', 
        name: 'Eliminar Profesor', 
        description: 'Dar de baja docentes', 
        module: 'professors' 
      },
      { 
        id: 'professors.assign_load', 
        name: 'Asignar Carga Académica', 
        description: 'Gestionar horas y materias de docentes', 
        module: 'professors' 
      },
      { 
        id: 'professors.view_schedule', 
        name: 'Ver Horarios', 
        description: 'Consultar horarios de profesores', 
        module: 'professors' 
      },
      { 
        id: 'professors.create_schedule', 
        name: 'Crear Horarios', 
        description: 'Generar horarios académicos', 
        module: 'professors' 
      },
      { 
        id: 'professors.view_evaluation', 
        name: 'Ver Evaluaciones', 
        description: 'Consultar evaluaciones docentes', 
        module: 'professors' 
      },
      { 
        id: 'professors.manage_contracts', 
        name: 'Gestionar Contratos', 
        description: 'Administrar contratos laborales', 
        module: 'professors' 
      },
      { 
        id: 'professors.export', 
        name: 'Exportar Profesores', 
        description: 'Descargar datos de docentes', 
        module: 'professors' 
      },
      { 
        id: 'professors.view_performance', 
        name: 'Ver Desempeño', 
        description: 'Consultar métricas de desempeño', 
        module: 'professors' 
      },
      { 
        id: 'professors.assign_sede', 
        name: 'Asignar Sede', 
        description: 'Vincular docente a sede específica', 
        module: 'professors' 
      },
    ]
  },

  // ==========================================================================
  // 7. CALENDARIO ACADÉMICO ESAP 2026 (8 permisos)
  // ==========================================================================
  {
    id: 'calendar',
    name: 'Calendario Académico',
    icon: CalendarDays,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    permissions: [
      { 
        id: 'calendar.view', 
        name: 'Ver Calendario', 
        description: 'Consultar calendario académico ESAP 2026', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.edit', 
        name: 'Editar Calendario', 
        description: 'Modificar eventos del calendario académico', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.create_events', 
        name: 'Crear Eventos', 
        description: 'Agregar nuevos eventos académicos', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.delete_events', 
        name: 'Eliminar Eventos', 
        description: 'Quitar eventos del calendario', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.manage_periods', 
        name: 'Gestionar Periodos', 
        description: 'Administrar periodos 2026-1, 2026-2, 2026-3', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.export', 
        name: 'Exportar Calendario', 
        description: 'Descargar calendario en diferentes formatos', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.notifications', 
        name: 'Gestionar Notificaciones', 
        description: 'Configurar alertas y recordatorios', 
        module: 'calendar' 
      },
      { 
        id: 'calendar.view_by_sede', 
        name: 'Ver por Sede', 
        description: 'Filtrar eventos académicos por sede', 
        module: 'calendar' 
      },
    ]
  },

  // ==========================================================================
  // 8. CERTIFICADOS LABORALES (10 permisos)
  // ==========================================================================
  {
    id: 'certificates_labor',
    name: 'Certificados Laborales',
    icon: FileCheck,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    permissions: [
      { 
        id: 'cert_labor.view', 
        name: 'Ver Solicitudes', 
        description: 'Consultar solicitudes de certificados laborales', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.create', 
        name: 'Crear Solicitud', 
        description: 'Generar nueva solicitud de certificado', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.generate', 
        name: 'Generar Certificado', 
        description: 'Emitir certificado laboral firmado', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.approve', 
        name: 'Aprobar Solicitud', 
        description: 'Aprobar o rechazar solicitudes', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.verify', 
        name: 'Verificar Certificado', 
        description: 'Validar autenticidad mediante código QR', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.export', 
        name: 'Exportar Certificados', 
        description: 'Descargar registros de certificados', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.manage_templates', 
        name: 'Gestionar Plantillas', 
        description: 'Administrar plantillas de certificados', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.view_stats', 
        name: 'Ver Estadísticas', 
        description: 'Consultar métricas de certificados emitidos', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.send_notification', 
        name: 'Enviar Notificación', 
        description: 'Notificar al solicitante', 
        module: 'certificates_labor' 
      },
      { 
        id: 'cert_labor.download_pdf', 
        name: 'Descargar PDF', 
        description: 'Descargar certificado en PDF', 
        module: 'certificates_labor' 
      },
    ]
  },

  // ==========================================================================
  // 9. ASPIRANTES (9 permisos)
  // ==========================================================================
  {
    id: 'aspirants',
    name: 'Aspirantes',
    icon: UserPlus,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    permissions: [
      { 
        id: 'aspirants.view', 
        name: 'Ver Aspirantes', 
        description: 'Consultar lista de aspirantes', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.create', 
        name: 'Crear Aspirante', 
        description: 'Registrar nuevo aspirante', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.edit', 
        name: 'Editar Aspirante', 
        description: 'Modificar datos de aspirante', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.delete', 
        name: 'Eliminar Aspirante', 
        description: 'Dar de baja aspirante', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.approve', 
        name: 'Aprobar Aspirante', 
        description: 'Aprobar ingreso de aspirante', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.reject', 
        name: 'Rechazar Aspirante', 
        description: 'Rechazar solicitud de ingreso', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.export', 
        name: 'Exportar Aspirantes', 
        description: 'Descargar datos de aspirantes', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.view_documents', 
        name: 'Ver Documentos', 
        description: 'Consultar carpeta digital de aspirante', 
        module: 'aspirants' 
      },
      { 
        id: 'aspirants.convert_to_student', 
        name: 'Convertir a Estudiante', 
        description: 'Matricular aspirante como estudiante', 
        module: 'aspirants' 
      },
    ]
  },

  // ==========================================================================
  // 10. CONTROL INTERNO DE GESTIÓN (80 permisos granulares)
  // ==========================================================================
  {
    id: 'control',
    name: 'Control Interno de Gestión',
    icon: ClipboardList,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    permissions: [
      // ========== AUDITORÍAS (15 permisos) ==========
      { id: 'control.auditorias.view', name: '👁️ Ver Auditorías', description: 'Consultar lista de auditorías registradas', module: 'control' },
      { id: 'control.auditorias.create', name: '➕ Crear Auditoría', description: 'Registrar nueva auditoría en el sistema', module: 'control' },
      { id: 'control.auditorias.edit', name: '✏️ Editar Auditoría', description: 'Modificar datos de auditoría existente', module: 'control' },
      { id: 'control.auditorias.delete', name: '🗑️ Eliminar Auditoría', description: 'Eliminar auditoría del sistema', module: 'control' },
      { id: 'control.auditorias.approve', name: '✅ Aprobar Auditoría', description: 'Aprobar auditoría finalizada', module: 'control' },
      { id: 'control.auditorias.export', name: '📥 Exportar Auditorías', description: 'Descargar reportes de auditorías', module: 'control' },
      { id: 'control.auditorias.assign', name: '👥 Asignar Auditor', description: 'Asignar responsable a auditoría', module: 'control' },
      { id: 'control.auditorias.view_evidencias', name: '📎 Ver Evidencias', description: 'Consultar evidencias de auditoría', module: 'control' },
      { id: 'control.auditorias.upload_evidencias', name: '📤 Cargar Evidencias', description: 'Subir documentos y evidencias', module: 'control' },
      { id: 'control.auditorias.view_hallazgos', name: '🔍 Ver Hallazgos', description: 'Consultar hallazgos detectados', module: 'control' },
      { id: 'control.auditorias.create_hallazgo', name: '📝 Crear Hallazgo', description: 'Registrar nuevo hallazgo de auditoría', module: 'control' },
      { id: 'control.auditorias.close', name: '🔒 Cerrar Auditoría', description: 'Cerrar auditoría finalizada', module: 'control' },
      { id: 'control.auditorias.reopen', name: '🔓 Reabrir Auditoría', description: 'Reabrir auditoría cerrada', module: 'control' },
      { id: 'control.auditorias.view_stats', name: '📊 Ver Estadísticas', description: 'Consultar métricas de auditorías', module: 'control' },
      { id: 'control.auditorias.programar', name: '📅 Programar Auditoría', description: 'Planificar auditoría futura', module: 'control' },

      // ========== PLAN DE MEJORAMIENTO (12 permisos) ==========
      { id: 'control.plan_mejoramiento.view', name: '👁️ Ver Planes', description: 'Consultar planes de mejoramiento', module: 'control' },
      { id: 'control.plan_mejoramiento.create', name: '➕ Crear Plan', description: 'Generar nuevo plan de mejoramiento', module: 'control' },
      { id: 'control.plan_mejoramiento.edit', name: '✏️ Editar Plan', description: 'Modificar plan existente', module: 'control' },
      { id: 'control.plan_mejoramiento.delete', name: '🗑️ Eliminar Plan', description: 'Eliminar plan de mejoramiento', module: 'control' },
      { id: 'control.plan_mejoramiento.approve', name: '✅ Aprobar Plan', description: 'Aprobar plan de mejoramiento', module: 'control' },
      { id: 'control.plan_mejoramiento.assign', name: '👥 Asignar Responsable', description: 'Asignar persona responsable del plan', module: 'control' },
      { id: 'control.plan_mejoramiento.track', name: '📈 Hacer Seguimiento', description: 'Realizar seguimiento y actualizar avances', module: 'control' },
      { id: 'control.plan_mejoramiento.close', name: '🔒 Cerrar Plan', description: 'Cerrar plan completado', module: 'control' },
      { id: 'control.plan_mejoramiento.export', name: '📥 Exportar Planes', description: 'Descargar reportes de planes', module: 'control' },
      { id: 'control.plan_mejoramiento.view_cronograma', name: '📅 Ver Cronograma', description: 'Consultar cronograma de actividades', module: 'control' },
      { id: 'control.plan_mejoramiento.upload_evidencias', name: '📤 Cargar Evidencias', description: 'Subir evidencias de cumplimiento', module: 'control' },
      { id: 'control.plan_mejoramiento.view_stats', name: '📊 Ver Estadísticas', description: 'Consultar métricas de planes', module: 'control' },

      // ========== INFORMES DE LEY (10 permisos) ==========
      { id: 'control.informes_ley.view', name: '👁️ Ver Informes', description: 'Consultar informes de ley', module: 'control' },
      { id: 'control.informes_ley.create', name: '➕ Crear Informe', description: 'Generar nuevo informe de ley', module: 'control' },
      { id: 'control.informes_ley.edit', name: '✏️ Editar Informe', description: 'Modificar informe existente', module: 'control' },
      { id: 'control.informes_ley.delete', name: '🗑️ Eliminar Informe', description: 'Eliminar informe del sistema', module: 'control' },
      { id: 'control.informes_ley.approve', name: '✅ Aprobar Informe', description: 'Aprobar informe para publicación', module: 'control' },
      { id: 'control.informes_ley.publish', name: '📢 Publicar Informe', description: 'Publicar informe en portal web', module: 'control' },
      { id: 'control.informes_ley.export', name: '📥 Exportar Informes', description: 'Descargar informes en PDF/Excel', module: 'control' },
      { id: 'control.informes_ley.upload_anexos', name: '📎 Cargar Anexos', description: 'Subir documentos anexos al informe', module: 'control' },
      { id: 'control.informes_ley.send_authorities', name: '📧 Enviar a Entidades', description: 'Enviar informe a entes de control', module: 'control' },
      { id: 'control.informes_ley.view_historico', name: '📚 Ver Histórico', description: 'Consultar histórico de informes', module: 'control' },

      // ========== EXPEDIENTES (10 permisos) ==========
      { id: 'control.expedientes.view', name: '👁️ Ver Expedientes', description: 'Consultar expedientes documentales', module: 'control' },
      { id: 'control.expedientes.create', name: '➕ Crear Expediente', description: 'Abrir nuevo expediente', module: 'control' },
      { id: 'control.expedientes.edit', name: '✏️ Editar Expediente', description: 'Modificar datos del expediente', module: 'control' },
      { id: 'control.expedientes.delete', name: '🗑️ Eliminar Expediente', description: 'Eliminar expediente del sistema', module: 'control' },
      { id: 'control.expedientes.upload_documents', name: '📤 Cargar Documentos', description: 'Subir archivos al expediente', module: 'control' },
      { id: 'control.expedientes.download_documents', name: '📥 Descargar Documentos', description: 'Descargar archivos del expediente', module: 'control' },
      { id: 'control.expedientes.close', name: '🔒 Cerrar Expediente', description: 'Cerrar expediente finalizado', module: 'control' },
      { id: 'control.expedientes.archive', name: '📦 Archivar Expediente', description: 'Enviar expediente a archivo', module: 'control' },
      { id: 'control.expedientes.search', name: '🔍 Buscar Expedientes', description: 'Búsqueda avanzada de expedientes', module: 'control' },
      { id: 'control.expedientes.export', name: '📥 Exportar Expedientes', description: 'Descargar listado de expedientes', module: 'control' },

      // ========== MAPA DE RIESGOS (12 permisos) ==========
      { id: 'control.mapa_riesgos.view', name: '👁️ Ver Mapa de Riesgos', description: 'Consultar matriz de riesgos', module: 'control' },
      { id: 'control.mapa_riesgos.create', name: '➕ Crear Riesgo', description: 'Registrar nuevo riesgo identificado', module: 'control' },
      { id: 'control.mapa_riesgos.edit', name: '✏️ Editar Riesgo', description: 'Modificar riesgo existente', module: 'control' },
      { id: 'control.mapa_riesgos.delete', name: '🗑️ Eliminar Riesgo', description: 'Eliminar riesgo del mapa', module: 'control' },
      { id: 'control.mapa_riesgos.evaluate', name: '📊 Evaluar Riesgo', description: 'Calificar probabilidad e impacto', module: 'control' },
      { id: 'control.mapa_riesgos.assign_controls', name: '🛡️ Asignar Controles', description: 'Asignar controles de mitigación', module: 'control' },
      { id: 'control.mapa_riesgos.monitor', name: '📈 Monitorear Riesgos', description: 'Hacer seguimiento a riesgos', module: 'control' },
      { id: 'control.mapa_riesgos.export', name: '📥 Exportar Mapa', description: 'Descargar matriz de riesgos', module: 'control' },
      { id: 'control.mapa_riesgos.view_matriz', name: '🎯 Ver Matriz 3x3', description: 'Visualizar matriz de calor', module: 'control' },
      { id: 'control.mapa_riesgos.approve', name: '✅ Aprobar Riesgo', description: 'Aprobar clasificación de riesgo', module: 'control' },
      { id: 'control.mapa_riesgos.assign_responsable', name: '👥 Asignar Responsable', description: 'Asignar dueño del riesgo', module: 'control' },
      { id: 'control.mapa_riesgos.view_historico', name: '📚 Ver Histórico', description: 'Consultar evolución de riesgos', module: 'control' },

      // ========== ROLES Y PERMISOS (Control Interno) (8 permisos) ==========
      { id: 'control.roles.view_equipo', name: '👁️ Ver Equipo', description: 'Consultar equipo de Control Interno', module: 'control' },
      { id: 'control.roles.assign_persona', name: '👥 Asignar Persona', description: 'Asignar persona al equipo de Control Interno', module: 'control' },
      { id: 'control.roles.remove_persona', name: '🗑️ Remover Persona', description: 'Remover persona del equipo', module: 'control' },
      { id: 'control.roles.edit_permisos', name: '✏️ Editar Permisos', description: 'Modificar permisos de persona', module: 'control' },
      { id: 'control.roles.view_matriz', name: '📋 Ver Matriz Permisos', description: 'Consultar matriz de permisos por rol', module: 'control' },
      { id: 'control.roles.export', name: '📥 Exportar Equipo', description: 'Descargar listado del equipo', module: 'control' },
      { id: 'control.roles.view_detalle', name: '🔍 Ver Detalle Persona', description: 'Consultar información completa de persona', module: 'control' },
      { id: 'control.roles.change_rol', name: '🔄 Cambiar Rol', description: 'Modificar rol asignado a persona', module: 'control' },

      // ========== CONFIGURACIONES (8 permisos) ==========
      { id: 'control.config.view', name: '👁️ Ver Configuraciones', description: 'Consultar configuración del módulo', module: 'control' },
      { id: 'control.config.edit_general', name: '⚙️ Editar General', description: 'Modificar configuración general', module: 'control' },
      { id: 'control.config.manage_tipos_auditoria', name: '📝 Gestionar Tipos Auditoría', description: 'Administrar tipos de auditoría', module: 'control' },
      { id: 'control.config.manage_estados', name: '🏷️ Gestionar Estados', description: 'Administrar estados de procesos', module: 'control' },
      { id: 'control.config.manage_templates', name: '📄 Gestionar Plantillas', description: 'Administrar plantillas de documentos', module: 'control' },
      { id: 'control.config.manage_notificaciones', name: '🔔 Gestionar Notificaciones', description: 'Configurar alertas y notificaciones', module: 'control' },
      { id: 'control.config.backup', name: '💾 Hacer Respaldo', description: 'Generar backup de configuración', module: 'control' },
      { id: 'control.config.restore', name: '♻️ Restaurar Config', description: 'Restaurar configuración anterior', module: 'control' },

      // ========== DASHBOARD Y REPORTES (5 permisos) ==========
      { id: 'control.dashboard.view', name: '📊 Ver Dashboard', description: 'Consultar dashboard de Control Interno', module: 'control' },
      { id: 'control.dashboard.view_kpis', name: '📈 Ver Indicadores', description: 'Consultar KPIs del módulo', module: 'control' },
      { id: 'control.dashboard.export_reports', name: '📥 Exportar Reportes', description: 'Descargar reportes consolidados', module: 'control' },
      { id: 'control.dashboard.view_analytics', name: '🔍 Ver Analítica', description: 'Consultar análisis avanzado', module: 'control' },
      { id: 'control.dashboard.customize', name: '🎨 Personalizar Dashboard', description: 'Configurar widgets del dashboard', module: 'control' },
    ]
  },

  // ==========================================================================
  // 11. DASHBOARD EJECUTIVO (8 permisos)
  // ==========================================================================
  {
    id: 'dashboard',
    name: 'Dashboard Ejecutivo',
    icon: TrendingUp,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    permissions: [
      // VISTAS GENERALES
      { 
        id: 'dashboard.view', 
        name: 'Ver Dashboard', 
        description: 'Acceso al dashboard ejecutivo general', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.view_kpis', 
        name: 'Ver KPIs', 
        description: 'Consultar indicadores clave de rendimiento', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.export', 
        name: 'Exportar Dashboard', 
        description: 'Descargar reportes ejecutivos en Excel/PDF', 
        module: 'dashboard' 
      },
      
      // MÉTRICAS DE USUARIOS
      { 
        id: 'dashboard.users_total', 
        name: 'Total Usuarios', 
        description: 'Ver cantidad total de usuarios del sistema', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.users_active', 
        name: 'Usuarios Activos', 
        description: 'Ver usuarios activos en el sistema', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.users_growth', 
        name: 'Crecimiento Usuarios', 
        description: 'Ver tendencia de crecimiento de usuarios', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.users_retention', 
        name: 'Retención Usuarios', 
        description: 'Ver tasa de retención de usuarios', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.users_by_role', 
        name: 'Usuarios por Rol', 
        description: 'Ver distribución de usuarios por roles', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.users_by_location', 
        name: 'Usuarios por Ubicación', 
        description: 'Ver distribución de usuarios por ciudad/región', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.users_by_device', 
        name: 'Usuarios por Dispositivo', 
        description: 'Ver dispositivos utilizados por usuarios', 
        module: 'dashboard' 
      },
      
      // MÉTRICAS DE SEDE/TERRITORIAL
      { 
        id: 'dashboard.view_by_sede', 
        name: 'Métricas por Sede', 
        description: 'Filtrar dashboard por sede específica', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.view_by_territorial', 
        name: 'Métricas por Territorial', 
        description: 'Filtrar dashboard por dirección territorial', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.view_by_nacional', 
        name: 'Métricas Nacionales', 
        description: 'Ver consolidado nacional de todas las territoriales', 
        module: 'dashboard' 
      },
      
      // MÉTRICAS ACADÉMICAS
      { 
        id: 'dashboard.academic_programs', 
        name: 'Programas Académicos', 
        description: 'Ver métricas de programas académicos', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.students_metrics', 
        name: 'Métricas Estudiantes', 
        description: 'Ver estadísticas de estudiantes activos', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.professors_metrics', 
        name: 'Métricas Profesores', 
        description: 'Ver estadísticas de docentes', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.enrollment_metrics', 
        name: 'Métricas Matrículas', 
        description: 'Ver datos de proceso de matrículas', 
        module: 'dashboard' 
      },
      
      // MÉTRICAS DE SISTEMA
      { 
        id: 'dashboard.system_health', 
        name: 'Salud del Sistema', 
        description: 'Ver uptime, performance y estabilidad', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.api_metrics', 
        name: 'Métricas API', 
        description: 'Ver llamadas API, latencia y errores', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.security_metrics', 
        name: 'Métricas Seguridad', 
        description: 'Ver alertas de seguridad y cumplimiento', 
        module: 'dashboard' 
      },
      
      // MÉTRICAS DE CERTIFICADOS
      { 
        id: 'dashboard.certificates_labor', 
        name: 'Certificados Laborales', 
        description: 'Ver métricas de certificados laborales emitidos', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.certificates_academic', 
        name: 'Certificados Académicos', 
        description: 'Ver métricas de certificados académicos', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.certificates_graduates', 
        name: 'Certificados Graduados', 
        description: 'Ver verificación de títulos y grados', 
        module: 'dashboard' 
      },
      
      // ANÁLISIS AVANZADO
      { 
        id: 'dashboard.real_time', 
        name: 'Datos Tiempo Real', 
        description: 'Acceso a métricas en tiempo real (actualización automática)', 
        module: 'dashboard' 
      },
      { 
        id: 'dashboard.custom_reports', 
        name: 'Reportes Personalizados', 
        description: 'Crear y guardar reportes ejecutivos personalizados', 
        module: 'dashboard' 
      },
    ]
  },

  // ==========================================================================
  // 12. COMUNIDAD ESAP (9 permisos)
  // ==========================================================================
  {
    id: 'community',
    name: 'Comunidad ESAP',
    icon: MessageSquare,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    permissions: [
      { 
        id: 'community.view', 
        name: 'Ver Comunidad', 
        description: 'Acceso a la red social universitaria', 
        module: 'community' 
      },
      { 
        id: 'community.post', 
        name: 'Crear Publicaciones', 
        description: 'Publicar contenido en la comunidad', 
        module: 'community' 
      },
      { 
        id: 'community.moderate', 
        name: 'Moderar Contenido', 
        description: 'Moderar y eliminar publicaciones', 
        module: 'community' 
      },
      { 
        id: 'community.events', 
        name: 'Gestionar Eventos', 
        description: 'Crear y administrar eventos comunitarios', 
        module: 'community' 
      },
      { 
        id: 'community.announcements', 
        name: 'Anuncios Oficiales', 
        description: 'Publicar anuncios institucionales', 
        module: 'community' 
      },
      { 
        id: 'community.groups', 
        name: 'Gestionar Grupos', 
        description: 'Crear y administrar grupos de interés', 
        module: 'community' 
      },
      { 
        id: 'community.analytics', 
        name: 'Ver Analíticas', 
        description: 'Consultar métricas de engagement', 
        module: 'community' 
      },
      { 
        id: 'community.delete', 
        name: 'Eliminar Contenido', 
        description: 'Eliminar publicaciones y comentarios', 
        module: 'community' 
      },
      { 
        id: 'community.reports', 
        name: 'Ver Reportes', 
        description: 'Consultar reportes de usuarios', 
        module: 'community' 
      },
    ]
  },

  // ==========================================================================
  // 13. BOLSA DE EMPLEO (7 permisos)
  // ==========================================================================
  {
    id: 'jobs',
    name: 'Bolsa de Empleo',
    icon: Briefcase,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    permissions: [
      { 
        id: 'jobs.view', 
        name: 'Ver Ofertas', 
        description: 'Consultar ofertas laborales publicadas', 
        module: 'jobs' 
      },
      { 
        id: 'jobs.create', 
        name: 'Publicar Ofertas', 
        description: 'Crear nuevas ofertas de empleo', 
        module: 'jobs' 
      },
      { 
        id: 'jobs.edit', 
        name: 'Editar Ofertas', 
        description: 'Modificar ofertas existentes', 
        module: 'jobs' 
      },
      { 
        id: 'jobs.delete', 
        name: 'Eliminar Ofertas', 
        description: 'Dar de baja ofertas laborales', 
        module: 'jobs' 
      },
      { 
        id: 'jobs.manage', 
        name: 'Gestionar Ofertas', 
        description: 'Administrar bolsa de trabajo completa', 
        module: 'jobs' 
      },
      { 
        id: 'jobs.applications', 
        name: 'Ver Aplicaciones', 
        description: 'Revisar postulaciones de candidatos', 
        module: 'jobs' 
      },
      { 
        id: 'jobs.analytics', 
        name: 'Analíticas de Empleo', 
        description: 'Ver estadísticas de empleabilidad', 
        module: 'jobs' 
      },
    ]
  },

  // ==========================================================================
  // 14. CERTIFICADOS ACADÉMICOS (6 permisos)
  // ==========================================================================
  {
    id: 'certificates',
    name: 'Certificados Académicos',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    permissions: [
      { 
        id: 'certificates.view', 
        name: 'Ver Solicitudes', 
        description: 'Consultar solicitudes de certificados', 
        module: 'certificates' 
      },
      { 
        id: 'certificates.generate', 
        name: 'Generar Certificados', 
        description: 'Emitir certificados académicos', 
        module: 'certificates' 
      },
      { 
        id: 'certificates.approve', 
        name: 'Aprobar Solicitudes', 
        description: 'Aprobar/rechazar solicitudes', 
        module: 'certificates' 
      },
      { 
        id: 'certificates.verify', 
        name: 'Verificar Certificados', 
        description: 'Validar autenticidad de certificados', 
        module: 'certificates' 
      },
      { 
        id: 'certificates.export', 
        name: 'Exportar Certificados', 
        description: 'Descargar registros', 
        module: 'certificates' 
      },
      { 
        id: 'certificates.manage_templates', 
        name: 'Gestionar Plantillas', 
        description: 'Administrar plantillas de certificados', 
        module: 'certificates' 
      },
    ]
  },

  // ==========================================================================
  // 15. CARPETA DIGITAL (5 permisos)
  // ==========================================================================
  {
    id: 'documents',
    name: 'Carpeta Digital',
    icon: FolderOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    permissions: [
      { 
        id: 'documents.view', 
        name: 'Ver Documentos', 
        description: 'Consultar documentos de estudiantes', 
        module: 'documents' 
      },
      { 
        id: 'documents.upload', 
        name: 'Cargar Documentos', 
        description: 'Subir archivos a carpeta digital', 
        module: 'documents' 
      },
      { 
        id: 'documents.manage', 
        name: 'Gestionar Documentos', 
        description: 'Administrar carpeta digital completa', 
        module: 'documents' 
      },
      { 
        id: 'documents.validate', 
        name: 'Validar Documentos', 
        description: 'Aprobar/rechazar documentos cargados', 
        module: 'documents' 
      },
      { 
        id: 'documents.download', 
        name: 'Descargar Documentos', 
        description: 'Descargar archivos de carpeta digital', 
        module: 'documents' 
      },
    ]
  },

  // ==========================================================================
  // 16. REPORTES (7 permisos)
  // ==========================================================================
  {
    id: 'reports',
    name: 'Reportes',
    icon: BarChart3,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    permissions: [
      { 
        id: 'reports.view', 
        name: 'Ver Reportes', 
        description: 'Consultar reportes del sistema', 
        module: 'reports' 
      },
      { 
        id: 'reports.create', 
        name: 'Crear Reportes', 
        description: 'Generar nuevos reportes', 
        module: 'reports' 
      },
      { 
        id: 'reports.export', 
        name: 'Exportar Reportes', 
        description: 'Descargar reportes en Excel/PDF', 
        module: 'reports' 
      },
      { 
        id: 'reports.schedule', 
        name: 'Programar Reportes', 
        description: 'Automatizar generación de reportes', 
        module: 'reports' 
      },
      { 
        id: 'reports.analytics', 
        name: 'Analíticas Avanzadas', 
        description: 'Acceso a herramientas de análisis', 
        module: 'reports' 
      },
      { 
        id: 'reports.custom', 
        name: 'Reportes Personalizados', 
        description: 'Crear reportes con filtros personalizados', 
        module: 'reports' 
      },
      { 
        id: 'reports.share', 
        name: 'Compartir Reportes', 
        description: 'Compartir reportes con otros usuarios', 
        module: 'reports' 
      },
    ]
  },

  // ==========================================================================
  // 17. AUDITORÍA (7 permisos)
  // ==========================================================================
  {
    id: 'audit',
    name: 'Auditoría',
    icon: ScrollText,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    permissions: [
      { 
        id: 'audit.view', 
        name: 'Ver Logs', 
        description: 'Consultar logs de auditoría del sistema', 
        module: 'audit' 
      },
      { 
        id: 'audit.export', 
        name: 'Exportar Logs', 
        description: 'Descargar registros de auditoría', 
        module: 'audit' 
      },
      { 
        id: 'audit.analyze', 
        name: 'Analizar Actividad', 
        description: 'Análisis de seguridad y comportamiento', 
        module: 'audit' 
      },
      { 
        id: 'audit.security', 
        name: 'Gestión de Seguridad', 
        description: 'Administrar políticas de seguridad', 
        module: 'audit' 
      },
      { 
        id: 'audit.compliance', 
        name: 'Cumplimiento Normativo', 
        description: 'Verificar cumplimiento de normativas', 
        module: 'audit' 
      },
      { 
        id: 'audit.alerts', 
        name: 'Alertas de Seguridad', 
        description: 'Configurar alertas de eventos críticos', 
        module: 'audit' 
      },
      { 
        id: 'audit.user_activity', 
        name: 'Actividad de Usuarios', 
        description: 'Rastrear actividad de usuarios específicos', 
        module: 'audit' 
      },
    ]
  },

  // ==========================================================================
  // 18. ROLES Y PERMISOS (8 permisos)
  // ==========================================================================
  {
    id: 'roles',
    name: 'Roles y Permisos',
    icon: Shield,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    permissions: [
      { 
        id: 'roles.view', 
        name: 'Ver Roles', 
        description: 'Consultar roles del sistema', 
        module: 'roles' 
      },
      { 
        id: 'roles.create', 
        name: 'Crear Roles', 
        description: 'Crear nuevos roles personalizados', 
        module: 'roles' 
      },
      { 
        id: 'roles.edit', 
        name: 'Editar Roles', 
        description: 'Modificar roles existentes', 
        module: 'roles' 
      },
      { 
        id: 'roles.delete', 
        name: 'Eliminar Roles', 
        description: 'Eliminar roles del sistema', 
        module: 'roles' 
      },
      { 
        id: 'roles.assign_permissions', 
        name: 'Asignar Permisos', 
        description: 'Configurar permisos de roles', 
        module: 'roles' 
      },
      { 
        id: 'roles.manage_access', 
        name: 'Gestionar Accesos', 
        description: 'Administrar control de acceso', 
        module: 'roles' 
      },
      { 
        id: 'roles.generate_qr', 
        name: 'Generar QR de Roles', 
        description: 'Generar códigos QR para asignación de roles', 
        module: 'roles' 
      },
      { 
        id: 'roles.audit', 
        name: 'Auditar Roles', 
        description: 'Ver historial de cambios en roles', 
        module: 'roles' 
      },
    ]
  },

  // ==========================================================================
  // 19. ADMINISTRACIÓN (8 permisos)
  // ==========================================================================
  {
    id: 'admin',
    name: 'Administración del Sistema',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    permissions: [
      { 
        id: 'admin.settings', 
        name: 'Configuración General', 
        description: 'Ajustes generales del sistema', 
        module: 'admin' 
      },
      { 
        id: 'admin.backup', 
        name: 'Respaldos', 
        description: 'Gestionar backups del sistema', 
        module: 'admin' 
      },
      { 
        id: 'admin.maintenance', 
        name: 'Mantenimiento', 
        description: 'Modo de mantenimiento y actualizaciones', 
        module: 'admin' 
      },
      { 
        id: 'admin.integrations', 
        name: 'Integraciones', 
        description: 'Configurar integraciones externas', 
        module: 'admin' 
      },
      { 
        id: 'admin.notifications', 
        name: 'Notificaciones Sistema', 
        description: 'Gestionar notificaciones globales', 
        module: 'admin' 
      },
      { 
        id: 'admin.database', 
        name: 'Gestión de Base de Datos', 
        description: 'Administración avanzada de BD', 
        module: 'admin' 
      },
      { 
        id: 'admin.logs', 
        name: 'Logs del Sistema', 
        description: 'Consultar logs técnicos del sistema', 
        module: 'admin' 
      },
      { 
        id: 'admin.performance', 
        name: 'Monitoreo de Rendimiento', 
        description: 'Monitorear performance del sistema', 
        module: 'admin' 
      },
    ]
  },

  // ==========================================================================
  // ========== PORTAL TRANSACCIONAL - PERMISOS DE USUARIOS FINALES ==========
  // ==========================================================================

  // ==========================================================================
  // 20. PERFIL Y CUENTA - PORTAL (12 permisos)
  // ==========================================================================
  {
    id: 'portal_profile',
    name: '👤 Portal: Perfil y Cuenta',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    permissions: [
      { 
        id: 'portal.profile.view', 
        name: 'Ver Perfil', 
        description: 'Visualizar perfil propio y de otros usuarios', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.edit', 
        name: 'Editar Perfil', 
        description: 'Modificar información personal del perfil', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.upload_photo', 
        name: 'Subir Foto de Perfil', 
        description: 'Cambiar foto de perfil', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.privacy', 
        name: 'Configurar Privacidad', 
        description: 'Ajustar configuración de privacidad del perfil', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.change_password', 
        name: 'Cambiar Contraseña', 
        description: 'Modificar contraseña de acceso', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.enable_2fa', 
        name: 'Activar 2FA', 
        description: 'Habilitar autenticación de dos factores', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.view_activity', 
        name: 'Ver Historial de Actividad', 
        description: 'Consultar historial de acciones', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.export_data', 
        name: 'Exportar Datos Personales', 
        description: 'Descargar información personal (GDPR)', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.delete_account', 
        name: 'Eliminar Cuenta', 
        description: 'Solicitar eliminación permanente de cuenta', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.verify_identity', 
        name: 'Verificar Identidad', 
        description: 'Proceso de verificación de identidad', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.view_stats', 
        name: 'Ver Estadísticas', 
        description: 'Ver estadísticas y métricas de perfil', 
        module: 'portal_profile' 
      },
      { 
        id: 'portal.profile.customize_theme', 
        name: 'Personalizar Tema', 
        description: 'Cambiar apariencia y tema del portal', 
        module: 'portal_profile' 
      },
    ]
  },

  // ==========================================================================
  // 21. PUBLICACIONES Y FEED - PORTAL (15 permisos)
  // ==========================================================================
  {
    id: 'portal_posts',
    name: '📱 Portal: Publicaciones y Feed',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    permissions: [
      { 
        id: 'portal.posts.view_feed', 
        name: 'Ver Feed', 
        description: 'Visualizar feed de publicaciones de la comunidad', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.create', 
        name: 'Crear Publicación', 
        description: 'Publicar contenido en el feed', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.edit_own', 
        name: 'Editar Publicaciones Propias', 
        description: 'Modificar publicaciones creadas por uno mismo', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.delete_own', 
        name: 'Eliminar Publicaciones Propias', 
        description: 'Borrar publicaciones creadas por uno mismo', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.like', 
        name: 'Dar Like', 
        description: 'Reaccionar con "me gusta" a publicaciones', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.unlike', 
        name: 'Quitar Like', 
        description: 'Quitar "me gusta" de publicaciones', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.comment', 
        name: 'Comentar', 
        description: 'Escribir comentarios en publicaciones', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.edit_comment', 
        name: 'Editar Comentarios', 
        description: 'Modificar comentarios propios', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.delete_comment', 
        name: 'Eliminar Comentarios', 
        description: 'Borrar comentarios propios', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.share', 
        name: 'Compartir Publicaciones', 
        description: 'Compartir publicaciones en el feed', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.save', 
        name: 'Guardar Publicaciones', 
        description: 'Guardar publicaciones en favoritos', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.unsave', 
        name: 'Quitar de Guardadas', 
        description: 'Remover publicaciones de favoritos', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.report', 
        name: 'Reportar Contenido', 
        description: 'Reportar contenido inapropiado', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.view_saved', 
        name: 'Ver Publicaciones Guardadas', 
        description: 'Acceder a publicaciones guardadas', 
        module: 'portal_posts' 
      },
      { 
        id: 'portal.posts.upload_media', 
        name: 'Subir Multimedia', 
        description: 'Adjuntar imágenes y videos a publicaciones', 
        module: 'portal_posts' 
      },
    ]
  },

  // ==========================================================================
  // 22. GRUPOS Y COMUNIDADES - PORTAL (10 permisos)
  // ==========================================================================
  {
    id: 'portal_groups',
    name: '👥 Portal: Grupos y Comunidades',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    permissions: [
      { 
        id: 'portal.groups.view', 
        name: 'Ver Grupos', 
        description: 'Visualizar grupos y comunidades disponibles', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.create', 
        name: 'Crear Grupo', 
        description: 'Crear nuevos grupos de interés', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.join', 
        name: 'Unirse a Grupo', 
        description: 'Unirse a grupos públicos o por invitación', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.leave', 
        name: 'Salir de Grupo', 
        description: 'Abandonar grupos', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.admin_own', 
        name: 'Administrar Grupos Propios', 
        description: 'Gestionar grupos creados por uno mismo', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.invite', 
        name: 'Invitar Miembros', 
        description: 'Invitar usuarios a grupos', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.remove_member', 
        name: 'Remover Miembros', 
        description: 'Expulsar miembros del grupo (administradores)', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.edit', 
        name: 'Editar Grupo', 
        description: 'Modificar información del grupo', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.delete', 
        name: 'Eliminar Grupo', 
        description: 'Borrar grupos propios', 
        module: 'portal_groups' 
      },
      { 
        id: 'portal.groups.post', 
        name: 'Publicar en Grupo', 
        description: 'Crear publicaciones dentro del grupo', 
        module: 'portal_groups' 
      },
    ]
  },

  // ==========================================================================
  // 23. EVENTOS - PORTAL (9 permisos)
  // ==========================================================================
  {
    id: 'portal_events',
    name: '📅 Portal: Eventos',
    icon: CalendarDays,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    permissions: [
      { 
        id: 'portal.events.view', 
        name: 'Ver Eventos', 
        description: 'Visualizar eventos disponibles', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.create', 
        name: 'Crear Evento', 
        description: 'Crear nuevos eventos (roles autorizados)', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.edit_own', 
        name: 'Editar Eventos Propios', 
        description: 'Modificar eventos creados', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.delete_own', 
        name: 'Eliminar Eventos Propios', 
        description: 'Borrar eventos creados', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.register', 
        name: 'Registrarse a Evento', 
        description: 'Inscribirse en eventos', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.cancel_registration', 
        name: 'Cancelar Registro', 
        description: 'Cancelar inscripción en evento', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.view_my_events', 
        name: 'Ver Mis Eventos', 
        description: 'Ver eventos a los que estoy inscrito', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.comment', 
        name: 'Comentar en Eventos', 
        description: 'Escribir comentarios en eventos', 
        module: 'portal_events' 
      },
      { 
        id: 'portal.events.rate', 
        name: 'Calificar Eventos', 
        description: 'Calificar eventos asistidos', 
        module: 'portal_events' 
      },
    ]
  },

  // ==========================================================================
  // 24. NOTICIAS Y ANUNCIOS - PORTAL (6 permisos)
  // ==========================================================================
  {
    id: 'portal_news',
    name: '📰 Portal: Noticias y Anuncios',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    permissions: [
      { 
        id: 'portal.news.view', 
        name: 'Ver Noticias', 
        description: 'Leer noticias y anuncios institucionales', 
        module: 'portal_news' 
      },
      { 
        id: 'portal.news.comment', 
        name: 'Comentar Noticias', 
        description: 'Escribir comentarios en noticias', 
        module: 'portal_news' 
      },
      { 
        id: 'portal.news.like', 
        name: 'Dar Like a Noticias', 
        description: 'Reaccionar a noticias institucionales', 
        module: 'portal_news' 
      },
      { 
        id: 'portal.news.share', 
        name: 'Compartir Noticias', 
        description: 'Compartir noticias en el feed', 
        module: 'portal_news' 
      },
      { 
        id: 'portal.news.save', 
        name: 'Guardar Noticias', 
        description: 'Guardar noticias en favoritos', 
        module: 'portal_news' 
      },
      { 
        id: 'portal.news.view_saved', 
        name: 'Ver Noticias Guardadas', 
        description: 'Acceder a noticias guardadas', 
        module: 'portal_news' 
      },
    ]
  },

  // ==========================================================================
  // 25. BOLSA DE EMPLEO - PORTAL (8 permisos)
  // ==========================================================================
  {
    id: 'portal_jobs',
    name: '💼 Portal: Bolsa de Empleo',
    icon: Briefcase,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    permissions: [
      { 
        id: 'portal.jobs.view', 
        name: 'Ver Ofertas Laborales', 
        description: 'Visualizar ofertas de empleo disponibles', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.apply', 
        name: 'Aplicar a Empleos', 
        description: 'Postularse a ofertas laborales', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.save', 
        name: 'Guardar Ofertas', 
        description: 'Marcar ofertas como favoritas', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.view_applications', 
        name: 'Ver Mis Aplicaciones', 
        description: 'Ver postulaciones enviadas', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.withdraw_application', 
        name: 'Retirar Aplicación', 
        description: 'Cancelar postulación enviada', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.upload_cv', 
        name: 'Subir Hoja de Vida', 
        description: 'Cargar CV al perfil', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.update_cv', 
        name: 'Actualizar CV', 
        description: 'Modificar hoja de vida', 
        module: 'portal_jobs' 
      },
      { 
        id: 'portal.jobs.create_offer', 
        name: 'Publicar Oferta Laboral', 
        description: 'Crear ofertas de empleo (graduados/empresas)', 
        module: 'portal_jobs' 
      },
    ]
  },

  // ==========================================================================
  // 26. MENSAJERÍA - PORTAL (10 permisos)
  // ==========================================================================
  {
    id: 'portal_messages',
    name: '💬 Portal: Mensajería',
    icon: MessageSquare,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    permissions: [
      { 
        id: 'portal.messages.view', 
        name: 'Ver Mensajes', 
        description: 'Acceder a bandeja de mensajes privados', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.send', 
        name: 'Enviar Mensajes', 
        description: 'Enviar mensajes privados a usuarios', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.reply', 
        name: 'Responder Mensajes', 
        description: 'Responder mensajes recibidos', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.delete', 
        name: 'Eliminar Mensajes', 
        description: 'Borrar mensajes de conversaciones', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.view_conversations', 
        name: 'Ver Conversaciones', 
        description: 'Ver historial de conversaciones', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.create_group_chat', 
        name: 'Crear Chat Grupal', 
        description: 'Iniciar conversaciones grupales', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.leave_group_chat', 
        name: 'Salir de Chat Grupal', 
        description: 'Abandonar chats grupales', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.block_user', 
        name: 'Bloquear Usuario', 
        description: 'Bloquear usuarios en mensajería', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.unblock_user', 
        name: 'Desbloquear Usuario', 
        description: 'Desbloquear usuarios bloqueados', 
        module: 'portal_messages' 
      },
      { 
        id: 'portal.messages.attach_files', 
        name: 'Adjuntar Archivos', 
        description: 'Enviar archivos en mensajes', 
        module: 'portal_messages' 
      },
    ]
  },

  // ==========================================================================
  // 27. NOTIFICACIONES - PORTAL (7 permisos)
  // ==========================================================================
  {
    id: 'portal_notifications',
    name: '🔔 Portal: Notificaciones',
    icon: Bell,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    permissions: [
      { 
        id: 'portal.notifications.view', 
        name: 'Ver Notificaciones', 
        description: 'Acceder al centro de notificaciones', 
        module: 'portal_notifications' 
      },
      { 
        id: 'portal.notifications.mark_read', 
        name: 'Marcar como Leída', 
        description: 'Marcar notificaciones individuales como leídas', 
        module: 'portal_notifications' 
      },
      { 
        id: 'portal.notifications.mark_all_read', 
        name: 'Marcar Todas Leídas', 
        description: 'Marcar todas las notificaciones como leídas', 
        module: 'portal_notifications' 
      },
      { 
        id: 'portal.notifications.delete', 
        name: 'Eliminar Notificaciones', 
        description: 'Borrar notificaciones', 
        module: 'portal_notifications' 
      },
      { 
        id: 'portal.notifications.configure', 
        name: 'Configurar Notificaciones', 
        description: 'Ajustar preferencias de notificaciones', 
        module: 'portal_notifications' 
      },
      { 
        id: 'portal.notifications.email_alerts', 
        name: 'Alertas por Email', 
        description: 'Recibir notificaciones por correo electrónico', 
        module: 'portal_notifications' 
      },
      { 
        id: 'portal.notifications.push_alerts', 
        name: 'Alertas Push', 
        description: 'Recibir notificaciones push en dispositivos', 
        module: 'portal_notifications' 
      },
    ]
  },

  // ==========================================================================
  // 28. BÚSQUEDA Y DESCUBRIMIENTO - PORTAL (6 permisos)
  // ==========================================================================
  {
    id: 'portal_search',
    name: '🔍 Portal: Búsqueda',
    icon: Users,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    permissions: [
      { 
        id: 'portal.search.users', 
        name: 'Buscar Usuarios', 
        description: 'Buscar y encontrar otros usuarios', 
        module: 'portal_search' 
      },
      { 
        id: 'portal.search.posts', 
        name: 'Buscar Publicaciones', 
        description: 'Buscar contenido en el feed', 
        module: 'portal_search' 
      },
      { 
        id: 'portal.search.events', 
        name: 'Buscar Eventos', 
        description: 'Buscar eventos académicos y sociales', 
        module: 'portal_search' 
      },
      { 
        id: 'portal.search.groups', 
        name: 'Buscar Grupos', 
        description: 'Buscar grupos y comunidades', 
        module: 'portal_search' 
      },
      { 
        id: 'portal.search.jobs', 
        name: 'Buscar Empleos', 
        description: 'Buscar ofertas laborales', 
        module: 'portal_search' 
      },
      { 
        id: 'portal.search.advanced_filters', 
        name: 'Filtros Avanzados', 
        description: 'Usar filtros avanzados de búsqueda', 
        module: 'portal_search' 
      },
    ]
  },

  // ==========================================================================
  // 29. CONEXIONES Y RED - PORTAL (8 permisos)
  // ==========================================================================
  {
    id: 'portal_connections',
    name: '🤝 Portal: Conexiones',
    icon: UserPlus,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    permissions: [
      { 
        id: 'portal.connections.view', 
        name: 'Ver Conexiones', 
        description: 'Ver lista de conexiones y amigos', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.send_request', 
        name: 'Enviar Solicitud', 
        description: 'Enviar solicitud de conexión a usuarios', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.accept_request', 
        name: 'Aceptar Solicitud', 
        description: 'Aceptar solicitudes de conexión recibidas', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.reject_request', 
        name: 'Rechazar Solicitud', 
        description: 'Rechazar solicitudes de conexión', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.remove', 
        name: 'Eliminar Conexión', 
        description: 'Quitar conexión establecida', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.view_suggestions', 
        name: 'Ver Sugerencias', 
        description: 'Ver usuarios sugeridos para conectar', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.follow', 
        name: 'Seguir Usuario', 
        description: 'Seguir usuarios públicos', 
        module: 'portal_connections' 
      },
      { 
        id: 'portal.connections.unfollow', 
        name: 'Dejar de Seguir', 
        description: 'Dejar de seguir usuarios', 
        module: 'portal_connections' 
      },
    ]
  },

  // ==========================================================================
  // 30. ACADÉMICO PORTAL (7 permisos)
  // ==========================================================================
  {
    id: 'portal_academic',
    name: '📚 Portal: Servicios Académicos',
    icon: BookOpen,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    permissions: [
      { 
        id: 'portal.academic.view_grades', 
        name: 'Ver Calificaciones', 
        description: 'Consultar calificaciones y notas', 
        module: 'portal_academic' 
      },
      { 
        id: 'portal.academic.view_schedule', 
        name: 'Ver Horario', 
        description: 'Ver horario de clases y actividades', 
        module: 'portal_academic' 
      },
      { 
        id: 'portal.academic.view_calendar', 
        name: 'Ver Calendario Académico', 
        description: 'Consultar calendario académico institucional', 
        module: 'portal_academic' 
      },
      { 
        id: 'portal.academic.view_program', 
        name: 'Ver Programa Académico', 
        description: 'Consultar plan de estudios y pensum', 
        module: 'portal_academic' 
      },
      { 
        id: 'portal.academic.request_certificate', 
        name: 'Solicitar Certificados', 
        description: 'Pedir certificados académicos', 
        module: 'portal_academic' 
      },
      { 
        id: 'portal.academic.view_documents', 
        name: 'Ver Carpeta Digital', 
        description: 'Acceder a documentos académicos', 
        module: 'portal_academic' 
      },
      { 
        id: 'portal.academic.upload_documents', 
        name: 'Subir Documentos', 
        description: 'Cargar documentos a carpeta digital', 
        module: 'portal_academic' 
      },
    ]
  },

  // ==========================================================================
  // 31. MODERACIÓN PORTAL (8 permisos)
  // ==========================================================================
  {
    id: 'portal_moderation',
    name: '🛡️ Portal: Moderación',
    icon: Shield,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    permissions: [
      { 
        id: 'portal.moderate.view_reports', 
        name: 'Ver Reportes', 
        description: 'Ver contenido reportado por usuarios', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.delete_content', 
        name: 'Eliminar Contenido', 
        description: 'Borrar publicaciones de otros usuarios', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.block_user', 
        name: 'Bloquear Usuario', 
        description: 'Bloquear usuarios del portal', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.unblock_user', 
        name: 'Desbloquear Usuario', 
        description: 'Desbloquear usuarios bloqueados', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.warn_user', 
        name: 'Advertir Usuario', 
        description: 'Enviar advertencia a usuarios', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.close_report', 
        name: 'Cerrar Reporte', 
        description: 'Cerrar reportes resueltos', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.ban_user', 
        name: 'Expulsar Usuario', 
        description: 'Expulsar usuarios permanentemente del portal', 
        module: 'portal_moderation' 
      },
      { 
        id: 'portal.moderate.view_analytics', 
        name: 'Ver Analíticas de Moderación', 
        description: 'Ver métricas y estadísticas de moderación', 
        module: 'portal_moderation' 
      },
    ]
  },

  // ==========================================================================
  // CONTROL INTERNO DISCIPLINARIO - MÓDULO COMPLETO (106 permisos)
  // ==========================================================================
  
  // ==========================================================================
  // 30. DISCIPLINARIO - PROCESOS (20 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_procesos',
    name: '⚖️ Disciplinario: Procesos',
    icon: Scale,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    permissions: [
      { 
        id: 'disciplinario.procesos.view', 
        name: 'Ver Procesos', 
        description: 'Consultar lista de procesos disciplinarios', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.view_assigned', 
        name: 'Ver Procesos Asignados', 
        description: 'Ver solo procesos asignados al usuario', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.view_all', 
        name: 'Ver Todos los Procesos', 
        description: 'Acceso completo a todos los procesos del sistema', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.create', 
        name: 'Crear Proceso', 
        description: 'Iniciar nuevo proceso disciplinario', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.edit', 
        name: 'Editar Proceso', 
        description: 'Modificar datos del proceso', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.delete', 
        name: 'Eliminar Proceso', 
        description: 'Eliminar proceso disciplinario (requiere justificación)', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.assign', 
        name: 'Asignar Proceso', 
        description: 'Asignar proceso a profesional', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.reassign', 
        name: 'Reasignar Proceso', 
        description: 'Cambiar asignación de profesional', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.change_stage', 
        name: 'Cambiar Etapa', 
        description: 'Avanzar/retroceder etapa del proceso', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.archive', 
        name: 'Archivar Proceso', 
        description: 'Archivar proceso finalizado', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.unarchive', 
        name: 'Desarchivar Proceso', 
        description: 'Restaurar proceso archivado', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.export', 
        name: 'Exportar Procesos', 
        description: 'Descargar datos de procesos', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.view_details', 
        name: 'Ver Detalles Completos', 
        description: 'Acceso a información detallada del proceso', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.view_timeline', 
        name: 'Ver Línea de Tiempo', 
        description: 'Consultar historial de actuaciones', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.add_observation', 
        name: 'Agregar Observación', 
        description: 'Registrar observaciones en el proceso', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.view_parties', 
        name: 'Ver Partes del Proceso', 
        description: 'Acceso a datos de denunciante, denunciado y profesional', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.manage_terms', 
        name: 'Gestionar Términos', 
        description: 'Administrar plazos y términos procesales', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.extend_term', 
        name: 'Prorrogar Términos', 
        description: 'Extender plazos procesales', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.close', 
        name: 'Cerrar Proceso', 
        description: 'Finalizar proceso con resolución', 
        module: 'disciplinario_procesos' 
      },
      { 
        id: 'disciplinario.procesos.remit', 
        name: 'Remitir por Competencia', 
        description: 'Enviar proceso a otra entidad competente', 
        module: 'disciplinario_procesos' 
      },
    ]
  },

  // ==========================================================================
  // 31. DISCIPLINARIO - NOTICIAS DISCIPLINARIAS (16 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_noticias',
    name: '📋 Disciplinario: Noticias',
    icon: FileText,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    permissions: [
      { 
        id: 'disciplinario.noticias.view', 
        name: 'Ver Noticias', 
        description: 'Consultar noticias disciplinarias', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.view_all', 
        name: 'Ver Todas las Noticias', 
        description: 'Acceso completo a todas las noticias', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.create', 
        name: 'Crear Noticia', 
        description: 'Registrar nueva noticia disciplinaria', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.edit', 
        name: 'Editar Noticia', 
        description: 'Modificar noticia existente', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.delete', 
        name: 'Eliminar Noticia', 
        description: 'Eliminar noticia disciplinaria', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.archive', 
        name: 'Archivar Noticia', 
        description: 'Archivar noticia sin proceso', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.convert_to_process', 
        name: 'Convertir a Proceso', 
        description: 'Iniciar proceso formal desde noticia', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.assign', 
        name: 'Asignar Noticia', 
        description: 'Asignar noticia a profesional para valoración', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.reassign', 
        name: 'Reasignar Noticia', 
        description: 'Cambiar asignación de valoración', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.change_status', 
        name: 'Cambiar Estado', 
        description: 'Actualizar estado de la noticia', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.add_comment', 
        name: 'Agregar Comentario', 
        description: 'Registrar comentarios en la noticia', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.view_details', 
        name: 'Ver Detalles', 
        description: 'Acceso a información completa de la noticia', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.export', 
        name: 'Exportar Noticias', 
        description: 'Descargar datos de noticias', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.remit', 
        name: 'Remitir por Competencia', 
        description: 'Enviar noticia a otra entidad', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.view_timeline', 
        name: 'Ver Historial', 
        description: 'Consultar historial de la noticia', 
        module: 'disciplinario_noticias' 
      },
      { 
        id: 'disciplinario.noticias.attach_evidence', 
        name: 'Adjuntar Evidencia', 
        description: 'Cargar documentos de soporte', 
        module: 'disciplinario_noticias' 
      },
    ]
  },

  // ==========================================================================
  // 32. DISCIPLINARIO - EXPEDIENTE ELECTRÓNICO (14 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_expediente',
    name: '📁 Disciplinario: Expediente',
    icon: FolderOpen,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    permissions: [
      { 
        id: 'disciplinario.expediente.view', 
        name: 'Ver Expediente', 
        description: 'Acceso al expediente electrónico', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.view_documents', 
        name: 'Ver Documentos', 
        description: 'Consultar documentos del expediente', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.upload_document', 
        name: 'Subir Documento', 
        description: 'Cargar documentos al expediente', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.download_document', 
        name: 'Descargar Documento', 
        description: 'Descargar archivos del expediente', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.delete_document', 
        name: 'Eliminar Documento', 
        description: 'Eliminar documentos del expediente', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.edit_metadata', 
        name: 'Editar Metadatos', 
        description: 'Modificar información de documentos', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.organize', 
        name: 'Organizar Expediente', 
        description: 'Ordenar y clasificar documentos', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.search', 
        name: 'Buscar en Expediente', 
        description: 'Búsqueda avanzada de documentos', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.export', 
        name: 'Exportar Expediente', 
        description: 'Descargar expediente completo', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.version_control', 
        name: 'Control de Versiones', 
        description: 'Gestionar versiones de documentos', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.view_history', 
        name: 'Ver Historial', 
        description: 'Consultar historial de cambios', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.stamp_document', 
        name: 'Sellar Documento', 
        description: 'Aplicar sello digital a documentos', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.share', 
        name: 'Compartir Expediente', 
        description: 'Compartir acceso a expediente', 
        module: 'disciplinario_expediente' 
      },
      { 
        id: 'disciplinario.expediente.lock', 
        name: 'Bloquear Expediente', 
        description: 'Proteger expediente contra modificaciones', 
        module: 'disciplinario_expediente' 
      },
    ]
  },

  // ==========================================================================
  // 33. DISCIPLINARIO - REVISIÓN Y APROBACIÓN (12 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_revision',
    name: '✓ Disciplinario: Revisión',
    icon: CheckCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    permissions: [
      { 
        id: 'disciplinario.revision.view_pending', 
        name: 'Ver Pendientes', 
        description: 'Consultar documentos pendientes de revisión', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.approve_document', 
        name: 'Aprobar Documento', 
        description: 'Aprobar documentos jurídicos', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.reject_document', 
        name: 'Rechazar Documento', 
        description: 'Rechazar documentos con observaciones', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.request_corrections', 
        name: 'Solicitar Correcciones', 
        description: 'Pedir ajustes en documentos', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.add_observations', 
        name: 'Agregar Observaciones', 
        description: 'Registrar comentarios de revisión', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.view_history', 
        name: 'Ver Historial de Revisiones', 
        description: 'Consultar historial de aprobaciones', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.delegate', 
        name: 'Delegar Revisión', 
        description: 'Asignar revisión a otro profesional', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.priority', 
        name: 'Establecer Prioridad', 
        description: 'Marcar documentos como urgentes', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.view_metrics', 
        name: 'Ver Métricas', 
        description: 'Consultar tiempos de revisión', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.batch_approve', 
        name: 'Aprobación Masiva', 
        description: 'Aprobar múltiples documentos', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.final_approval', 
        name: 'Aprobación Final', 
        description: 'Aprobación definitiva de jefe', 
        module: 'disciplinario_revision' 
      },
      { 
        id: 'disciplinario.revision.export', 
        name: 'Exportar Revisiones', 
        description: 'Descargar datos de revisiones', 
        module: 'disciplinario_revision' 
      },
    ]
  },

  // ==========================================================================
  // 34. DISCIPLINARIO - TÉRMINOS Y ALERTAS (10 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_terminos',
    name: '⏰ Disciplinario: Términos',
    icon: Clock,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    permissions: [
      { 
        id: 'disciplinario.terminos.view', 
        name: 'Ver Términos', 
        description: 'Consultar términos y plazos', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.view_alerts', 
        name: 'Ver Alertas', 
        description: 'Recibir notificaciones de vencimientos', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.configure', 
        name: 'Configurar Términos', 
        description: 'Establecer plazos por etapa', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.extend', 
        name: 'Prorrogar Términos', 
        description: 'Extender plazos procesales', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.suspend', 
        name: 'Suspender Términos', 
        description: 'Pausar conteo de plazos', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.resume', 
        name: 'Reanudar Términos', 
        description: 'Reactivar conteo de plazos', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.view_dashboard', 
        name: 'Ver Dashboard de Términos', 
        description: 'Consultar semáforo de plazos', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.export', 
        name: 'Exportar Términos', 
        description: 'Descargar reporte de vencimientos', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.configure_notifications', 
        name: 'Configurar Notificaciones', 
        description: 'Ajustar alertas automáticas', 
        module: 'disciplinario_terminos' 
      },
      { 
        id: 'disciplinario.terminos.view_history', 
        name: 'Ver Historial', 
        description: 'Consultar historial de prórrogas', 
        module: 'disciplinario_terminos' 
      },
    ]
  },

  // ==========================================================================
  // 35. DISCIPLINARIO - PROFESIONALES (12 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_profesionales',
    name: '👨‍⚖️ Disciplinario: Profesionales',
    icon: Users,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    permissions: [
      { 
        id: 'disciplinario.profesionales.view', 
        name: 'Ver Profesionales', 
        description: 'Consultar equipo de profesionales', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.create', 
        name: 'Crear Profesional', 
        description: 'Registrar nuevo profesional', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.edit', 
        name: 'Editar Profesional', 
        description: 'Modificar datos de profesional', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.delete', 
        name: 'Eliminar Profesional', 
        description: 'Dar de baja profesional', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.assign_capacity', 
        name: 'Asignar Capacidad', 
        description: 'Establecer capacidad máxima de casos', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.view_workload', 
        name: 'Ver Carga Laboral', 
        description: 'Consultar casos asignados', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.view_performance', 
        name: 'Ver Desempeño', 
        description: 'Consultar métricas de rendimiento', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.assign_role', 
        name: 'Asignar Rol', 
        description: 'Configurar rol del profesional', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.activate_deactivate', 
        name: 'Activar/Desactivar', 
        description: 'Cambiar estado del profesional', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.export', 
        name: 'Exportar Profesionales', 
        description: 'Descargar datos del equipo', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.view_statistics', 
        name: 'Ver Estadísticas', 
        description: 'Consultar métricas del equipo', 
        module: 'disciplinario_profesionales' 
      },
      { 
        id: 'disciplinario.profesionales.manage_permissions', 
        name: 'Gestionar Permisos', 
        description: 'Administrar accesos del profesional', 
        module: 'disciplinario_profesionales' 
      },
    ]
  },

  // ==========================================================================
  // 36. DISCIPLINARIO - CONFIGURACIÓN (10 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_config',
    name: '⚙️ Disciplinario: Configuración',
    icon: Settings,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    permissions: [
      { 
        id: 'disciplinario.config.view', 
        name: 'Ver Configuración', 
        description: 'Acceso a configuración del sistema', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.edit_stages', 
        name: 'Configurar Etapas', 
        description: 'Modificar tiempos por etapa procesal', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.edit_capacity', 
        name: 'Configurar Capacidad', 
        description: 'Ajustar capacidad máxima por cargo', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.edit_workflows', 
        name: 'Configurar Flujos', 
        description: 'Modificar flujos de trabajo', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.edit_templates', 
        name: 'Gestionar Plantillas', 
        description: 'Administrar plantillas de documentos', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.edit_notifications', 
        name: 'Configurar Notificaciones', 
        description: 'Ajustar alertas del sistema', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.backup', 
        name: 'Respaldar Configuración', 
        description: 'Crear backup de configuración', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.restore', 
        name: 'Restaurar Configuración', 
        description: 'Recuperar configuración previa', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.export', 
        name: 'Exportar Configuración', 
        description: 'Descargar configuración del sistema', 
        module: 'disciplinario_config' 
      },
      { 
        id: 'disciplinario.config.audit', 
        name: 'Auditar Cambios', 
        description: 'Ver historial de cambios de configuración', 
        module: 'disciplinario_config' 
      },
    ]
  },

  // ==========================================================================
  // 37. DISCIPLINARIO - DASHBOARD Y REPORTES (12 permisos)
  // ==========================================================================
  {
    id: 'disciplinario_dashboard',
    name: '📊 Disciplinario: Dashboard',
    icon: BarChart3,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    permissions: [
      { 
        id: 'disciplinario.dashboard.view', 
        name: 'Ver Dashboard', 
        description: 'Acceso al dashboard principal', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.view_kanban', 
        name: 'Ver Kanban Operativo', 
        description: 'Acceso al tablero Kanban', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.view_ejecutivo', 
        name: 'Dashboard Ejecutivo', 
        description: 'Métricas y KPIs ejecutivos', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.view_metrics', 
        name: 'Ver Métricas', 
        description: 'Consultar indicadores del sistema', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.view_charts', 
        name: 'Ver Gráficos', 
        description: 'Acceso a gráficos y visualizaciones', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.export_reports', 
        name: 'Exportar Reportes', 
        description: 'Descargar reportes estadísticos', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.create_report', 
        name: 'Crear Reporte', 
        description: 'Generar reportes personalizados', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.schedule_report', 
        name: 'Programar Reportes', 
        description: 'Automatizar generación de reportes', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.view_by_sede', 
        name: 'Filtrar por Sede', 
        description: 'Ver métricas por sede', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.view_by_territorial', 
        name: 'Filtrar por Territorial', 
        description: 'Ver métricas por territorial', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.real_time', 
        name: 'Datos en Tiempo Real', 
        description: 'Actualización automática de métricas', 
        module: 'disciplinario_dashboard' 
      },
      { 
        id: 'disciplinario.dashboard.analytics', 
        name: 'Analíticas Avanzadas', 
        description: 'Acceso a análisis predictivo', 
        module: 'disciplinario_dashboard' 
      },
    ]
  },
];

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

export const PERMISSIONS_STATS = {
  totalModules: PERMISSION_MODULES.length,
  totalPermissions: PERMISSION_MODULES.reduce((acc, m) => acc + m.permissions.length, 0),
  backofficeModules: 19,
  portalModules: 12,
  systemModules: 1,
  lastUpdated: '2025-11-30',
  version: '3.0.0'
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default PERMISSION_MODULES;