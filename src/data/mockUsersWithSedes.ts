/**
 * MOCK DATA: USUARIOS CON SEDES
 * Datos de ejemplo para demostración
 */

export interface UserWithSedes {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'blocked' | 'pending';
  roles: Array<{
    id: string;
    name: string;
    code: string;
    alcance?: 'nacional' | 'territorial' | 'cetap';
    unidadOrganizacionalId?: string;
  }>;
  location: string;
  sedes: Array<{
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'sede-central' | 'territorial' | 'cetap';
    esPrincipal: boolean;
  }>;
  enrollmentMethod: 'qr' | 'manual' | 'massive';
  enrollmentDate: string;
  lastLogin?: string;
  avatar?: string;
  documentType: string;
  documentNumber: string;
  documentIssueDate?: string;
  birthDate?: string;
  address?: string;
  program?: string;
}

// Datos de ejemplo para demostración
export const MOCK_USERS_WITH_SEDES: UserWithSedes[] = [
  {
    id: 'USR-001',
    personId: 'PER-001',
    firstName: 'María Claudia',
    lastName: 'Rodríguez Martínez',
    email: 'maria.rodriguez@esap.edu.co',
    phone: '+57 310 5551234',
    documentType: 'CC',
    documentNumber: '52345678',
    birthDate: '1985-03-15',
    address: 'Calle 44 # 53-37, Bogotá D.C.',
    status: 'active',
    location: 'Bogotá D.C.',
    program: 'Especialización en Gestión Pública',
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-01-15T10:30:00Z',
    lastLogin: '2025-01-23T08:45:00Z',
    roles: [
      {
        id: 'ROL-ADM-001',
        name: 'Administrador Nacional',
        code: 'ADMIN_NACIONAL',
        alcance: 'nacional'
      }
    ],
    sedes: [
      {
        id: 'SEDE-001',
        codigo: 'SC-BOG',
        nombre: 'Sede Central Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ]
  },
  {
    id: 'USR-002',
    personId: 'PER-002',
    firstName: 'Carlos Alberto',
    lastName: 'Gómez Silva',
    email: 'carlos.gomez@esap.edu.co',
    phone: '+57 315 5559876',
    documentType: 'CC',
    documentNumber: '79456123',
    birthDate: '1978-08-22',
    status: 'active',
    location: 'Antioquia',
    program: 'Maestría en Administración Pública',
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-02-10T14:20:00Z',
    lastLogin: '2025-01-22T16:30:00Z',
    roles: [
      {
        id: 'ROL-TER-001',
        name: 'Coordinador Territorial',
        code: 'COORD_TERRITORIAL',
        alcance: 'territorial',
        unidadOrganizacionalId: 'TERR-ANT'
      }
    ],
    sedes: [
      {
        id: 'TERR-ANT',
        codigo: 'T-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ]
  },
  {
    id: 'USR-003',
    personId: 'PER-003',
    firstName: 'Ana Patricia',
    lastName: 'Ramírez Vargas',
    email: 'ana.ramirez@esap.edu.co',
    phone: '+57 320 5554567',
    documentType: 'CC',
    documentNumber: '1015789654',
    birthDate: '1992-11-30',
    status: 'active',
    location: 'Valle del Cauca',
    program: 'Administración Pública Territorial',
    enrollmentMethod: 'massive',
    enrollmentDate: '2024-03-05T09:15:00Z',
    lastLogin: '2025-01-23T07:20:00Z',
    roles: [
      {
        id: 'ROL-DOC-001',
        name: 'Docente',
        code: 'DOCENTE',
        alcance: 'territorial',
        unidadOrganizacionalId: 'TERR-VAL'
      }
    ],
    sedes: [
      {
        id: 'TERR-VAL',
        codigo: 'T-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ]
  },
  {
    id: 'USR-004',
    personId: 'PER-004',
    firstName: 'Jorge Enrique',
    lastName: 'Pérez Gutiérrez',
    email: 'jorge.perez@esap.edu.co',
    phone: '+57 318 5552345',
    documentType: 'CC',
    documentNumber: '8234567',
    birthDate: '1980-05-18',
    status: 'active',
    location: 'Santander',
    program: 'Especialización en Alta Gerencia',
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-01-22T11:45:00Z',
    lastLogin: '2025-01-21T14:10:00Z',
    roles: [
      {
        id: 'ROL-AUD-001',
        name: 'Auditor Interno',
        code: 'AUDITOR_INTERNO',
        alcance: 'nacional'
      }
    ],
    sedes: [
      {
        id: 'SEDE-001',
        codigo: 'SC-BOG',
        nombre: 'Sede Central Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      },
      {
        id: 'TERR-SAN',
        codigo: 'T-SAN',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: false
      }
    ]
  },
  {
    id: 'USR-005',
    personId: 'PER-005',
    firstName: 'Laura Fernanda',
    lastName: 'Hernández López',
    email: 'laura.hernandez@esap.edu.co',
    phone: '+57 312 5558901',
    documentType: 'CC',
    documentNumber: '1045123789',
    birthDate: '1995-02-14',
    status: 'active',
    location: 'Cundinamarca',
    program: 'Tecnología en Gestión Pública',
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-02-28T13:00:00Z',
    lastLogin: '2025-01-23T09:00:00Z',
    roles: [
      {
        id: 'ROL-EST-001',
        name: 'Estudiante',
        code: 'ESTUDIANTE',
        alcance: 'cetap',
        unidadOrganizacionalId: 'CETAP-FUN'
      }
    ],
    sedes: [
      {
        id: 'CETAP-FUN',
        codigo: 'C-FUN',
        nombre: 'CETAP Funza',
        nivel: 'cetap',
        esPrincipal: true
      }
    ]
  }
];
