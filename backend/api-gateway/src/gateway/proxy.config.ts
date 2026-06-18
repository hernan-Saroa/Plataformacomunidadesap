// Usar localhost para desarrollo local, nombres de Docker para producción,
// y permitir overrides por ambiente desde docker-compose/.env.
const USE_LOCALHOST = process.env.NODE_ENV !== 'production';

const serviceUrl = (
  envName: string,
  localUrl: string,
  dockerUrl: string,
): string => process.env[envName] || (USE_LOCALHOST ? localUrl : dockerUrl);

export const serviceMap = {
  // Auth Service - Puerto 3001
  auth: serviceUrl(
    'AUTH_SERVICE_URL',
    'http://localhost:3001',
    'http://auth-service:3001',
  ),

  // Academic Registration Service - Puerto 3002
  'registro-academico': serviceUrl(
    'ACADEMIC_REGISTRATION_SERVICE_URL',
    'http://localhost:3002',
    'http://academic-registration-service:3002',
  ),

  // Academic Work Plan Service (PTA) - Puerto 3003
  pta: serviceUrl(
    'ACADEMIC_WORK_PLAN_SERVICE_URL',
    'http://localhost:3003',
    'http://academic-work-plan-service:3003',
  ),

  // Certification Service - Puerto 3004
  certificados: serviceUrl(
    'CERTIFICATION_SERVICE_URL',
    'http://localhost:3004',
    'http://certification-service:3004',
  ),
  certificates: serviceUrl(
    'CERTIFICATION_SERVICE_URL',
    'http://localhost:3004',
    'http://certification-service:3004',
  ), // Alias

  // Internal Disciplinary Control Service - Puerto 3005
  'control-disciplinario': serviceUrl(
    'INTERNAL_DISCIPLINARY_CONTROL_SERVICE_URL',
    'http://localhost:3005',
    'http://internal-disciplinary-control-service:3005',
  ),

  // Interoperability Service - Puerto 3006
  interoperabilidad: serviceUrl(
    'INTEROPERABILITY_SERVICE_URL',
    'http://localhost:3006',
    'http://interoperability-service:3006',
  ),

  // Internal Institutional Control Service - Puerto 3007
  'control-institucional': serviceUrl(
    'INTERNAL_INSTITUTIONAL_CONTROL_SERVICE_URL',
    'http://localhost:3007',
    'http://internal-institutional-control-service:3007',
  ),

  // Legal Management Service - Puerto 3008
  legal: serviceUrl(
    'LEGAL_MANAGEMENT_SERVICE_URL',
    'http://localhost:3008',
    'http://legal-management-service:3008',
  ),
  'legal-management': serviceUrl(
    'LEGAL_MANAGEMENT_SERVICE_URL',
    'http://localhost:3008',
    'http://legal-management-service:3008',
  ),
  'legal-management-service': serviceUrl(
    'LEGAL_MANAGEMENT_SERVICE_URL',
    'http://localhost:3008',
    'http://legal-management-service:3008',
  ),

  // Notifications Service - Puerto 3009
  notificaciones: serviceUrl(
    'NOTIFICATIONS_SERVICE_URL',
    'http://localhost:3009',
    'http://notifications-service:3009',
  ),

  // Travel Expenses Service - Puerto 3010
  viaticos: serviceUrl(
    'TRAVEL_EXPENSES_SERVICE_URL',
    'http://localhost:3010',
    'http://travel-expenses-service:3010',
  ),

  // Audit Service - Puerto 3011
  audit: serviceUrl(
    'AUDIT_SERVICE_URL',
    'http://localhost:3011',
    'http://audit-service:3011',
  ),
};
