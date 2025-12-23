/**
 * MOCK DATA: USUARIOS CON SEDES
 * Datos de prueba para el módulo de gestión de usuarios
 * Incluye asignación de sedes territoriales y CETAP
 * ✅ ACTUALIZADO: Usa estructura real de ESAP (1 Sede Central + 17 Territoriales + 307 CETAP)
 * ✅ INTEGRADO: Incluye docentes de Gestión Profesoral (Planta + Hora Cátedra)
 */

import { TERRITORIALES_ESAP } from './territoriales-cetap-completo';
import { TODOS_LOS_DOCENTES } from './docentesGestionProfesoral';

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
    alcance?: 'nacional' | 'territorial' | 'cetap';  // ✅ NUEVO: Alcance del rol según jerarquía
    unidadOrganizacionalId?: string;  // ✅ NUEVO: ID de la unidad donde aplica el rol
  }>;
  location: string;
  sedes: Array<{
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'sede-central' | 'territorial' | 'cetap';  // ✅ ACTUALIZADO: niveles reales
    esPrincipal: boolean;
  }>;
  enrollmentMethod: 'qr' | 'manual' | 'massive';
  enrollmentDate: string;
  lastLogin?: string;
  avatar?: string;
  documentType: string;
  documentNumber: string;
  documentIssueDate?: string;  // ✅ NUEVO: Fecha de expedición del documento
  birthDate?: string;
  address?: string;
  program?: string;  // ✅ NUEVO: Programa académico para graduados
}

export const MOCK_USERS_WITH_SEDES: UserWithSedes[] = [
  {
    id: 'user-001',
    personId: 'person-001',
    firstName: 'María Elena',
    lastName: 'Rodríguez',
    email: 'maria.rodriguez@esap.edu.co',
    phone: '+57 300 123 4567',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE' },
      { id: 'role-02', name: 'Coordinador Académico', code: 'COORD_ACAD' }
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
    enrollmentDate: '2024-01-15',
    lastLogin: '2024-12-04T15:30:00',
    documentType: 'CC',
    documentNumber: '52123456',
    birthDate: '1985-03-20',
    address: 'Cra 7 # 32-45, Bogotá'
  },
  {
    id: 'user-002',
    personId: 'person-002',
    firstName: 'Carlos Alberto',
    lastName: 'Martínez',
    email: 'carlos.martinez@esap.edu.co',
    phone: '+57 310 234 5678',
    status: 'active',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'ter-antioquia',
        codigo: 'ESAP-ANT',
        nombre: 'Territorial Antioquia',
        nivel: 'territorial',
        esPrincipal: true
      },
      {
        id: 'cetap-med-001',
        codigo: 'CETAP-Medellín',
        nombre: 'CETAP Medellín',
        nivel: 'cetap',
        esPrincipal: false
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-02-10',
    lastLogin: '2024-12-05T09:15:00',
    documentType: 'CC',
    documentNumber: '1098765432',
    birthDate: '2002-07-15'
  },
  {
    id: 'user-003',
    personId: 'person-003',
    firstName: 'Ana Patricia',
    lastName: 'Gómez',
    email: 'ana.gomez@esap.edu.co',
    phone: '+57 315 345 6789',
    status: 'active',
    roles: [
      { id: 'role-04', name: 'Directivo', code: 'DIRECTIVO' },
      { id: 'role-05', name: 'Director Territorial', code: 'DIR_TERRITORIAL' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VALLE',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-08-20',
    lastLogin: '2024-12-05T08:00:00',
    documentType: 'CC',
    documentNumber: '31456789',
    birthDate: '1978-11-05'
  },
  {
    id: 'user-004',
    personId: 'person-004',
    firstName: 'Jorge Luis',
    lastName: 'Hernández',
    email: 'jorge.hernandez@esap.edu.co',
    phone: '+57 320 456 7890',
    status: 'blocked',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Barranquilla',
    sedes: [
      {
        id: 'ter-atlantico',
        codigo: 'ESAP-ATL',
        nombre: 'Territorial Atlántico',
        nivel: 'territorial',
        esPrincipal: true
      },
      {
        id: 'cetap-baq-001',
        codigo: 'CETAP-Barranquilla',
        nombre: 'CETAP Barranquilla',
        nivel: 'cetap',
        esPrincipal: false
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-03-15',
    lastLogin: '2024-11-20T14:30:00',
    documentType: 'CC',
    documentNumber: '72345678'
  },
  {
    id: 'user-005',
    personId: 'person-005',
    firstName: 'Sandra Milena',
    lastName: 'Torres',
    email: 'sandra.torres@esap.edu.co',
    phone: '+57 311 567 8901',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE' }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'ter-santander',
        codigo: 'ESAP-SANT',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-09-01',
    lastLogin: '2024-12-04T16:45:00',
    documentType: 'CC',
    documentNumber: '63789012',
    birthDate: '1990-05-30'
  },
  {
    id: 'user-006',
    personId: 'person-006',
    firstName: 'Diego Fernando',
    lastName: 'Ramírez',
    email: 'diego.ramirez@esap.edu.co',
    phone: '+57 312 678 9012',
    status: 'active',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Cartagena',
    sedes: [
      {
        id: 'ter-bolivar',
        codigo: 'ESAP-BOL',
        nombre: 'Territorial Bolívar',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'massive',
    enrollmentDate: '2024-01-20',
    lastLogin: '2024-12-03T10:20:00',
    documentType: 'CC',
    documentNumber: '1123456789',
    birthDate: '2001-09-12'
  },
  {
    id: 'user-007',
    personId: 'person-007',
    firstName: 'Claudia Marcela',
    lastName: 'Díaz',
    email: 'claudia.diaz@esap.edu.co',
    phone: '+57 313 789 0123',
    status: 'active',
    roles: [
      { id: 'role-06', name: 'Administrativo', code: 'ADMIN' },
      { id: 'role-07', name: 'Secretario Académico', code: 'SEC_ACAD' }
    ],
    location: 'Manizales',
    sedes: [
      {
        id: 'ter-caldas',
        codigo: 'ESAP-CAL',
        nombre: 'Territorial Caldas',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-07-10',
    lastLogin: '2024-12-05T07:30:00',
    documentType: 'CC',
    documentNumber: '42567890',
    birthDate: '1982-02-25'
  },
  {
    id: 'user-008',
    personId: 'person-008',
    firstName: 'Roberto Antonio',
    lastName: 'Pérez',
    email: 'roberto.perez@esap.edu.co',
    phone: '+57 314 890 1234',
    status: 'pending',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Pereira',
    sedes: [
      {
        id: 'ter-risaralda',
        codigo: 'ESAP-RIS',
        nombre: 'Territorial Risaralda',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-11-30',
    documentType: 'CC',
    documentNumber: '10345678',
    birthDate: '2003-01-18'
  },
  {
    id: 'user-009',
    personId: 'person-009',
    firstName: 'Luisa Fernanda',
    lastName: 'Castro',
    email: 'luisa.castro@esap.edu.co',
    phone: '+57 315 901 2345',
    status: 'active',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE' },
      { id: 'role-08', name: 'Investigador', code: 'INVESTIGADOR' }
    ],
    location: 'Pasto',
    sedes: [
      {
        id: 'ter-narino',
        codigo: 'ESAP-NAR',
        nombre: 'Territorial Nariño',
        nivel: 'territorial',
        esPrincipal: true
      },
      {
        id: 'cetap-pasto-001',
        codigo: 'CETAP-Pasto',
        nombre: 'CETAP Pasto',
        nivel: 'cetap',
        esPrincipal: false
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-03-15',
    lastLogin: '2024-12-04T11:00:00',
    documentType: 'CC',
    documentNumber: '59012345',
    birthDate: '1987-08-10'
  },
  {
    id: 'user-010',
    personId: 'person-010',
    firstName: 'Andrés Felipe',
    lastName: 'Vargas',
    email: 'andres.vargas@esap.edu.co',
    phone: '+57 316 012 3456',
    status: 'active',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Cúcuta',
    sedes: [
      {
        id: 'ter-norte-santander',
        codigo: 'ESAP-NSA',
        nombre: 'Territorial Norte de Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'massive',
    enrollmentDate: '2024-02-01',
    lastLogin: '2024-12-05T08:45:00',
    documentType: 'CC',
    documentNumber: '88123456',
    birthDate: '2000-04-22'
  },
  {
    id: 'user-011',
    personId: 'person-011',
    firstName: 'Patricia del Carmen',
    lastName: 'Ruiz',
    email: 'patricia.ruiz@esap.edu.co',
    phone: '+57 317 123 4567',
    status: 'active',
    roles: [
      { id: 'role-04', name: 'Directivo', code: 'DIRECTIVO' }
    ],
    location: 'Neiva',
    sedes: [
      {
        id: 'ter-huila',
        codigo: 'ESAP-HUI',
        nombre: 'Territorial Huila',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2022-05-20',
    lastLogin: '2024-12-04T17:00:00',
    documentType: 'CC',
    documentNumber: '26234567',
    birthDate: '1975-12-15'
  },
  {
    id: 'user-012',
    personId: 'person-012',
    firstName: 'Miguel Ángel',
    lastName: 'Sánchez',
    email: 'miguel.sanchez@esap.edu.co',
    phone: '+57 318 234 5678',
    status: 'active',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Ibagué',
    sedes: [
      {
        id: 'ter-tolima',
        codigo: 'ESAP-TOL',
        nombre: 'Territorial Tolima',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-03-05',
    lastLogin: '2024-12-02T14:15:00',
    documentType: 'CC',
    documentNumber: '93345678',
    birthDate: '2002-06-08'
  },
  {
    id: 'user-013',
    personId: 'person-013',
    firstName: 'Gloria Stella',
    lastName: 'Morales',
    email: 'gloria.morales@esap.edu.co',
    phone: '+57 319 345 6789',
    status: 'blocked',
    roles: [
      { id: 'role-01', name: 'Docente', code: 'DOCENTE' }
    ],
    location: 'Popayán',
    sedes: [
      {
        id: 'ter-cauca',
        codigo: 'ESAP-CAU',
        nombre: 'Territorial Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-06-10',
    lastLogin: '2024-10-15T09:30:00',
    documentType: 'CC',
    documentNumber: '29456789',
    birthDate: '1980-01-28'
  },
  {
    id: 'user-014',
    personId: 'person-014',
    firstName: 'Héctor Fabio',
    lastName: 'Mejía',
    email: 'hector.mejia@esap.edu.co',
    phone: '+57 320 456 7890',
    status: 'active',
    roles: [
      { id: 'role-03', name: 'Estudiante', code: 'ESTUDIANTE' }
    ],
    location: 'Tunja',
    sedes: [
      {
        id: 'ter-boyaca',
        codigo: 'ESAP-BOY',
        nombre: 'Territorial Boyacá',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'massive',
    enrollmentDate: '2024-01-25',
    lastLogin: '2024-12-05T06:50:00',
    documentType: 'CC',
    documentNumber: '74567890',
    birthDate: '2001-11-03'
  },
  {
    id: 'user-015',
    personId: 'person-015',
    firstName: 'Carolina',
    lastName: 'Jiménez Ospina',
    email: 'carolina.jimenez@esap.edu.co',
    phone: '+57 321 567 8901',
    status: 'active',
    roles: [
      { id: 'role-06', name: 'Administrativo', code: 'ADMIN' }
    ],
    location: 'Quibdó',
    sedes: [
      {
        id: 'ter-choco',
        codigo: 'ESAP-CHO',
        nombre: 'Territorial Chocó',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-10-05',
    lastLogin: '2024-12-04T12:20:00',
    documentType: 'CC',
    documentNumber: '38678901',
    birthDate: '1988-07-19'
  },
  // ============================================================================
  // GRADUADOS (usuarios que completaron sus programas académicos)
  // ============================================================================
  {
    id: 'user-016',
    personId: 'person-016',
    firstName: 'Laura Marcela',
    lastName: 'Rodríguez Gutiérrez',
    email: 'laura.rodriguez.grad@esap.edu.co',
    phone: '+57 318 234 5678',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
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
    enrollmentDate: '2020-02-10',
    lastLogin: '2024-12-01T14:30:00',
    documentType: 'CC',
    documentNumber: '52987654',
    documentIssueDate: '2013-04-15',  // ✅ Fecha expedición documento
    birthDate: '1995-04-15',
    program: 'Administración Pública Territorial',
    address: 'Calle 50 # 15-30, Bogotá'
  },
  {
    id: 'user-017',
    personId: 'person-017',
    firstName: 'Miguel Ángel',
    lastName: 'Sánchez Mora',
    email: 'miguel.sanchez.grad@esap.edu.co',
    phone: '+57 312 345 6789',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
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
    enrollmentDate: '2019-08-05',
    lastLogin: '2024-11-28T09:15:00',
    documentType: 'CC',
    documentNumber: '1098234567',
    documentIssueDate: '2011-11-22',  // ✅ Fecha expedición documento
    birthDate: '1993-11-22',
    program: 'Especialización en Gestión Pública',
    address: 'Carrera 45 # 78-20, Medellín'
  },
  {
    id: 'user-018',
    personId: 'person-018',
    firstName: 'Diana Carolina',
    lastName: 'Martínez Pérez',
    email: 'diana.martinez.grad@esap.edu.co',
    phone: '+57 315 456 7890',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'ter-valle',
        codigo: 'ESAP-VALLE',
        nombre: 'Territorial Valle del Cauca',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2021-01-20',
    lastLogin: '2024-12-03T16:45:00',
    documentType: 'CC',
    documentNumber: '31876543',
    documentIssueDate: '2014-07-08',  // ✅ Fecha expedición documento
    birthDate: '1996-07-08',
    program: 'Administración Pública Territorial',
    address: 'Avenida 6N # 25-40, Cali'
  },
  {
    id: 'user-019',
    personId: 'person-019',
    firstName: 'Andrés Felipe',
    lastName: 'Gómez Castro',
    email: 'andres.gomez.grad@esap.edu.co',
    phone: '+57 320 567 8901',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
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
    enrollmentDate: '2020-07-15',
    lastLogin: '2024-11-30T11:20:00',
    documentType: 'CC',
    documentNumber: '72456789',
    documentIssueDate: '2012-03-12',  // ✅ Fecha expedición documento
    birthDate: '1994-03-12',
    program: 'Tecnología en Gestión Pública',
    address: 'Calle 84 # 52-10, Barranquilla'
  },
  {
    id: 'user-020',
    personId: 'person-020',
    firstName: 'Paola Andrea',
    lastName: 'Hernández Silva',
    email: 'paola.hernandez.grad@esap.edu.co',
    phone: '+57 311 678 9012',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'ter-santander',
        codigo: 'ESAP-SANT',
        nombre: 'Territorial Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2019-03-10',
    lastLogin: '2024-12-02T13:45:00',
    documentType: 'CC',
    documentNumber: '63234567',
    documentIssueDate: '2010-09-18',  // ✅ Fecha expedición documento
    birthDate: '1992-09-18',
    program: 'Administración Pública',
    address: 'Carrera 27 # 40-15, Bucaramanga'
  },
  {
    id: 'user-021',
    personId: 'person-021',
    firstName: 'Carlos Eduardo',
    lastName: 'López Ramírez',
    email: 'carlos.lopez.grad@esap.edu.co',
    phone: '+57 314 789 0123',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Cartagena',
    sedes: [
      {
        id: 'ter-bolivar',
        codigo: 'ESAP-BOL',
        nombre: 'Territorial Bolívar',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2021-06-10',
    lastLogin: '2024-12-02T13:15:00',
    documentType: 'CC',
    documentNumber: '1134567890',
    documentIssueDate: '2015-01-30',  // ✅ Fecha expedición documento
    birthDate: '1997-01-30',
    program: 'Administración Pública Territorial',
    address: 'Manga, Calle 25 # 20-15, Cartagena'
  },
  {
    id: 'user-022',
    personId: 'person-022',
    firstName: 'Valentina',
    lastName: 'Torres Mendoza',
    email: 'valentina.torres.grad@esap.edu.co',
    phone: '+57 316 890 1234',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Manizales',
    sedes: [
      {
        id: 'ter-caldas',
        codigo: 'ESAP-CAL',
        nombre: 'Territorial Caldas',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2020-11-18',
    lastLogin: '2024-12-05T10:45:00',
    documentType: 'CC',
    documentNumber: '42789012',
    documentIssueDate: '2013-12-05',  // ✅ Fecha expedición documento
    birthDate: '1995-12-05',
    program: 'Administración Municipal',
    address: 'Avenida Santander # 56-30, Manizales'
  },
  {
    id: 'user-023',
    personId: 'person-023',
    firstName: 'Juan Sebastián',
    lastName: 'Díaz Moreno',
    email: 'juan.diaz.grad@esap.edu.co',
    phone: '+57 319 901 2345',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Pereira',
    sedes: [
      {
        id: 'ter-risaralda',
        codigo: 'ESAP-RIS',
        nombre: 'Territorial Risaralda',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2019-09-22',
    lastLogin: '2024-11-29T15:30:00',
    documentType: 'CC',
    documentNumber: '10567890',
    documentIssueDate: '2011-05-18',  // ✅ Fecha expedición documento
    birthDate: '1993-05-18',
    program: 'Especialización en Gestión Pública',
    address: 'Calle 14 # 22-45, Pereira'
  },
  {
    id: 'user-024',
    personId: 'person-024',
    firstName: 'María Fernanda',
    lastName: 'Vargas Rojas',
    email: 'maria.vargas.grad@esap.edu.co',
    phone: '+57 313 012 3456',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Pasto',
    sedes: [
      {
        id: 'ter-narino',
        codigo: 'ESAP-NAR',
        nombre: 'Territorial Nariño',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'massive',
    enrollmentDate: '2021-03-05',
    lastLogin: '2024-12-04T12:00:00',
    documentType: 'CC',
    documentNumber: '59345678',
    documentIssueDate: '2014-10-22',  // ✅ Fecha expedición documento
    birthDate: '1996-10-22',
    program: 'Tecnología en Gestión Pública',
    address: 'Carrera 26 # 18-70, Pasto'
  },
  {
    id: 'user-025',
    personId: 'person-025',
    firstName: 'Javier Alonso',
    lastName: 'Ruiz Ospina',
    email: 'javier.ruiz.grad@esap.edu.co',
    phone: '+57 317 123 4567',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
    ],
    location: 'Cúcuta',
    sedes: [
      {
        id: 'ter-norte-santander',
        codigo: 'ESAP-NSA',
        nombre: 'Territorial Norte de Santander',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2020-05-12',
    lastLogin: '2024-12-01T09:40:00',
    documentType: 'CC',
    documentNumber: '88456789',
    documentIssueDate: '2012-08-14',  // ✅ Fecha expedición documento
    birthDate: '1994-08-14',
    program: 'Administración Pública Territorial',
    address: 'Avenida 0 # 11-56, Cúcuta'
  },
  // ============================================================================
  // GRADUADO DE PRUEBA - VERIFICACIÓN EXITOSA
  // ============================================================================
  {
    id: 'user-test-001',
    personId: 'person-test-001',
    firstName: 'María Alejandra',
    lastName: 'González Pérez',
    email: 'ma.gonzalez@esap.edu.co',
    phone: '+57 300 555 1234',
    status: 'active',
    roles: [
      { id: 'role-09', name: 'Graduado', code: 'GRADUADO' }
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
    enrollmentDate: '2002-02-01',
    lastLogin: '2024-11-15T10:30:00',
    documentType: 'CC',
    documentNumber: '1012345678',  // ✅ CÉDULA DE PRUEBA EXITOSA
    documentIssueDate: '2002-03-15',  // ✅ FECHA EXPEDICIÓN DE PRUEBA EXITOSA
    birthDate: '1984-03-15',
    program: 'Administración Pública',
    address: 'Calle 72 # 10-34, Bogotá D.C.'
  },
  // ============================================================================
  // DOCENTES DE GESTIÓN PROFESORAL (Planta + Hora Cátedra)
  // Importados desde docentesGestionProfesoral.ts
  // ============================================================================
  ...TODOS_LOS_DOCENTES
];