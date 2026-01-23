/**
 * EMPLEADOS ELEGIBLES PARA CERTIFICADOS
 * Datos de ejemplo para demostración
 */

export interface EmpleadoElegible {
  id: string;
  firstName: string;
  lastName: string;
  document: string;
  email: string;
  location: string;
  status?: 'active' | 'inactive';
  roles?: Array<{ name: string; id: string }>;
}

export interface DatosLaborales {
  cargo: string;
  dependencia: string;
  tipoVinculacion: string;
  fechaVinculacion: string;
  grado?: string;
  salario: number;
  sede: string;
  funciones?: string[];
}

// Datos de ejemplo para demostración
export const EMPLEADOS_ELEGIBLES: EmpleadoElegible[] = [
  {
    id: 'EMP-001',
    firstName: 'Carlos Eduardo',
    lastName: 'Martínez Sánchez',
    document: '79234567',
    email: 'carlos.martinez@esap.edu.co',
    location: 'Bogotá D.C.',
    status: 'active',
    roles: [{ id: 'ROL-001', name: 'Coordinador Académico' }]
  },
  {
    id: 'EMP-002',
    firstName: 'María Isabel',
    lastName: 'Rodríguez Gómez',
    document: '52678901',
    email: 'maria.rodriguez@esap.edu.co',
    location: 'Bogotá D.C.',
    status: 'active',
    roles: [{ id: 'ROL-002', name: 'Directora de Investigación' }]
  },
  {
    id: 'EMP-003',
    firstName: 'Jorge Andrés',
    lastName: 'López Vargas',
    document: '1015234567',
    email: 'jorge.lopez@esap.edu.co',
    location: 'Antioquia',
    status: 'active',
    roles: [{ id: 'ROL-003', name: 'Profesional Administrativo' }]
  }
];

export const DATOS_LABORALES: Record<string, DatosLaborales> = {
  'EMP-001': {
    cargo: 'Coordinador Académico',
    dependencia: 'Vicerrectoría Académica',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2018-03-15',
    grado: '15',
    salario: 6500000,
    sede: 'Sede Central Bogotá',
    funciones: [
      'Coordinar actividades académicas de la Vicerrectoría',
      'Supervisar procesos de registro académico',
      'Gestionar cronogramas académicos institucionales',
      'Apoyar procesos de autoevaluación y acreditación'
    ]
  },
  'EMP-002': {
    cargo: 'Directora de Investigación',
    dependencia: 'Dirección de Investigaciones',
    tipoVinculacion: 'Planta',
    fechaVinculacion: '2015-08-01',
    grado: '18',
    salario: 8200000,
    sede: 'Sede Central Bogotá',
    funciones: [
      'Dirigir la política institucional de investigación',
      'Coordinar grupos de investigación',
      'Gestionar convocatorias internas de investigación',
      'Representar a ESAP en eventos académicos nacionales e internacionales'
    ]
  },
  'EMP-003': {
    cargo: 'Profesional Administrativo',
    dependencia: 'Territorial Antioquia',
    tipoVinculacion: 'Contrato',
    fechaVinculacion: '2020-02-10',
    salario: 3500000,
    sede: 'Territorial Antioquia',
    funciones: [
      'Apoyar procesos administrativos de la Territorial',
      'Gestionar trámites académicos',
      'Atender consultas de estudiantes y docentes'
    ]
  }
};

// Función helper
export function getDatosLaboralesCompletos(empleadoId: string): DatosLaborales | null {
  return DATOS_LABORALES[empleadoId] || null;
}
