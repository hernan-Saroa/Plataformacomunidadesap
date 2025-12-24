/**
 * TIPOS Y ESTRUCTURAS DEL PTA
 * 
 * Según Documento Maestro Integrado v3.0
 * Definiciones completas de tipos, interfaces y estructuras de datos
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { EstadoPTA, NivelAprobacion, DecisionAprobacion } from '../data/ptaEstadosYFlujo';

// ============================================================================
// INFORMACIÓN DEL DOCENTE (Sección 4.0)
// ============================================================================

export interface DocentePTA {
  // Identificación
  cedula: string;
  nombreCompleto: string;
  correoInstitucional: string;
  telefono?: string;
  
  // Académico
  perfilAcademico: 'Especialización' | 'Maestría' | 'Doctorado';
  categoria: 'Auxiliar' | 'Asistente' | 'Asociado' | 'Titular';
  nucleoTematico: string;
  
  // Vinculación
  sedeTerritori al: string;
  tipoVinculacion: 'Carrera1' | 'Carrera2' | 'Periodo Prueba' | 'Ocasional' | 'Visitante' | 'Especial';
  tipoDedicacion: 'Tiempo Completo' | 'Medio Tiempo';
  actoAdministrativoVinculacion: string;
  fechaInicioVinculacion: string;
  fechaTerminacionVinculacion?: string;
  
  // Horas programables (calculado según vinculación)
  horasProgramables: 720 | 800 | 400; // 720 (Carrera1), 800 (Carrera2+), 400 (MT)
}

// ============================================================================
// PLAN DE TRABAJO ACADÉMICO (PTA)
// ============================================================================

export interface PlanTrabajoAcademico {
  // Identificación
  id: string;
  codigo: string;
  version: number;
  
  // Período
  periodoId: string;
  periodoNombre: string; // Ej: "2025-I"
  
  // Docente
  docenteId: string;
  docente: DocentePTA;
  
  // Estado y flujo
  estado: EstadoPTA;
  nivelAprobacionActual: NivelAprobacion | null;
  historialAprobaciones: DecisionAprobacion[];
  
  // Componentes del PTA
  componenteDocencia: ComponenteDocencia;
  componenteInvestigacion: ComponenteInvestigacion;
  componenteExtension: ComponenteExtension;
  componenteComplementarias: ComponenteComplementarias;
  componenteAdministrativas: ComponenteAdministrativas;
  
  // Resumen
  totalHorasAsignadas: number;
  distribucionValida: boolean;
  
  // Fechas
  fechaCreacion: string;
  fechaUltimaModificacion: string;
  fechaEnvioAprobacion?: string;
  fechaAprobacionFinal?: string;
  fechaEnFirme?: string;
  
  // Observaciones generales
  observacionesDocente?: string;
  observacionesAprobadores?: string[];
  
  // Evidencias (solo cuando está EN_FIRME)
  evidencias?: EvidenciaPTA[];
  cumplimientoGlobal?: number; // Porcentaje 0-100
}

// ============================================================================
// COMPONENTE: DOCENCIA (Sección 6)
// ============================================================================

export interface ComponenteDocencia {
  horas: number;
  porcentaje: number;
  actividades: ActividadDocencia[];
}

export interface ActividadDocencia {
  id: string;
  
  // Ubicación
  territorial: string;
  cetap?: string;
  programaAcademico: 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC';
  
  // Asignatura
  codigoAsignatura: string;
  nombreAsignatura: string;
  nucleoTematico: string;
  ubicacionSemestral: number; // 1-10
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  
  // Estudiantes y créditos
  totalEstudiantes: number;
  numeroCreditos: number;
  
  // Cálculo de horas (Criterio 1+2)
  horasBase: number; // Depende del programa y créditos
  horasPTA: number; // horasBase × 3
  
  // Fechas
  fechaInicio: string;
  fechaTerminacion: string;
  
  // Porcentaje del total
  porcentajePTA: number;
  
  // Aprobación
  aprobadoPorProgramacion: boolean;
  aprobadoPorDirector: boolean;
  aprobadoPorDocente: boolean;
  observaciones?: string;
  
  // Responsables
  responsableProgramacion: string;
  directorTerritorial: string;
}

// ============================================================================
// COMPONENTE: INVESTIGACIÓN (Sección 7)
// ============================================================================

export interface ComponenteInvestigacion {
  horas: number;
  porcentaje: number;
  actividades: (ActividadProyectoInvestigacion | ActividadInvestigacionServicio)[];
}

export interface ActividadProyectoInvestigacion {
  tipo: 'proyecto';
  id: string;
  
  // Proyecto
  idProyecto: string;
  nombreProyecto: string;
  grupoInvestigacion: string;
  lineaInvestigacion: string;
  
  // Rol del docente
  rol: 'Investigador Líder' | 'Coinvestigador' | 'Asistente Nivel II';
  horasDescarga: number; // Máx según rol: 400, 300, 200
  
  // Estímulo económico
  recibeEstimuloEconomico: boolean; // Si es TRUE, no se registran horas en PTA
  
  // Productos y compromisos
  productos: ProductoInvestigacion[];
  funciones: string;
  compromisos: string;
  
  // Acto administrativo
  actoAdministrativo: string;
  
  // Fechas
  fechaInicio: string;
  fechaTerminacion: string;
  
  // Porcentaje
  porcentajePTA: number;
  
  // Aprobación
  aprobadoPorSNI: boolean;
  observaciones?: string;
}

export interface ActividadInvestigacionServicio {
  tipo: 'servicio';
  id: string;
  
  sedeTerriroral: string;
  actividad: string; // Del catálogo de actividades de investigación
  criterioHoras: string;
  evidencias: string;
  
  fechaInicio: string;
  fechaTerminacion: string;
  
  horasAsignadas: number;
  porcentajePTA: number;
}

export interface ProductoInvestigacion {
  tipo: 'Generación Nuevo Conocimiento' | 'Desarrollo Tecnológico' | 'Formación Recurso Humano' | 'Apropiación Social';
  descripcion: string;
  horasAsignadas: number;
  tipologiaMinCiencias?: string; // Según convocatorias MinCiencias
}

// ============================================================================
// COMPONENTE: EXTENSIÓN ACADÉMICA (Sección 8)
// ============================================================================

export interface ComponenteExtension {
  horas: number;
  porcentaje: number;
  actividades: ActividadExtension[];
}

export interface ActividadExtension {
  id: string;
  
  sedeTerriroral: string;
  subdireccion: 'Capacitación' | 'Procesos Selección' | 'DFAGE' | 'Alto Gobierno';
  actividadEspecifica: string;
  
  // Para DFAGE
  municipioEntidad?: string;
  
  // Descripción
  compromisos: string;
  evidencias: string;
  
  // Fechas
  fechaInicio: string;
  fechaTerminacion: string;
  
  // Horas
  horasAsignadas: number;
  porcentajePTA: number;
  
  // Aprobación específica según subdirección
  aprobadoPorSubdireccion: boolean;
  observaciones?: string;
}

// ============================================================================
// COMPONENTE: ACTIVIDADES COMPLEMENTARIAS (Sección 9)
// ============================================================================

export interface ComponenteComplementarias {
  horas: number;
  porcentaje: number;
  actividades: ActividadComplementaria[];
}

export interface ActividadComplementaria {
  id: string;
  
  sedeTerriroral: string;
  numeroActividad: number; // 1-24 del catálogo oficial
  nombreActividad: string;
  descripcion: string;
  evidencias: string;
  
  fechaInicio: string;
  fechaTerminacion: string;
  
  horasAsignadas: number;
  porcentajePTA: number;
  
  observaciones?: string;
  responsableProgramacion: string;
  directorTerritorial: string;
}

// ============================================================================
// COMPONENTE: ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS (Sección 10)
// ============================================================================

export interface ComponenteAdministrativas {
  horas: number;
  porcentaje: number;
  actividades: ActividadAdministrativa[];
}

export interface ActividadAdministrativa {
  id: string;
  
  tipo: 'Acreditación' | 'Cargo Directivo' | 'Comisión Servicio' | 'Comisión Estudio' | 'Año Sabático' | 'Misión Profesoral' | 'Doctorado';
  descripcion: string;
  
  // Acto administrativo (obligatorio)
  actoAdministrativo: string;
  
  // Puede ser 100% del PTA
  horasAsignadas: number;
  porcentajePTA: number;
  
  fechaInicio: string;
  fechaTerminacion: string;
}

// ============================================================================
// EVIDENCIAS (Solo cuando está EN_FIRME)
// ============================================================================

export interface EvidenciaPTA {
  id: string;
  ptaId: string;
  componenteId: string;
  actividadId: string;
  
  tipoEvidencia: string;
  descripcion: string;
  archivoUrl: string;
  nombreArchivo: string;
  tamanoArchivo: number;
  
  fechaCarga: string;
  cargadoPor: string;
  
  validada: boolean;
  observacionesValidacion?: string;
}

// ============================================================================
// CATÁLOGOS (Sección 12)
// ============================================================================

export interface Asignatura {
  codigo: string;
  nombre: string;
  nucleoTematico: string;
  numeroCreditos: number;
  ubicacionSemestral: number;
  programa: 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC';
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  horasBase: number; // Según programa
  horasPTA: number; // horasBase × 3
}

export interface SedeTerriroral {
  codigo: string;
  nombre: string;
  docentesTC: number;
}

export interface ActividadComplementariaCatalogo {
  numero: number;
  nombre: string;
  horasAsignadas: string; // Puede ser rango: "20 hrs/estudiante"
  observaciones?: string;
}

// ============================================================================
// FUNCIONES DE CÁLCULO
// ============================================================================

/**
 * Calcula las horas programables según tipo de vinculación
 */
export function calcularHorasProgramables(
  tipoVinculacion: DocentePTA['tipoVinculacion'],
  tipoDedicacion: DocentePTA['tipoDedicacion']
): 720 | 800 | 400 {
  if (tipoDedicacion === 'Medio Tiempo') {
    return 400;
  }
  
  if (tipoVinculacion === 'Carrera1') {
    return 720; // Acuerdo 009/2004
  }
  
  return 800; // Acuerdo 003/2018
}

/**
 * Calcula horas PTA para una asignatura según el Criterio 1+2
 */
export function calcularHorasPTAAsignatura(
  programa: 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC',
  creditos: number,
  esSeminario: boolean = false
): number {
  let horasBase = 0;
  
  if (programa === 'AP' || programa === 'EP') {
    if (esSeminario) {
      horasBase = 128;
    } else {
      horasBase = 64; // Para 1-4 créditos
    }
  } else if (programa === 'APT') {
    horasBase = creditos * 16; // 16 hrs/crédito
  } else if (programa === 'ESP') {
    horasBase = creditos * 16; // 16 hrs/crédito
  } else if (programa === 'MAE' || programa === 'DOC') {
    horasBase = creditos * 12; // 12 hrs/crédito
  }
  
  // Aplicar Criterio 1+2: × 3
  return horasBase * 3;
}

/**
 * Calcula el porcentaje de un componente respecto al total
 */
export function calcularPorcentaje(horas: number, horasProgramables: number): number {
  if (horasProgramables === 0) return 0;
  return Math.round((horas / horasProgramables) * 100 * 100) / 100; // 2 decimales
}

/**
 * Valida la distribución porcentual de los componentes
 */
export function validarDistribucionComponentes(pta: PlanTrabajoAcademico): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  
  // Validar límites por componente
  if (pta.componenteInvestigacion.porcentaje > 50) {
    errores.push('Investigación no puede superar el 50%');
  }
  
  if (pta.componenteExtension.porcentaje > 25) {
    errores.push('Extensión no puede superar el 25%');
  }
  
  if (pta.componenteComplementarias.porcentaje > 25) {
    errores.push('Actividades Complementarias no pueden superar el 25%');
  }
  
  // Validar mínimo 50% docencia para ocasionales/visitantes/especiales
  const requiereMinDocencia = ['Ocasional', 'Visitante', 'Especial'].includes(
    pta.docente.tipoVinculacion
  );
  
  if (requiereMinDocencia && pta.componenteDocencia.porcentaje < 50) {
    errores.push('Docentes Ocasionales/Visitantes/Especiales deben tener mínimo 50% en Docencia');
  }
  
  // Validar suma total
  const totalPorcentaje =
    pta.componenteDocencia.porcentaje +
    pta.componenteInvestigacion.porcentaje +
    pta.componenteExtension.porcentaje +
    pta.componenteComplementarias.porcentaje +
    pta.componenteAdministrativas.porcentaje;
  
  if (Math.abs(totalPorcentaje - 100) > 0.01) {
    errores.push(`La suma de porcentajes debe ser 100% (actual: ${totalPorcentaje.toFixed(2)}%)`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}