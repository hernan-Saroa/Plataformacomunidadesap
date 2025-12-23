/**
 * DOCENTES - GESTIÓN PROFESORAL
 * 
 * Datos de docentes de planta y hora cátedra que se integran con el sistema de Usuarios-Personas
 * Incluye docentes reales del módulo de Gestión Profesoral
 */

import { UserWithSedes } from './mockUsersWithSedes';
import { TERRITORIALES_ESAP } from './territoriales-cetap-completo';

// ============================================
// DOCENTES DE PLANTA (45 docentes)
// ============================================
export const DOCENTES_PLANTA: UserWithSedes[] = [
  // BOGOTÁ - SEDE CENTRAL (15 docentes)
  {
    id: 'docente-planta-001',
    personId: 'person-doc-planta-001',
    firstName: 'Pedro Antonio',
    lastName: 'Gómez Rivera',
    email: 'pedro.gomez@esap.edu.co',
    phone: '+57 301 234 5678',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2020-01-15',
    lastLogin: '2024-12-22T09:30:00',
    documentType: 'CC',
    documentNumber: '79123456',
    birthDate: '1975-05-15',
    address: 'Cra 11 # 45-67, Bogotá'
  },
  {
    id: 'docente-planta-002',
    personId: 'person-doc-planta-002',
    firstName: 'Laura Patricia',
    lastName: 'Sánchez Mora',
    email: 'laura.sanchez@esap.edu.co',
    phone: '+57 312 345 6789',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' },
      { id: 'role-02', name: 'Coordinador Académico', code: 'COORD_ACAD', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2018-03-20',
    lastLogin: '2024-12-22T08:15:00',
    documentType: 'CC',
    documentNumber: '52234567',
    birthDate: '1980-08-22',
    address: 'Calle 72 # 10-45, Bogotá'
  },
  {
    id: 'docente-planta-003',
    personId: 'person-doc-planta-003',
    firstName: 'Jorge Hernando',
    lastName: 'Ramírez Castro',
    email: 'jorge.ramirez@esap.edu.co',
    phone: '+57 315 456 7890',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2019-06-10',
    lastLogin: '2024-12-21T16:45:00',
    documentType: 'CC',
    documentNumber: '80345678',
    birthDate: '1978-11-30',
    address: 'Cra 15 # 85-30, Bogotá'
  },
  {
    id: 'docente-planta-004',
    personId: 'person-doc-planta-004',
    firstName: 'Diana Carolina',
    lastName: 'López Fernández',
    email: 'diana.lopez@esap.edu.co',
    phone: '+57 320 567 8901',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2021-02-05',
    lastLogin: '2024-12-22T10:20:00',
    documentType: 'CC',
    documentNumber: '41456789',
    birthDate: '1983-04-18',
    address: 'Calle 100 # 19-54, Bogotá'
  },
  {
    id: 'docente-planta-005',
    personId: 'person-doc-planta-005',
    firstName: 'Ricardo Andrés',
    lastName: 'Torres Mendoza',
    email: 'ricardo.torres@esap.edu.co',
    phone: '+57 318 678 9012',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2017-09-12',
    lastLogin: '2024-12-22T07:30:00',
    documentType: 'CC',
    documentNumber: '79567890',
    birthDate: '1976-12-08',
    address: 'Cra 7 # 127-45, Bogotá'
  },

  // ANTIOQUIA - MEDELLÍN (5 docentes)
  {
    id: 'docente-planta-006',
    personId: 'person-doc-planta-006',
    firstName: 'Martha Cecilia',
    lastName: 'Giraldo Pérez',
    email: 'martha.giraldo@esap.edu.co',
    phone: '+57 304 789 0123',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2019-08-20',
    lastLogin: '2024-12-22T09:00:00',
    documentType: 'CC',
    documentNumber: '43678901',
    birthDate: '1981-07-14',
    address: 'Calle 50 # 43-85, Medellín'
  },
  {
    id: 'docente-planta-007',
    personId: 'person-doc-planta-007',
    firstName: 'Luis Fernando',
    lastName: 'Álvarez Gómez',
    email: 'luis.alvarez@esap.edu.co',
    phone: '+57 311 890 1234',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2020-05-15',
    lastLogin: '2024-12-21T14:30:00',
    documentType: 'CC',
    documentNumber: '71789012',
    birthDate: '1979-09-25',
    address: 'Cra 80 # 30-50, Medellín'
  },

  // VALLE DEL CAUCA - CALI (5 docentes)
  {
    id: 'docente-planta-008',
    personId: 'person-doc-planta-008',
    firstName: 'Sandra Milena',
    lastName: 'Valencia Ríos',
    email: 'sandra.valencia@esap.edu.co',
    phone: '+57 316 901 2345',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2018-11-08',
    lastLogin: '2024-12-22T08:45:00',
    documentType: 'CC',
    documentNumber: '66890123',
    birthDate: '1982-03-12',
    address: 'Calle 5 # 38-45, Cali'
  },

  // ATLÁNTICO - BARRANQUILLA (5 docentes)
  {
    id: 'docente-planta-009',
    personId: 'person-doc-planta-009',
    firstName: 'Roberto Carlos',
    lastName: 'Mendoza Silva',
    email: 'roberto.mendoza@esap.edu.co',
    phone: '+57 300 012 3456',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Barranquilla',
    sedes: [
      {
        id: 'ter-atlantico',
        codigo: 'ESAP-ATL',
        nombre: 'Territorial Atlántico',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2019-04-22',
    lastLogin: '2024-12-21T17:15:00',
    documentType: 'CC',
    documentNumber: '72901234',
    birthDate: '1977-06-30',
    address: 'Cra 43 # 74-120, Barranquilla'
  },

  // SANTANDER - BUCARAMANGA (5 docentes)
  {
    id: 'docente-planta-010',
    personId: 'person-doc-planta-010',
    firstName: 'Gloria Inés',
    lastName: 'Parra Gutiérrez',
    email: 'gloria.parra@esap.edu.co',
    phone: '+57 313 123 4567',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'ter-santander',
        codigo: 'ESAP-SAN',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2020-10-18',
    lastLogin: '2024-12-22T11:00:00',
    documentType: 'CC',
    documentNumber: '63012345',
    birthDate: '1984-01-22',
    address: 'Calle 36 # 15-20, Bucaramanga'
  },

  // Agregar más docentes de planta para otras territoriales...
  // Total: 45 docentes de planta distribuidos en las 17 territoriales
];

// ============================================
// DOCENTES HORA CÁTEDRA (225 docentes - muestra de 20)
// ============================================
export const DOCENTES_HORA_CATEDRA: UserWithSedes[] = [
  {
    id: 'docente-catedra-001',
    personId: 'person-doc-catedra-001',
    firstName: 'María Elena',
    lastName: 'González Ruiz',
    email: 'maria.gonzalez@esap.edu.co',
    phone: '+57 300 234 5678',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-20T15:30:00',
    documentType: 'CC',
    documentNumber: '52123456',
    birthDate: '1988-09-10',
    address: 'Calle 45 # 20-35, Bogotá'
  },
  {
    id: 'docente-catedra-002',
    personId: 'person-doc-catedra-002',
    firstName: 'Carlos Andrés',
    lastName: 'Martínez López',
    email: 'carlos.martinez.doc@esap.edu.co',
    phone: '+57 310 345 6789',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T10:15:00',
    documentType: 'CC',
    documentNumber: '80234567',
    birthDate: '1985-12-15',
    address: 'Cra 70 # 44-85, Medellín'
  },
  {
    id: 'docente-catedra-003',
    personId: 'person-doc-catedra-003',
    firstName: 'Ana Patricia',
    lastName: 'Rojas Cardona',
    email: 'ana.rojas@esap.edu.co',
    phone: '+57 315 456 7890',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T09:00:00',
    documentType: 'CC',
    documentNumber: '41345678',
    birthDate: '1990-05-20',
    address: 'Calle 63 # 11-28, Bogotá'
  },
  {
    id: 'docente-catedra-004',
    personId: 'person-doc-catedra-004',
    firstName: 'Javier Eduardo',
    lastName: 'Vargas Díaz',
    email: 'javier.vargas@esap.edu.co',
    phone: '+57 320 567 8901',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T13:45:00',
    documentType: 'CC',
    documentNumber: '94456789',
    birthDate: '1987-08-08',
    address: 'Calle 10 # 4-60, Cali'
  },
  {
    id: 'docente-catedra-005',
    personId: 'person-doc-catedra-005',
    firstName: 'Claudia Marcela',
    lastName: 'Ospina Herrera',
    email: 'claudia.ospina@esap.edu.co',
    phone: '+57 318 678 9012',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Barranquilla',
    sedes: [
      {
        id: 'ter-atlantico',
        codigo: 'ESAP-ATL',
        nombre: 'Territorial Atlántico',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-20T16:20:00',
    documentType: 'CC',
    documentNumber: '45567890',
    birthDate: '1991-11-25',
    address: 'Cra 51B # 80-140, Barranquilla'
  },
  {
    id: 'docente-catedra-006',
    personId: 'person-doc-catedra-006',
    firstName: 'Fernando José',
    lastName: 'Molina Castro',
    email: 'fernando.molina@esap.edu.co',
    phone: '+57 304 789 0123',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'ter-santander',
        codigo: 'ESAP-SAN',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T08:30:00',
    documentType: 'CC',
    documentNumber: '91678901',
    birthDate: '1986-02-18',
    address: 'Calle 42 # 27-13, Bucaramanga'
  },
  {
    id: 'docente-catedra-007',
    personId: 'person-doc-catedra-007',
    firstName: 'Patricia Elena',
    lastName: 'Hernández Suárez',
    email: 'patricia.hernandez@esap.edu.co',
    phone: '+57 311 890 1234',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T12:00:00',
    documentType: 'CC',
    documentNumber: '52789012',
    birthDate: '1989-07-05',
    address: 'Cra 30 # 17-52, Bogotá'
  },
  {
    id: 'docente-catedra-008',
    personId: 'person-doc-catedra-008',
    firstName: 'Andrés Felipe',
    lastName: 'Cardona Mejía',
    email: 'andres.cardona@esap.edu.co',
    phone: '+57 316 901 2345',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T07:45:00',
    documentType: 'CC',
    documentNumber: '71890123',
    birthDate: '1992-04-30',
    address: 'Calle 33 # 75-50, Medellín'
  },
  {
    id: 'docente-catedra-009',
    personId: 'person-doc-catedra-009',
    firstName: 'Liliana Andrea',
    lastName: 'Restrepo Gómez',
    email: 'liliana.restrepo@esap.edu.co',
    phone: '+57 300 012 3456',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-20T18:10:00',
    documentType: 'CC',
    documentNumber: '31901234',
    birthDate: '1993-10-12',
    address: 'Cra 100 # 15-25, Cali'
  },
  {
    id: 'docente-catedra-010',
    personId: 'person-doc-catedra-010',
    firstName: 'Mauricio Alejandro',
    lastName: 'Pérez Salazar',
    email: 'mauricio.perez@esap.edu.co',
    phone: '+57 313 123 4567',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Barranquilla',
    sedes: [
      {
        id: 'ter-atlantico',
        codigo: 'ESAP-ATL',
        nombre: 'Territorial Atlántico',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T14:25:00',
    documentType: 'CC',
    documentNumber: '72012345',
    birthDate: '1988-06-28',
    address: 'Calle 84 # 52-130, Barranquilla'
  },
  {
    id: 'docente-catedra-011',
    personId: 'person-doc-catedra-011',
    firstName: 'Verónica Isabel',
    lastName: 'Muñoz Parra',
    email: 'veronica.munoz@esap.edu.co',
    phone: '+57 320 234 5678',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T10:15:00',
    documentType: 'CC',
    documentNumber: '39123456',
    birthDate: '1994-03-14',
    address: 'Calle 127 # 15-70, Bogotá'
  },
  {
    id: 'docente-catedra-012',
    personId: 'person-doc-catedra-012',
    firstName: 'Diego Armando',
    lastName: 'Quintero Díaz',
    email: 'diego.quintero@esap.edu.co',
    phone: '+57 318 345 6789',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'ter-santander',
        codigo: 'ESAP-SAN',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T11:30:00',
    documentType: 'CC',
    documentNumber: '13234567',
    birthDate: '1987-09-22',
    address: 'Cra 27 # 45-30, Bucaramanga'
  },
  {
    id: 'docente-catedra-013',
    personId: 'person-doc-catedra-013',
    firstName: 'Carolina',
    lastName: 'Jiménez Torres',
    email: 'carolina.jimenez@esap.edu.co',
    phone: '+57 304 456 7890',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T09:20:00',
    documentType: 'CC',
    documentNumber: '43345678',
    birthDate: '1991-01-17',
    address: 'Calle 10 Sur # 48-50, Medellín'
  },
  {
    id: 'docente-catedra-014',
    personId: 'person-doc-catedra-014',
    firstName: 'Nelson Iván',
    lastName: 'Castro Ramírez',
    email: 'nelson.castro@esap.edu.co',
    phone: '+57 311 567 8901',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T15:50:00',
    documentType: 'CC',
    documentNumber: '80456789',
    birthDate: '1986-11-09',
    address: 'Cra 50 # 26-80, Bogotá'
  },
  {
    id: 'docente-catedra-015',
    personId: 'person-doc-catedra-015',
    firstName: 'Mónica Patricia',
    lastName: 'Vega Sánchez',
    email: 'monica.vega@esap.edu.co',
    phone: '+57 316 678 9012',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T08:05:00',
    documentType: 'CC',
    documentNumber: '66567890',
    birthDate: '1990-08-03',
    address: 'Calle 23N # 6-35, Cali'
  },
  {
    id: 'docente-catedra-016',
    personId: 'person-doc-catedra-016',
    firstName: 'Germán Darío',
    lastName: 'Ortiz Gómez',
    email: 'german.ortiz@esap.edu.co',
    phone: '+57 300 789 0123',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Barranquilla',
    sedes: [
      {
        id: 'ter-atlantico',
        codigo: 'ESAP-ATL',
        nombre: 'Territorial Atlántico',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-20T17:40:00',
    documentType: 'CC',
    documentNumber: '8678901',
    birthDate: '1985-05-26',
    address: 'Cra 38 # 74-176, Barranquilla'
  },
  {
    id: 'docente-catedra-017',
    personId: 'person-doc-catedra-017',
    firstName: 'Adriana Lucia',
    lastName: 'Ruiz Mora',
    email: 'adriana.ruiz@esap.edu.co',
    phone: '+57 313 890 1234',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T11:25:00',
    documentType: 'CC',
    documentNumber: '52789012',
    birthDate: '1992-12-11',
    address: 'Calle 170 # 9-85, Bogotá'
  },
  {
    id: 'docente-catedra-018',
    personId: 'person-doc-catedra-018',
    firstName: 'Oscar Mauricio',
    lastName: 'Delgado Silva',
    email: 'oscar.delgado@esap.edu.co',
    phone: '+57 320 901 2345',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'ter-santander',
        codigo: 'ESAP-SAN',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T13:15:00',
    documentType: 'CC',
    documentNumber: '91890123',
    birthDate: '1988-02-19',
    address: 'Calle 56 # 31-17, Bucaramanga'
  },
  {
    id: 'docente-catedra-019',
    personId: 'person-doc-catedra-019',
    firstName: 'Beatriz Elena',
    lastName: 'Acosta Vargas',
    email: 'beatriz.acosta@esap.edu.co',
    phone: '+57 318 012 3456',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-22T10:40:00',
    documentType: 'CC',
    documentNumber: '39901234',
    birthDate: '1993-07-08',
    address: 'Cra 65 # 8B-91, Medellín'
  },
  {
    id: 'docente-catedra-020',
    personId: 'person-doc-catedra-020',
    firstName: 'Hernán Darío',
    lastName: 'Londoño Cruz',
    email: 'hernan.londono@esap.edu.co',
    phone: '+57 304 123 4567',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-21T16:55:00',
    documentType: 'CC',
    documentNumber: '16012345',
    birthDate: '1987-04-15',
    address: 'Calle 70 # 4B-32, Cali'
  },
  
  // ============================================
  // NUEVOS DOCENTES - PTAs PENDIENTES
  // ============================================
  {
    id: 'docente-catedra-021',
    personId: 'person-doc-catedra-021',
    firstName: 'Carlos',
    lastName: 'Méndez Bivera',
    email: 'carlos.mendez@esap.edu.co',
    phone: '+57 310 234 5670',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'nacional' }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-nacional',
        codigo: 'ESAP-NAC',
        nombre: 'Sede Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2022-03-15',
    lastLogin: '2024-12-23T08:30:00',
    documentType: 'CC',
    documentNumber: '79234567',
    birthDate: '1975-09-12',
    address: 'Calle 80 # 12-45, Bogotá'
  },
  {
    id: 'docente-catedra-022',
    personId: 'person-doc-catedra-022',
    firstName: 'Ana',
    lastName: 'Gutiérrez López',
    email: 'ana.gutierrez@esap.edu.co',
    phone: '+57 315 678 9012',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2021-08-20',
    lastLogin: '2024-12-23T09:15:00',
    documentType: 'CC',
    documentNumber: '43567890',
    birthDate: '1982-06-25',
    address: 'Calle 60 # 45-30, Medellín'
  },
  {
    id: 'docente-catedra-023',
    personId: 'person-doc-catedra-023',
    firstName: 'Roberto',
    lastName: 'Silva Castro',
    email: 'roberto.silva.docente@esap.edu.co',
    phone: '+57 318 890 1234',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE', alcance: 'territorial' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VAL',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2020-02-10',
    lastLogin: '2024-12-23T07:45:00',
    documentType: 'CC',
    documentNumber: '80123456',
    birthDate: '1978-11-30',
    address: 'Cra 5 # 25-60, Cali'
  }
];

// ============================================
// TODOS LOS DOCENTES (PLANTA + CÁTEDRA)
// ============================================
export const TODOS_LOS_DOCENTES: UserWithSedes[] = [
  ...DOCENTES_PLANTA,
  ...DOCENTES_HORA_CATEDRA
];

// ============================================
// ESTADÍSTICAS
// ============================================
export const DOCENTES_STATS = {
  totalDocentes: TODOS_LOS_DOCENTES.length,
  docentesPlanta: DOCENTES_PLANTA.length,
  docentesHoraCatedra: DOCENTES_HORA_CATEDRA.length,
  activos: TODOS_LOS_DOCENTES.filter(d => d.status === 'active').length,
  porTerritorial: {
    bogota: TODOS_LOS_DOCENTES.filter(d => d.location === 'Bogotá D.C.').length,
    medellin: TODOS_LOS_DOCENTES.filter(d => d.location === 'Medellín').length,
    cali: TODOS_LOS_DOCENTES.filter(d => d.location === 'Cali').length,
    barranquilla: TODOS_LOS_DOCENTES.filter(d => d.location === 'Barranquilla').length,
    bucaramanga: TODOS_LOS_DOCENTES.filter(d => d.location === 'Bucaramanga').length,
  }
};