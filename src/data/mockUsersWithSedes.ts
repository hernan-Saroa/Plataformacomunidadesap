/**
 * ============================================
 * MOCK DATA - USUARIOS CON SEDES
 * ============================================
 * 
 * Datos de prueba para usuarios de la plataforma
 * incluyendo asignación a sedes territoriales
 * 
 * ESTRUCTURA:
 * - Usuarios persona (funcionarios, docentes, estudiantes)
 * - Asignación a sedes territoriales
 * - Roles y permisos
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

export interface MockUserRole {
  id: string;
  name: string;
  code?: string; // Código del rol (ej: 'DOCENTE', 'ESTUDIANTE')
  permissions: string[];
}

export interface MockUserSede {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'Nacional' | 'Territorial' | 'CETAP';
  nivel?: 'nacional' | 'territorial' | 'cetap';
  ciudad?: string;
  departamento?: string;
}

export interface MockUserWithSedes {
  id: string;
  personId: string; // ID de la persona en el módulo de Personas
  documentNumber: string;
  documentType: 'CC' | 'CE' | 'TI' | 'PEP';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'inactive' | 'blocked';
  roles: MockUserRole[];
  sedes: MockUserSede[];
  createdAt: string;
  avatar?: string;
}

/**
 * ============================================
 * MOCK DATA - USUARIOS CON SEDES
 * ============================================
 */
export const MOCK_USERS_WITH_SEDES: MockUserWithSedes[] = [
  {
    id: 'user-001',
    personId: 'person-001',
    documentNumber: '1234567890',
    documentType: 'CC',
    firstName: 'Mario Oswaldo',
    lastName: 'Bernal Gutiérrez',
    email: 'mario.bernal@esap.edu.co',
    phone: '+57 310 123 4567',
    location: 'Bogotá',
    status: 'active',
    roles: [
      {
        id: 'rol-jefe-oci',
        name: 'Jefe OCI',
        permissions: ['control-interno', 'auditoria', 'gestion-riesgos']
      }
    ],
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'NACIONAL',
        nombre: 'Sede Nacional',
        tipo: 'Nacional',
        nivel: 'nacional',
        ciudad: 'Bogotá',
        departamento: 'Cundinamarca'
      }
    ],
    createdAt: '2024-01-15'
  },
  {
    id: 'user-002',
    personId: 'person-002',
    documentNumber: '9876543210',
    documentType: 'CC',
    firstName: 'María Fernanda',
    lastName: 'López Rodríguez',
    email: 'maria.lopez@esap.edu.co',
    phone: '+57 320 234 5678',
    location: 'Medellín',
    status: 'active',
    roles: [
      {
        id: 'rol-docente',
        name: 'Docente',
        code: 'DOCENTE',
        permissions: ['gestion-academica', 'calificaciones']
      }
    ],
    sedes: [
      {
        id: 'sede-antioquia',
        codigo: 'ANTIOQUIA',
        nombre: 'Territorial Antioquia',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Medellín',
        departamento: 'Antioquia'
      }
    ],
    createdAt: '2024-02-20'
  },
  {
    id: 'user-003',
    personId: 'person-003',
    documentNumber: '5555555555',
    documentType: 'CC',
    firstName: 'Carlos Alberto',
    lastName: 'Gómez Pérez',
    email: 'carlos.gomez@esap.edu.co',
    phone: '+57 315 345 6789',
    location: 'Cali',
    status: 'active',
    roles: [
      {
        id: 'rol-estudiante',
        name: 'Estudiante',
        code: 'ESTUDIANTE',
        permissions: ['ver-contenidos', 'subir-tareas']
      }
    ],
    sedes: [
      {
        id: 'sede-valle',
        codigo: 'VALLE',
        nombre: 'Territorial Valle del Cauca',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Cali',
        departamento: 'Valle del Cauca'
      }
    ],
    createdAt: '2024-03-10'
  },
  {
    id: 'user-004',
    personId: 'person-004',
    documentNumber: '7777777777',
    documentType: 'CC',
    firstName: 'Ana Patricia',
    lastName: 'Martínez Silva',
    email: 'ana.martinez@esap.edu.co',
    phone: '+57 318 456 7890',
    location: 'Cartagena',
    status: 'active',
    roles: [
      {
        id: 'rol-coordinador',
        name: 'Coordinador Académico',
        permissions: ['gestion-academica', 'gestion-usuarios', 'reportes']
      }
    ],
    sedes: [
      {
        id: 'sede-bolivar',
        codigo: 'BOLIVAR',
        nombre: 'Territorial Bolívar',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Cartagena',
        departamento: 'Bolívar'
      }
    ],
    createdAt: '2024-01-25'
  },
  {
    id: 'user-005',
    personId: 'person-005',
    documentNumber: '3333333333',
    documentType: 'CC',
    firstName: 'Diego Alejandro',
    lastName: 'Ramírez Torres',
    email: 'diego.ramirez@esap.edu.co',
    phone: '+57 311 567 8901',
    location: 'Barranquilla',
    status: 'active',
    roles: [
      {
        id: 'rol-director-territorial',
        name: 'Director Territorial',
        permissions: ['gestion-sede', 'gestion-usuarios', 'reportes', 'presupuesto']
      }
    ],
    sedes: [
      {
        id: 'sede-atlantico',
        codigo: 'ATLANTICO',
        nombre: 'Territorial Atlántico',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Barranquilla',
        departamento: 'Atlántico'
      }
    ],
    createdAt: '2023-11-05'
  },
  {
    id: 'user-006',
    personId: 'person-006',
    documentNumber: '4444444444',
    documentType: 'CC',
    firstName: 'Laura Cristina',
    lastName: 'Hernández Vargas',
    email: 'laura.hernandez@esap.edu.co',
    phone: '+57 312 678 9012',
    location: 'Bucaramanga',
    status: 'active',
    roles: [
      {
        id: 'rol-docente',
        name: 'Docente',
        code: 'DOCENTE',
        permissions: ['gestion-academica', 'calificaciones']
      }
    ],
    sedes: [
      {
        id: 'sede-santander',
        codigo: 'SANTANDER',
        nombre: 'Territorial Santander',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Bucaramanga',
        departamento: 'Santander'
      }
    ],
    createdAt: '2024-02-14'
  },
  {
    id: 'user-007',
    personId: 'person-007',
    documentNumber: '6666666666',
    documentType: 'CC',
    firstName: 'Andrés Felipe',
    lastName: 'Castro Mendoza',
    email: 'andres.castro@esap.edu.co',
    phone: '+57 313 789 0123',
    location: 'Pereira',
    status: 'inactive',
    roles: [
      {
        id: 'rol-estudiante',
        name: 'Estudiante',
        code: 'ESTUDIANTE',
        permissions: ['ver-contenidos', 'subir-tareas']
      }
    ],
    sedes: [
      {
        id: 'sede-risaralda',
        codigo: 'RISARALDA',
        nombre: 'Territorial Risaralda',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Pereira',
        departamento: 'Risaralda'
      }
    ],
    createdAt: '2024-04-01'
  },
  {
    id: 'user-008',
    personId: 'person-008',
    documentNumber: '8888888888',
    documentType: 'CC',
    firstName: 'Sandra Milena',
    lastName: 'Rojas Delgado',
    email: 'sandra.rojas@esap.edu.co',
    phone: '+57 314 890 1234',
    location: 'Manizales',
    status: 'active',
    roles: [
      {
        id: 'rol-funcionario',
        name: 'Funcionario Administrativo',
        permissions: ['gestion-administrativa', 'documentos']
      }
    ],
    sedes: [
      {
        id: 'sede-caldas',
        codigo: 'CALDAS',
        nombre: 'Territorial Caldas',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Manizales',
        departamento: 'Caldas'
      }
    ],
    createdAt: '2023-12-20'
  },
  {
    id: 'user-009',
    personId: 'person-009',
    documentNumber: '2222222222',
    documentType: 'CC',
    firstName: 'Jorge Luis',
    lastName: 'Quintero Sánchez',
    email: 'jorge.quintero@esap.edu.co',
    phone: '+57 316 901 2345',
    location: 'Pasto',
    status: 'active',
    roles: [
      {
        id: 'rol-docente',
        name: 'Docente',
        code: 'DOCENTE',
        permissions: ['gestion-academica', 'calificaciones']
      }
    ],
    sedes: [
      {
        id: 'sede-narino',
        codigo: 'NARINO',
        nombre: 'Territorial Nariño',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Pasto',
        departamento: 'Nariño'
      }
    ],
    createdAt: '2024-01-30'
  },
  {
    id: 'user-010',
    personId: 'person-010',
    documentNumber: '1111111111',
    documentType: 'CC',
    firstName: 'Patricia Elena',
    lastName: 'Morales Ríos',
    email: 'patricia.morales@esap.edu.co',
    phone: '+57 317 012 3456',
    location: 'Neiva',
    status: 'blocked',
    roles: [
      {
        id: 'rol-estudiante',
        name: 'Estudiante',
        code: 'ESTUDIANTE',
        permissions: ['ver-contenidos', 'subir-tareas']
      }
    ],
    sedes: [
      {
        id: 'sede-huila',
        codigo: 'HUILA',
        nombre: 'Territorial Huila',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Neiva',
        departamento: 'Huila'
      }
    ],
    createdAt: '2024-03-15'
  },
  {
    id: 'user-011',
    personId: 'person-011',
    documentNumber: '9999999999',
    documentType: 'CC',
    firstName: 'Roberto Carlos',
    lastName: 'Valencia Ortiz',
    email: 'roberto.valencia@esap.edu.co',
    phone: '+57 319 123 4567',
    location: 'Ibagué',
    status: 'active',
    roles: [
      {
        id: 'rol-coordinador',
        name: 'Coordinador Académico',
        permissions: ['gestion-academica', 'gestion-usuarios', 'reportes']
      }
    ],
    sedes: [
      {
        id: 'sede-tolima',
        codigo: 'TOLIMA',
        nombre: 'Territorial Tolima',
        tipo: 'Territorial',
        nivel: 'territorial',
        ciudad: 'Ibagué',
        departamento: 'Tolima'
      }
    ],
    createdAt: '2023-10-10'
  },
  {
    id: 'user-012',
    personId: 'person-012',
    documentNumber: '1010101010',
    documentType: 'CC',
    firstName: 'Liliana Andrea',
    lastName: 'Suárez Campos',
    email: 'liliana.suarez@esap.edu.co',
    phone: '+57 321 234 5678',
    location: 'Bogotá',
    status: 'active',
    roles: [
      {
        id: 'rol-docente',
        name: 'Docente',
        code: 'DOCENTE',
        permissions: ['gestion-academica', 'calificaciones']
      },
      {
        id: 'rol-investigador',
        name: 'Investigador',
        permissions: ['gestion-investigacion', 'publicaciones']
      }
    ],
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'NACIONAL',
        nombre: 'Sede Nacional',
        tipo: 'Nacional',
        nivel: 'nacional',
        ciudad: 'Bogotá',
        departamento: 'Cundinamarca'
      }
    ],
    createdAt: '2024-01-05'
  }
];

/**
 * ============================================
 * HELPERS
 * ============================================
 */

/**
 * Obtener usuario por ID
 */
export const getUserById = (id: string): MockUserWithSedes | undefined => {
  return MOCK_USERS_WITH_SEDES.find(user => user.id === id);
};

/**
 * Obtener usuarios por sede
 */
export const getUsersBySede = (sedeId: string): MockUserWithSedes[] => {
  return MOCK_USERS_WITH_SEDES.filter(user => 
    user.sedes.some(sede => sede.id === sedeId)
  );
};

/**
 * Obtener usuarios por rol
 */
export const getUsersByRole = (roleName: string): MockUserWithSedes[] => {
  return MOCK_USERS_WITH_SEDES.filter(user => 
    user.roles.some(role => role.name === roleName)
  );
};

/**
 * Obtener usuarios activos
 */
export const getActiveUsers = (): MockUserWithSedes[] => {
  return MOCK_USERS_WITH_SEDES.filter(user => user.status === 'active');
};

/**
 * Obtener estadísticas de usuarios
 */
export const getUserStats = () => {
  return {
    total: MOCK_USERS_WITH_SEDES.length,
    active: MOCK_USERS_WITH_SEDES.filter(u => u.status === 'active').length,
    inactive: MOCK_USERS_WITH_SEDES.filter(u => u.status === 'inactive').length,
    blocked: MOCK_USERS_WITH_SEDES.filter(u => u.status === 'blocked').length,
  };
};