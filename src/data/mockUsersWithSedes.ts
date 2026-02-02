/**
 * STUB: Array vacío - Agregar datos reales cuando se requieran
 * 
 * ⚠️ DEPRECATED: Para pruebas de desarrollo, usar:
 * import { USUARIOS_EJEMPLO } from './usuarios-ejemplo';
 */
export const MOCK_USERS_WITH_SEDES: UserWithSedes[] = [
  // ========== ESTUDIANTE ==========
  {
    id: 'usr-001',
    personId: 'per-001',
    firstName: 'María Camila',
    lastName: 'González Rodríguez',
    email: 'maria.gonzalez@estudiante.esap.edu.co',
    phone: '+57 310 234 5678',
    status: 'active',
    roles: [
      {
        id: 'rol-estudiante',
        name: 'Estudiante',
        code: 'EST',
        alcance: 'territorial',
        unidadOrganizacionalId: 'sede-bogota'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-bogota',
        codigo: 'BOG-001',
        nombre: 'Sede Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-08-15',
    lastLogin: '2025-01-26T08:30:00',
    avatar: 'https://i.pravatar.cc/150?img=1',
    documentType: 'CC',
    documentNumber: '1012345678',
    documentIssueDate: '2018-03-15',
    birthDate: '2000-05-20',
    address: 'Calle 45 #23-10, Bogotá',
    program: 'Administración Pública Territorial'
  },

  // ========== DOCENTE ==========
  {
    id: 'usr-002',
    personId: 'per-002',
    firstName: 'Carlos Alberto',
    lastName: 'Martínez Pérez',
    email: 'carlos.martinez@docente.esap.edu.co',
    phone: '+57 315 987 6543',
    status: 'active',
    roles: [
      {
        id: 'rol-docente',
        name: 'Docente',
        code: 'DOC',
        alcance: 'territorial',
        unidadOrganizacionalId: 'sede-medellin'
      }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'sede-medellin',
        codigo: 'MED-001',
        nombre: 'Sede Medellín',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2020-02-10',
    lastLogin: '2025-01-26T09:15:00',
    avatar: 'https://i.pravatar.cc/150?img=12',
    documentType: 'CC',
    documentNumber: '71234567',
    documentIssueDate: '2005-06-20',
    birthDate: '1985-11-10',
    address: 'Carrera 50 #12-34, Medellín',
    program: 'Gestión Pública'
  },

  // ========== ADMINISTRATIVO ==========
  {
    id: 'usr-003',
    personId: 'per-003',
    firstName: 'Ana Patricia',
    lastName: 'Ramírez Silva',
    email: 'ana.ramirez@esap.edu.co',
    phone: '+57 312 456 7890',
    status: 'active',
    roles: [
      {
        id: 'rol-administrativo',
        name: 'Administrativo',
        code: 'ADM',
        alcance: 'nacional',
        unidadOrganizacionalId: 'sede-central'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'BOG-CENTRAL',
        nombre: 'Sede Central Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2019-03-01',
    lastLogin: '2025-01-26T07:45:00',
    avatar: 'https://i.pravatar.cc/150?img=5',
    documentType: 'CC',
    documentNumber: '52345678',
    documentIssueDate: '2008-09-12',
    birthDate: '1988-07-15',
    address: 'Calle 80 #45-67, Bogotá'
  },

  // ========== GRADUADO ==========
  {
    id: 'usr-004',
    personId: 'per-004',
    firstName: 'Diego Fernando',
    lastName: 'López Torres',
    email: 'diego.lopez@graduado.esap.edu.co',
    phone: '+57 320 765 4321',
    status: 'active',
    roles: [
      {
        id: 'rol-graduado',
        name: 'Graduado',
        code: 'GRAD',
        alcance: 'nacional'
      }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'sede-cali',
        codigo: 'CAL-001',
        nombre: 'Sede Cali',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'massive',
    enrollmentDate: '2022-12-01',
    lastLogin: '2025-01-20T14:30:00',
    avatar: 'https://i.pravatar.cc/150?img=8',
    documentType: 'CC',
    documentNumber: '1098765432',
    documentIssueDate: '2015-04-10',
    birthDate: '1995-03-25',
    address: 'Avenida 6N #25-50, Cali',
    program: 'Administración Pública Territorial - Graduado 2022'
  },

  // ========== ASPIRANTE ==========
  {
    id: 'usr-005',
    personId: 'per-005',
    firstName: 'Laura Valentina',
    lastName: 'Hernández Castro',
    email: 'laura.hernandez@aspirante.esap.edu.co',
    phone: '+57 318 234 5678',
    status: 'pending',
    roles: [
      {
        id: 'rol-aspirante',
        name: 'Aspirante',
        code: 'ASP',
        alcance: 'territorial',
        unidadOrganizacionalId: 'sede-barranquilla'
      }
    ],
    location: 'Barranquilla',
    sedes: [
      {
        id: 'sede-barranquilla',
        codigo: 'BAQ-001',
        nombre: 'Sede Barranquilla',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2025-01-10',
    avatar: 'https://i.pravatar.cc/150?img=9',
    documentType: 'CC',
    documentNumber: '1023456789',
    documentIssueDate: '2020-02-15',
    birthDate: '2002-09-08',
    address: 'Calle 72 #45-23, Barranquilla',
    program: 'Pendiente de admisión'
  },

  // ========== SUPER ADMINISTRADOR ==========
  {
    id: 'usr-006',
    personId: 'per-006',
    firstName: 'Roberto',
    lastName: 'Sánchez Morales',
    email: 'roberto.sanchez@esap.edu.co',
    phone: '+57 311 555 0001',
    status: 'active',
    roles: [
      {
        id: 'rol-superadmin',
        name: 'Super Administrador',
        code: 'SADM',
        alcance: 'nacional'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'BOG-CENTRAL',
        nombre: 'Sede Central Nacional',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2018-01-15',
    lastLogin: '2025-01-26T06:00:00',
    avatar: 'https://i.pravatar.cc/150?img=13',
    documentType: 'CC',
    documentNumber: '79876543',
    documentIssueDate: '2000-05-20',
    birthDate: '1980-12-05',
    address: 'Carrera 15 #100-45, Bogotá'
  }
];

// Re-exportar usuarios de ejemplo para compatibilidad
export { USUARIOS_EJEMPLO, obtenerUsuarioPorRol, obtenerUsuarioPorEmail } from './usuarios-ejemplo';