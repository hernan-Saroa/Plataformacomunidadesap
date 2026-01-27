/**
 * ════════════════════════════════════════════════════════════════════════════
 * USUARIOS DE EJEMPLO - 1 USUARIO POR ROL
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Archivo optimizado con 1 usuario representativo por cada rol del sistema.
 * Total: 12 usuarios (uno por cada rol definido en roles-sistema.types.ts)
 * 
 * USO:
 * - Pruebas de funcionalidad por rol
 * - Desarrollo y debugging
 * - Simulación de permisos
 * 
 * ⚠️ IMPORTANTE: Estos son datos de EJEMPLO, no reales.
 * 
 * Fecha: Enero 2026
 * Proyecto: Backoffice ESAP
 */

import type { UserWithSedes } from './mockUsersWithSedes';

// ════════════════════════════════════════════════════════════════════════════
// USUARIOS DE EJEMPLO (1 POR ROL)
// ════════════════════════════════════════════════════════════════════════════

export const USUARIOS_EJEMPLO: UserWithSedes[] = [
  // ══════════════════════════════════════
  // 1. SUPER ADMINISTRADOR
  // ══════════════════════════════════════
  {
    id: 'usr-001-superadmin',
    personId: 'per-001',
    firstName: 'Ana María',
    lastName: 'López Ramírez',
    email: 'ana.lopez@esap.edu.co',
    phone: '+57 310 123 4501',
    status: 'active',
    roles: [
      {
        id: 'rol-001',
        name: 'Super Administrador',
        code: 'SUPER_ADMIN',
        alcance: 'nacional'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'ESAP-BOG',
        nombre: 'Sede Central - Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-01-15',
    lastLogin: '2026-01-25T09:30:00Z',
    documentType: 'CC',
    documentNumber: '52123456',
    birthDate: '1985-03-20',
    address: 'Calle 44 # 53-37, Bogotá'
  },

  // ══════════════════════════════════════
  // 2. ADMINISTRADOR DE SISTEMA
  // ══════════════════════════════════════
  {
    id: 'usr-002-admin',
    personId: 'per-002',
    firstName: 'Carlos Andrés',
    lastName: 'Ruiz Gómez',
    email: 'carlos.ruiz@esap.edu.co',
    phone: '+57 310 123 4502',
    status: 'active',
    roles: [
      {
        id: 'rol-002',
        name: 'Administrador de Sistema',
        code: 'ADMIN_SISTEMA',
        alcance: 'nacional'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'ESAP-BOG',
        nombre: 'Sede Central - Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-10',
    lastLogin: '2026-01-25T10:15:00Z',
    documentType: 'CC',
    documentNumber: '80234567',
    birthDate: '1988-07-12',
    address: 'Carrera 15 # 32-10, Bogotá'
  },

  // ══════════════════════════════════════
  // 3. DIRECTOR NACIONAL
  // ══════════════════════════════════════
  {
    id: 'usr-003-dirnacional',
    personId: 'per-003',
    firstName: 'María Fernanda',
    lastName: 'Torres Suárez',
    email: 'maria.torres@esap.edu.co',
    phone: '+57 310 123 4503',
    status: 'active',
    roles: [
      {
        id: 'rol-003',
        name: 'Director Nacional',
        code: 'DIRECTOR_NACIONAL',
        alcance: 'nacional'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'ESAP-BOG',
        nombre: 'Sede Central - Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-06-01',
    lastLogin: '2026-01-25T08:45:00Z',
    documentType: 'CC',
    documentNumber: '52345678',
    birthDate: '1975-11-05',
    address: 'Calle 72 # 10-51, Bogotá'
  },

  // ══════════════════════════════════════
  // 4. DIRECTOR TERRITORIAL
  // ══════════════════════════════════════
  {
    id: 'usr-004-dirterritorial',
    personId: 'per-004',
    firstName: 'Jorge Luis',
    lastName: 'Martínez Pérez',
    email: 'jorge.martinez@esap.edu.co',
    phone: '+57 310 123 4504',
    status: 'active',
    roles: [
      {
        id: 'rol-004',
        name: 'Director Territorial',
        code: 'DIRECTOR_TERRITORIAL',
        alcance: 'territorial',
        unidadOrganizacionalId: 'territorial-antioquia'
      }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'territorial-antioquia',
        codigo: 'ESAP-MED',
        nombre: 'Territorial Antioquia - Medellín',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-08-15',
    lastLogin: '2026-01-24T16:20:00Z',
    documentType: 'CC',
    documentNumber: '71456789',
    birthDate: '1980-04-18',
    address: 'Carrera 43A # 19-105, Medellín'
  },

  // ══════════════════════════════════════
  // 5. COORDINADOR CETAP
  // ══════════════════════════════════════
  {
    id: 'usr-005-coordcetap',
    personId: 'per-005',
    firstName: 'Claudia Patricia',
    lastName: 'Hernández Ríos',
    email: 'claudia.hernandez@esap.edu.co',
    phone: '+57 310 123 4505',
    status: 'active',
    roles: [
      {
        id: 'rol-005',
        name: 'Coordinador CETAP',
        code: 'COORDINADOR_CETAP',
        alcance: 'cetap',
        unidadOrganizacionalId: 'cetap-ibague'
      }
    ],
    location: 'Ibagué',
    sedes: [
      {
        id: 'cetap-ibague',
        codigo: 'ESAP-IBG',
        nombre: 'CETAP Ibagué',
        nivel: 'cetap',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-03-01',
    lastLogin: '2026-01-24T14:10:00Z',
    documentType: 'CC',
    documentNumber: '46567890',
    birthDate: '1982-09-25',
    address: 'Calle 10 # 2-55, Ibagué'
  },

  // ══════════════════════════════════════
  // 6. DOCENTE
  // ══════════════════════════════════════
  {
    id: 'usr-006-docente',
    personId: 'per-006',
    firstName: 'Pedro Antonio',
    lastName: 'Vargas Moreno',
    email: 'pedro.vargas@esap.edu.co',
    phone: '+57 310 123 4506',
    status: 'active',
    roles: [
      {
        id: 'rol-006',
        name: 'Docente',
        code: 'DOCENTE',
        alcance: 'territorial',
        unidadOrganizacionalId: 'territorial-valle'
      }
    ],
    location: 'Cali',
    sedes: [
      {
        id: 'territorial-valle',
        codigo: 'ESAP-CALI',
        nombre: 'Territorial Valle - Cali',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-01-20',
    lastLogin: '2026-01-25T07:30:00Z',
    documentType: 'CC',
    documentNumber: '94678901',
    birthDate: '1978-06-14',
    address: 'Avenida 5N # 23-30, Cali',
    program: 'Maestría en Administración Pública'
  },

  // ══════════════════════════════════════
  // 7. ESTUDIANTE
  // ══════════════════════════════════════
  {
    id: 'usr-007-estudiante',
    personId: 'per-007',
    firstName: 'Laura Valentina',
    lastName: 'Cardona Silva',
    email: 'laura.cardona@estudiantes.esap.edu.co',
    phone: '+57 310 123 4507',
    status: 'active',
    roles: [
      {
        id: 'rol-007',
        name: 'Estudiante',
        code: 'ESTUDIANTE',
        alcance: 'territorial',
        unidadOrganizacionalId: 'territorial-antioquia'
      }
    ],
    location: 'Medellín',
    sedes: [
      {
        id: 'territorial-antioquia',
        codigo: 'ESAP-MED',
        nombre: 'Territorial Antioquia - Medellín',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'qr',
    enrollmentDate: '2024-07-15',
    lastLogin: '2026-01-25T11:45:00Z',
    documentType: 'CC',
    documentNumber: '1032789012',
    birthDate: '1999-02-28',
    address: 'Calle 50 # 70-15, Medellín',
    program: 'Pregrado en Administración Pública Territorial'
  },

  // ══════════════════════════════════════
  // 8. GRADUADO
  // ══════════════════════════════════════
  {
    id: 'usr-008-graduado',
    personId: 'per-008',
    firstName: 'Andrés Felipe',
    lastName: 'Gómez Castro',
    email: 'andres.gomez@graduados.esap.edu.co',
    phone: '+57 310 123 4508',
    status: 'active',
    roles: [
      {
        id: 'rol-008',
        name: 'Graduado',
        code: 'GRADUADO',
        alcance: 'nacional'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'ESAP-BOG',
        nombre: 'Sede Central - Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2022-05-10',
    lastLogin: '2026-01-20T18:30:00Z',
    documentType: 'CC',
    documentNumber: '1015890123',
    birthDate: '1995-08-22',
    address: 'Carrera 30 # 45-03, Bogotá',
    program: 'Especialización en Gestión Pública'
  },

  // ══════════════════════════════════════
  // 9. COORDINADOR ACADÉMICO
  // ══════════════════════════════════════
  {
    id: 'usr-009-coordacademico',
    personId: 'per-009',
    firstName: 'Diana Carolina',
    lastName: 'Rojas Medina',
    email: 'diana.rojas@esap.edu.co',
    phone: '+57 310 123 4509',
    status: 'active',
    roles: [
      {
        id: 'rol-009',
        name: 'Coordinador Académico',
        code: 'COORD_ACADEMICO',
        alcance: 'territorial',
        unidadOrganizacionalId: 'territorial-santander'
      }
    ],
    location: 'Bucaramanga',
    sedes: [
      {
        id: 'territorial-santander',
        codigo: 'ESAP-BUCA',
        nombre: 'Territorial Santander - Bucaramanga',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-09-01',
    lastLogin: '2026-01-24T15:00:00Z',
    documentType: 'CC',
    documentNumber: '63901234',
    birthDate: '1983-12-10',
    address: 'Calle 36 # 19-02, Bucaramanga'
  },

  // ══════════════════════════════════════
  // 10. SECRETARIO ACADÉMICO
  // ══════════════════════════════════════
  {
    id: 'usr-010-secacademico',
    personId: 'per-010',
    firstName: 'Roberto Carlos',
    lastName: 'Salazar Mejía',
    email: 'roberto.salazar@esap.edu.co',
    phone: '+57 310 123 4510',
    status: 'active',
    roles: [
      {
        id: 'rol-010',
        name: 'Secretario Académico',
        code: 'SECRETARIO_ACADEMICO',
        alcance: 'territorial',
        unidadOrganizacionalId: 'territorial-bolivar'
      }
    ],
    location: 'Cartagena',
    sedes: [
      {
        id: 'territorial-bolivar',
        codigo: 'ESAP-CTG',
        nombre: 'Territorial Bolívar - Cartagena',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-01-08',
    lastLogin: '2026-01-24T13:20:00Z',
    documentType: 'CC',
    documentNumber: '73012345',
    birthDate: '1981-05-03',
    address: 'Bocagrande, Carrera 3 # 8-60, Cartagena'
  },

  // ══════════════════════════════════════
  // 11. COORDINADOR DE CERTIFICADOS
  // ══════════════════════════════════════
  {
    id: 'usr-011-coordcertificados',
    personId: 'per-011',
    firstName: 'Sandra Milena',
    lastName: 'Quintero López',
    email: 'sandra.quintero@esap.edu.co',
    phone: '+57 310 123 4511',
    status: 'active',
    roles: [
      {
        id: 'rol-011',
        name: 'Coordinador de Certificados',
        code: 'COORD_CERTIFICADOS',
        alcance: 'territorial',
        unidadOrganizacionalId: 'territorial-nariño'
      }
    ],
    location: 'Pasto',
    sedes: [
      {
        id: 'territorial-nariño',
        codigo: 'ESAP-PST',
        nombre: 'Territorial Nariño - Pasto',
        nivel: 'territorial',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2024-02-20',
    lastLogin: '2026-01-24T12:00:00Z',
    documentType: 'CC',
    documentNumber: '59123456',
    birthDate: '1986-10-15',
    address: 'Calle 18 # 25-47, Pasto'
  },

  // ══════════════════════════════════════
  // 12. COORDINADOR DE ARQUITECTURA EMPRESARIAL
  // ══════════════════════════════════════
  {
    id: 'usr-012-coordarq',
    personId: 'per-012',
    firstName: 'Luis Fernando',
    lastName: 'Parra Cortés',
    email: 'luis.parra@esap.edu.co',
    phone: '+57 310 123 4512',
    status: 'active',
    roles: [
      {
        id: 'rol-012',
        name: 'Coordinador de Arquitectura Empresarial',
        code: 'COORD_ARQ_EMPRESARIAL',
        alcance: 'nacional'
      }
    ],
    location: 'Bogotá D.C.',
    sedes: [
      {
        id: 'sede-central',
        codigo: 'ESAP-BOG',
        nombre: 'Sede Central - Bogotá',
        nivel: 'sede-central',
        esPrincipal: true
      }
    ],
    enrollmentMethod: 'manual',
    enrollmentDate: '2023-11-01',
    lastLogin: '2026-01-25T09:00:00Z',
    documentType: 'CC',
    documentNumber: '79234567',
    birthDate: '1984-01-30',
    address: 'Calle 26 # 51-53, Bogotá'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtener usuario de ejemplo por código de rol
 */
export function obtenerUsuarioPorRol(codigoRol: string): UserWithSedes | undefined {
  return USUARIOS_EJEMPLO.find(
    usuario => usuario.roles.some(rol => rol.code === codigoRol)
  );
}

/**
 * Obtener usuario de ejemplo por email
 */
export function obtenerUsuarioPorEmail(email: string): UserWithSedes | undefined {
  return USUARIOS_EJEMPLO.find(usuario => usuario.email === email);
}

/**
 * Obtener usuarios por alcance
 */
export function obtenerUsuariosPorAlcance(
  alcance: 'nacional' | 'territorial' | 'cetap'
): UserWithSedes[] {
  return USUARIOS_EJEMPLO.filter(
    usuario => usuario.roles.some(rol => rol.alcance === alcance)
  );
}

/**
 * Obtener estadísticas de usuarios
 */
export function obtenerEstadisticasUsuarios() {
  return {
    total: USUARIOS_EJEMPLO.length,
    activos: USUARIOS_EJEMPLO.filter(u => u.status === 'active').length,
    bloqueados: USUARIOS_EJEMPLO.filter(u => u.status === 'blocked').length,
    pendientes: USUARIOS_EJEMPLO.filter(u => u.status === 'pending').length,
    porAlcance: {
      nacional: obtenerUsuariosPorAlcance('nacional').length,
      territorial: obtenerUsuariosPorAlcance('territorial').length,
      cetap: obtenerUsuariosPorAlcance('cetap').length
    }
  };
}

/**
 * Validar si un email es de ejemplo
 */
export function esUsuarioDeEjemplo(email: string): boolean {
  return USUARIOS_EJEMPLO.some(u => u.email === email);
}
