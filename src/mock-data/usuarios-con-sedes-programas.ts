/**
 * MOCK DATA: Usuarios con Sedes y Programas Académicos Integrados
 * Implementación del modelo Usuario Persona de ESAP
 * Actualizado: 30 de Noviembre, 2025
 */

import type { User, AsignacionSede, AsignacionPrograma } from '../types';

/**
 * Usuarios de ejemplo con asignaciones de sedes y programas
 */
export const usuariosConSedesYProgramas: Partial<User>[] = [
  // 1. ESTUDIANTE DE PREGRADO - SEDE NACIONAL BOGOTÁ
  {
    id: 'U-EST-001',
    username: 'juan.perez',
    email: 'juan.perez@esap.edu.co',
    firstName: 'Juan',
    lastName: 'Pérez García',
    fullName: 'Juan Pérez García',
    documentType: 'CC',
    documentNumber: '1234567890',
    phone: '3001234567',
    status: 'active',
    roles: [
      {
        id: 'R-001',
        name: 'estudiante',
        displayName: 'Estudiante',
        type: 'system',
        permissions: [],
        userCount: 3500,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    permissions: ['estudiante:*'],
    
    // TERRITORIAL - Dirección Territorial asignada
    territorialId: 'ter-cundinamarca',
    territorial: {
      id: 'ter-cundinamarca',
      codigo: 'ESAP-TER-CUN',
      nombre: 'Dirección Territorial Cundinamarca',
      departamento: 'Cundinamarca',
    },
    
    // SEDE PRINCIPAL - Sede específica asignada
    sedePrincipalId: 'SEDE-NAL',
    sedePrincipal: {
      id: 'SEDE-NAL',
      codigo: 'SEDE-NAL',
      nombre: 'Sede Nacional ESAP',
      nivel: 'nacional',
      ciudad: 'Bogotá D.C.',
      departamento: 'Cundinamarca',
    },
    asignacionesSedes: [
      {
        id: 'AS-001',
        usuarioId: 'U-EST-001',
        unidadId: 'SEDE-NAL',
        unidad: {
          id: 'SEDE-NAL',
          codigo: 'SEDE-NAL',
          nombre: 'Sede Nacional ESAP',
          nombreCorto: 'Nacional',
          nivel: 'nacional',
          ciudad: 'Bogotá D.C.',
          departamento: 'Cundinamarca',
        },
        rolId: 'R-001',
        rolNombre: 'Estudiante',
        ambitoAcceso: 'local',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2024-02-01T00:00:00Z',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z',
      },
    ],
    
    // PROGRAMA PRINCIPAL
    programaPrincipalId: 'AP-DIURNA',
    programaPrincipal: {
      id: 'AP-DIURNA',
      codigo: 'AP-DIURNA',
      nombre: 'Administración Pública Diurna',
      nivel: 'Pregrado',
      modalidad: 'Presencial',
    },
    asignacionesProgramas: [
      {
        id: 'AP-001',
        usuarioId: 'U-EST-001',
        programaId: 'AP-DIURNA',
        programa: {
          id: 'AP-DIURNA',
          codigo: 'AP-DIURNA',
          nombre: 'Administración Pública Diurna',
          nivel: 'Pregrado',
          modalidad: 'Presencial',
        },
        rolId: 'R-001',
        rolNombre: 'Estudiante',
        ambitoAcceso: 'local',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2024-02-01T00:00:00Z',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z',
      },
    ],
    
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
  },

  // 2. DOCENTE CON MÚLTIPLES SEDES Y PROGRAMAS
  {
    id: 'U-DOC-001',
    username: 'maria.gonzalez',
    email: 'maria.gonzalez@esap.edu.co',
    firstName: 'María',
    lastName: 'González Rodríguez',
    fullName: 'María González Rodríguez',
    documentType: 'CC',
    documentNumber: '9876543210',
    phone: '3109876543',
    status: 'active',
    roles: [
      {
        id: 'R-003',
        name: 'docente',
        displayName: 'Docente',
        type: 'system',
        permissions: [],
        userCount: 450,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    permissions: ['docente:*'],
    
    // MÚLTIPLES SEDES
    sedePrincipalId: 'SEDE-NAL',
    sedePrincipal: {
      id: 'SEDE-NAL',
      codigo: 'SEDE-NAL',
      nombre: 'Sede Nacional ESAP',
      nivel: 'nacional',
    },
    asignacionesSedes: [
      {
        id: 'AS-002',
        usuarioId: 'U-DOC-001',
        unidadId: 'SEDE-NAL',
        unidad: {
          id: 'SEDE-NAL',
          codigo: 'SEDE-NAL',
          nombre: 'Sede Nacional ESAP',
          nombreCorto: 'Nacional',
          nivel: 'nacional',
          ciudad: 'Bogotá D.C.',
          departamento: 'Cundinamarca',
        },
        rolId: 'R-003',
        rolNombre: 'Docente',
        ambitoAcceso: 'territorial',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2020-03-01T00:00:00Z',
        createdAt: '2020-03-01T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
      {
        id: 'AS-003',
        usuarioId: 'U-DOC-001',
        unidadId: 'DIR-ATL',
        unidad: {
          id: 'DIR-ATL',
          codigo: 'DIR-ATL',
          nombre: 'Dirección Territorial Atlántico',
          nombreCorto: 'Barranquilla',
          nivel: 'territorial',
          ciudad: 'Barranquilla',
          departamento: 'Atlántico',
        },
        rolId: 'R-003',
        rolNombre: 'Docente',
        ambitoAcceso: 'local',
        esPrincipal: false,
        estado: 'activa',
        fechaInicio: '2022-08-01T00:00:00Z',
        createdAt: '2022-08-01T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
    ],
    
    // MÚLTIPLES PROGRAMAS
    programaPrincipalId: 'AP-DIURNA',
    programaPrincipal: {
      id: 'AP-DIURNA',
      codigo: 'AP-DIURNA',
      nombre: 'Administración Pública Diurna',
      nivel: 'Pregrado',
      modalidad: 'Presencial',
    },
    asignacionesProgramas: [
      {
        id: 'AP-002',
        usuarioId: 'U-DOC-001',
        programaId: 'AP-DIURNA',
        programa: {
          id: 'AP-DIURNA',
          codigo: 'AP-DIURNA',
          nombre: 'Administración Pública Diurna',
          nivel: 'Pregrado',
          modalidad: 'Presencial',
        },
        rolId: 'R-003',
        rolNombre: 'Docente',
        ambitoAcceso: 'territorial',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2020-03-01T00:00:00Z',
        createdAt: '2020-03-01T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
      {
        id: 'AP-003',
        usuarioId: 'U-DOC-001',
        programaId: 'MAE-AP',
        programa: {
          id: 'MAE-AP',
          codigo: 'MAE-AP',
          nombre: 'Maestría en Administración Pública',
          nivel: 'Maestría',
          modalidad: 'Virtual',
        },
        rolId: 'R-003',
        rolNombre: 'Docente',
        ambitoAcceso: 'nacional',
        esPrincipal: false,
        estado: 'activa',
        fechaInicio: '2021-01-15T00:00:00Z',
        createdAt: '2021-01-15T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
      {
        id: 'AP-004',
        usuarioId: 'U-DOC-001',
        programaId: 'APT-PRE',
        programa: {
          id: 'APT-PRE',
          codigo: 'APT-PRE',
          nombre: 'Administración Pública Territorial',
          nivel: 'Pregrado',
          modalidad: 'Distancia',
        },
        rolId: 'R-003',
        rolNombre: 'Docente',
        ambitoAcceso: 'local',
        esPrincipal: false,
        estado: 'activa',
        fechaInicio: '2022-08-01T00:00:00Z',
        createdAt: '2022-08-01T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
    ],
    
    createdAt: '2020-03-01T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
  },

  // 3. ADMINISTRATIVO CON ACCESO NACIONAL
  {
    id: 'U-ADM-001',
    username: 'carlos.ramirez',
    email: 'carlos.ramirez@esap.edu.co',
    firstName: 'Carlos',
    lastName: 'Ramírez López',
    fullName: 'Carlos Ramírez López',
    documentType: 'CC',
    documentNumber: '5555555555',
    phone: '3155555555',
    status: 'active',
    roles: [
      {
        id: 'R-004',
        name: 'admin',
        displayName: 'Administrador',
        type: 'system',
        permissions: [],
        userCount: 25,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    permissions: ['admin:*', '*:*'],
    
    // ACCESO NACIONAL
    sedePrincipalId: 'SEDE-NAL',
    sedePrincipal: {
      id: 'SEDE-NAL',
      codigo: 'SEDE-NAL',
      nombre: 'Sede Nacional ESAP',
      nivel: 'nacional',
    },
    asignacionesSedes: [
      {
        id: 'AS-004',
        usuarioId: 'U-ADM-001',
        unidadId: 'SEDE-NAL',
        unidad: {
          id: 'SEDE-NAL',
          codigo: 'SEDE-NAL',
          nombre: 'Sede Nacional ESAP',
          nombreCorto: 'Nacional',
          nivel: 'nacional',
          ciudad: 'Bogotá D.C.',
          departamento: 'Cundinamarca',
        },
        rolId: 'R-004',
        rolNombre: 'Administrador',
        ambitoAcceso: 'nacional', // ✅ Acceso a TODAS las sedes
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2019-01-15T00:00:00Z',
        createdAt: '2019-01-15T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
    ],
    ambitoAccesoMaximo: 'nacional',
    
    // Sin programas (no es docente ni estudiante)
    asignacionesProgramas: [],
    
    createdAt: '2019-01-15T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
  },

  // 4. GRADUADO (anterior estudiante)
  {
    id: 'U-GRAD-001',
    username: 'ana.martinez',
    email: 'ana.martinez@esap.edu.co',
    firstName: 'Ana',
    lastName: 'Martínez Suárez',
    fullName: 'Ana Martínez Suárez',
    documentType: 'CC',
    documentNumber: '7777777777',
    phone: '3207777777',
    status: 'active',
    roles: [
      {
        id: 'R-005',
        name: 'graduado',
        displayName: 'Graduado',
        type: 'system',
        permissions: [],
        userCount: 12000,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    permissions: ['graduado:*'],
    
    // SEDE DONDE SE GRADUÓ
    sedePrincipalId: 'DIR-VAL',
    sedePrincipal: {
      id: 'DIR-VAL',
      codigo: 'DIR-VAL',
      nombre: 'Dirección Territorial Valle del Cauca',
      nivel: 'territorial',
    },
    asignacionesSedes: [
      {
        id: 'AS-005',
        usuarioId: 'U-GRAD-001',
        unidadId: 'DIR-VAL',
        unidad: {
          id: 'DIR-VAL',
          codigo: 'DIR-VAL',
          nombre: 'Dirección Territorial Valle del Cauca',
          nombreCorto: 'Cali',
          nivel: 'territorial',
          ciudad: 'Cali',
          departamento: 'Valle del Cauca',
        },
        rolId: 'R-005',
        rolNombre: 'Graduado',
        ambitoAcceso: 'local',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2018-02-01T00:00:00Z',
        fechaFin: '2023-12-15T00:00:00Z', // ✅ Fecha de graduación
        createdAt: '2018-02-01T00:00:00Z',
        updatedAt: '2023-12-15T00:00:00Z',
      },
    ],
    
    // PROGRAMA DEL QUE SE GRADUÓ
    programaPrincipalId: 'ECO-PRE',
    programaPrincipal: {
      id: 'ECO-PRE',
      codigo: 'ECO-PRE',
      nombre: 'Economía',
      nivel: 'Pregrado',
      modalidad: 'Presencial',
    },
    asignacionesProgramas: [
      {
        id: 'AP-005',
        usuarioId: 'U-GRAD-001',
        programaId: 'ECO-PRE',
        programa: {
          id: 'ECO-PRE',
          codigo: 'ECO-PRE',
          nombre: 'Economía',
          nivel: 'Pregrado',
          modalidad: 'Presencial',
        },
        rolId: 'R-005',
        rolNombre: 'Graduado',
        ambitoAcceso: 'local',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2018-02-01T00:00:00Z',
        fechaFin: '2023-12-15T00:00:00Z', // ✅ Fecha de graduación
        createdAt: '2018-02-01T00:00:00Z',
        updatedAt: '2023-12-15T00:00:00Z',
      },
    ],
    
    createdAt: '2018-02-01T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
  },

  // 5. ESTUDIANTE DE MAESTRÍA - MODALIDAD VIRTUAL (ACCESO NACIONAL)
  {
    id: 'U-EST-002',
    username: 'pedro.sanchez',
    email: 'pedro.sanchez@esap.edu.co',
    firstName: 'Pedro',
    lastName: 'Sánchez Torres',
    fullName: 'Pedro Sánchez Torres',
    documentType: 'CC',
    documentNumber: '8888888888',
    phone: '3208888888',
    status: 'active',
    roles: [
      {
        id: 'R-001',
        name: 'estudiante',
        displayName: 'Estudiante',
        type: 'system',
        permissions: [],
        userCount: 3500,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    permissions: ['estudiante:*'],
    
    // SEDE PRINCIPAL
    sedePrincipalId: 'DIR-ARA',
    sedePrincipal: {
      id: 'DIR-ARA',
      codigo: 'DIR-ARA',
      nombre: 'Dirección Territorial Arauca',
      nivel: 'territorial',
    },
    asignacionesSedes: [
      {
        id: 'AS-006',
        usuarioId: 'U-EST-002',
        unidadId: 'DIR-ARA',
        unidad: {
          id: 'DIR-ARA',
          codigo: 'DIR-ARA',
          nombre: 'Dirección Territorial Arauca',
          nombreCorto: 'Arauca',
          nivel: 'territorial',
          ciudad: 'Arauca',
          departamento: 'Arauca',
        },
        rolId: 'R-001',
        rolNombre: 'Estudiante',
        ambitoAcceso: 'local',
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2024-08-01T00:00:00Z',
        createdAt: '2024-08-01T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
    ],
    
    // PROGRAMA VIRTUAL
    programaPrincipalId: 'MAE-DH',
    programaPrincipal: {
      id: 'MAE-DH',
      codigo: 'MAE-DH',
      nombre: 'Maestría en Derechos Humanos',
      nivel: 'Maestría',
      modalidad: 'Virtual',
    },
    asignacionesProgramas: [
      {
        id: 'AP-006',
        usuarioId: 'U-EST-002',
        programaId: 'MAE-DH',
        programa: {
          id: 'MAE-DH',
          codigo: 'MAE-DH',
          nombre: 'Maestría en Derechos Humanos',
          nivel: 'Maestría',
          modalidad: 'Virtual',
        },
        rolId: 'R-001',
        rolNombre: 'Estudiante',
        ambitoAcceso: 'nacional', // ✅ Virtual = acceso nacional
        esPrincipal: true,
        estado: 'activa',
        fechaInicio: '2024-08-01T00:00:00Z',
        createdAt: '2024-08-01T00:00:00Z',
        updatedAt: '2024-11-30T00:00:00Z',
      },
    ],
    
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
  },
];

/**
 * Helper: Obtener usuarios por sede
 */
export function getUsuariosPorSede(codigoSede: string): Partial<User>[] {
  return usuariosConSedesYProgramas.filter((user) =>
    user.asignacionesSedes?.some(
      (asignacion) => asignacion.unidad?.codigo === codigoSede && asignacion.estado === 'activa'
    )
  );
}

/**
 * Helper: Obtener usuarios por programa
 */
export function getUsuariosPorPrograma(codigoPrograma: string): Partial<User>[] {
  return usuariosConSedesYProgramas.filter((user) =>
    user.asignacionesProgramas?.some(
      (asignacion) =>
        asignacion.programa?.codigo === codigoPrograma && asignacion.estado === 'activa'
    )
  );
}

/**
 * Helper: Obtener usuarios por sede Y programa (cruce)
 */
export function getUsuariosPorSedeYPrograma(
  codigoSede: string,
  codigoPrograma: string
): Partial<User>[] {
  return usuariosConSedesYProgramas.filter((user) => {
    const tieneSede = user.asignacionesSedes?.some(
      (asignacion) => asignacion.unidad?.codigo === codigoSede && asignacion.estado === 'activa'
    );
    const tienePrograma = user.asignacionesProgramas?.some(
      (asignacion) =>
        asignacion.programa?.codigo === codigoPrograma && asignacion.estado === 'activa'
    );
    return tieneSede && tienePrograma;
  });
}

/**
 * Helper: Obtener estadísticas de distribución
 */
export function getEstadisticasDistribucion() {
  const porSede: Record<string, number> = {};
  const porPrograma: Record<string, number> = {};

  usuariosConSedesYProgramas.forEach((user) => {
    // Contar por sede
    user.asignacionesSedes?.forEach((asignacion) => {
      if (asignacion.estado === 'activa' && asignacion.unidad?.codigo) {
        porSede[asignacion.unidad.codigo] = (porSede[asignacion.unidad.codigo] || 0) + 1;
      }
    });

    // Contar por programa
    user.asignacionesProgramas?.forEach((asignacion) => {
      if (asignacion.estado === 'activa' && asignacion.programa?.codigo) {
        porPrograma[asignacion.programa.codigo] = (porPrograma[asignacion.programa.codigo] || 0) + 1;
      }
    });
  });

  return {
    porSede,
    porPrograma,
    totalUsuarios: usuariosConSedesYProgramas.length,
  };
}