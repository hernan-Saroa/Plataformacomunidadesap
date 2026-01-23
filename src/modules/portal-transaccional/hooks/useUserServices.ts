import { useMemo } from 'react';
import { 
  BookOpen, 
  ClipboardCheck, 
  FileSignature, 
  Award, 
  User, 
  CheckCircle, 
  Target,
  Bell,
  Building2,
  UserCircle
} from 'lucide-react';

export interface Servicio {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  ruta: string;
  badge?: number | string;
  modulo: string;
  color?: string;
}

export interface UsuarioPersona {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  documento: string;
  roles: string[];
  permisos: string[];
  sede?: {
    id: string;
    nombre: string;
  };
  territorial?: {
    id: string;
    nombre: string;
  };
  area?: {
    id: string;
    nombre: string;
  };
  rolActivo?: string;
}

/**
 * Hook que determina los servicios disponibles para un usuario
 * según sus roles y permisos.
 * 
 * Este es el CEREBRO del Portal Transaccional Unificado.
 */
export function useUserServices(user: UsuarioPersona | null) {
  const servicios = useMemo(() => {
    if (!user) return [];

    const serviciosDisponibles: Servicio[] = [];

    // ========================================
    // DOCENTE → Mi PTA
    // ========================================
    if (hasRole(user, 'DOCENTE')) {
      serviciosDisponibles.push({
        id: 'mi-pta',
        titulo: 'Mi PTA',
        descripcion: 'Plan de Trabajo Académico',
        icono: <BookOpen className="w-5 h-5" />,
        ruta: '/portal/pta',
        badge: getPTAPendiente(user),
        modulo: 'gestion-profesoral',
        color: '#2962FF'
      });
    }

    // ========================================
    // JEFE DE ÁREA → Auditorías y Planes
    // ========================================
    if (hasRole(user, 'JEFE_AREA')) {
      // Mis Auditorías
      serviciosDisponibles.push({
        id: 'mis-auditorias',
        titulo: 'Mis Auditorías',
        descripcion: 'Auditorías de mi área',
        icono: <ClipboardCheck className="w-5 h-5" />,
        ruta: '/portal/auditorias',
        badge: getAuditoriasPendientes(user),
        modulo: 'control-interno',
        color: '#F57C00'
      });

      // Planes de Mejoramiento
      serviciosDisponibles.push({
        id: 'planes-mejoramiento',
        titulo: 'Planes de Mejoramiento',
        descripcion: 'Seguimiento a planes de mi área',
        icono: <Target className="w-5 h-5" />,
        ruta: '/portal/planes-mejoramiento',
        badge: getPlanesPendientes(user),
        modulo: 'control-interno',
        color: '#F57C00'
      });
    }

    // ========================================
    // FIRMANTE → Documentos para Firmar
    // ========================================
    if (hasRole(user, 'FIRMANTE')) {
      serviciosDisponibles.push({
        id: 'mis-firmas',
        titulo: 'Documentos para Firmar',
        descripcion: 'Pendientes de mi firma',
        icono: <FileSignature className="w-5 h-5" />,
        ruta: '/portal/firmas',
        badge: getFirmasPendientes(user),
        modulo: 'firma-electronica',
        color: '#2962FF'
      });
    }

    // ========================================
    // APROBADOR PTA → PTAs por Aprobar
    // ========================================
    if (hasRole(user, 'APROBADOR_PTA') || hasRole(user, 'COORDINADOR_ACADEMICO')) {
      serviciosDisponibles.push({
        id: 'aprobar-ptas',
        titulo: 'PTAs por Aprobar',
        descripcion: 'Pendientes de aprobación',
        icono: <CheckCircle className="w-5 h-5" />,
        ruta: '/portal/aprobar-ptas',
        badge: getPTAsPorAprobar(user),
        modulo: 'gestion-profesoral',
        color: '#2962FF'
      });
    }

    // ========================================
    // ÁREA AUDITADA → Evidencias
    // ========================================
    if (hasRole(user, 'AREA_AUDITADA')) {
      serviciosDisponibles.push({
        id: 'cargar-evidencias',
        titulo: 'Cargar Evidencias',
        descripcion: 'Auditorías en curso',
        icono: <ClipboardCheck className="w-5 h-5" />,
        ruta: '/portal/evidencias',
        badge: getEvidenciasPendientes(user),
        modulo: 'control-interno',
        color: '#F57C00'
      });
    }

    // ========================================
    // SERVICIOS PARA TODOS LOS USUARIOS
    // ========================================
    
    // Mis Certificados
    serviciosDisponibles.push({
      id: 'mis-certificados',
      titulo: 'Mis Certificados',
      descripcion: 'Solicitar y consultar certificados',
      icono: <Award className="w-5 h-5" />,
      ruta: '/portal/certificados',
      modulo: 'certificados-laborales',
      color: '#003DA5'
    });

    // Notificaciones
    serviciosDisponibles.push({
      id: 'mis-notificaciones',
      titulo: 'Mis Notificaciones',
      descripcion: 'Centro de notificaciones',
      icono: <Bell className="w-5 h-5" />,
      ruta: '/portal/notificaciones',
      badge: getNotificacionesNoLeidas(user),
      modulo: 'core',
      color: '#003DA5'
    });

    // Mi Perfil
    serviciosDisponibles.push({
      id: 'mi-perfil',
      titulo: 'Mi Perfil',
      descripcion: 'Datos personales y configuración',
      icono: <User className="w-5 h-5" />,
      ruta: '/portal/perfil',
      modulo: 'core',
      color: '#003DA5'
    });

    return serviciosDisponibles;
  }, [user]);

  return {
    servicios,
    tieneServicios: servicios.length > 0
  };
}

// ========================================
// HELPERS PRIVADOS
// ========================================

function hasRole(user: UsuarioPersona, role: string): boolean {
  return user.roles?.includes(role) || false;
}

function hasPermission(user: UsuarioPersona, permission: string): boolean {
  return user.permisos?.includes(permission) || false;
}

// ========================================
// FUNCIONES DE BADGES (Mock - Conectar con API real)
// ========================================

function getPTAPendiente(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: No usar localStorage para lógica de negocio
  // TODO: Conectar con API real usando token seguro
  // MOCK temporal (reemplazar con API call)
  
  // Evitar uso de localStorage para datos de negocio
  // ya que puede ser manipulado por el usuario
  
  // En producción, esto debe venir de la API:
  // const { data } = await apiClient.get('/api/pta/pendientes', {
  //   headers: { Authorization: `Bearer ${getSecureToken()}` }
  // });
  
  // Mock temporal - NO USAR EN PRODUCCIÓN
  return 1; // Siempre mostrar badge en desarrollo
}

function getAuditoriasPendientes(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: NO usar Math.random() para datos de negocio
  // TODO: Conectar con API real
  if (user.area) {
    // Mock temporal - reemplazar con API call
    return 2; // Valor fijo para desarrollo
  }
  return undefined;
}

function getPlanesPendientes(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: NO usar Math.random() para datos de negocio
  // TODO: Conectar con API real
  if (user.area) {
    // Mock temporal - reemplazar con API call
    return 1; // Valor fijo para desarrollo
  }
  return undefined;
}

function getFirmasPendientes(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: NO usar Math.random() para datos de negocio
  // TODO: Conectar con API real
  // Mock temporal - reemplazar con API call
  return 3; // Valor fijo para desarrollo
}

function getPTAsPorAprobar(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: NO usar Math.random() para datos de negocio
  // TODO: Conectar con API real
  // Mock temporal - reemplazar con API call
  return 5; // Valor fijo para desarrollo
}

function getEvidenciasPendientes(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: NO usar Math.random() para datos de negocio
  // TODO: Conectar con API real
  // Mock temporal - reemplazar con API call
  return 2; // Valor fijo para desarrollo
}

function getNotificacionesNoLeidas(user: UsuarioPersona): number | undefined {
  // 🔒 SEGURIDAD: NO usar Math.random() para datos de negocio
  // TODO: Conectar con API real
  // Mock temporal - reemplazar con API call
  return 7; // Valor fijo para desarrollo
}
