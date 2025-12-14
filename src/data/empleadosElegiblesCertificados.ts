/**
 * DATOS COMPARTIDOS - EMPLEADOS ELEGIBLES PARA CERTIFICADOS LABORALES
 * 
 * Esta lista contiene TODOS los usuarios EXCEPTO:
 * - Estudiantes
 * - Graduados
 * 
 * INCLUYE todos los demás roles:
 * - Docentes
 * - Administrativos
 * - Directivos
 * - Coordinadores
 * - Investigadores
 * - etc.
 * 
 * IMPORTANTE: Esta es la fuente de verdad única para ambos módulos:
 * - Módulo de Usuarios (lista completa)
 * - Módulo de Certificados Laborales (solo elegibles)
 */

import { MOCK_USERS_WITH_SEDES } from './mockUsersWithSedes';

// Roles que NO son elegibles para certificados laborales
const ROLES_EXCLUIDOS = ['estudiante', 'graduado'];

// Filtramos TODOS los usuarios EXCEPTO estudiantes y graduados
export const EMPLEADOS_ELEGIBLES = MOCK_USERS_WITH_SEDES.filter(user => 
  // Usuario debe estar activo
  user.status === 'active' &&
  // NO debe tener rol de Estudiante ni Graduado
  !user.roles?.some(role => 
    ROLES_EXCLUIDOS.includes(role.name.toLowerCase()) || 
    ROLES_EXCLUIDOS.includes(role.code.toLowerCase())
  )
).map(user => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  document: user.documentNumber,
  documentType: user.documentType,
  status: user.status,
  roles: user.roles,
  location: user.location,
  sedes: user.sedes
}));

// Función para verificar si un usuario es elegible
export function esEmpleadoElegible(userId: string): boolean {
  return EMPLEADOS_ELEGIBLES.some(emp => emp.id === userId);
}

// Función para obtener datos de empleado por ID
export function getEmpleadoById(userId: string) {
  return EMPLEADOS_ELEGIBLES.find(emp => emp.id === userId);
}

// Datos adicionales de empleado para certificados laborales
export interface DatosLaboralesEmpleado {
  userId: string;
  cargo: string;
  tipoVinculacion: 'Planta' | 'Tiempo Completo' | 'Hora Cátedra' | 'Prestación de Servicios' | 'Contrato';
  fechaVinculacion: string;
  grado: string;
  dependencia: string;
  salario: number;
}

// Datos laborales complementarios (esto iría en una base de datos real)
export const DATOS_LABORALES: Record<string, DatosLaboralesEmpleado> = {
  // ============================================================================
  // DOCENTES (usuarios con rol DOCENTE)
  // ============================================================================
  'user-001': {
    userId: 'user-001',
    cargo: 'Docente Tiempo Completo - Coordinador Académico',
    tipoVinculacion: 'Tiempo Completo',
    fechaVinculacion: '2019-03-15',
    grado: 'Maestría en Administración Pública',
    dependencia: 'Sede Nacional - Bogotá D.C.',
    salario: 4800000
  },
  'user-005': {
    userId: 'user-005',
    cargo: 'Docente de Planta',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2020-05-10',
    grado: 'Especialización en Gestión Pública',
    dependencia: 'Territorial Santander - Bucaramanga',
    salario: 4200000
  },
  'user-009': {
    userId: 'user-009',
    cargo: 'Docente Investigador',
    tipoVinculacion: 'Tiempo Completo',
    fechaVinculacion: '2018-11-08',
    grado: 'Doctorado en Ciencias Políticas',
    dependencia: 'Territorial Nariño - Pasto',
    salario: 5200000
  },
  
  // ============================================================================
  // DIRECTIVOS (usuarios con rol DIRECTIVO / DIRECTOR TERRITORIAL)
  // ============================================================================
  'user-003': {
    userId: 'user-003',
    cargo: 'Director Territorial Valle del Cauca',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2017-08-20',
    grado: 'Maestría en Alta Gerencia',
    dependencia: 'Territorial Valle del Cauca - Cali',
    salario: 6500000
  },
  'user-011': {
    userId: 'user-011',
    cargo: 'Directivo Regional',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2019-04-12',
    grado: 'Especialización en Administración Pública',
    dependencia: 'Territorial Huila - Neiva',
    salario: 5800000
  },
  
  // ============================================================================
  // ADMINISTRATIVOS (usuarios con rol ADMINISTRATIVO)
  // ============================================================================
  'user-007': {
    userId: 'user-007',
    cargo: 'Secretario Académico',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2018-10-05',
    grado: 'Maestría en Gestión de Recursos Humanos',
    dependencia: 'Territorial Caldas - Manizales',
    salario: 4500000
  },
  'user-015': {
    userId: 'user-015',
    cargo: 'Coordinador Administrativo',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2020-07-22',
    grado: 'Especialización en Gestión Pública',
    dependencia: 'Territorial Chocó - Quibdó',
    salario: 4000000
  }
};

// Función para obtener datos laborales completos de un empleado
export function getDatosLaboralesCompletos(userId: string) {
  const empleado = getEmpleadoById(userId);
  const datosLaborales = DATOS_LABORALES[userId];
  
  if (!empleado || !datosLaborales) {
    return null;
  }
  
  return {
    ...empleado,
    ...datosLaborales
  };
}