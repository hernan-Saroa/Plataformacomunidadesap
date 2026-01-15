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
  [Microservice.AUTH]: 'Gestión de Personas',
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

export function getModuleFromService(serviceName: string | null): string {
  if (!serviceName) return 'unknown';
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

