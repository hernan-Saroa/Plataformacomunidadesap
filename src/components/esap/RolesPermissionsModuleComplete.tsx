/**
 * MÓDULO COMPLETO: ROLES Y PERMISOS
 * Sistema de gestión de roles y permisos del Backoffice ESAP
 * Actualizado: 30 de Noviembre, 2025
 * 
 * IMPORTANTE: Este módulo debe mantenerse actualizado con TODOS los módulos del sistema
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Shield,
  Check,
  X,
  Star,
  Calendar,
  AlertCircle,
  Building,
  GraduationCap,
  BookOpen,
  UserCheck,
  FileText,
  MessageSquare,
  Cog,
  Building2,
  Search,
  Award,
  Briefcase,
  UserCircle,
  ClipboardList,
  FolderOpen,
  BarChart3,
  ScrollText,
  MapPin,
  Landmark,
  ClipboardCheck,
  UserCog,
  CalendarDays,
  BriefcaseBusiness,
  FileCheck,
  TrendingUp,
  Settings,
  Lock,
  Database,
  Network
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

// ============================================================================
// TIPOS
// ============================================================================

interface UserRole {
  id_rol_usuario: string;
  tipo_rol: 'Aspirante' | 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';
  esta_activo: boolean;
  es_rol_principal: boolean;
  fecha_activacion: string;
  fecha_desactivacion?: string;
  motivo_activacion: string;
  motivo_desactivacion?: string;
  datos_rol?: Record<string, any>;
  activado_por_nombre?: string;
  desactivado_por_nombre?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface PermissionModule {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  permissions: Permission[];
}

interface RolePermissions {
  roleType: string;
  permissions: string[]; // IDs de permisos
}

// ============================================================================
// CONFIGURACIÓN DE MÓDULOS Y PERMISOS - ACTUALIZADO 2025
// ============================================================================

const PERMISSION_MODULES: PermissionModule[] = [
  // ============================================================================
  // 1. GESTIÓN DE USUARIOS Y PERSONAS
  // ============================================================================
  {
    id: 'users',
    name: 'Usuarios y Personas',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    permissions: [
      { id: 'users.view', name: 'Ver Usuarios', description: 'Consultar lista de usuarios del sistema', module: 'users' },
      { id: 'users.create', name: 'Crear Usuarios', description: 'Registrar nuevos usuarios en el sistema', module: 'users' },
      { id: 'users.edit', name: 'Editar Usuarios', description: 'Modificar datos de usuarios existentes', module: 'users' },
      { id: 'users.delete', name: 'Eliminar Usuarios', description: 'Dar de baja usuarios del sistema', module: 'users' },
      { id: 'users.export', name: 'Exportar Usuarios', description: 'Descargar datos de usuarios en Excel/CSV', module: 'users' },
      { id: 'users.assign_roles', name: 'Asignar Roles', description: 'Gestionar roles de usuarios (modelo Usuario Persona)', module: 'users' },
      { id: 'users.manage_access', name: 'Gestionar Accesos', description: 'Configurar permisos y accesos de usuarios', module: 'users' },
      { id: 'users.view_enrollment', name: 'Ver Vinculaciones', description: 'Consultar información de vinculaciones académicas', module: 'users' },
    ]
  },

  // ============================================================================
  // 2. ESTRUCTURA ORGANIZACIONAL (NUEVO - Nov 2025)
  // ============================================================================
  {
    id: 'organization',
    name: 'Estructura Organizacional',
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    permissions: [
      { id: 'org.view_territorial', name: 'Ver Territoriales', description: 'Consultar direcciones territoriales (17 en Colombia)', module: 'organization' },
      { id: 'org.view_sedes', name: 'Ver Sedes', description: 'Consultar sedes y puntos de atención (71+)', module: 'organization' },
      { id: 'org.manage_sedes', name: 'Gestionar Sedes', description: 'Crear, editar y gestionar sedes', module: 'organization' },
      { id: 'org.assign_users', name: 'Asignar Usuarios a Sedes', description: 'Vincular usuarios a territoriales y sedes', module: 'organization' },
      { id: 'org.view_hierarchy', name: 'Ver Jerarquía', description: 'Consultar estructura Nacional > Territorial > Sede', module: 'organization' },
      { id: 'org.export_structure', name: 'Exportar Estructura', description: 'Descargar datos de estructura organizacional', module: 'organization' },
      { id: 'org.manage_territorial', name: 'Gestionar Territoriales', description: 'Administrar direcciones territoriales', module: 'organization' },
    ]
  },

  // ============================================================================
  // 3. ESTUDIANTES Y ACADÉMICO
  // ============================================================================
  {
    id: 'students',
    name: 'Estudiantes',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    permissions: [
      { id: 'students.view', name: 'Ver Estudiantes', description: 'Consultar información estudiantil', module: 'students' },
      { id: 'students.enroll', name: 'Matricular', description: 'Gestionar matrículas de estudiantes', module: 'students' },
      { id: 'students.grades', name: 'Calificaciones', description: 'Gestionar calificaciones y notas', module: 'students' },
      { id: 'students.attendance', name: 'Asistencia', description: 'Registrar y consultar asistencia', module: 'students' },
      { id: 'students.export', name: 'Exportar Estudiantes', description: 'Descargar datos de estudiantes', module: 'students' },
      { id: 'students.academic_programs', name: 'Ver Programas Académicos', description: 'Consultar programas académicos vinculados', module: 'students' },
    ]
  },

  // ============================================================================
  // 4. GRADUADOS Y VERIFICACIÓN DE TÍTULOS
  // ============================================================================
  {
    id: 'graduates',
    name: 'Graduados',
    icon: Award,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    permissions: [
      { id: 'graduates.view', name: 'Ver Graduados', description: 'Consultar base de datos de graduados', module: 'graduates' },
      { id: 'graduates.manage', name: 'Gestionar Graduados', description: 'Administrar registros de graduados', module: 'graduates' },
      { id: 'graduates.verify', name: 'Verificar Títulos', description: 'Generar certificados de verificación de títulos', module: 'graduates' },
      { id: 'graduates.export', name: 'Exportar Graduados', description: 'Descargar datos de graduados', module: 'graduates' },
      { id: 'graduates.certificates', name: 'Certificados de Título', description: 'Emitir certificados de graduación', module: 'graduates' },
    ]
  },

  // ============================================================================
  // 5. GESTIÓN PROFESORAL (NUEVO - Nov 2025)
  // ============================================================================
  {
    id: 'professors',
    name: 'Gestión Profesoral',
    icon: UserCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    permissions: [
      { id: 'professors.view', name: 'Ver Profesores', description: 'Consultar información de docentes', module: 'professors' },
      { id: 'professors.create', name: 'Crear Profesores', description: 'Registrar nuevos docentes en el sistema', module: 'professors' },
      { id: 'professors.edit', name: 'Editar Profesores', description: 'Modificar información de docentes', module: 'professors' },
      { id: 'professors.assign_load', name: 'Asignar Carga Académica', description: 'Gestionar carga académica de docentes', module: 'professors' },
      { id: 'professors.view_schedule', name: 'Ver Horarios', description: 'Consultar horarios de profesores', module: 'professors' },
      { id: 'professors.export', name: 'Exportar Profesores', description: 'Descargar datos de docentes', module: 'professors' },
    ]
  },

  // ============================================================================
  // 6. CALENDARIO ACADÉMICO ESAP 2026 (NUEVO - Nov 2025)
  // ============================================================================
  {
    id: 'calendar',
    name: 'Calendario Académico',
    icon: CalendarDays,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    permissions: [
      { id: 'calendar.view', name: 'Ver Calendario', description: 'Consultar calendario académico ESAP 2026', module: 'calendar' },
      { id: 'calendar.edit', name: 'Editar Calendario', description: 'Modificar eventos del calendario académico', module: 'calendar' },
      { id: 'calendar.create_events', name: 'Crear Eventos', description: 'Agregar nuevos eventos académicos', module: 'calendar' },
      { id: 'calendar.manage_periods', name: 'Gestionar Periodos', description: 'Administrar periodos académicos (2026-1, 2026-2, 2026-3)', module: 'calendar' },
      { id: 'calendar.export', name: 'Exportar Calendario', description: 'Descargar calendario en diferentes formatos', module: 'calendar' },
      { id: 'calendar.notifications', name: 'Gestionar Notificaciones', description: 'Configurar alertas y recordatorios', module: 'calendar' },
    ]
  },

  // ============================================================================
  // 7. CERTIFICADOS LABORALES (ACTUALIZADO - Nov 2025)
  // ============================================================================
  {
    id: 'certificates',
    name: 'Certificados Laborales',
    icon: FileCheck,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    permissions: [
      { id: 'certificates.view', name: 'Ver Solicitudes', description: 'Consultar solicitudes de certificados laborales', module: 'certificates' },
      { id: 'certificates.generate', name: 'Generar Certificados', description: 'Emitir certificados laborales', module: 'certificates' },
      { id: 'certificates.approve', name: 'Aprobar Solicitudes', description: 'Aprobar/rechazar solicitudes de certificados', module: 'certificates' },
      { id: 'certificates.verify', name: 'Verificar Certificados', description: 'Validar autenticidad de certificados', module: 'certificates' },
      { id: 'certificates.export', name: 'Exportar Certificados', description: 'Descargar registros de certificados', module: 'certificates' },
      { id: 'certificates.manage_templates', name: 'Gestionar Plantillas', description: 'Administrar plantillas de certificados', module: 'certificates' },
    ]
  },

  // ============================================================================
  // 8. PORTAL TRANSACCIONAL - COMUNIDAD ESAP (ACTUALIZADO)
  // ============================================================================
  {
    id: 'community',
    name: 'Comunidad ESAP',
    icon: MessageSquare,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    permissions: [
      { id: 'community.view', name: 'Ver Comunidad', description: 'Acceso a la red social universitaria', module: 'community' },
      { id: 'community.post', name: 'Crear Publicaciones', description: 'Publicar contenido en la comunidad', module: 'community' },
      { id: 'community.moderate', name: 'Moderar Contenido', description: 'Moderar y eliminar publicaciones', module: 'community' },
      { id: 'community.events', name: 'Gestionar Eventos', description: 'Crear y administrar eventos comunitarios', module: 'community' },
      { id: 'community.announcements', name: 'Anuncios Oficiales', description: 'Publicar anuncios institucionales', module: 'community' },
      { id: 'community.groups', name: 'Gestionar Grupos', description: 'Crear y administrar grupos de interés', module: 'community' },
      { id: 'community.analytics', name: 'Ver Analíticas', description: 'Consultar métricas de engagement', module: 'community' },
    ]
  },

  // ============================================================================
  // 9. BOLSA DE TRABAJO
  // ============================================================================
  {
    id: 'jobs',
    name: 'Bolsa de Trabajo',
    icon: BriefcaseBusiness,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    permissions: [
      { id: 'jobs.view', name: 'Ver Ofertas', description: 'Consultar ofertas laborales publicadas', module: 'jobs' },
      { id: 'jobs.create', name: 'Publicar Ofertas', description: 'Crear nuevas ofertas de empleo', module: 'jobs' },
      { id: 'jobs.manage', name: 'Gestionar Ofertas', description: 'Administrar bolsa de trabajo', module: 'jobs' },
      { id: 'jobs.applications', name: 'Ver Aplicaciones', description: 'Revisar postulaciones de candidatos', module: 'jobs' },
      { id: 'jobs.analytics', name: 'Analíticas de Empleo', description: 'Ver estadísticas de empleabilidad', module: 'jobs' },
    ]
  },

  // ============================================================================
  // 10. SISTEMA DE MATRÍCULAS
  // ============================================================================
  {
    id: 'enrollment',
    name: 'Matrículas',
    icon: ClipboardList,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    permissions: [
      { id: 'enrollment.view', name: 'Ver Solicitudes', description: 'Consultar solicitudes de matrícula', module: 'enrollment' },
      { id: 'enrollment.approve', name: 'Aprobar Matrículas', description: 'Aprobar/rechazar solicitudes de matrícula', module: 'enrollment' },
      { id: 'enrollment.manage', name: 'Gestionar Proceso', description: 'Administrar proceso completo de matrícula', module: 'enrollment' },
      { id: 'enrollment.payments', name: 'Gestionar Pagos', description: 'Administrar pagos y recibos de matrícula', module: 'enrollment' },
      { id: 'enrollment.export', name: 'Exportar Matrículas', description: 'Descargar reportes de matrículas', module: 'enrollment' },
    ]
  },

  // ============================================================================
  // 11. CARPETA DIGITAL DE ESTUDIANTES
  // ============================================================================
  {
    id: 'documents',
    name: 'Carpeta Digital',
    icon: FolderOpen,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    permissions: [
      { id: 'documents.view', name: 'Ver Documentos', description: 'Consultar documentos de estudiantes', module: 'documents' },
      { id: 'documents.upload', name: 'Cargar Documentos', description: 'Subir archivos a carpeta digital', module: 'documents' },
      { id: 'documents.manage', name: 'Gestionar Documentos', description: 'Administrar carpeta digital completa', module: 'documents' },
      { id: 'documents.validate', name: 'Validar Documentos', description: 'Aprobar/rechazar documentos cargados', module: 'documents' },
      { id: 'documents.download', name: 'Descargar Documentos', description: 'Descargar archivos de carpeta digital', module: 'documents' },
    ]
  },

  // ============================================================================
  // 12. DASHBOARD EJECUTIVO (ACTUALIZADO - Nov 2025)
  // ============================================================================
  {
    id: 'dashboard',
    name: 'Dashboard Ejecutivo',
    icon: TrendingUp,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    permissions: [
      { id: 'dashboard.view_general', name: 'Ver Dashboard General', description: 'Acceso a métricas generales del sistema', module: 'dashboard' },
      { id: 'dashboard.view_by_sede', name: 'Métricas por Sede', description: 'Consultar KPIs por sede específica', module: 'dashboard' },
      { id: 'dashboard.view_by_territorial', name: 'Métricas por Territorial', description: 'Consultar KPIs por dirección territorial', module: 'dashboard' },
      { id: 'dashboard.export_metrics', name: 'Exportar Métricas', description: 'Descargar reportes ejecutivos', module: 'dashboard' },
      { id: 'dashboard.real_time', name: 'Datos en Tiempo Real', description: 'Acceso a métricas en tiempo real', module: 'dashboard' },
      { id: 'dashboard.custom_reports', name: 'Reportes Personalizados', description: 'Crear reportes ejecutivos personalizados', module: 'dashboard' },
    ]
  },

  // ============================================================================
  // 13. REPORTES Y ANALÍTICAS
  // ============================================================================
  {
    id: 'reports',
    name: 'Reportes',
    icon: BarChart3,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    permissions: [
      { id: 'reports.view', name: 'Ver Reportes', description: 'Consultar reportes del sistema', module: 'reports' },
      { id: 'reports.create', name: 'Crear Reportes', description: 'Generar nuevos reportes', module: 'reports' },
      { id: 'reports.export', name: 'Exportar Reportes', description: 'Descargar reportes en Excel/PDF', module: 'reports' },
      { id: 'reports.schedule', name: 'Programar Reportes', description: 'Automatizar generación de reportes', module: 'reports' },
      { id: 'reports.analytics', name: 'Analíticas Avanzadas', description: 'Acceso a herramientas de análisis', module: 'reports' },
    ]
  },

  // ============================================================================
  // 14. AUDITORÍA Y SEGURIDAD
  // ============================================================================
  {
    id: 'audit',
    name: 'Auditoría',
    icon: ScrollText,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    permissions: [
      { id: 'audit.view', name: 'Ver Logs', description: 'Consultar logs de auditoría del sistema', module: 'audit' },
      { id: 'audit.export', name: 'Exportar Logs', description: 'Descargar registros de auditoría', module: 'audit' },
      { id: 'audit.analyze', name: 'Analizar Actividad', description: 'Análisis de seguridad y comportamiento', module: 'audit' },
      { id: 'audit.security', name: 'Gestión de Seguridad', description: 'Administrar políticas de seguridad', module: 'audit' },
      { id: 'audit.compliance', name: 'Cumplimiento Normativo', description: 'Verificar cumplimiento de normativas', module: 'audit' },
    ]
  },

  // ============================================================================
  // 15. ROLES Y PERMISOS
  // ============================================================================
  {
    id: 'roles',
    name: 'Roles y Permisos',
    icon: Shield,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    permissions: [
      { id: 'roles.view', name: 'Ver Roles', description: 'Consultar roles del sistema', module: 'roles' },
      { id: 'roles.create', name: 'Crear Roles', description: 'Crear nuevos roles personalizados', module: 'roles' },
      { id: 'roles.edit', name: 'Editar Roles', description: 'Modificar roles existentes', module: 'roles' },
      { id: 'roles.delete', name: 'Eliminar Roles', description: 'Eliminar roles del sistema', module: 'roles' },
      { id: 'roles.assign_permissions', name: 'Asignar Permisos', description: 'Configurar permisos de roles', module: 'roles' },
      { id: 'roles.manage_access', name: 'Gestionar Accesos', description: 'Administrar control de acceso', module: 'roles' },
    ]
  },

  // ============================================================================
  // 16. ARQUITECTURA EMPRESARIAL MRAE v3.0 MinTIC (NUEVO - Dic 2025)
  // ============================================================================
  {
    id: 'arquitectura_empresarial',
    name: 'Arquitectura Empresarial',
    icon: Network,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    permissions: [
      // Visualización
      { id: 'ae.view_dashboard', name: 'Ver Dashboard AE', description: 'Acceso al dashboard de Arquitectura Empresarial', module: 'arquitectura_empresarial' },
      { id: 'ae.view_lineamientos', name: 'Ver Lineamientos', description: 'Consultar los 106 lineamientos MRAE v3.0', module: 'arquitectura_empresarial' },
      { id: 'ae.view_matriz', name: 'Ver Matriz de Cumplimiento', description: 'Consultar matriz de cumplimiento MinTIC', module: 'arquitectura_empresarial' },
      
      // Gestión de Lineamientos
      { id: 'ae.edit_lineamientos', name: 'Editar Lineamientos', description: 'Modificar estado y progreso de lineamientos', module: 'arquitectura_empresarial' },
      { id: 'ae.assign_responsible', name: 'Asignar Responsables', description: 'Asignar responsables a lineamientos', module: 'arquitectura_empresarial' },
      
      // Evidencias
      { id: 'ae.view_evidencias', name: 'Ver Evidencias', description: 'Consultar evidencias cargadas', module: 'arquitectura_empresarial' },
      { id: 'ae.upload_evidencias', name: 'Cargar Evidencias', description: 'Subir evidencias documentales', module: 'arquitectura_empresarial' },
      { id: 'ae.review_evidencias', name: 'Revisar Evidencias', description: 'Revisar evidencias en estado "En Revisión"', module: 'arquitectura_empresarial' },
      { id: 'ae.approve_evidencias', name: 'Aprobar Evidencias', description: 'Aprobar o rechazar evidencias', module: 'arquitectura_empresarial' },
      { id: 'ae.download_evidencias', name: 'Descargar Evidencias', description: 'Descargar archivos de evidencias', module: 'arquitectura_empresarial' },
      
      // Tareas y Workflow
      { id: 'ae.view_tareas', name: 'Ver Mis Tareas', description: 'Consultar tareas asignadas de AE', module: 'arquitectura_empresarial' },
      { id: 'ae.assign_tareas', name: 'Asignar Tareas', description: 'Crear y asignar tareas a usuarios', module: 'arquitectura_empresarial' },
      { id: 'ae.complete_tareas', name: 'Completar Tareas', description: 'Marcar tareas como completadas', module: 'arquitectura_empresarial' },
      
      // Reportería
      { id: 'ae.generate_reports', name: 'Generar Reportes MinTIC', description: 'Crear reportes oficiales MinTIC', module: 'arquitectura_empresarial' },
      { id: 'ae.export_data', name: 'Exportar Datos AE', description: 'Exportar datos de AE en Excel/PDF', module: 'arquitectura_empresarial' },
      
      // Administración
      { id: 'ae.manage_all', name: 'Administración Completa AE', description: 'Control total del módulo de AE', module: 'arquitectura_empresarial' },
    ]
  },

  // ============================================================================
  // 17. ADMINISTRACIÓN DEL SISTEMA
  // ============================================================================
  {
    id: 'admin',
    name: 'Administración',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    permissions: [
      { id: 'admin.settings', name: 'Configuración General', description: 'Ajustes generales del sistema', module: 'admin' },
      { id: 'admin.backup', name: 'Respaldos', description: 'Gestionar backups del sistema', module: 'admin' },
      { id: 'admin.maintenance', name: 'Mantenimiento', description: 'Modo de mantenimiento y actualizaciones', module: 'admin' },
      { id: 'admin.integrations', name: 'Integraciones', description: 'Configurar integraciones externas', module: 'admin' },
      { id: 'admin.notifications', name: 'Notificaciones Sistema', description: 'Gestionar notificaciones globales', module: 'admin' },
      { id: 'admin.database', name: 'Gestión de Base de Datos', description: 'Administración avanzada de BD', module: 'admin' },
    ]
  },
];

// ============================================================================
// PERMISOS POR ROL (PRESETS) - ACTUALIZADOS 2025
// ============================================================================

const ROLE_PERMISSIONS_PRESETS: Record<string, string[]> = {
  // ============================================================================
  // ESTUDIANTE - Acceso básico a servicios estudiantiles
  // ============================================================================
  'Estudiante': [
    // Usuarios y Perfil
    'users.view',
    
    // Académico
    'students.view',
    'students.grades',
    'calendar.view',
    
    // Comunidad
    'community.view',
    'community.post',
    'community.groups',
    
    // Servicios
    'jobs.view',
    'documents.view',
    'documents.upload',
    'certificates.view',
    
    // Estructura
    'org.view_sedes',
  ],

  // ============================================================================
  // DOCENTE - Gestión académica y evaluación
  // ============================================================================
  'Docente': [
    // Usuarios
    'users.view',
    
    // Académico
    'students.view',
    'students.grades',
    'students.attendance',
    'calendar.view',
    'calendar.create_events',
    
    // Profesoral
    'professors.view',
    'professors.view_schedule',
    
    // Comunidad
    'community.view',
    'community.post',
    'community.events',
    'community.announcements',
    
    // Documentos
    'documents.view',
    'documents.validate',
    
    // Reportes
    'reports.view',
    
    // Estructura
    'org.view_sedes',
    'org.view_territorial',
  ],

  // ============================================================================
  // GRADUADO - Servicios para egresados
  // ============================================================================
  'Graduado': [
    // Usuarios
    'users.view',
    
    // Graduados
    'graduates.view',
    'graduates.certificates',
    
    // Comunidad
    'community.view',
    'community.post',
    'community.groups',
    
    // Bolsa de Trabajo
    'jobs.view',
    
    // Certificados
    'certificates.view',
    
    // Estructura
    'org.view_sedes',
  ],

  // ============================================================================
  // ASPIRANTE - Acceso limitado para futuros estudiantes
  // ============================================================================
  'Aspirante': [
    // Información General
    'calendar.view',
    'org.view_sedes',
    'org.view_territorial',
    
    // Matrículas
    'enrollment.view',
    
    // Documentos
    'documents.view',
    'documents.upload',
    
    // Comunidad limitada
    'community.view',
  ],

  // ============================================================================
  // ADMINISTRATIVO - Gestión operativa completa
  // ============================================================================
  'Administrativo': [
    // Usuarios
    'users.view',
    'users.create',
    'users.edit',
    'users.export',
    'users.assign_roles',
    'users.manage_access',
    'users.view_enrollment',
    
    // Estructura Organizacional
    'org.view_territorial',
    'org.view_sedes',
    'org.manage_sedes',
    'org.assign_users',
    'org.view_hierarchy',
    'org.export_structure',
    
    // Estudiantes
    'students.view',
    'students.enroll',
    'students.grades',
    'students.attendance',
    'students.export',
    'students.academic_programs',
    
    // Graduados
    'graduates.view',
    'graduates.manage',
    'graduates.verify',
    'graduates.export',
    'graduates.certificates',
    
    // Profesores
    'professors.view',
    'professors.create',
    'professors.edit',
    'professors.assign_load',
    'professors.view_schedule',
    'professors.export',
    
    // Calendario Académico
    'calendar.view',
    'calendar.edit',
    'calendar.create_events',
    'calendar.manage_periods',
    'calendar.export',
    'calendar.notifications',
    
    // Certificados Laborales
    'certificates.view',
    'certificates.generate',
    'certificates.approve',
    'certificates.verify',
    'certificates.export',
    'certificates.manage_templates',
    
    // Comunidad
    'community.view',
    'community.post',
    'community.moderate',
    'community.events',
    'community.announcements',
    'community.groups',
    'community.analytics',
    
    // Bolsa de Trabajo
    'jobs.view',
    'jobs.create',
    'jobs.manage',
    'jobs.applications',
    'jobs.analytics',
    
    // Matrículas
    'enrollment.view',
    'enrollment.approve',
    'enrollment.manage',
    'enrollment.payments',
    'enrollment.export',
    
    // Documentos
    'documents.view',
    'documents.upload',
    'documents.manage',
    'documents.validate',
    'documents.download',
    
    // Dashboard
    'dashboard.view_general',
    'dashboard.view_by_sede',
    'dashboard.view_by_territorial',
    'dashboard.export_metrics',
    'dashboard.real_time',
    
    // Reportes
    'reports.view',
    'reports.create',
    'reports.export',
    'reports.schedule',
    
    // Auditoría
    'audit.view',
    'audit.export',
    'audit.analyze',
    
    // Roles (limitado)
    'roles.view',
  ],

  // ============================================================================
  // GESTOR CERTIFICADOS LABORALES - Acceso especializado
  // Usuario: cerlaboral@esap.edu.co
  // ============================================================================
  'Gestor Certificados Laborales': [
    // Certificados (COMPLETO)
    'certificates.view',
    'certificates.generate',
    'certificates.approve',
    'certificates.verify',
    'certificates.export',
    'certificates.manage_templates',
    
    // Dashboard (SOLO CERTIFICADOS)
    'dashboard.view_general',
    'dashboard.export_metrics',
    
    // Auditoría (SOLO CERTIFICADOS)
    'audit.view',
    'audit.export',
    
    // Reportes (SOLO CERTIFICADOS)
    'reports.view',
    'reports.export',
    
    // Estructura (VISTA LIMITADA)
    'org.view_sedes',
    'org.view_territorial',
  ],

  // ============================================================================
  // ARQUITECTO TI - Gestión completa de Arquitectura Empresarial
  // ============================================================================
  'Arquitecto TI': [
    // Arquitectura Empresarial (TODOS)
    'ae.view_dashboard',
    'ae.view_lineamientos',
    'ae.view_matriz',
    'ae.edit_lineamientos',
    'ae.assign_responsible',
    'ae.view_evidencias',
    'ae.upload_evidencias',
    'ae.review_evidencias',
    'ae.approve_evidencias',
    'ae.download_evidencias',
    'ae.view_tareas',
    'ae.assign_tareas',
    'ae.complete_tareas',
    'ae.generate_reports',
    'ae.export_data',
    'ae.manage_all',
    
    // Dashboard
    'dashboard.view_general',
    'dashboard.export_metrics',
    
    // Reportes
    'reports.view',
    'reports.create',
    'reports.export',
    
    // Auditoría
    'audit.view',
    'audit.export',
    
    // Estructura
    'org.view_sedes',
    'org.view_territorial',
    'org.view_hierarchy',
  ],

  // ============================================================================
  // REVISOR AE - Revisión y aprobación de evidencias
  // ============================================================================
  'Revisor AE': [
    // Arquitectura Empresarial (REVISIÓN)
    'ae.view_dashboard',
    'ae.view_lineamientos',
    'ae.view_matriz',
    'ae.view_evidencias',
    'ae.review_evidencias',
    'ae.approve_evidencias',
    'ae.download_evidencias',
    'ae.view_tareas',
    'ae.complete_tareas',
    'ae.export_data',
    
    // Dashboard (limitado)
    'dashboard.view_general',
    
    // Reportes (limitado)
    'reports.view',
    'reports.export',
    
    // Estructura
    'org.view_sedes',
    'org.view_territorial',
  ],

  // ============================================================================
  // CISO - Chief Information Security Officer
  // ============================================================================
  'CISO': [
    // Arquitectura Empresarial (SEGURIDAD)
    'ae.view_dashboard',
    'ae.view_lineamientos',
    'ae.view_matriz',
    'ae.view_evidencias',
    'ae.review_evidencias',
    'ae.approve_evidencias',
    'ae.download_evidencias',
    'ae.export_data',
    
    // Auditoría (COMPLETO)
    'audit.view',
    'audit.export',
    'audit.analyze',
    'audit.security',
    'audit.compliance',
    
    // Dashboard
    'dashboard.view_general',
    'dashboard.export_metrics',
    
    // Reportes
    'reports.view',
    'reports.create',
    'reports.export',
    
    // Estructura
    'org.view_sedes',
    'org.view_territorial',
    'org.view_hierarchy',
    
    // Roles (para gestión de seguridad)
    'roles.view',
    'roles.assign_permissions',
  ],

  // ============================================================================
  // DIRECTOR TI - Gestión estratégica de TI y AE
  // ============================================================================
  'Director TI': [
    // Arquitectura Empresarial (COMPLETO)
    'ae.view_dashboard',
    'ae.view_lineamientos',
    'ae.view_matriz',
    'ae.edit_lineamientos',
    'ae.assign_responsible',
    'ae.view_evidencias',
    'ae.upload_evidencias',
    'ae.review_evidencias',
    'ae.approve_evidencias',
    'ae.download_evidencias',
    'ae.view_tareas',
    'ae.assign_tareas',
    'ae.complete_tareas',
    'ae.generate_reports',
    'ae.export_data',
    'ae.manage_all',
    
    // Dashboard (COMPLETO)
    'dashboard.view_general',
    'dashboard.view_by_sede',
    'dashboard.view_by_territorial',
    'dashboard.export_metrics',
    'dashboard.real_time',
    'dashboard.custom_reports',
    
    // Reportes (COMPLETO)
    'reports.view',
    'reports.create',
    'reports.export',
    'reports.schedule',
    'reports.analytics',
    
    // Auditoría (COMPLETO)
    'audit.view',
    'audit.export',
    'audit.analyze',
    'audit.security',
    'audit.compliance',
    
    // Roles
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.assign_permissions',
    
    // Estructura
    'org.view_territorial',
    'org.view_sedes',
    'org.view_hierarchy',
    'org.export_structure',
    
    // Administración (PARCIAL)
    'admin.settings',
    'admin.integrations',
    'admin.notifications',
  ],

  // ============================================================================
  // RECTOR / DIRECTOR NACIONAL - Acceso total al sistema
  // ============================================================================
  'Rector': [
    // ✅ TODOS LOS PERMISOS DEL SISTEMA
    ...PERMISSION_MODULES.flatMap(module => module.permissions.map(p => p.id))
  ],

  // ============================================================================
  // DIRECTOR TERRITORIAL - Gestión a nivel territorial
  // ============================================================================
  'Director Territorial': [
    // Usuarios
    'users.view',
    'users.create',
    'users.edit',
    'users.export',
    'users.assign_roles',
    'users.view_enrollment',
    
    // Estructura (TERRITORIAL)
    'org.view_territorial',
    'org.view_sedes',
    'org.manage_sedes',
    'org.assign_users',
    'org.view_hierarchy',
    'org.export_structure',
    
    // Todo lo académico
    'students.view',
    'students.enroll',
    'students.export',
    'graduates.view',
    'graduates.export',
    'professors.view',
    'professors.export',
    'calendar.view',
    'calendar.edit',
    
    // Certificados
    'certificates.view',
    'certificates.approve',
    'certificates.export',
    
    // Dashboard (TERRITORIAL)
    'dashboard.view_general',
    'dashboard.view_by_sede',
    'dashboard.view_by_territorial',
    'dashboard.export_metrics',
    'dashboard.real_time',
    'dashboard.custom_reports',
    
    // Reportes
    'reports.view',
    'reports.create',
    'reports.export',
    'reports.analytics',
    
    // Auditoría
    'audit.view',
    'audit.export',
    'audit.analyze',
  ],
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function RolesPermissionsModuleComplete({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(ROLE_PERMISSIONS_PRESETS);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - Roles activos del usuario
  const activeRoles: UserRole[] = [
    {
      id_rol_usuario: '1',
      tipo_rol: 'Administrativo',
      esta_activo: true,
      es_rol_principal: true,
      fecha_activacion: '2024-01-01',
      motivo_activacion: 'Contratación',
      activado_por_nombre: 'Sistema'
    }
  ];

  // Filtrar permisos por búsqueda
  const filteredModules = PERMISSION_MODULES.map(module => ({
    ...module,
    permissions: module.permissions.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(module => module.permissions.length > 0);

  // Toggle permission
  const togglePermission = (roleType: string, permissionId: string) => {
    setRolePermissions(prev => {
      const current = prev[roleType] || [];
      const updated = current.includes(permissionId)
        ? current.filter(p => p !== permissionId)
        : [...current, permissionId];
      return { ...prev, [roleType]: updated };
    });
    toast.success('Permiso actualizado');
  };

  // Verificar si un rol tiene un permiso
  const hasPermission = (roleType: string, permissionId: string) => {
    return rolePermissions[roleType]?.includes(permissionId) || false;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Roles y Permisos</h1>
            <p className="text-white/90 mt-1">
              Gestión completa de roles y permisos del sistema - Actualizado Nov 2025
            </p>
          </div>
        </div>
        
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Módulos</p>
                <p className="text-2xl font-bold mt-1">{PERMISSION_MODULES.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-white/60" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Permisos Totales</p>
                <p className="text-2xl font-bold mt-1">
                  {PERMISSION_MODULES.reduce((acc, m) => acc + m.permissions.length, 0)}
                </p>
              </div>
              <Lock className="w-8 h-8 text-white/60" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Roles Activos</p>
                <p className="text-2xl font-bold mt-1">{activeRoles.length}</p>
              </div>
              <Users className="w-8 h-8 text-white/60" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Última Actualización</p>
                <p className="text-sm font-semibold mt-1">30 Nov 2025</p>
              </div>
              <Calendar className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'roles'
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              Mis Roles Activos
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'permissions'
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" />
              Matriz de Permisos
            </div>
          </button>
        </div>

        <div className="p-6">
          {/* TAB: Roles Activos */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Sistema Usuario Persona de ESAP</p>
                    <p>
                      En ESAP, una persona puede tener múltiples roles simultáneos. 
                      Por ejemplo, un Docente puede también ser Estudiante de posgrado y Graduado de pregrado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {activeRoles.map((role) => (
                  <motion.div
                    key={role.id_rol_usuario}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#003DA5] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <UserCircle className="w-6 h-6 text-[#003DA5]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">{role.tipo_rol}</h3>
                            {role.es_rol_principal && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                <Star className="w-3 h-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Activo desde {new Date(role.fecha_activacion).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <Badge 
                        className={`${
                          role.esta_activo 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {role.esta_activo ? (
                          <><Check className="w-3 h-3 mr-1" /> Activo</>
                        ) : (
                          <><X className="w-3 h-3 mr-1" /> Inactivo</>
                        )}
                      </Badge>
                    </div>

                    {/* Permisos del rol */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Permisos asignados ({rolePermissions[role.tipo_rol]?.length || 0})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {PERMISSION_MODULES.map(module => {
                          const rolePerms = rolePermissions[role.tipo_rol] || [];
                          const modulePerms = module.permissions.filter(p => rolePerms.includes(p.id));
                          
                          if (modulePerms.length === 0) return null;
                          
                          return (
                            <div key={module.id} className="text-sm">
                              <p className={`font-semibold ${module.color} mb-1 flex items-center gap-1`}>
                                <module.icon className="w-4 h-4" />
                                {module.name}
                              </p>
                              <ul className="space-y-0.5 pl-5">
                                {modulePerms.slice(0, 3).map(perm => (
                                  <li key={perm.id} className="text-xs text-gray-600 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-green-600" />
                                    {perm.name}
                                  </li>
                                ))}
                                {modulePerms.length > 3 && (
                                  <li className="text-xs text-gray-500 italic">
                                    +{modulePerms.length - 3} más...
                                  </li>
                                )}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Matriz de Permisos */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar permisos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none"
                />
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seleccionar Rol para Editar Permisos
                </label>
                <select
                  value={selectedRole || ''}
                  onChange={(e) => setSelectedRole(e.target.value || null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none"
                >
                  <option value="">-- Seleccionar Rol --</option>
                  {Object.keys(ROLE_PERMISSIONS_PRESETS).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {selectedRole && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">Rol Seleccionado: {selectedRole}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {rolePermissions[selectedRole]?.length || 0} permisos asignados
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setRolePermissions(prev => ({
                          ...prev,
                          [selectedRole]: []
                        }));
                        toast.success('Todos los permisos removidos');
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                    >
                      Remover Todos
                    </button>
                  </div>
                </div>
              )}

              {/* Matriz de Permisos */}
              <div className="space-y-6">
                {filteredModules.map((module) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className={`${module.bgColor} px-6 py-4 border-b-2 border-gray-200`}>
                      <div className="flex items-center gap-3">
                        <module.icon className={`w-6 h-6 ${module.color}`} />
                        <div>
                          <h3 className="font-bold text-gray-900">{module.name}</h3>
                          <p className="text-sm text-gray-600">
                            {module.permissions.length} permisos disponibles
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {module.permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-3 p-4 border-2 border-gray-100 rounded-lg hover:border-gray-300 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{permission.name}</p>
                              <p className="text-sm text-gray-500 mt-1">{permission.description}</p>
                            </div>
                            
                            {selectedRole && (
                              <button
                                onClick={() => togglePermission(selectedRole, permission.id)}
                                className={`mt-1 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                  hasPermission(selectedRole, permission.id)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                }`}
                              >
                                {hasPermission(selectedRole, permission.id) && (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredModules.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron permisos</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resumen Final */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 mb-2">
              ✅ Módulo Actualizado - Noviembre 2025
            </p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• <strong>16 módulos</strong> del sistema completamente integrados</li>
              <li>• <strong>Gestión Profesoral</strong> y <strong>Calendario Académico ESAP 2026</strong> incluidos</li>
              <li>• <strong>Estructura Organizacional</strong> (Territorial vs Sede) actualizada</li>
              <li>• <strong>Certificados Laborales</strong> con acceso especializado para cerlaboral@esap.edu.co</li>
              <li>• <strong>Dashboard Ejecutivo</strong> con métricas por sede y territorial</li>
              <li>Roles preconfigurados para todos los perfiles de usuario</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}