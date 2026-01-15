export enum Microservice {
  AUTH = 'auth',
  REGISTRO_ACADEMICO = 'registro-academico',
  PTA = 'pta',
  CERTIFICADOS = 'certificados',
  CERTIFICATES = 'certificates',
  CONTROL_DISCIPLINARIO = 'control-disciplinario',
  INTEROPERABILIDAD = 'interoperabilidad',
  CONTROL_INSTITUCIONAL = 'control-institucional',
  LEGAL = 'legal',
  LEGAL_MANAGEMENT = 'legal-management',
  LEGAL_MANAGEMENT_SERVICE = 'legal-management-service',
  NOTIFICACIONES = 'notificaciones',
  VIATICOS = 'viaticos',
}

export const SERVICE_MODULE_MAP: Record<Microservice | string, string> = {
  [Microservice.AUTH]: 'Gestión de Personas', // Default para auth
  [Microservice.REGISTRO_ACADEMICO]: 'Verificación de Graduados',
  [Microservice.PTA]: 'Programas Académicos',
  [Microservice.CERTIFICADOS]: 'Certificados Académicos',
  [Microservice.CERTIFICATES]: 'Certificados Académicos',
  [Microservice.CONTROL_DISCIPLINARIO]: 'Control Disciplinario - Procesos',
  [Microservice.CONTROL_INSTITUCIONAL]: 'Control Interno - Auditorías',
  [Microservice.LEGAL]: 'Gestión Legal - Expedientes',
  [Microservice.LEGAL_MANAGEMENT]: 'Gestión Legal - Expedientes',
  [Microservice.LEGAL_MANAGEMENT_SERVICE]: 'Gestión Legal - Expedientes',
  [Microservice.INTEROPERABILIDAD]: 'Interoperabilidad',
  [Microservice.NOTIFICACIONES]: 'Notificaciones',
  [Microservice.VIATICOS]: 'Viáticos',
};

// Mapeo de rutas específicas a módulos
const ROUTE_MODULE_MAP: Array<{ pattern: RegExp; module: string }> = [
  // Autenticación
  { pattern: /\/auth\/api\/v\d+\/(login|logout|refresh|register|forgot-password|reset-password)/i, module: 'Autenticación' },
  // Roles y permisos
  { pattern: /\/auth\/api\/v\d+\/(roles|permissions|role|permission)/i, module: 'Roles y Permisos' },
  // Gestión de usuarios
  { pattern: /\/auth\/api\/v\d+\/(users|user)/i, module: 'Gestión de Usuarios' },
  // Gestión de personas
  { pattern: /\/auth\/api\/v\d+\/(persons|person|people)/i, module: 'Gestión de Personas' },
];

/**
 * Obtiene el módulo basándose en el servicio y la URL completa
 */
export function getModuleFromService(serviceName: string | null, url?: string): string {
  if (!serviceName) return 'unknown';
  
  // Si se proporciona la URL, verificar rutas específicas primero
  if (url) {
    const urlWithoutQuery = url.split('?')[0];
    for (const { pattern, module } of ROUTE_MODULE_MAP) {
      if (pattern.test(urlWithoutQuery)) {
        return module;
      }
    }
  }
  
  // Si no hay coincidencia específica, usar el mapeo por servicio
  return SERVICE_MODULE_MAP[serviceName] || serviceName;
}

export function getServiceFromUrl(url: string): string | null {
  const urlMatch = url.match(/^\/([^\/]+)\/api\/v\d+/);
  return urlMatch?.[1] || null;
}

export function getSubmoduleFromUrl(url: string): string | null {
  const urlWithoutQuery = url.split('?')[0];
  const urlMatch = urlWithoutQuery.match(/^\/[^\/]+\/api\/v\d+\/([^\/]+)/);
  return urlMatch?.[1] || null;
}

