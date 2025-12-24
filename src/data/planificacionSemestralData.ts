/**
 * PLANIFICACIÓN SEMESTRAL - ESAP
 * Sistema completo de planificación académica por semestre
 * Gestión de demanda educativa y necesidades docentes
 */

export interface AsignaturaProgramada {
  codigo: string;
  nombre: string;
  creditos: number;
  semestre: number; // Semestre del programa (1-8)
  horasSemanales: number;
  requiereDocente: 'planta' | 'catedra' | 'ambos';
  tipoAsignatura: 'obligatoria' | 'electiva' | 'practica';
}

export interface GrupoProgramado {
  id: string;
  asignaturaId: string;
  numeroGrupo: number;
  estudiantesMatriculados: number;
  capacidadMaxima: number;
  modalidad: 'presencial' | 'virtual' | 'hibrido';
  horario: string;
  aula?: string;
  docenteAsignado?: string; // ID del docente
}

export interface ProgramaAcademicoPlanificado {
  codigo: string;
  nombre: string;
  nivel: 'Pregrado' | 'Especialización' | 'Maestría';
  sede: string;
  modalidad: 'Presencial' | 'Virtual' | 'Distancia';
  asignaturas: AsignaturaProgramada[];
  grupos: GrupoProgramado[];
  estudiantesActivos: number;
  docentesNecesarios: number;
  docentesDisponibles: number;
  deficit?: number; // Docentes faltantes
}

export interface SedePlanificada {
  codigo: string;
  nombre: string;
  departamento: string;
  ciudad: string;
  activa: boolean;
  programas: ProgramaAcademicoPlanificado[];
  totalEstudiantes: number;
  totalDocentes: number;
  docentesPlanta: number;
  docentesCatedra: number;
  necesidadConvocatoria: boolean;
}

export interface PlanificacionSemestral {
  id: string;
  periodo: string; // '2025-1', '2025-2'
  año: number;
  semestre: 1 | 2;
  fechaInicio: string;
  fechaFin: string;
  estado: 'planificacion' | 'en-curso' | 'finalizado';
  sedes: SedePlanificada[];
  resumenGlobal: {
    sedesActivas: number;
    programasActivos: number;
    totalEstudiantes: number;
    totalGrupos: number;
    docentesNecesarios: number;
    docentesPlantaDisponibles: number;
    docentesCatedraDisponibles: number;
    deficit: number;
    convocatoriasRequeridas: number;
  };
}

// ============================================================================
// ASIGNATURAS POR PROGRAMA
// ============================================================================

export const ASIGNATURAS_ADMINISTRACION_PUBLICA: AsignaturaProgramada[] = [
  {
    codigo: 'AP-101',
    nombre: 'Introducción a la Administración Pública',
    creditos: 4,
    semestre: 1,
    horasSemanales: 4,
    requiereDocente: 'ambos',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-102',
    nombre: 'Teoría del Estado y Constitución Política',
    creditos: 4,
    semestre: 1,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-103',
    nombre: 'Matemáticas Básicas',
    creditos: 3,
    semestre: 1,
    horasSemanales: 3,
    requiereDocente: 'catedra',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-104',
    nombre: 'Competencias Comunicativas',
    creditos: 3,
    semestre: 1,
    horasSemanales: 3,
    requiereDocente: 'catedra',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-201',
    nombre: 'Gestión Pública',
    creditos: 4,
    semestre: 2,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-202',
    nombre: 'Derecho Administrativo',
    creditos: 4,
    semestre: 2,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-203',
    nombre: 'Economía Política',
    creditos: 3,
    semestre: 2,
    horasSemanales: 3,
    requiereDocente: 'ambos',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-301',
    nombre: 'Políticas Públicas I',
    creditos: 4,
    semestre: 3,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-302',
    nombre: 'Presupuesto Público',
    creditos: 4,
    semestre: 3,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-303',
    nombre: 'Estadística Aplicada',
    creditos: 3,
    semestre: 3,
    horasSemanales: 3,
    requiereDocente: 'catedra',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-401',
    nombre: 'Políticas Públicas II',
    creditos: 4,
    semestre: 4,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-402',
    nombre: 'Gestión Territorial',
    creditos: 4,
    semestre: 4,
    horasSemanales: 4,
    requiereDocente: 'ambos',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-501',
    nombre: 'Gerencia Pública',
    creditos: 4,
    semestre: 5,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'AP-502',
    nombre: 'Electiva Profesional I',
    creditos: 3,
    semestre: 5,
    horasSemanales: 3,
    requiereDocente: 'ambos',
    tipoAsignatura: 'electiva'
  },
  {
    codigo: 'AP-601',
    nombre: 'Práctica Profesional',
    creditos: 6,
    semestre: 6,
    horasSemanales: 6,
    requiereDocente: 'planta',
    tipoAsignatura: 'practica'
  },
  {
    codigo: 'AP-602',
    nombre: 'Seminario de Grado',
    creditos: 4,
    semestre: 6,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  }
];

export const ASIGNATURAS_ESPECIALIZACION_GP: AsignaturaProgramada[] = [
  {
    codigo: 'ESP-GP-101',
    nombre: 'Fundamentos de Gestión Pública',
    creditos: 3,
    semestre: 1,
    horasSemanales: 3,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'ESP-GP-102',
    nombre: 'Planeación Estratégica',
    creditos: 3,
    semestre: 1,
    horasSemanales: 3,
    requiereDocente: 'ambos',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'ESP-GP-103',
    nombre: 'Gestión Financiera Pública',
    creditos: 3,
    semestre: 1,
    horasSemanales: 3,
    requiereDocente: 'catedra',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'ESP-GP-201',
    nombre: 'Gestión del Talento Humano',
    creditos: 3,
    semestre: 2,
    horasSemanales: 3,
    requiereDocente: 'ambos',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'ESP-GP-202',
    nombre: 'Control y Evaluación Pública',
    creditos: 3,
    semestre: 2,
    horasSemanales: 3,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'ESP-GP-203',
    nombre: 'Trabajo de Grado',
    creditos: 4,
    semestre: 2,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  }
];

export const ASIGNATURAS_MAESTRIA_AP: AsignaturaProgramada[] = [
  {
    codigo: 'MAE-AP-101',
    nombre: 'Teorías de Administración Pública',
    creditos: 4,
    semestre: 1,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'MAE-AP-102',
    nombre: 'Metodología de Investigación',
    creditos: 4,
    semestre: 1,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'MAE-AP-103',
    nombre: 'Políticas Públicas Avanzadas',
    creditos: 4,
    semestre: 1,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'MAE-AP-201',
    nombre: 'Seminario de Tesis I',
    creditos: 4,
    semestre: 2,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'MAE-AP-202',
    nombre: 'Gobernanza y Estado',
    creditos: 4,
    semestre: 2,
    horasSemanales: 4,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'MAE-AP-301',
    nombre: 'Seminario de Tesis II',
    creditos: 6,
    semestre: 3,
    horasSemanales: 6,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  },
  {
    codigo: 'MAE-AP-302',
    nombre: 'Electiva de Profundización',
    creditos: 3,
    semestre: 3,
    horasSemanales: 3,
    requiereDocente: 'ambos',
    tipoAsignatura: 'electiva'
  },
  {
    codigo: 'MAE-AP-401',
    nombre: 'Tesis de Maestría',
    creditos: 8,
    semestre: 4,
    horasSemanales: 8,
    requiereDocente: 'planta',
    tipoAsignatura: 'obligatoria'
  }
];

// ============================================================================
// PLANIFICACIÓN 2025-1 - EJEMPLO COMPLETO
// ============================================================================

export const PLANIFICACION_2025_1: PlanificacionSemestral = {
  id: 'PLAN-2025-1',
  periodo: '2025-1',
  año: 2025,
  semestre: 1,
  fechaInicio: '2025-02-03',
  fechaFin: '2025-06-15',
  estado: 'planificacion',
  sedes: [
    // SEDE NACIONAL - BOGOTÁ
    {
      codigo: 'SEDE-NAL',
      nombre: 'Sede Nacional',
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá D.C.',
      activa: true,
      programas: [
        {
          codigo: 'APT-PRE',
          nombre: 'Administración Pública Territorial',
          nivel: 'Pregrado',
          sede: 'Sede Nacional',
          modalidad: 'Presencial',
          asignaturas: ASIGNATURAS_ADMINISTRACION_PUBLICA,
          grupos: [
            // SEMESTRE 1
            { id: 'GRP-NAL-AP-101-A', asignaturaId: 'AP-101', numeroGrupo: 1, estudiantesMatriculados: 45, capacidadMaxima: 50, modalidad: 'presencial', horario: 'Lunes 7:00-11:00' },
            { id: 'GRP-NAL-AP-101-B', asignaturaId: 'AP-101', numeroGrupo: 2, estudiantesMatriculados: 42, capacidadMaxima: 50, modalidad: 'presencial', horario: 'Martes 7:00-11:00' },
            { id: 'GRP-NAL-AP-102-A', asignaturaId: 'AP-102', numeroGrupo: 1, estudiantesMatriculados: 87, capacidadMaxima: 90, modalidad: 'presencial', horario: 'Miércoles 7:00-11:00' },
            { id: 'GRP-NAL-AP-103-A', asignaturaId: 'AP-103', numeroGrupo: 1, estudiantesMatriculados: 44, capacidadMaxima: 50, modalidad: 'presencial', horario: 'Jueves 7:00-10:00' },
            { id: 'GRP-NAL-AP-103-B', asignaturaId: 'AP-103', numeroGrupo: 2, estudiantesMatriculados: 43, capacidadMaxima: 50, modalidad: 'presencial', horario: 'Viernes 7:00-10:00' },
            { id: 'GRP-NAL-AP-104-A', asignaturaId: 'AP-104', numeroGrupo: 1, estudiantesMatriculados: 87, capacidadMaxima: 90, modalidad: 'presencial', horario: 'Viernes 14:00-17:00' },
            // SEMESTRE 2
            { id: 'GRP-NAL-AP-201-A', asignaturaId: 'AP-201', numeroGrupo: 1, estudiantesMatriculados: 78, capacidadMaxima: 80, modalidad: 'presencial', horario: 'Lunes 14:00-18:00' },
            { id: 'GRP-NAL-AP-202-A', asignaturaId: 'AP-202', numeroGrupo: 1, estudiantesMatriculados: 76, capacidadMaxima: 80, modalidad: 'presencial', horario: 'Martes 14:00-18:00' },
            { id: 'GRP-NAL-AP-203-A', asignaturaId: 'AP-203', numeroGrupo: 1, estudiantesMatriculados: 38, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Miércoles 14:00-17:00' },
            { id: 'GRP-NAL-AP-203-B', asignaturaId: 'AP-203', numeroGrupo: 2, estudiantesMatriculados: 38, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Jueves 14:00-17:00' },
            // SEMESTRE 3
            { id: 'GRP-NAL-AP-301-A', asignaturaId: 'AP-301', numeroGrupo: 1, estudiantesMatriculados: 65, capacidadMaxima: 70, modalidad: 'presencial', horario: 'Lunes 18:00-22:00' },
            { id: 'GRP-NAL-AP-302-A', asignaturaId: 'AP-302', numeroGrupo: 1, estudiantesMatriculados: 65, capacidadMaxima: 70, modalidad: 'presencial', horario: 'Miércoles 18:00-22:00' },
            { id: 'GRP-NAL-AP-303-A', asignaturaId: 'AP-303', numeroGrupo: 1, estudiantesMatriculados: 32, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Viernes 18:00-21:00' },
            { id: 'GRP-NAL-AP-303-B', asignaturaId: 'AP-303', numeroGrupo: 2, estudiantesMatriculados: 33, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Sábado 8:00-11:00' }
          ],
          estudiantesActivos: 673,
          docentesNecesarios: 18,
          docentesDisponibles: 15,
          deficit: 3
        },
        {
          codigo: 'ESP-GP',
          nombre: 'Especialización en Gestión Pública',
          nivel: 'Especialización',
          sede: 'Sede Nacional',
          modalidad: 'Presencial',
          asignaturas: ASIGNATURAS_ESPECIALIZACION_GP,
          grupos: [
            { id: 'GRP-NAL-ESP-101-A', asignaturaId: 'ESP-GP-101', numeroGrupo: 1, estudiantesMatriculados: 32, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Viernes 18:00-21:00' },
            { id: 'GRP-NAL-ESP-102-A', asignaturaId: 'ESP-GP-102', numeroGrupo: 1, estudiantesMatriculados: 32, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Sábado 8:00-11:00' },
            { id: 'GRP-NAL-ESP-103-A', asignaturaId: 'ESP-GP-103', numeroGrupo: 1, estudiantesMatriculados: 32, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Sábado 14:00-17:00' },
            { id: 'GRP-NAL-ESP-201-A', asignaturaId: 'ESP-GP-201', numeroGrupo: 1, estudiantesMatriculados: 28, capacidadMaxima: 30, modalidad: 'presencial', horario: 'Viernes 18:00-21:00' },
            { id: 'GRP-NAL-ESP-202-A', asignaturaId: 'ESP-GP-202', numeroGrupo: 1, estudiantesMatriculados: 28, capacidadMaxima: 30, modalidad: 'presencial', horario: 'Sábado 8:00-11:00' },
            { id: 'GRP-NAL-ESP-203-A', asignaturaId: 'ESP-GP-203', numeroGrupo: 1, estudiantesMatriculados: 28, capacidadMaxima: 30, modalidad: 'presencial', horario: 'Trabajo Individual' }
          ],
          estudiantesActivos: 180,
          docentesNecesarios: 8,
          docentesDisponibles: 6,
          deficit: 2
        },
        {
          codigo: 'MAE-AP',
          nombre: 'Maestría en Administración Pública',
          nivel: 'Maestría',
          sede: 'Sede Nacional',
          modalidad: 'Presencial',
          asignaturas: ASIGNATURAS_MAESTRIA_AP,
          grupos: [
            { id: 'GRP-NAL-MAE-101-A', asignaturaId: 'MAE-AP-101', numeroGrupo: 1, estudiantesMatriculados: 22, capacidadMaxima: 25, modalidad: 'presencial', horario: 'Viernes 18:00-22:00' },
            { id: 'GRP-NAL-MAE-102-A', asignaturaId: 'MAE-AP-102', numeroGrupo: 1, estudiantesMatriculados: 22, capacidadMaxima: 25, modalidad: 'presencial', horario: 'Sábado 8:00-12:00' },
            { id: 'GRP-NAL-MAE-103-A', asignaturaId: 'MAE-AP-103', numeroGrupo: 1, estudiantesMatriculados: 22, capacidadMaxima: 25, modalidad: 'presencial', horario: 'Sábado 14:00-18:00' },
            { id: 'GRP-NAL-MAE-201-A', asignaturaId: 'MAE-AP-201', numeroGrupo: 1, estudiantesMatriculados: 18, capacidadMaxima: 20, modalidad: 'presencial', horario: 'Viernes 18:00-22:00' },
            { id: 'GRP-NAL-MAE-202-A', asignaturaId: 'MAE-AP-202', numeroGrupo: 1, estudiantesMatriculados: 18, capacidadMaxima: 20, modalidad: 'presencial', horario: 'Sábado 8:00-12:00' }
          ],
          estudiantesActivos: 102,
          docentesNecesarios: 6,
          docentesDisponibles: 6,
          deficit: 0
        }
      ],
      totalEstudiantes: 955,
      totalDocentes: 32,
      docentesPlanta: 21,
      docentesCatedra: 11,
      necesidadConvocatoria: true
    },
    
    // MEDELLÍN - TERRITORIAL ANTIOQUIA
    {
      codigo: 'DIR-ANT',
      nombre: 'Medellín',
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      activa: true,
      programas: [
        {
          codigo: 'APT-PRE',
          nombre: 'Administración Pública Territorial',
          nivel: 'Pregrado',
          sede: 'Medellín',
          modalidad: 'Presencial',
          asignaturas: ASIGNATURAS_ADMINISTRACION_PUBLICA.slice(0, 12), // Primeros 3 semestres
          grupos: [
            { id: 'GRP-MED-AP-101-A', asignaturaId: 'AP-101', numeroGrupo: 1, estudiantesMatriculados: 38, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Lunes 7:00-11:00' },
            { id: 'GRP-MED-AP-102-A', asignaturaId: 'AP-102', numeroGrupo: 1, estudiantesMatriculados: 38, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Miércoles 7:00-11:00' },
            { id: 'GRP-MED-AP-103-A', asignaturaId: 'AP-103', numeroGrupo: 1, estudiantesMatriculados: 38, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Jueves 7:00-10:00' },
            { id: 'GRP-MED-AP-201-A', asignaturaId: 'AP-201', numeroGrupo: 1, estudiantesMatriculados: 35, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Lunes 14:00-18:00' },
            { id: 'GRP-MED-AP-202-A', asignaturaId: 'AP-202', numeroGrupo: 1, estudiantesMatriculados: 35, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Martes 14:00-18:00' },
            { id: 'GRP-MED-AP-301-A', asignaturaId: 'AP-301', numeroGrupo: 1, estudiantesMatriculados: 32, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Lunes 18:00-22:00' },
            { id: 'GRP-MED-AP-302-A', asignaturaId: 'AP-302', numeroGrupo: 1, estudiantesMatriculados: 32, capacidadMaxima: 35, modalidad: 'presencial', horario: 'Miércoles 18:00-22:00' }
          ],
          estudiantesActivos: 248,
          docentesNecesarios: 10,
          docentesDisponibles: 8,
          deficit: 2
        },
        {
          codigo: 'ESP-GP',
          nombre: 'Especialización en Gestión Pública',
          nivel: 'Especialización',
          sede: 'Medellín',
          modalidad: 'Presencial',
          asignaturas: ASIGNATURAS_ESPECIALIZACION_GP,
          grupos: [
            { id: 'GRP-MED-ESP-101-A', asignaturaId: 'ESP-GP-101', numeroGrupo: 1, estudiantesMatriculados: 25, capacidadMaxima: 30, modalidad: 'presencial', horario: 'Viernes 18:00-21:00' },
            { id: 'GRP-MED-ESP-102-A', asignaturaId: 'ESP-GP-102', numeroGrupo: 1, estudiantesMatriculados: 25, capacidadMaxima: 30, modalidad: 'presencial', horario: 'Sábado 8:00-11:00' },
            { id: 'GRP-MED-ESP-103-A', asignaturaId: 'ESP-GP-103', numeroGrupo: 1, estudiantesMatriculados: 25, capacidadMaxima: 30, modalidad: 'presencial', horario: 'Sábado 14:00-17:00' }
          ],
          estudiantesActivos: 75,
          docentesNecesarios: 5,
          docentesDisponibles: 3,
          deficit: 2
        }
      ],
      totalEstudiantes: 323,
      totalDocentes: 15,
      docentesPlanta: 10,
      docentesCatedra: 5,
      necesidadConvocatoria: true
    },

    // CALI - TERRITORIAL VALLE
    {
      codigo: 'DIR-VAL',
      nombre: 'Cali',
      departamento: 'Valle del Cauca',
      ciudad: 'Cali',
      activa: true,
      programas: [
        {
          codigo: 'APT-PRE',
          nombre: 'Administración Pública Territorial',
          nivel: 'Pregrado',
          sede: 'Cali',
          modalidad: 'Presencial',
          asignaturas: ASIGNATURAS_ADMINISTRACION_PUBLICA.slice(0, 10),
          grupos: [
            { id: 'GRP-CAL-AP-101-A', asignaturaId: 'AP-101', numeroGrupo: 1, estudiantesMatriculados: 42, capacidadMaxima: 45, modalidad: 'presencial', horario: 'Lunes 7:00-11:00' },
            { id: 'GRP-CAL-AP-102-A', asignaturaId: 'AP-102', numeroGrupo: 1, estudiantesMatriculados: 42, capacidadMaxima: 45, modalidad: 'presencial', horario: 'Miércoles 7:00-11:00' },
            { id: 'GRP-CAL-AP-201-A', asignaturaId: 'AP-201', numeroGrupo: 1, estudiantesMatriculados: 38, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Lunes 14:00-18:00' },
            { id: 'GRP-CAL-AP-301-A', asignaturaId: 'AP-301', numeroGrupo: 1, estudiantesMatriculados: 35, capacidadMaxima: 40, modalidad: 'presencial', horario: 'Lunes 18:00-22:00' }
          ],
          estudiantesActivos: 157,
          docentesNecesarios: 8,
          docentesDisponibles: 6,
          deficit: 2
        }
      ],
      totalEstudiantes: 157,
      totalDocentes: 8,
      docentesPlanta: 5,
      docentesCatedra: 3,
      necesidadConvocatoria: true
    }
  ],
  resumenGlobal: {
    sedesActivas: 3,
    programasActivos: 6,
    totalEstudiantes: 1435,
    totalGrupos: 45,
    docentesNecesarios: 55,
    docentesPlantaDisponibles: 36,
    docentesCatedraDisponibles: 19,
    deficit: 9, // Necesitamos 9 docentes más
    convocatoriasRequeridas: 2 // 2 convocatorias (5 planta + 4 cátedra)
  }
};

// ============================================================================
// FUNCIONES DE CÁLCULO
// ============================================================================

/**
 * Calcula el número de docentes necesarios para una sede
 */
export function calcularDocentesNecesariosPorSede(sede: SedePlanificada): number {
  let totalDocentes = 0;
  
  sede.programas.forEach(programa => {
    // Calcular por tipo de docente requerido
    const asignaturasPlanta = programa.asignaturas.filter(a => 
      a.requiereDocente === 'planta' || a.requiereDocente === 'ambos'
    );
    const asignaturasCatedra = programa.asignaturas.filter(a => 
      a.requiereDocente === 'catedra' || a.requiereDocente === 'ambos'
    );
    
    // Estimar docentes (1 docente de planta puede cubrir 2-3 asignaturas)
    // 1 docente de cátedra generalmente cubre 1-2 asignaturas
    totalDocentes += Math.ceil(asignaturasPlanta.length / 2.5);
    totalDocentes += Math.ceil(asignaturasCatedra.length / 1.5);
  });
  
  return totalDocentes;
}

/**
 * Identifica necesidades de convocatorias
 */
export function identificarNecesidadesConvocatorias(planificacion: PlanificacionSemestral) {
  const necesidades = {
    planta: 0,
    catedra: 0,
    sedes: [] as string[]
  };
  
  planificacion.sedes.forEach(sede => {
    if (sede.necesidadConvocatoria) {
      sede.programas.forEach(programa => {
        if (programa.deficit && programa.deficit > 0) {
          // Estimar si se necesita planta o cátedra
          const asignaturasPlanta = programa.asignaturas.filter(a => a.requiereDocente === 'planta').length;
          const asignaturasCatedra = programa.asignaturas.filter(a => a.requiereDocente === 'catedra').length;
          
          const proporcionPlanta = asignaturasPlanta / (asignaturasPlanta + asignaturasCatedra);
          
          necesidades.planta += Math.ceil(programa.deficit * proporcionPlanta);
          necesidades.catedra += Math.floor(programa.deficit * (1 - proporcionPlanta));
          
          if (!necesidades.sedes.includes(sede.nombre)) {
            necesidades.sedes.push(sede.nombre);
          }
        }
      });
    }
  });
  
  return necesidades;
}

/**
 * Genera reporte de planificación
 */
export function generarReportePlanificacion(planificacion: PlanificacionSemestral) {
  return {
    periodo: planificacion.periodo,
    fechas: {
      inicio: planificacion.fechaInicio,
      fin: planificacion.fechaFin
    },
    cobertura: {
      sedesActivas: planificacion.resumenGlobal.sedesActivas,
      programasActivos: planificacion.resumenGlobal.programasActivos,
      estudiantesTotal: planificacion.resumenGlobal.totalEstudiantes,
      gruposTotal: planificacion.resumenGlobal.totalGrupos
    },
    docentesActuales: {
      planta: planificacion.resumenGlobal.docentesPlantaDisponibles,
      catedra: planificacion.resumenGlobal.docentesCatedraDisponibles,
      total: planificacion.resumenGlobal.docentesPlantaDisponibles + planificacion.resumenGlobal.docentesCatedraDisponibles
    },
    necesidades: {
      docentesNecesarios: planificacion.resumenGlobal.docentesNecesarios,
      deficit: planificacion.resumenGlobal.deficit,
      convocatoriasRequeridas: planificacion.resumenGlobal.convocatoriasRequeridas
    },
    detallesPorSede: planificacion.sedes.map(sede => ({
      sede: sede.nombre,
      estudiantes: sede.totalEstudiantes,
      docentes: sede.totalDocentes,
      deficit: sede.programas.reduce((sum, p) => sum + (p.deficit || 0), 0),
      requiereConvocatoria: sede.necesidadConvocatoria
    }))
  };
}
