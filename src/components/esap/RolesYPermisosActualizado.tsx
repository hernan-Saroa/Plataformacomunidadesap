/**
 * RF015 - ROLES Y PERMISOS - ACTUALIZADO
 * Sistema de control de acceso con SSO, permisos granulares y auditoría completa
 * Módulo de Gestión de Personas - ESAP
 * 
 * ACTUALIZACIÓN: Incluye TODOS los módulos del backoffice y roles completos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, Lock, Key, Eye, Edit, Trash2, Plus, Search,
  Settings, CheckCircle, XCircle, AlertTriangle, MoreVertical,
  ChevronDown, ChevronRight, Copy, Download, Upload, Activity,
  Clock, UserCheck, UserX, Filter, Star, Database, FileText,
  Calendar, Mail, Phone, Building2, Globe, LogIn, LogOut,
  History, Award, Ban, CheckSquare, X, Save, RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type TipoRol = 'Sistema' | 'Personalizado';
type EstadoRol = 'Activo' | 'Inactivo';

type PermisoAccion = 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'aprobar' | 'exportar';

interface Permiso {
  id: string;
  modulo: string;
  acciones: PermisoAccion[];
  descripcion: string;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoRol;
  estado: EstadoRol;
  usuariosAsignados: number;
  permisos: Permiso[];
  color: string;
  icono: string;
  creadoPor?: string;
  fechaCreacion?: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}

interface Usuario {
  id: string;
  nombreCompleto: string;
  email: string;
  documento: string;
  cargo: string;
  area: string;
  roles: string[]; // IDs de roles
  estado: 'Activo' | 'Inactivo';
  ultimoAcceso?: string;
  autenticacionSSO: boolean;
  requiere2FA: boolean;
}

interface EventoAuditoria {
  id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalles: string;
  ipAddress: string;
  exito: boolean;
}

// ============ DATOS - MÓDULOS DEL SISTEMA ============

const MODULOS_SISTEMA = [
  // Módulos Generales
  'Dashboard Ejecutivo',
  'Gestión de Personas',
  'Roles y Permisos',
  'Auditoría del Sistema',
  'Reportes y Análisis',
  
  // Estructura y Organización
  'Estructura Organizacional',
  
  // Gestión Académica
  'Programas Académicos',
  'Gestión Profesoral',
  'Aspirantes',
  
  // Graduados
  'Verificación de Graduados',
  'Certificados Académicos',
  'Solicitudes de Revisión',
  
  // Comunidad Universitaria
  'Comunidad - Publicaciones',
  'Comunidad - Eventos',
  'Comunidad - Anuncios',
  'Bolsa de Empleo',
  
  // Control Interno de Gestión
  'Control Interno - Plan Anual',
  'Control Interno - Universo Auditorías',
  'Control Interno - Programa Anual',
  'Control Interno - Auditorías',
  'Control Interno - Hallazgos',
  'Control Interno - Planes de Mejoramiento',
  'Control Interno - Seguimiento',
  'Control Interno - Gestión Documental',
  'Control Interno - Expedientes',
  'Control Interno - Configuraciones',
  'Control Interno - Notificaciones',
  'Control Interno - Dashboard Kanban',
  'Control Interno - Trazabilidad',
  'Control Interno - Comunicaciones',
  'Control Interno - Aprobaciones',
  'Control Interno - Historial',
  
  // Control Disciplinario
  'Control Disciplinario - Quejas',
  'Control Disciplinario - Procesos',
  'Control Disciplinario - Investigaciones',
  'Control Disciplinario - Sanciones',
  
  // Gestión Legal
  'Gestión Legal - Juzgamiento',
  'Gestión Legal - Expedientes',
  'Gestión Legal - Sentencias',
  
  // Certificados y Documentos
  'Certificados Laborales',
  'Carpeta Digital'
];

// ============ DATOS - ROLES DEL SISTEMA ============

const ROLES_SISTEMA: Rol[] = [
  // 1. SUPER ADMINISTRADOR
  {
    id: 'rol-super-admin',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total al sistema con todos los permisos administrativos',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 2,
    color: '#DC2626',
    icono: '👑',
    permisos: MODULOS_SISTEMA.map(modulo => ({
      id: `perm-super-${modulo}`,
      modulo,
      acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'],
      descripcion: 'Acceso total al módulo'
    })),
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 2. ADMINISTRADOR OCI (Jefe Control Interno)
  {
    id: 'rol-admin-oci',
    nombre: 'Administrador OCI',
    descripcion: 'Jefe de Oficina de Control Interno - Acceso total a Control Interno de Gestión',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 1,
    color: '#EF4444',
    icono: '🛡️',
    permisos: [
      { id: 'perm-dash', modulo: 'Dashboard Ejecutivo', acciones: ['leer', 'exportar'], descripcion: 'Visualización de métricas' },
      { id: 'perm-rep', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Generación de reportes' },
      
      // Planificación
      { id: 'perm-ci1', modulo: 'Control Interno - Plan Anual', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci2', modulo: 'Control Interno - Universo Auditorías', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci3', modulo: 'Control Interno - Programa Anual', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      
      // Auditorías y Hallazgos
      { id: 'perm-ci4', modulo: 'Control Interno - Auditorías', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci5', modulo: 'Control Interno - Hallazgos', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      
      // Planes de Mejoramiento
      { id: 'perm-ci6', modulo: 'Control Interno - Planes de Mejoramiento', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci7', modulo: 'Control Interno - Seguimiento', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      
      // Gestión Documental y Expedientes
      { id: 'perm-ci8', modulo: 'Control Interno - Gestión Documental', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci9', modulo: 'Control Interno - Expedientes', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      
      // Configuraciones y Administración
      { id: 'perm-ci10', modulo: 'Control Interno - Configuraciones', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci11', modulo: 'Control Interno - Notificaciones', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci12', modulo: 'Control Interno - Dashboard Kanban', acciones: ['leer', 'actualizar', 'exportar'], descripcion: 'Gestión del Kanban' },
      
      // Trazabilidad y Comunicaciones
      { id: 'perm-ci13', modulo: 'Control Interno - Trazabilidad', acciones: ['leer', 'exportar'], descripcion: 'Visualización de trazabilidad' },
      { id: 'perm-ci14', modulo: 'Control Interno - Comunicaciones', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-ci15', modulo: 'Control Interno - Aprobaciones', acciones: ['leer', 'aprobar', 'exportar'], descripcion: 'Aprobación de documentos' },
      { id: 'perm-ci16', modulo: 'Control Interno - Historial', acciones: ['leer', 'exportar'], descripcion: 'Consulta de historial' },
      
      // Gestión de Personas y Roles
      { id: 'perm-usr', modulo: 'Gestión de Personas', acciones: ['leer'], descripcion: 'Solo consulta' },
      { id: 'perm-roles', modulo: 'Roles y Permisos', acciones: ['leer'], descripcion: 'Solo consulta' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 3. AUDITOR
  {
    id: 'rol-auditor',
    nombre: 'Auditor',
    descripcion: 'Gestión de auditorías asignadas, creación de hallazgos e informes',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 8,
    color: '#3B82F6',
    icono: '🔍',
    permisos: [
      { id: 'perm-dash-aud', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Visualización de dashboard' },
      { id: 'perm-plan-aud', modulo: 'Control Interno - Plan Anual', acciones: ['leer', 'exportar'], descripcion: 'Solo visualización' },
      { id: 'perm-univ-aud', modulo: 'Control Interno - Universo Auditorías', acciones: ['leer', 'exportar'], descripcion: 'Solo visualización' },
      { id: 'perm-prog-aud', modulo: 'Control Interno - Programa Anual', acciones: ['leer', 'exportar'], descripcion: 'Solo visualización' },
      { id: 'perm-audit-aud', modulo: 'Control Interno - Auditorías', acciones: ['crear', 'leer', 'actualizar', 'exportar'], descripcion: 'Gestión de auditorías asignadas' },
      { id: 'perm-hall-aud', modulo: 'Control Interno - Hallazgos', acciones: ['crear', 'leer', 'actualizar', 'exportar'], descripcion: 'Gestión de hallazgos' },
      { id: 'perm-planes-aud', modulo: 'Control Interno - Planes de Mejoramiento', acciones: ['leer', 'exportar'], descripcion: 'Solo visualización' },
      { id: 'perm-seg-aud', modulo: 'Control Interno - Seguimiento', acciones: ['leer', 'exportar'], descripcion: 'Solo visualización' },
      { id: 'perm-doc-aud', modulo: 'Control Interno - Gestión Documental', acciones: ['crear', 'leer', 'actualizar', 'exportar'], descripcion: 'Gestión de documentación' },
      { id: 'perm-rep-aud', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Acceso a reportes' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 4. CONSULTA (Control Interno)
  {
    id: 'rol-consulta-ci',
    nombre: 'Consulta (Control Interno)',
    descripcion: 'Visualización de reportes y dashboards de Control Interno, sin capacidad de edición',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 3,
    color: '#10B981',
    icono: '👁️',
    permisos: [
      { id: 'perm-dash-cons', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-plan-cons', modulo: 'Control Interno - Plan Anual', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-univ-cons', modulo: 'Control Interno - Universo Auditorías', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-prog-cons', modulo: 'Control Interno - Programa Anual', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-audit-cons', modulo: 'Control Interno - Auditorías', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-hall-cons', modulo: 'Control Interno - Hallazgos', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-planes-cons', modulo: 'Control Interno - Planes de Mejoramiento', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-seg-cons', modulo: 'Control Interno - Seguimiento', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-doc-cons', modulo: 'Control Interno - Gestión Documental', acciones: ['leer'], descripcion: 'Solo visualización' },
      { id: 'perm-rep-cons', modulo: 'Reportes y Análisis', acciones: ['leer'], descripcion: 'Solo visualización' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 5. ÁREA AUDITADA
  {
    id: 'rol-area-auditada',
    nombre: 'Área Auditada',
    descripcion: 'Acceso solo a planes de mejoramiento propios y carga de evidencias',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 15,
    color: '#F59E0B',
    icono: '📋',
    permisos: [
      { id: 'perm-hall-area', modulo: 'Control Interno - Hallazgos', acciones: ['leer'], descripcion: 'Solo hallazgos de su área' },
      { id: 'perm-planes-area', modulo: 'Control Interno - Planes de Mejoramiento', acciones: ['crear', 'leer', 'actualizar'], descripcion: 'Solo planes de su área' },
      { id: 'perm-seg-area', modulo: 'Control Interno - Seguimiento', acciones: ['leer', 'actualizar'], descripcion: 'Actualización de avances' },
      { id: 'perm-doc-area', modulo: 'Control Interno - Gestión Documental', acciones: ['crear', 'leer', 'actualizar'], descripcion: 'Cargue de evidencias' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 6. ADMINISTRADOR DE PERSONAS
  {
    id: 'rol-admin-personas',
    nombre: 'Administrador de Personas',
    descripcion: 'Gestión completa de usuarios, roles y estructura organizacional',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 2,
    color: '#8B5CF6',
    icono: '👥',
    permisos: [
      { id: 'perm-dash-pers', modulo: 'Dashboard Ejecutivo', acciones: ['leer', 'exportar'], descripcion: 'Métricas de personal' },
      { id: 'perm-pers', modulo: 'Gestión de Personas', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar'], descripcion: 'Gestión completa de usuarios' },
      { id: 'perm-roles-pers', modulo: 'Roles y Permisos', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de roles' },
      { id: 'perm-carpeta', modulo: 'Carpeta Digital', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar'], descripcion: 'Gestión de carpetas digitales' },
      { id: 'perm-estruc', modulo: 'Estructura Organizacional', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar'], descripcion: 'Gestión de estructura' },
      { id: 'perm-cert-lab', modulo: 'Certificados Laborales', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Emisión de certificados' },
      { id: 'perm-audit-pers', modulo: 'Auditoría del Sistema', acciones: ['leer', 'exportar'], descripcion: 'Consulta de auditoría' },
      { id: 'perm-rep-pers', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes de personal' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 7. COORDINADOR ACADÉMICO
  {
    id: 'rol-coord-academico',
    nombre: 'Coordinador Académico',
    descripcion: 'Gestión de programas académicos, profesores y aspirantes',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 5,
    color: '#0EA5E9',
    icono: '📚',
    permisos: [
      { id: 'perm-dash-acad', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Métricas académicas' },
      { id: 'perm-prog-acad', modulo: 'Programas Académicos', acciones: ['crear', 'leer', 'actualizar', 'exportar'], descripcion: 'Gestión de programas' },
      { id: 'perm-prof', modulo: 'Gestión Profesoral', acciones: ['crear', 'leer', 'actualizar', 'exportar'], descripcion: 'Gestión de docentes' },
      { id: 'perm-asp', modulo: 'Aspirantes', acciones: ['leer', 'actualizar', 'exportar'], descripcion: 'Seguimiento de aspirantes' },
      { id: 'perm-pers-acad', modulo: 'Gestión de Personas', acciones: ['leer'], descripcion: 'Consulta de personas' },
      { id: 'perm-rep-acad', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes académicos' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 8. SECRETARÍA ACADÉMICA
  {
    id: 'rol-secretaria',
    nombre: 'Secretaría Académica',
    descripcion: 'Gestión de certificados, verificaciones y documentos académicos',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 4,
    color: '#EC4899',
    icono: '📝',
    permisos: [
      { id: 'perm-grad-ver', modulo: 'Verificación de Graduados', acciones: ['leer', 'actualizar', 'exportar'], descripcion: 'Verificación de graduados' },
      { id: 'perm-cert-acad', modulo: 'Certificados Académicos', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Emisión de certificados' },
      { id: 'perm-sol-rev', modulo: 'Solicitudes de Revisión', acciones: ['leer', 'actualizar', 'exportar'], descripcion: 'Atención de solicitudes' },
      { id: 'perm-carpeta-sec', modulo: 'Carpeta Digital', acciones: ['leer', 'actualizar', 'exportar'], descripcion: 'Consulta de carpetas' },
      { id: 'perm-asp-sec', modulo: 'Aspirantes', acciones: ['leer', 'actualizar'], descripcion: 'Seguimiento de aspirantes' },
      { id: 'perm-rep-sec', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes académicos' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 9. COORDINADOR DE COMUNIDAD
  {
    id: 'rol-coord-comunidad',
    nombre: 'Coordinador de Comunidad',
    descripcion: 'Gestión de publicaciones, eventos, anuncios y bolsa de empleo',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 3,
    color: '#14B8A6',
    icono: '🌐',
    permisos: [
      { id: 'perm-dash-com', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Métricas de comunidad' },
      { id: 'perm-pub', modulo: 'Comunidad - Publicaciones', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión de publicaciones' },
      { id: 'perm-event', modulo: 'Comunidad - Eventos', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión de eventos' },
      { id: 'perm-anunc', modulo: 'Comunidad - Anuncios', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión de anuncios' },
      { id: 'perm-bolsa', modulo: 'Bolsa de Empleo', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión de ofertas' },
      { id: 'perm-rep-com', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes de comunidad' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 10. JEFE DE ADMISIONES
  {
    id: 'rol-jefe-admisiones',
    nombre: 'Jefe de Admisiones',
    descripcion: 'Gestión completa del proceso de admisiones y aspirantes',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 2,
    color: '#F97316',
    icono: '🎓',
    permisos: [
      { id: 'perm-dash-adm', modulo: 'Dashboard Ejecutivo', acciones: ['leer', 'exportar'], descripcion: 'Métricas de admisiones' },
      { id: 'perm-asp-jefe', modulo: 'Aspirantes', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa de aspirantes' },
      { id: 'perm-prog-adm', modulo: 'Programas Académicos', acciones: ['leer'], descripcion: 'Consulta de programas' },
      { id: 'perm-pers-adm', modulo: 'Gestión de Personas', acciones: ['leer'], descripcion: 'Consulta de personas' },
      { id: 'perm-rep-adm', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes de admisiones' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 11. ABOGADO DISCIPLINARIO
  {
    id: 'rol-abogado-disciplinario',
    nombre: 'Abogado Disciplinario',
    descripcion: 'Gestión de procesos disciplinarios e investigaciones',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 3,
    color: '#DC2626',
    icono: '⚖️',
    permisos: [
      { id: 'perm-dash-disc', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Métricas disciplinarias' },
      { id: 'perm-quejas', modulo: 'Control Disciplinario - Quejas', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de quejas' },
      { id: 'perm-proc', modulo: 'Control Disciplinario - Procesos', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de procesos' },
      { id: 'perm-invest', modulo: 'Control Disciplinario - Investigaciones', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de investigaciones' },
      { id: 'perm-sanc', modulo: 'Control Disciplinario - Sanciones', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de sanciones' },
      { id: 'perm-pers-disc', modulo: 'Gestión de Personas', acciones: ['leer'], descripcion: 'Consulta de personas' },
      { id: 'perm-rep-disc', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes disciplinarios' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 12. OPERADOR LEGAL
  {
    id: 'rol-operador-legal',
    nombre: 'Operador Legal',
    descripcion: 'Gestión de juzgamiento, expedientes y sentencias',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 2,
    color: '#7C3AED',
    icono: '📖',
    permisos: [
      { id: 'perm-dash-leg', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Métricas legales' },
      { id: 'perm-juzg', modulo: 'Gestión Legal - Juzgamiento', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de juzgamiento' },
      { id: 'perm-exp', modulo: 'Gestión Legal - Expedientes', acciones: ['crear', 'leer', 'actualizar', 'exportar'], descripcion: 'Gestión de expedientes' },
      { id: 'perm-sent', modulo: 'Gestión Legal - Sentencias', acciones: ['crear', 'leer', 'actualizar', 'aprobar', 'exportar'], descripcion: 'Gestión de sentencias' },
      { id: 'perm-pers-leg', modulo: 'Gestión de Personas', acciones: ['leer'], descripcion: 'Consulta de personas' },
      { id: 'perm-rep-leg', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes legales' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 13. DOCENTE
  {
    id: 'rol-docente',
    nombre: 'Docente',
    descripcion: 'Acceso a gestión profesoral y consulta de información académica',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 152,
    color: '#06B6D4',
    icono: '👨‍🏫',
    permisos: [
      { id: 'perm-dash-doc', modulo: 'Dashboard Ejecutivo', acciones: ['leer'], descripcion: 'Vista limitada' },
      { id: 'perm-prof-doc', modulo: 'Gestión Profesoral', acciones: ['leer', 'actualizar'], descripcion: 'Gestión de su información' },
      { id: 'perm-prog-doc', modulo: 'Programas Académicos', acciones: ['leer'], descripcion: 'Consulta de programas' },
      { id: 'perm-com-doc', modulo: 'Comunidad - Publicaciones', acciones: ['leer'], descripcion: 'Visualización de publicaciones' },
      { id: 'perm-event-doc', modulo: 'Comunidad - Eventos', acciones: ['leer'], descripcion: 'Visualización de eventos' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 14. ARQUITECTO EMPRESARIAL
  {
    id: 'rol-arquitecto-empresarial',
    nombre: 'Arquitecto Empresarial',
    descripcion: 'Gestión de arquitectura empresarial y plataforma tecnológica',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 1,
    color: '#6366F1',
    icono: '🏗️',
    permisos: [
      { id: 'perm-dash-arq', modulo: 'Dashboard Ejecutivo', acciones: ['leer', 'exportar'], descripcion: 'Métricas de arquitectura' },
      { id: 'perm-arq', modulo: 'Arquitectura Empresarial', acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], descripcion: 'Gestión completa' },
      { id: 'perm-estruc-arq', modulo: 'Estructura Organizacional', acciones: ['leer'], descripcion: 'Consulta de estructura' },
      { id: 'perm-audit-arq', modulo: 'Auditoría del Sistema', acciones: ['leer', 'exportar'], descripcion: 'Consulta de auditoría' },
      { id: 'perm-rep-arq', modulo: 'Reportes y Análisis', acciones: ['leer', 'exportar'], descripcion: 'Reportes técnicos' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 15. GRADUADO
  {
    id: 'rol-graduado',
    nombre: 'Graduado',
    descripcion: 'Acceso limitado a servicios para exalumnos',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 4521,
    color: '#84CC16',
    icono: '🎓',
    permisos: [
      { id: 'perm-cert-grad', modulo: 'Certificados Académicos', acciones: ['crear', 'leer'], descripcion: 'Solicitud de certificados propios' },
      { id: 'perm-bolsa-grad', modulo: 'Bolsa de Empleo', acciones: ['leer'], descripcion: 'Consulta de ofertas' },
      { id: 'perm-event-grad', modulo: 'Comunidad - Eventos', acciones: ['leer'], descripcion: 'Visualización de eventos' },
      { id: 'perm-pub-grad', modulo: 'Comunidad - Publicaciones', acciones: ['leer'], descripcion: 'Visualización de publicaciones' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // 16. ASPIRANTE
  {
    id: 'rol-aspirante',
    nombre: 'Aspirante',
    descripcion: 'Acceso muy limitado durante el proceso de admisión',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 892,
    color: '#A855F7',
    icono: '📋',
    permisos: [
      { id: 'perm-prog-asp', modulo: 'Programas Académicos', acciones: ['leer'], descripcion: 'Consulta de programas' },
      { id: 'perm-event-asp', modulo: 'Comunidad - Eventos', acciones: ['leer'], descripcion: 'Visualización de eventos' }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  }
];

// ============ DATOS MOCK - USUARIOS ============

const MOCK_USUARIOS: Usuario[] = [
  {
    id: 'user-001',
    nombreCompleto: 'Mario Osvaldo Bernal Rodríguez',
    email: 'mario.bernal@esap.edu.co',
    documento: '52123456',
    cargo: 'Jefe Oficina de Control Interno',
    area: 'Control Interno',
    roles: ['rol-admin-oci'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-15 08:30',
    autenticacionSSO: true,
    requiere2FA: true
  },
  {
    id: 'user-002',
    nombreCompleto: 'Sandra Montero',
    email: 'sandra.montero@esap.edu.co',
    documento: '63987654',
    cargo: 'Profesional Especializado OCI',
    area: 'Control Interno',
    roles: ['rol-auditor'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-15 07:45',
    autenticacionSSO: true,
    requiere2FA: true
  },
  {
    id: 'user-003',
    nombreCompleto: 'María Pérez González',
    email: 'maria.perez@esap.edu.co',
    documento: '41234567',
    cargo: 'Jefe Oficina Jurídica',
    area: 'Oficina Jurídica',
    roles: ['rol-area-auditada'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-14 16:20',
    autenticacionSSO: true,
    requiere2FA: false
  },
  {
    id: 'user-004',
    nombreCompleto: 'Sandra Patricia Contreras',
    email: 'sandra.contreras@esap.edu.co',
    documento: '39852147',
    cargo: 'Jefe OTIC',
    area: 'Tecnología',
    roles: ['rol-super-admin'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-15 09:15',
    autenticacionSSO: true,
    requiere2FA: true
  }
];

// ============ DATOS MOCK - AUDITORÍA ============

const MOCK_EVENTOS_AUDITORIA: EventoAuditoria[] = [
  {
    id: 'evt-001',
    timestamp: '2025-12-15 08:30:15',
    usuario: 'Mario Osvaldo Bernal Rodríguez',
    accion: 'Inicio de sesión (SSO)',
    modulo: 'Autenticación',
    detalles: 'Autenticación exitosa vía Active Directory',
    ipAddress: '192.168.1.10',
    exito: true
  },
  {
    id: 'evt-002',
    timestamp: '2025-12-15 08:25:42',
    usuario: 'Sandra Montero',
    accion: 'Modificación de permisos',
    modulo: 'Roles y Permisos',
    detalles: 'Agregado permiso "exportar" al rol Auditor',
    ipAddress: '192.168.1.11',
    exito: true
  },
  {
    id: 'evt-003',
    timestamp: '2025-12-14 17:05:30',
    usuario: 'María Pérez González',
    accion: 'Intento de acceso denegado',
    modulo: 'Control Interno - Auditorías',
    detalles: 'Usuario sin permisos suficientes',
    ipAddress: '192.168.1.25',
    exito: false
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function RolesYPermisosActualizado() {
  const [vistaActual, setVistaActual] = useState<'roles' | 'usuarios' | 'auditoria'>('roles');
  const [roles, setRoles] = useState<Rol[]>(ROLES_SISTEMA);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoRol>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoRol>('Todos');
  
  // Modales
  const [modalCrearRol, setModalCrearRol] = useState(false);
  const [modalEditarRol, setModalEditarRol] = useState(false);
  const [modalVerPermisos, setModalVerPermisos] = useState(false);
  const [modalAsignarUsuarios, setModalAsignarUsuarios] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);

  // Filtrar roles
  const rolesFiltrados = roles.filter(rol => {
    const cumpleBusqueda = rol.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          rol.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleTipo = filtroTipo === 'Todos' || rol.tipo === filtroTipo;
    const cumpleEstado = filtroEstado === 'Todos' || rol.estado === filtroEstado;
    return cumpleBusqueda && cumpleTipo && cumpleEstado;
  });

  // Estadísticas
  const stats = {
    totalRoles: roles.length,
    rolesSistema: roles.filter(r => r.tipo === 'Sistema').length,
    rolesPersonalizados: roles.filter(r => r.tipo === 'Personalizado').length,
    rolesActivos: roles.filter(r => r.estado === 'Activo').length,
    totalUsuarios: roles.reduce((sum, r) => sum + r.usuariosAsignados, 0)
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Roles y Permisos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Administra {stats.totalRoles} roles y {stats.totalUsuarios} usuarios con permisos granulares
          </p>
        </div>

        <Button onClick={() => setModalCrearRol(true)} style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Rol
        </Button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setVistaActual('roles')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            vistaActual === 'roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Lista de Roles ({stats.totalRoles})
        </button>
        <button
          onClick={() => setVistaActual('usuarios')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            vistaActual === 'usuarios'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Usuarios Asignados ({stats.totalUsuarios})
        </button>
        <button
          onClick={() => setVistaActual('auditoria')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            vistaActual === 'auditoria'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Auditoría de Accesos
        </button>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">Total Roles</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalRoles}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-xs text-gray-600">Roles Sistema</p>
          <p className="text-2xl font-black text-green-600">{stats.rolesSistema}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <p className="text-xs text-gray-600">Personalizados</p>
          <p className="text-2xl font-black text-purple-600">{stats.rolesPersonalizados}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-xs text-gray-600">Activos</p>
          <p className="text-2xl font-black text-amber-600">{stats.rolesActivos}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#6B7280' }}>
          <p className="text-xs text-gray-600">Total Usuarios</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalUsuarios}</p>
        </Card>
      </div>

      {/* CONTENIDO */}
      <AnimatePresence mode="wait">
        {vistaActual === 'roles' && (
          <VistaListaRoles
            key="roles"
            roles={rolesFiltrados}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            filtroTipo={filtroTipo}
            onFiltroTipoChange={setFiltroTipo}
            filtroEstado={filtroEstado}
            onFiltroEstadoChange={setFiltroEstado}
            onVerPermisos={(rol) => {
              setRolSeleccionado(rol);
              setModalVerPermisos(true);
            }}
            onEditarRol={(rol) => {
              setRolSeleccionado(rol);
              setModalEditarRol(true);
            }}
            onAsignarUsuarios={(rol) => {
              setRolSeleccionado(rol);
              setModalAsignarUsuarios(true);
            }}
          />
        )}

        {vistaActual === 'usuarios' && (
          <VistaUsuariosAsignados
            key="usuarios"
            usuarios={MOCK_USUARIOS}
            roles={roles}
          />
        )}

        {vistaActual === 'auditoria' && (
          <VistaAuditoriaAccesos
            key="auditoria"
            eventos={MOCK_EVENTOS_AUDITORIA}
          />
        )}
      </AnimatePresence>

      {/* MODALES */}
      <AnimatePresence>
        {modalCrearRol && (
          <ModalCrearRol
            onCrear={(nuevoRol) => {
              setRoles([...roles, nuevoRol]);
              setModalCrearRol(false);
              toast.success('Rol creado exitosamente');
            }}
            onCerrar={() => setModalCrearRol(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalVerPermisos && rolSeleccionado && (
          <ModalVerPermisos
            rol={rolSeleccionado}
            onCerrar={() => setModalVerPermisos(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: LISTA DE ROLES ============

function VistaListaRoles({ roles, busqueda, onBusquedaChange, filtroTipo, onFiltroTipoChange, filtroEstado, onFiltroEstadoChange, onVerPermisos, onEditarRol, onAsignarUsuarios }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar por nombre o descripción
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filtrar por tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => onFiltroTipoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Sistema">Sistema</option>
              <option value="Personalizado">Personalizado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Filtrar por estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => onFiltroEstadoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TARJETAS DE ROLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((rol: Rol) => (
          <RolCard
            key={rol.id}
            rol={rol}
            onVerPermisos={onVerPermisos}
            onEditarRol={onEditarRol}
            onAsignarUsuarios={onAsignarUsuarios}
          />
        ))}
      </div>

      {roles.length === 0 && (
        <div className="p-12 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No se encontraron roles</p>
        </div>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE: TARJETA DE ROL ============

function RolCard({ rol, onVerPermisos, onEditarRol, onAsignarUsuarios }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border-2 border-gray-200 p-4 cursor-pointer"
      onClick={() => onVerPermisos(rol)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
          style={{ background: rol.color + '20' }}
        >
          {rol.icono}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{rol.nombre}</h3>
          <p className="text-xs text-gray-600 line-clamp-2">{rol.descripcion}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-900">
            {rol.usuariosAsignados} usuarios
          </span>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {rol.permisos.length} permisos
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onVerPermisos(rol);
          }}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Eye className="w-3 h-3 mr-1" />
          Ver
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onEditarRol(rol);
          }}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Edit className="w-3 h-3 mr-1" />
          Editar
        </Button>
      </div>
    </motion.div>
  );
}

// ============ VISTA: USUARIOS ASIGNADOS ============

function VistaUsuariosAsignados({ usuarios, roles }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden">
        <div className="p-6 border-b" style={{ background: '#F9FAFB' }}>
          <h3 className="text-lg font-black text-gray-900">
            Usuarios con Roles Asignados
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {usuarios.length} usuarios activos en el sistema
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#F3F4F6' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">USUARIO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ROLES</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">SSO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">2FA</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ÚLTIMO ACCESO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((usuario: Usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-gray-900">{usuario.nombreCompleto}</p>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                      <p className="text-sm text-gray-500">{usuario.cargo} - {usuario.area}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {usuario.roles.map(rolId => {
                        const rol = roles.find((r: Rol) => r.id === rolId);
                        return rol ? (
                          <Badge
                            key={rolId}
                            style={{ background: rol.color + '20', color: rol.color }}
                          >
                            {rol.icono} {rol.nombre}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {usuario.autenticacionSSO ? (
                      <Badge style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        <XCircle className="w-3 h-3 mr-1" />
                        No
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {usuario.requiere2FA ? (
                      <Badge style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                        <Shield className="w-3 h-3 mr-1" />
                        Requerido
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        No
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {usuario.ultimoAcceso || 'Nunca'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      style={{
                        background: usuario.estado === 'Activo' ? '#D1FAE5' : '#FEE2E2',
                        color: usuario.estado === 'Activo' ? '#065F46' : '#991B1B'
                      }}
                    >
                      {usuario.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA: AUDITORÍA DE ACCESOS ============

function VistaAuditoriaAccesos({ eventos }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden">
        <div className="p-6 border-b" style={{ background: '#F9FAFB' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Registro de Auditoría de Accesos
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Historial completo de accesos y acciones por usuario
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar Log
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {eventos.map((evento: EventoAuditoria) => (
              <div
                key={evento.id}
                className="p-4 rounded-lg border"
                style={{ background: evento.exito ? '#F0FDF4' : '#FEF2F2' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: evento.exito ? '#10B981' : '#EF4444' }}
                  >
                    {evento.exito ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <XCircle className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{evento.accion}</p>
                        <p className="text-sm text-gray-600">
                          {evento.usuario} • {evento.modulo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{evento.timestamp}</p>
                        <p className="text-xs text-gray-500">{evento.ipAddress}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 italic">
                      {evento.detalles}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ MODALES ============

function ModalCrearRol({ onCrear, onCerrar }: any) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  return (
    <Modal titulo="Crear Nuevo Rol" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Rol</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Auditor Senior"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe las responsabilidades de este rol..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const nuevoRol: Rol = {
                id: `rol-${Date.now()}`,
                nombre,
                descripcion,
                tipo: 'Personalizado',
                estado: 'Activo',
                usuariosAsignados: 0,
                color: '#6B7280',
                icono: '📋',
                permisos: [],
                creadoPor: 'Admin Sistema',
                fechaCreacion: new Date().toISOString().split('T')[0]
              };
              onCrear(nuevoRol);
            }}
            disabled={!nombre || !descripcion}
            className="flex-1"
            style={{ background: '#003DA5' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Crear Rol
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalVerPermisos({ rol, onCerrar }: any) {
  return (
    <Modal titulo={`Permisos del Rol: ${rol.nombre}`} onCerrar={onCerrar} size="large">
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
          <div className="text-3xl">{rol.icono}</div>
          <div>
            <p className="font-bold text-blue-900">{rol.nombre}</p>
            <p className="text-sm text-blue-700">
              {rol.permisos.length} módulos • {rol.usuariosAsignados} usuarios asignados
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {rol.permisos.map((permiso: Permiso) => (
            <div key={permiso.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">{permiso.modulo}</p>
                  <p className="text-sm text-gray-600">{permiso.descripcion}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {permiso.acciones.map(accion => (
                  <Badge
                    key={accion}
                    style={{
                      background: accion === 'eliminar' ? '#FEE2E2' : accion === 'aprobar' ? '#DBEAFE' : '#F0FDF4',
                      color: accion === 'eliminar' ? '#991B1B' : accion === 'aprobar' ? '#1E40AF' : '#065F46'
                    }}
                  >
                    {accion.charAt(0).toUpperCase() + accion.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cerrar
          </Button>
          <Button className="flex-1" style={{ background: '#003DA5' }}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Permisos
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ titulo, children, onCerrar, size = 'default' }: { titulo: string; children: React.ReactNode; onCerrar: () => void; size?: 'default' | 'large' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${
          size === 'large' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}