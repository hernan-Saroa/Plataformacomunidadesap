// Usar localhost para desarrollo local, o nombres de Docker para producción
const USE_LOCALHOST = process.env.NODE_ENV !== 'production';

export const serviceMap = {
  // Auth Service - Puerto 3001
  auth: USE_LOCALHOST ? 'http://localhost:3001' : 'http://auth-service:3001',

  // Academic Registration Service - Puerto 3002
  'registro-academico': USE_LOCALHOST ? 'http://localhost:3002' : 'http://academic-registration-service:3002',

  // Academic Work Plan Service (PTA) - Puerto 3003
  pta: USE_LOCALHOST ? 'http://localhost:3003' : 'http://academic-work-plan-service:3003',

  // Certification Service - Puerto 3004
  certificados: USE_LOCALHOST ? 'http://localhost:3004' : 'http://certification-service:3004',
  certificates: USE_LOCALHOST ? 'http://localhost:3004' : 'http://certification-service:3004', // Alias

  // Internal Disciplinary Control Service - Puerto 3005
  'control-disciplinario': USE_LOCALHOST ? 'http://localhost:3005' : 'http://internal-disciplinary-control-service:3005',

  // Interoperability Service - Puerto 3006
  interoperabilidad: USE_LOCALHOST ? 'http://localhost:3006' : 'http://interoperability-service:3006',

  // Internal Institutional Control Service - Puerto 3007
  'control-institucional': USE_LOCALHOST ? 'http://localhost:3007' : 'http://internal-institutional-control-service:3007',

  // Legal Management Service - Puerto 3008
  legal: USE_LOCALHOST ? 'http://localhost:3008' : 'http://legal-management-service:3008',

  // Notifications Service - Puerto 3009
  notificaciones: USE_LOCALHOST ? 'http://localhost:3009' : 'http://notifications-service:3009',

  // Travel Expenses Service - Puerto 3010
  viaticos: USE_LOCALHOST ? 'http://localhost:3010' : 'http://travel-expenses-service:3010',
};
