/**
 * DOCENTES GESTIÓN PROFESORAL
 * Datos de ejemplo para demostración
 */

export interface DocenteGestionProfesoral {
  id: string;
  personaId: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string;
  telefono?: string;
  direccion?: string;
  tipoVinculacion: 'planta' | 'hora-catedra' | 'ocasional';
  estado: 'activo' | 'inactivo' | 'licencia' | 'retirado';
}

// Datos de ejemplo para demostración
export const TODOS_LOS_DOCENTES: DocenteGestionProfesoral[] = [
  {
    id: 'DOC-001',
    personaId: 'PER-DOC-001',
    nombres: 'Carlos Eduardo',
    apellidos: 'Martínez Sánchez',
    tipoDocumento: 'CC',
    numeroDocumento: '79234567',
    email: 'carlos.martinez@esap.edu.co',
    telefono: '+57 310 5551111',
    direccion: 'Cra 15 # 45-30, Bogotá',
    tipoVinculacion: 'planta',
    estado: 'activo'
  },
  {
    id: 'DOC-002',
    personaId: 'PER-DOC-002',
    nombres: 'María Isabel',
    apellidos: 'Rodríguez Gómez',
    tipoDocumento: 'CC',
    numeroDocumento: '52678901',
    email: 'maria.rodriguez@esap.edu.co',
    telefono: '+57 315 5552222',
    direccion: 'Calle 72 # 10-34, Bogotá',
    tipoVinculacion: 'planta',
    estado: 'activo'
  },
  {
    id: 'DOC-003',
    personaId: 'PER-DOC-003',
    nombres: 'Jorge Andrés',
    apellidos: 'López Vargas',
    tipoDocumento: 'CC',
    numeroDocumento: '1015234567',
    email: 'jorge.lopez@esap.edu.co',
    telefono: '+57 318 5553333',
    tipoVinculacion: 'hora-catedra',
    estado: 'activo'
  },
  {
    id: 'DOC-004',
    personaId: 'PER-DOC-004',
    nombres: 'Ana Patricia',
    apellidos: 'Hernández Silva',
    tipoDocumento: 'CC',
    numeroDocumento: '52901234',
    email: 'ana.hernandez@esap.edu.co',
    telefono: '+57 320 5554444',
    direccion: 'Calle 100 # 19-20, Bogotá',
    tipoVinculacion: 'planta',
    estado: 'activo'
  },
  {
    id: 'DOC-005',
    personaId: 'PER-DOC-005',
    nombres: 'Luis Fernando',
    apellidos: 'Pérez Gutiérrez',
    tipoDocumento: 'CC',
    numeroDocumento: '80123456',
    email: 'luis.perez@esap.edu.co',
    telefono: '+57 312 5555555',
    tipoVinculacion: 'ocasional',
    estado: 'activo'
  },
  {
    id: 'DOC-006',
    personaId: 'PER-DOC-006',
    nombres: 'Sandra Milena',
    apellidos: 'Ramírez Castro',
    tipoDocumento: 'CC',
    numeroDocumento: '1045678901',
    email: 'sandra.ramirez@esap.edu.co',
    telefono: '+57 314 5556666',
    tipoVinculacion: 'hora-catedra',
    estado: 'activo'
  }
];