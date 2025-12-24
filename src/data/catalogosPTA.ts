/**
 * CATÁLOGOS Y DATOS MAESTROS DEL PTA
 * 
 * Según Documento Maestro Integrado v3.0 - Sección 12
 * Catálogos completos para construcción de PTAs
 * 
 * INTEGRADO CON ESTRUCTURA ORGANIZACIONAL
 * Las sedes territoriales están alineadas con el módulo de Estructura Organizacional
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { ESTRUCTURA_ORGANIZACIONAL_ESAP } from './estructura-organizacional-completa';

// ============================================================================
// SEDES TERRITORIALES (Sección 12.1)
// ============================================================================

export interface SedeTerrirorial {
  codigo: string;
  nombre: string;
  nombreCorto: string;
  departamento: string;
  ciudad: string;
  docentesTC: number;
  id: string;
}

/**
 * SEDES TERRITORIALES - INTEGRADO CON ESTRUCTURA ORGANIZACIONAL
 * 
 * Extrae las 17 territoriales del módulo de Estructura Organizacional
 * para mantener consistencia de datos en toda la aplicación
 */
export const SEDES_TERRITORIALES: SedeTerrirorial[] = ESTRUCTURA_ORGANIZACIONAL_ESAP
  .filter(u => u.nivel === 'territorial')
  .map(territorial => ({
    id: territorial.id,
    codigo: territorial.codigo,
    nombre: territorial.nombre,
    nombreCorto: territorial.nombreCorto,
    departamento: territorial.departamento,
    ciudad: territorial.ciudad,
    docentesTC: 0 // Se actualizará con datos reales del sistema
  }))
  .sort((a, b) => a.nombreCorto.localeCompare(b.nombreCorto));

/**
 * SEDE NACIONAL - Para uso específico en PTAs
 */
export const SEDE_NACIONAL = ESTRUCTURA_ORGANIZACIONAL_ESAP.find(u => u.nivel === 'nacional');

/**
 * Obtener sedes (CETAPs) de una territorial específica
 */
export function getSedesPorTerritorial(territorialId: string) {
  return ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(
    u => u.nivel === 'sede' && u.padreId === territorialId
  );
}

// ============================================================================
// PROGRAMAS ACADÉMICOS (Sección 12.2)
// ============================================================================

export interface ProgramaAcademico {
  codigo: 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC';
  nombre: string;
  nivel: 'Pregrado' | 'Posgrado';
  modalidad: 'Presencial' | 'Distancia' | 'Virtual' | 'Híbrida';
  sede: string;
  horasBasePorCredito: number;
}

export const PROGRAMAS_ACADEMICOS: ProgramaAcademico[] = [
  {
    codigo: 'AP',
    nombre: 'Administración Pública',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    sede: 'Sede Central',
    horasBasePorCredito: 64 // Fijo para 1-4 créditos
  },
  {
    codigo: 'EP',
    nombre: 'Economía Pública',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    sede: 'Sede Central',
    horasBasePorCredito: 64 // Fijo para 1-4 créditos
  },
  {
    codigo: 'APT',
    nombre: 'Administración Pública Territorial',
    nivel: 'Pregrado',
    modalidad: 'Distancia',
    sede: 'Nacional',
    horasBasePorCredito: 16 // 16 hrs por crédito
  },
  {
    codigo: 'ESP',
    nombre: 'Especializaciones',
    nivel: 'Posgrado',
    modalidad: 'Híbrida',
    sede: 'Nacional',
    horasBasePorCredito: 16 // 16 hrs por crédito
  },
  {
    codigo: 'MAE',
    nombre: 'Maestrías',
    nivel: 'Posgrado',
    modalidad: 'Híbrida',
    sede: 'Nacional',
    horasBasePorCredito: 12 // 12 hrs por crédito
  },
  {
    codigo: 'DOC',
    nombre: 'Doctorado',
    nivel: 'Posgrado',
    modalidad: 'Presencial',
    sede: 'Sede Central',
    horasBasePorCredito: 12 // 12 hrs por crédito
  }
];

// ============================================================================
// NÚCLEOS TEMÁTICOS (Sección 12.2.2)
// ============================================================================

export const NUCLEOS_TEMATICOS = [
  'Nuevo Plan de Estudios AP',
  'Estado y Poder',
  'Idioma Extranjero',
  'Fundamentación Cuantitativa',
  'Gestión Territorial',
  'Hacienda Pública',
  'Alta Dirección',
  'Investigación',
  'Administración Pública',
  'Ciencia Política',
  'Derecho Público',
  'Economía Pública',
  'Gestión del Desarrollo',
  'Políticas Públicas'
];

// ============================================================================
// CATÁLOGO DE ASIGNATURAS (Sección 12.2.1)
// ============================================================================

export interface Asignatura {
  codigo: string;
  nombre: string;
  nucleoTematico: string;
  numeroCreditos: number;
  ubicacionSemestral: number;
  programa: 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC';
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  horasBase: number;
  horasPTA: number;
  esSeminario?: boolean;
}

export const CATALOGO_ASIGNATURAS: Asignatura[] = [
  // Pregrado - Administración Pública
  {
    codigo: 'AP-101',
    nombre: 'Teoría del Estado',
    nucleoTematico: 'Estado y Poder',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 64,
    horasPTA: 192
  },
  {
    codigo: 'AP-102',
    nombre: 'Introducción a la Administración Pública',
    nucleoTematico: 'Administración Pública',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 64,
    horasPTA: 192
  },
  {
    codigo: 'AP-103',
    nombre: 'Matemáticas I',
    nucleoTematico: 'Fundamentación Cuantitativa',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 64,
    horasPTA: 192
  },
  {
    codigo: 'AP-201',
    nombre: 'Derecho Administrativo',
    nucleoTematico: 'Derecho Público',
    numeroCreditos: 4,
    ubicacionSemestral: 2,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 64,
    horasPTA: 192
  },
  {
    codigo: 'AP-301',
    nombre: 'Gestión Pública',
    nucleoTematico: 'Administración Pública',
    numeroCreditos: 3,
    ubicacionSemestral: 3,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 64,
    horasPTA: 192
  },
  {
    codigo: 'AP-401',
    nombre: 'Políticas Públicas',
    nucleoTematico: 'Políticas Públicas',
    numeroCreditos: 4,
    ubicacionSemestral: 4,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 64,
    horasPTA: 192
  },
  {
    codigo: 'AP-SEM-01',
    nombre: 'Seminario de Investigación I',
    nucleoTematico: 'Investigación',
    numeroCreditos: 3,
    ubicacionSemestral: 7,
    programa: 'AP',
    modalidad: 'Presencial',
    horasBase: 128,
    horasPTA: 384,
    esSeminario: true
  },
  
  // Pregrado APT
  {
    codigo: 'APT-101',
    nombre: 'Fundamentos de Administración Pública',
    nucleoTematico: 'Administración Pública',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'APT',
    modalidad: 'Virtual',
    horasBase: 48,
    horasPTA: 144
  },
  {
    codigo: 'APT-201',
    nombre: 'Gestión Territorial',
    nucleoTematico: 'Gestión Territorial',
    numeroCreditos: 3,
    ubicacionSemestral: 2,
    programa: 'APT',
    modalidad: 'Virtual',
    horasBase: 48,
    horasPTA: 144
  },
  {
    codigo: 'APT-301',
    nombre: 'Desarrollo Regional',
    nucleoTematico: 'Gestión del Desarrollo',
    numeroCreditos: 3,
    ubicacionSemestral: 3,
    programa: 'APT',
    modalidad: 'Virtual',
    horasBase: 48,
    horasPTA: 144
  },
  
  // Especializaciones
  {
    codigo: 'ESP-GEP-101',
    nombre: 'Gerencia Estratégica Pública',
    nucleoTematico: 'Alta Dirección',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'ESP',
    modalidad: 'Híbrida',
    horasBase: 48,
    horasPTA: 144
  },
  {
    codigo: 'ESP-HP-101',
    nombre: 'Hacienda Pública Territorial',
    nucleoTematico: 'Hacienda Pública',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'ESP',
    modalidad: 'Híbrida',
    horasBase: 48,
    horasPTA: 144
  },
  
  // Maestrías
  {
    codigo: 'MAE-GAP-101',
    nombre: 'Teorías de la Administración Pública',
    nucleoTematico: 'Administración Pública',
    numeroCreditos: 3,
    ubicacionSemestral: 1,
    programa: 'MAE',
    modalidad: 'Presencial',
    horasBase: 36,
    horasPTA: 108
  },
  {
    codigo: 'MAE-GAP-201',
    nombre: 'Métodos de Investigación',
    nucleoTematico: 'Investigación',
    numeroCreditos: 3,
    ubicacionSemestral: 2,
    programa: 'MAE',
    modalidad: 'Presencial',
    horasBase: 36,
    horasPTA: 108
  },
  {
    codigo: 'MAE-PP-101',
    nombre: 'Análisis de Políticas Públicas',
    nucleoTematico: 'Políticas Públicas',
    numeroCreditos: 4,
    ubicacionSemestral: 1,
    programa: 'MAE',
    modalidad: 'Presencial',
    horasBase: 48,
    horasPTA: 144
  }
];

// ============================================================================
// ROLES DE INVESTIGACIÓN (Sección 7.1)
// ============================================================================

export interface RolInvestigacion {
  id: string;
  nombre: string;
  horasMaximas: number;
  porcentajeMaximo: number;
}

export const ROLES_INVESTIGACION: RolInvestigacion[] = [
  {
    id: 'lider',
    nombre: 'Investigador Líder de Proyecto',
    horasMaximas: 400,
    porcentajeMaximo: 50
  },
  {
    id: 'coinvestigador',
    nombre: 'Coinvestigador',
    horasMaximas: 300,
    porcentajeMaximo: 37.5
  },
  {
    id: 'asistente',
    nombre: 'Asistente de Investigación Nivel II',
    horasMaximas: 200,
    porcentajeMaximo: 25
  }
];

// ============================================================================
// ACTIVIDADES DE INVESTIGACIÓN SIN ROL (Sección 7.2)
// ============================================================================

export interface ActividadInvestigacionServicio {
  id: string;
  nombre: string;
  horasMaximas: number;
  criterio: string;
}

export const ACTIVIDADES_INVESTIGACION_SERVICIO: ActividadInvestigacionServicio[] = [
  {
    id: 'lider-semillero',
    nombre: 'Líder de Semillero de Investigación (reconocido SNI)',
    horasMaximas: 120,
    criterio: 'Hasta 120 hrs'
  },
  {
    id: 'enlace-territorial',
    nombre: 'Enlace Territorial de Investigaciones',
    horasMaximas: 200,
    criterio: 'Hasta 200 hrs (Máx 25% PTA, designado por Director)'
  },
  {
    id: 'lider-grupo',
    nombre: 'Líder o Director de Grupo de Investigación',
    horasMaximas: 200,
    criterio: 'Hasta 200 hrs (Máx 25% PTA, avalado por SNI)'
  },
  {
    id: 'par-propuestas',
    nombre: 'Par evaluador propuestas de proyecto',
    horasMaximas: 20,
    criterio: '20 hrs por propuesta evaluada'
  },
  {
    id: 'par-resultados',
    nombre: 'Par evaluador resultados/productos',
    horasMaximas: 20,
    criterio: '20 hrs por resultado evaluado'
  },
  {
    id: 'diseno-cursos',
    nombre: 'Diseño cursos formación investigativa',
    horasMaximas: 32,
    criterio: '32 hrs por curso diseñado'
  },
  {
    id: 'capacitador',
    nombre: 'Capacitador cursos formación investigativa',
    horasMaximas: 32,
    criterio: '32 hrs por curso impartido'
  },
  {
    id: 'articulo-adicional',
    nombre: 'Producción artículos científicos adicionales',
    horasMaximas: 96,
    criterio: 'Hasta 96 hrs por producto adicional'
  },
  {
    id: 'libro-adicional',
    nombre: 'Producción libro (mín 3 capítulos) adicional',
    horasMaximas: 144,
    criterio: 'Hasta 144 hrs por producto adicional'
  }
];

// ============================================================================
// PRODUCTOS CTI MinCiencias (Sección 7.3)
// ============================================================================

export interface ProductoCTI {
  tipo: string;
  descripcion: string;
  horasMin: number;
  horasMax: number;
}

export const PRODUCTOS_CTI: ProductoCTI[] = [
  {
    tipo: 'Generación Nuevo Conocimiento',
    descripcion: 'Artículos científicos, libros resultado investigación, patentes',
    horasMin: 40,
    horasMax: 60
  },
  {
    tipo: 'Desarrollo Tecnológico',
    descripcion: 'Productos tecnológicos certificados, innovaciones',
    horasMin: 40,
    horasMax: 60
  },
  {
    tipo: 'Formación Recurso Humano',
    descripcion: 'Dirección tesis doctoral, maestría, pregrado',
    horasMin: 40,
    horasMax: 60
  },
  {
    tipo: 'Apropiación Social',
    descripcion: 'Según circulares ESAP y requerimientos Subdirección',
    horasMin: 2,
    horasMax: 6
  }
];

// ============================================================================
// SUBDIRECCIONES DE EXTENSIÓN (Sección 8.1)
// ============================================================================

export const SUBDIRECCIONES_EXTENSION = [
  'Capacitación',
  'Procesos Selección',
  'DFAGE',
  'Alto Gobierno'
] as const;

// ============================================================================
// ACTIVIDADES DE CAPACITACIÓN (Sección 8.2)
// ============================================================================

export interface ActividadCapacitacion {
  id: string;
  nombre: string;
  rol: string;
  horasMaximas: number;
}

export const ACTIVIDADES_CAPACITACION: ActividadCapacitacion[] = [
  {
    id: 'taller',
    nombre: 'Talleres de capacitación',
    rol: 'Diseñador-Formador',
    horasMaximas: 16
  },
  {
    id: 'seminario',
    nombre: 'Seminarios de capacitación',
    rol: 'Diseñador-Formador',
    horasMaximas: 32
  },
  {
    id: 'curso',
    nombre: 'Cursos de capacitación',
    rol: 'Diseñador-Formador',
    horasMaximas: 64
  },
  {
    id: 'diplomado',
    nombre: 'Diplomados',
    rol: 'Diseñador-Formador',
    horasMaximas: 160
  }
];

// ============================================================================
// CATÁLOGO DE 24 ACTIVIDADES COMPLEMENTARIAS (Sección 9.1 - Anexo 1)
// ============================================================================

export interface ActividadComplementariaCatalogo {
  numero: number;
  nombre: string;
  horasAsignadas: string;
  observaciones?: string;
}

export const CATALOGO_ACTIVIDADES_COMPLEMENTARIAS: ActividadComplementariaCatalogo[] = [
  {
    numero: 1,
    nombre: 'Acompañamiento opciones grado pregrado - Monografía (AP)',
    horasAsignadas: '20 hrs/estudiante o grupo'
  },
  {
    numero: 1.5,
    nombre: 'Acompañamiento opciones grado pregrado - Monografía (APT)',
    horasAsignadas: '10+10 hrs (9° y 10° sem)'
  },
  {
    numero: 2,
    nombre: 'Acompañamiento opciones grado pregrado - Práctica/Proyecto (AP)',
    horasAsignadas: '20 hrs/estudiante o grupo'
  },
  {
    numero: 2.5,
    nombre: 'Acompañamiento opciones grado pregrado - Práctica/Proyecto (APT)',
    horasAsignadas: '16 hrs/estudiante o grupo'
  },
  {
    numero: 3,
    nombre: 'Acompañamiento seminario trabajos grado III y IV - Maestrías',
    horasAsignadas: 'Hasta 18 hrs/estudiante'
  },
  {
    numero: 4,
    nombre: 'Actualización y/o creación unidades didácticas',
    horasAsignadas: '60-120 hrs/unidad'
  },
  {
    numero: 5,
    nombre: 'Coordinación escuela doctoral',
    horasAsignadas: '40-80 hrs'
  },
  {
    numero: 6,
    nombre: 'Cursos de repetición y nivelación (Esp/Maestrías)',
    horasAsignadas: 'Hasta 32 hrs/curso'
  },
  {
    numero: 7,
    nombre: 'Dirección trabajos de grado - Maestrías',
    horasAsignadas: 'Hasta 30 hrs/estudiante'
  },
  {
    numero: 8,
    nombre: 'Elaboración de microcurrículos',
    horasAsignadas: 'Hasta 10 hrs/microcurrículo'
  },
  {
    numero: 9,
    nombre: 'Elaboración REA - PREAAP',
    horasAsignadas: 'Hasta 60 hrs/período'
  },
  {
    numero: 10,
    nombre: 'Elaboración/revisión preguntas tipo ECAES',
    horasAsignadas: 'Hasta 3 hrs/pregunta'
  },
  {
    numero: 11,
    nombre: 'Examen de habilitación o segundo calificador',
    horasAsignadas: '10 hrs/grupo o 3 hrs/individual'
  },
  {
    numero: 12,
    nombre: 'Examen de homologación, suficiencia o supletorio',
    horasAsignadas: 'Hasta 6 hrs/estudiante'
  },
  {
    numero: 13,
    nombre: 'Jurado concurso docente no vinculado carrera TC/MT',
    horasAsignadas: 'Hasta 5 hrs/aspirante'
  },
  {
    numero: 14,
    nombre: 'Jurado concurso docente vinculado carrera',
    horasAsignadas: 'Hasta 5 hrs/aspirante'
  },
  {
    numero: 15,
    nombre: 'Jurado trabajo de grado maestrías',
    horasAsignadas: 'Hasta 12 hrs'
  },
  {
    numero: 16,
    nombre: 'Jurado valoración productos académicos/investigativos',
    horasAsignadas: 'Hasta 20 hrs/producto'
  },
  {
    numero: 17,
    nombre: 'Líder académico campo conocimiento de programa',
    horasAsignadas: 'Hasta 100 hrs'
  },
  {
    numero: 18,
    nombre: 'Líder académico en programa de posgrados',
    horasAsignadas: '120-200 hrs'
  },
  {
    numero: 19,
    nombre: 'Miembro Junta Directiva Sindicato',
    horasAsignadas: 'Titular: 320 hrs (40%) / Suplente: 160 hrs (20%)',
    observaciones: 'Acuerdo Laboral 2023'
  },
  {
    numero: 20,
    nombre: 'Participación como expositor en eventos académicos',
    horasAsignadas: 'Hasta 30 hrs'
  },
  {
    numero: 21,
    nombre: 'Participación cuerpos colegiados representación docente',
    horasAsignadas: 'Hasta 40 hrs'
  },
  {
    numero: 22,
    nombre: 'Participación escenarios académicos representación institucional',
    horasAsignadas: 'Hasta 5 hrs/evento'
  },
  {
    numero: 23,
    nombre: 'Participación actividades formativas Plan Desarrollo Profesoral',
    horasAsignadas: 'Hasta 48 hrs/semestre'
  },
  {
    numero: 24,
    nombre: 'Producción académica derivada de actividad docente',
    horasAsignadas: 'Hasta 80 hrs'
  }
];

// ============================================================================
// ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS (Sección 10)
// ============================================================================

export interface ActividadAdministrativaCatalogo {
  id: string;
  nombre: string;
  horasAsignadas: string;
  requiereActo: boolean;
}

export const CATALOGO_ACTIVIDADES_ADMINISTRATIVAS: ActividadAdministrativaCatalogo[] = [
  {
    id: 'acreditacion',
    nombre: 'Actividades en proceso de acreditación institucional',
    horasAsignadas: 'Hasta 64 hrs',
    requiereActo: false
  },
  {
    id: 'cargo-directivo',
    nombre: 'Desempeño cargos Directivo Académico-Administrativo',
    horasAsignadas: '100% del PTA',
    requiereActo: true
  },
  {
    id: 'comision-servicio',
    nombre: 'Comisiones de servicio dentro o fuera ESAP',
    horasAsignadas: '100% del PTA',
    requiereActo: true
  },
  {
    id: 'comision-estudio',
    nombre: 'Comisiones de estudio',
    horasAsignadas: '100% del PTA',
    requiereActo: true
  },
  {
    id: 'ano-sabatico',
    nombre: 'Año Sabático o Semestre de Perfeccionamiento',
    horasAsignadas: '100% del PTA',
    requiereActo: true
  },
  {
    id: 'mision-profesoral',
    nombre: 'Misiones profesorales',
    horasAsignadas: 'Hasta 200 hrs (máx 25% PTA)',
    requiereActo: false
  },
  {
    id: 'coord-doctorado',
    nombre: 'Coordinador Comisión Doctoral',
    horasAsignadas: '200 hrs o dedicación exclusiva',
    requiereActo: true
  },
  {
    id: 'comite-doctorado',
    nombre: 'Participación Comisionado Comité Científico Doctorado',
    horasAsignadas: 'Hasta 60 hrs',
    requiereActo: false
  }
];