/**
 * ═════════════════════════════════════════════════════════════════════════
 * DATOS MOCK CENTRALIZADOS - OCI
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ DATOS SIMPLIFICADOS - Mínimo necesario para desarrollo
 * Los datos extensos fueron removidos para reducir el tamaño del proyecto
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

// ═════════════════════════════════════════════════════════════════════════
// AUDITORES
// ═════════════════════════════════════════════════════════════════════════

export const AUDITORES_MOCK = [
  { id: 'aud-1', nombre: 'Fernando Ávila', cargo: 'Auditor Líder', email: 'favila@esap.edu.co' },
  { id: 'aud-2', nombre: 'Martha Rojas', cargo: 'Auditora Senior', email: 'mrojas@esap.edu.co' },
  { id: 'aud-3', nombre: 'Carlos López', cargo: 'Auditor', email: 'clopez@esap.edu.co' }
];

// ═════════════════════════════════════════════════════════════════════════
// PROCESOS
// ═════════════════════════════════════════════════════════════════════════

export const PROCESOS_MOCK = [
  { id: 'proc-1', nombre: 'Gestión Administrativa', codigo: 'GA' },
  { id: 'proc-2', nombre: 'Gestión Financiera', codigo: 'GF' },
  { id: 'proc-3', nombre: 'Gestión de RRHH', codigo: 'RRHH' }
];

// ═════════════════════════════════════════════════════════════════════════
// ÁREAS
// ═════════════════════════════════════════════════════════════════════════

export const AREAS_MOCK = [
  { 
    id: 'a1', 
    nombre: 'Dirección Nacional', 
    responsable: 'Director Nacional',
    email: 'direccion@esap.edu.co',
    codigo: 'DN'
  },
  { 
    id: 'a2', 
    nombre: 'Subdirección Administrativa', 
    responsable: 'Subdirector Administrativo',
    email: 'subadmin@esap.edu.co',
    codigo: 'SA'
  }
];

// ═════════════════════════════════════════════════════════════════════════
// TIPOS DE AUDITORÍA
// ═════════════════════════════════════════════════════════════════════════

export const TIPOS_AUDITORIA = [
  'Auditoría de Gestión',
  'Auditoría Financiera',
  'Auditoría de Cumplimiento',
  'Auditoría de Sistemas',
  'Auditoría Especial'
];

// ═════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═════════════════════════════════════════════════════════════════════════

export function getAuditorById(id: string) {
  return AUDITORES_MOCK.find(a => a.id === id);
}

export function getAuditoresDisponibles() {
  return AUDITORES_MOCK;
}

export function getProcesoById(id: string) {
  return PROCESOS_MOCK.find(p => p.id === id);
}

export function getAreaById(id: string) {
  return AREAS_MOCK.find(a => a.id === id);
}

// ═════════════════════════════════════════════════════════════════════════
// DATOS MÍNIMOS PARA DESARROLLO
// ═════════════════════════════════════════════════════════════════════════

export const AUDITORIAS_MOCK = [];
export const PLANES_MOCK = [];
export const LISTAS_CHEQUEO_MOCK = [];
export const PLANES_ANUALES_MOCK = [];

// ═════════════════════════════════════════════════════════════════════════
// NOTA: Los datos extensos fueron removidos intencionalmente
// En producción, estos datos vienen del backend
// ═════════════════════════════════════════════════════════════════════════
