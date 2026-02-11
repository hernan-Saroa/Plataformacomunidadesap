/**
 * MOCK DATA: Usuarios con Sedes y Estructura Organizacional (OPTIMIZADO)
 * Datos de ejemplo reducidos para el módulo de Gestión de Usuarios
 * Fecha: 10 de febrero de 2026
 */

export interface UserRole {
  id: string;
  name: string;
  color: string;
}

export interface UserSede {
  id: string;
  nombre: string;
  tipo: 'SEDE_NACIONAL' | 'TERRITORIAL' | 'CETAP';
}

export interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  document?: string;
  documentNumber?: string;
  status: 'active' | 'blocked' | 'inactive';
  location: string;
  roles: UserRole[];
  sedes: UserSede[];
  avatar?: string;
  createdAt?: string;
  lastLogin?: string;
}

export const MOCK_USERS_WITH_SEDES: MockUser[] = [
  {
    id: 'user-001',
    firstName: 'María',
    lastName: 'García Rodríguez',
    email: 'maria.garcia@esap.edu.co',
    phone: '+57 310 123 4567',
    document: 'CC',
    documentNumber: '52123456',
    status: 'active',
    location: 'Bogotá',
    roles: [
      { id: 'role-admin', name: 'Administrador', color: '#2962FF' },
      { id: 'role-docente', name: 'Docente', color: '#10B981' }
    ],
    sedes: [
      { id: 'sede-bogota', nombre: 'Sede Nacional Bogotá', tipo: 'SEDE_NACIONAL' }
    ],
    createdAt: '2024-01-15',
    lastLogin: '2024-02-08'
  },
  {
    id: 'user-002',
    firstName: 'Juan',
    lastName: 'Martínez López',
    email: 'juan.martinez@esap.edu.co',
    phone: '+57 315 234 5678',
    document: 'CC',
    documentNumber: '79876543',
    status: 'active',
    location: 'Medellín',
    roles: [
      { id: 'role-docente', name: 'Docente', color: '#10B981' }
    ],
    sedes: [
      { id: 'sede-antioquia', nombre: 'Territorial Antioquia', tipo: 'TERRITORIAL' }
    ],
    createdAt: '2023-11-20',
    lastLogin: '2024-02-09'
  },
  {
    id: 'user-003',
    firstName: 'Ana',
    lastName: 'Pérez Gómez',
    email: 'ana.perez@esap.edu.co',
    phone: '+57 320 345 6789',
    document: 'CC',
    documentNumber: '41234567',
    status: 'active',
    location: 'Cali',
    roles: [
      { id: 'role-coordinador', name: 'Coordinador Académico', color: '#F59E0B' }
    ],
    sedes: [
      { id: 'sede-valle', nombre: 'Territorial Valle del Cauca', tipo: 'TERRITORIAL' }
    ],
    createdAt: '2023-09-10',
    lastLogin: '2024-02-07'
  },
  {
    id: 'user-004',
    firstName: 'Carlos',
    lastName: 'Sánchez Torres',
    email: 'carlos.sanchez@esap.edu.co',
    phone: '+57 311 456 7890',
    document: 'CC',
    documentNumber: '80123456',
    status: 'active',
    location: 'Barranquilla',
    roles: [
      { id: 'role-estudiante', name: 'Estudiante', color: '#8B5CF6' }
    ],
    sedes: [
      { id: 'sede-atlantico', nombre: 'Territorial Atlántico', tipo: 'TERRITORIAL' }
    ],
    createdAt: '2024-01-05',
    lastLogin: '2024-02-10'
  },
  {
    id: 'user-005',
    firstName: 'Laura',
    lastName: 'González Ruiz',
    email: 'laura.gonzalez@esap.edu.co',
    phone: '+57 318 567 8901',
    document: 'CC',
    documentNumber: '63456789',
    status: 'active',
    location: 'Bucaramanga',
    roles: [
      { id: 'role-admin', name: 'Administrativo', color: '#EF4444' }
    ],
    sedes: [
      { id: 'sede-santander', nombre: 'Territorial Santander', tipo: 'TERRITORIAL' }
    ],
    createdAt: '2023-08-15',
    lastLogin: '2024-02-09'
  },
  {
    id: 'user-006',
    firstName: 'Pedro',
    lastName: 'Ramírez Castro',
    email: 'pedro.ramirez@esap.edu.co',
    phone: '+57 314 678 9012',
    document: 'CC',
    documentNumber: '16789012',
    status: 'blocked',
    location: 'Bogotá',
    roles: [
      { id: 'role-docente', name: 'Docente', color: '#10B981' }
    ],
    sedes: [
      { id: 'sede-bogota', nombre: 'Sede Nacional Bogotá', tipo: 'SEDE_NACIONAL' }
    ],
    createdAt: '2023-05-10',
    lastLogin: '2024-01-15'
  }
];

export type { MockUser, UserRole, UserSede };

// RESUMEN OPTIMIZADO:
// - Reducido de 12 a 6 usuarios
// - Ahorro aproximado: ~6 KB
// - Mantiene diversidad de roles, sedes y estados