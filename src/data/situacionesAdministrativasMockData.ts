/**
 * DATOS MOCK - SITUACIONES ADMINISTRATIVAS DOCENTES
 * 
 * Datos de ejemplo para el sistema de gestión de situaciones administrativas
 * - Licencias médicas, maternidad, paternidad
 * - Comisiones de servicio
 * - Años sabáticos
 * - Incapacidades
 * - Permisos
 * 
 * Fecha: 22 de diciembre de 2024
 */

import {
  SituacionAdministrativa,
  AlertaDisponibilidad,
  ReporteDisponibilidad,
  SolicitudTalentoHumano,
  EvidenciaSituacion,
  GestorSituacionesAdministrativas
} from '../components/gestion-profesoral/SituacionesAdministrativasDocentes';

const gestor = new GestorSituacionesAdministrativas();

// ============================================================================
// EVIDENCIAS
// ============================================================================

const evidenciaLicenciaMaternidad: EvidenciaSituacion[] = [
  {
    id: 'EVID-SIT-001',
    tipo: 'certificado-medico',
    nombre: 'Certificado Médico - Embarazo de Alto Riesgo',
    descripcion: 'Certificado médico que justifica licencia de maternidad',
    url: 'https://drive.google.com/file/certificado-medico-001.pdf',
    fechaCarga: '2024-06-15T10:00:00Z',
    cargadoPor: 'docente-010'
  },
  {
    id: 'EVID-SIT-002',
    tipo: 'resolucion',
    nombre: 'Resolución 0123 de 2024',
    descripcion: 'Resolución que aprueba la licencia de maternidad',
    url: 'https://drive.google.com/file/resolucion-0123-2024.pdf',
    fechaCarga: '2024-06-20T15:30:00Z',
    cargadoPor: 'talento-humano-001'
  }
];

const evidenciaAnoSabatico: EvidenciaSituacion[] = [
  {
    id: 'EVID-SIT-003',
    tipo: 'acta',
    nombre: 'Acta Comité de Carrera Docente',
    descripcion: 'Acta que aprueba solicitud de año sabático',
    url: 'https://drive.google.com/file/acta-comite-carrera.pdf',
    fechaCarga: '2024-03-10T11:00:00Z',
    cargadoPor: 'secretaria-academica'
  },
  {
    id: 'EVID-SIT-004',
    tipo: 'certificado-estudios',
    nombre: 'Carta de aceptación Universidad Harvard',
    descripcion: 'Aceptación a programa doctoral en Harvard',
    url: 'https://drive.google.com/file/aceptacion-harvard.pdf',
    fechaCarga: '2024-03-15T14:00:00Z',
    cargadoPor: 'docente-015'
  },
  {
    id: 'EVID-SIT-005',
    tipo: 'resolucion',
    nombre: 'Resolución Rectoral 0456 de 2024',
    descripcion: 'Resolución que otorga año sabático',
    url: 'https://drive.google.com/file/resolucion-0456-2024.pdf',
    fechaCarga: '2024-04-01T09:00:00Z',
    cargadoPor: 'rectoría'
  }
];

const evidenciaIncapacidad: EvidenciaSituacion[] = [
  {
    id: 'EVID-SIT-006',
    tipo: 'incapacidad-eps',
    nombre: 'Incapacidad EPS - 30 días',
    descripcion: 'Certificado de incapacidad por cirugía',
    url: 'https://drive.google.com/file/incapacidad-eps-001.pdf',
    fechaCarga: '2024-10-05T08:00:00Z',
    cargadoPor: 'docente-020'
  }
];

// ============================================================================
// SITUACIONES ADMINISTRATIVAS
// ============================================================================

/**
 * 1. Licencia de Maternidad - Activa
 */
export const situacion1: SituacionAdministrativa = {
  id: 'SIT-2024-001',
  docenteId: 'docente-010',
  docenteNombre: 'Dra. María Fernanda Gutiérrez',
  docenteDocumento: '52.789.456',
  tipo: 'licencia-maternidad',
  descripcion: 'Licencia de maternidad - Embarazo de alto riesgo',
  motivo: 'Embarazo de alto riesgo requiere reposo absoluto desde semana 28',
  fechaInicio: '2024-07-01T00:00:00Z',
  fechaFin: '2024-12-31T23:59:59Z',
  duracionDias: 184,
  estado: 'activa',
  impactoDisponibilidad: 'total',
  porcentajeDisponibilidad: 0,
  afectaPTA: true,
  afectaCargaAcademica: true,
  numeroActoAdministrativo: 'Resolución 0123 de 2024',
  urlDocumento: 'https://drive.google.com/file/resolucion-0123-2024.pdf',
  evidencias: evidenciaLicenciaMaternidad,
  solicitadoPor: 'docente-010',
  solicitadoFecha: '2024-06-15T10:00:00Z',
  aprobadoPor: 'rectoria-001',
  aprobadoFecha: '2024-06-20T15:30:00Z',
  aprobadoCargo: 'Rector',
  observacionesAprobacion: 'Aprobada licencia de maternidad de acuerdo a la normativa vigente. Se autorizó reemplazo temporal.',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-06-21T09:00:00Z',
  funcionarioTH: 'Ana López - Talento Humano',
  codigoTH: 'TH-LIC-2024-0001',
  requiereCompensacion: false,
  createdAt: '2024-06-15T10:00:00Z',
  updatedAt: '2024-06-21T09:00:00Z',
  observaciones: 'Docente en licencia con reemplazo asignado para docencia directa'
};

/**
 * 2. Año Sabático - Aprobado, próximo a iniciar
 */
export const situacion2: SituacionAdministrativa = {
  id: 'SIT-2024-002',
  docenteId: 'docente-015',
  docenteNombre: 'Dr. Roberto Silva Castro',
  docenteDocumento: '80.123.456',
  tipo: 'ano-sabatico',
  descripcion: 'Año sabático para estudios doctorales en Harvard',
  motivo: 'Programa doctoral en Políticas Públicas - Universidad de Harvard',
  fechaInicio: '2025-01-15T00:00:00Z',
  fechaFin: '2026-01-14T23:59:59Z',
  duracionDias: 365,
  estado: 'aprobada',
  impactoDisponibilidad: 'total',
  porcentajeDisponibilidad: 0,
  afectaPTA: true,
  afectaCargaAcademica: true,
  numeroActoAdministrativo: 'Resolución Rectoral 0456 de 2024',
  urlDocumento: 'https://drive.google.com/file/resolucion-0456-2024.pdf',
  evidencias: evidenciaAnoSabatico,
  solicitadoPor: 'docente-015',
  solicitadoFecha: '2024-03-01T14:00:00Z',
  aprobadoPor: 'rectoria-001',
  aprobadoFecha: '2024-04-01T09:00:00Z',
  aprobadoCargo: 'Rector',
  observacionesAprobacion: 'Aprobado año sabático. El docente deberá presentar informes semestrales de avance.',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-04-02T10:00:00Z',
  funcionarioTH: 'Carlos Méndez - Talento Humano',
  codigoTH: 'TH-SAB-2024-0001',
  requiereCompensacion: false,
  createdAt: '2024-03-01T14:00:00Z',
  updatedAt: '2024-04-02T10:00:00Z',
  observaciones: 'Año sabático para formación doctoral. Suspensión total de actividades docentes.'
};

/**
 * 3. Incapacidad Médica - Activa
 */
export const situacion3: SituacionAdministrativa = {
  id: 'SIT-2024-003',
  docenteId: 'docente-020',
  docenteNombre: 'Mg. Carlos Andrés Ramírez',
  docenteDocumento: '79.456.789',
  tipo: 'incapacidad',
  descripcion: 'Incapacidad médica por cirugía programada',
  motivo: 'Cirugía de columna - Hernia discal lumbar',
  fechaInicio: '2024-10-05T00:00:00Z',
  fechaFin: '2024-11-04T23:59:59Z',
  duracionDias: 30,
  estado: 'activa',
  impactoDisponibilidad: 'total',
  porcentajeDisponibilidad: 0,
  afectaPTA: true,
  afectaCargaAcademica: true,
  numeroActoAdministrativo: 'Incapacidad EPS Compensar 789456',
  evidencias: evidenciaIncapacidad,
  solicitadoPor: 'docente-020',
  solicitadoFecha: '2024-10-05T08:00:00Z',
  aprobadoPor: 'director-001',
  aprobadoFecha: '2024-10-05T10:00:00Z',
  aprobadoCargo: 'Director Territorial',
  observacionesAprobacion: 'Aprobada incapacidad. Se asignó docente de reemplazo.',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-10-05T11:00:00Z',
  funcionarioTH: 'Ana López - Talento Humano',
  codigoTH: 'TH-INC-2024-0012',
  requiereCompensacion: false,
  compensacionDescripcion: 'Docente deberá reprogramar tutorías y actividades al reincorporarse',
  createdAt: '2024-10-05T08:00:00Z',
  updatedAt: '2024-10-05T11:00:00Z',
  observaciones: 'Incapacidad por 30 días. Reincorporación esperada el 5 de noviembre.'
};

/**
 * 4. Licencia de Paternidad - Finalizada
 */
export const situacion4: SituacionAdministrativa = {
  id: 'SIT-2024-004',
  docenteId: 'docente-025',
  docenteNombre: 'Dr. Andrés Felipe Moreno',
  docenteDocumento: '1.123.456.789',
  tipo: 'licencia-paternidad',
  descripcion: 'Licencia de paternidad - Nacimiento de hijo',
  motivo: 'Nacimiento de hijo el 15 de septiembre',
  fechaInicio: '2024-09-15T00:00:00Z',
  fechaFin: '2024-09-29T23:59:59Z',
  duracionDias: 14,
  estado: 'finalizada',
  impactoDisponibilidad: 'total',
  porcentajeDisponibilidad: 0,
  afectaPTA: true,
  afectaCargaAcademica: true,
  numeroActoAdministrativo: 'Resolución 0234 de 2024',
  evidencias: [
    {
      id: 'EVID-SIT-007',
      tipo: 'certificado-medico',
      nombre: 'Registro Civil de Nacimiento',
      descripcion: 'Registro civil del recién nacido',
      url: 'https://drive.google.com/file/registro-civil.pdf',
      fechaCarga: '2024-09-16T10:00:00Z',
      cargadoPor: 'docente-025'
    }
  ],
  solicitadoPor: 'docente-025',
  solicitadoFecha: '2024-09-10T14:00:00Z',
  aprobadoPor: 'director-001',
  aprobadoFecha: '2024-09-11T09:00:00Z',
  aprobadoCargo: 'Director Territorial',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-09-11T10:00:00Z',
  funcionarioTH: 'Carlos Méndez - Talento Humano',
  codigoTH: 'TH-PAT-2024-0003',
  requiereCompensacion: false,
  createdAt: '2024-09-10T14:00:00Z',
  updatedAt: '2024-09-30T09:00:00Z',
  observaciones: 'Licencia finalizada. Docente reincorporado exitosamente el 30 de septiembre.'
};

/**
 * 5. Comisión de Servicio - Activa
 */
export const situacion5: SituacionAdministrativa = {
  id: 'SIT-2024-005',
  docenteId: 'docente-030',
  docenteNombre: 'Dra. Patricia Mendoza Ruiz',
  docenteDocumento: '52.456.123',
  tipo: 'comision-servicio',
  descripcion: 'Comisión de servicio - Proceso de acreditación nacional',
  motivo: 'Participación en comisión de acreditación de programas a nivel nacional',
  fechaInicio: '2024-10-15T00:00:00Z',
  fechaFin: '2024-12-15T23:59:59Z',
  duracionDias: 62,
  estado: 'activa',
  impactoDisponibilidad: 'parcial',
  porcentajeDisponibilidad: 30,
  afectaPTA: true,
  afectaCargaAcademica: false,
  numeroActoAdministrativo: 'Resolución 0567 de 2024',
  evidencias: [
    {
      id: 'EVID-SIT-008',
      tipo: 'comunicado-oficial',
      nombre: 'Comunicado CNA - Comisión de Acreditación',
      descripcion: 'Comunicado oficial del CNA',
      url: 'https://drive.google.com/file/comunicado-cna.pdf',
      fechaCarga: '2024-10-01T10:00:00Z',
      cargadoPor: 'docente-030'
    }
  ],
  solicitadoPor: 'docente-030',
  solicitadoFecha: '2024-09-25T11:00:00Z',
  aprobadoPor: 'rectoria-001',
  aprobadoFecha: '2024-10-01T15:00:00Z',
  aprobadoCargo: 'Rector',
  observacionesAprobacion: 'Aprobada comisión. La docente mantendrá actividades de investigación de manera virtual.',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-10-02T09:00:00Z',
  funcionarioTH: 'Ana López - Talento Humano',
  codigoTH: 'TH-COM-2024-0008',
  requiereCompensacion: true,
  compensacionDescripcion: 'La docente compensará con actividades de investigación y tutorías virtuales',
  horasCompensadas: 120,
  createdAt: '2024-09-25T11:00:00Z',
  updatedAt: '2024-10-02T09:00:00Z',
  observaciones: 'Disponibilidad parcial 30%. Mantiene actividades de investigación virtuales.'
};

/**
 * 6. Licencia de Estudios - Aprobada, próxima
 */
export const situacion6: SituacionAdministrativa = {
  id: 'SIT-2024-006',
  docenteId: 'docente-035',
  docenteNombre: 'Mg. Laura Gómez Sánchez',
  docenteDocumento: '1.098.765.432',
  tipo: 'licencia-estudios',
  descripcion: 'Licencia para estudios doctorales - Universidad Nacional',
  motivo: 'Cursar semestre intensivo de doctorado en Ciencias Políticas',
  fechaInicio: '2025-01-10T00:00:00Z',
  fechaFin: '2025-06-30T23:59:59Z',
  duracionDias: 172,
  estado: 'aprobada',
  impactoDisponibilidad: 'parcial',
  porcentajeDisponibilidad: 50,
  afectaPTA: true,
  afectaCargaAcademica: true,
  numeroActoAdministrativo: 'Resolución 0678 de 2024',
  evidencias: [
    {
      id: 'EVID-SIT-009',
      tipo: 'certificado-estudios',
      nombre: 'Carta Universidad Nacional',
      descripcion: 'Carta de aceptación al programa doctoral',
      url: 'https://drive.google.com/file/carta-unal.pdf',
      fechaCarga: '2024-11-01T10:00:00Z',
      cargadoPor: 'docente-035'
    }
  ],
  solicitadoPor: 'docente-035',
  solicitadoFecha: '2024-10-20T09:00:00Z',
  aprobadoPor: 'rectoria-001',
  aprobadoFecha: '2024-11-05T14:00:00Z',
  aprobadoCargo: 'Rector',
  observacionesAprobacion: 'Aprobada licencia de estudios con 50% de disponibilidad. La docente mantendrá dirección de trabajos de grado y tutorías.',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-11-06T09:00:00Z',
  funcionarioTH: 'Carlos Méndez - Talento Humano',
  codigoTH: 'TH-EST-2024-0004',
  requiereCompensacion: true,
  compensacionDescripcion: 'Mantiene 50% de carga con dirección de trabajos de grado y tutorías',
  horasCompensadas: 400,
  createdAt: '2024-10-20T09:00:00Z',
  updatedAt: '2024-11-06T09:00:00Z',
  observaciones: 'Licencia aprobada. Docente mantendrá 50% de actividades académicas de forma virtual.'
};

/**
 * 7. Permiso No Remunerado - Solicitada
 */
export const situacion7: SituacionAdministrativa = {
  id: 'SIT-2024-007',
  docenteId: 'docente-040',
  docenteNombre: 'Dr. Javier Hernández Torres',
  docenteDocumento: '79.123.789',
  tipo: 'permiso-no-remunerado',
  descripcion: 'Permiso no remunerado - Asuntos personales',
  motivo: 'Atención de asuntos personales en el exterior',
  fechaInicio: '2025-02-01T00:00:00Z',
  fechaFin: '2025-02-28T23:59:59Z',
  duracionDias: 28,
  estado: 'solicitada',
  impactoDisponibilidad: 'total',
  porcentajeDisponibilidad: 0,
  afectaPTA: true,
  afectaCargaAcademica: true,
  evidencias: [],
  solicitadoPor: 'docente-040',
  solicitadoFecha: '2024-12-20T10:00:00Z',
  registradoTalentoHumano: false,
  requiereCompensacion: false,
  createdAt: '2024-12-20T10:00:00Z',
  updatedAt: '2024-12-20T10:00:00Z',
  observaciones: 'Solicitud pendiente de aprobación por Rectoría'
};

// ============================================================================
// COLECCIÓN COMPLETA
// ============================================================================

export const todasLasSituaciones: SituacionAdministrativa[] = [
  situacion1, // Activa - Maternidad
  situacion2, // Próxima - Año Sabático
  situacion3, // Activa - Incapacidad
  situacion4, // Finalizada - Paternidad
  situacion5, // Activa - Comisión Servicio
  situacion6, // Próxima - Licencia Estudios
  situacion7  // Solicitada - Permiso No Remunerado
];

// ============================================================================
// ALERTAS
// ============================================================================

// Generar alertas automáticas
export const alertasDisponibilidad: AlertaDisponibilidad[] = gestor.generarAlertas(
  todasLasSituaciones,
  '2024-12-22T00:00:00Z'
);

// ============================================================================
// REPORTE DE DISPONIBILIDAD
// ============================================================================

// Docentes de ejemplo
const docentesEjemplo = [
  { id: 'docente-010', nombre: 'Dra. María Fernanda Gutiérrez', vinculacion: 'carrera', territorial: 'Bogotá' },
  { id: 'docente-015', nombre: 'Dr. Roberto Silva Castro', vinculacion: 'carrera', territorial: 'Bogotá' },
  { id: 'docente-020', nombre: 'Mg. Carlos Andrés Ramírez', vinculacion: 'ocasional', territorial: 'Antioquia' },
  { id: 'docente-025', nombre: 'Dr. Andrés Felipe Moreno', vinculacion: 'carrera', territorial: 'Valle' },
  { id: 'docente-030', nombre: 'Dra. Patricia Mendoza Ruiz', vinculacion: 'carrera', territorial: 'Bogotá' },
  { id: 'docente-035', nombre: 'Mg. Laura Gómez Sánchez', vinculacion: 'carrera', territorial: 'Atlántico' },
  { id: 'docente-040', nombre: 'Dr. Javier Hernández Torres', vinculacion: 'ocasional', territorial: 'Bogotá' },
  // Docentes adicionales sin situaciones
  ...Array.from({ length: 50 }, (_, i) => ({
    id: `docente-${100 + i}`,
    nombre: `Docente ${100 + i}`,
    vinculacion: i % 3 === 0 ? 'carrera' : i % 3 === 1 ? 'ocasional' : 'catedra',
    territorial: i % 4 === 0 ? 'Bogotá' : i % 4 === 1 ? 'Antioquia' : i % 4 === 2 ? 'Valle' : 'Atlántico'
  }))
];

export const reporteDisponibilidad: ReporteDisponibilidad = gestor.generarReporteDisponibilidad(
  docentesEjemplo,
  todasLasSituaciones,
  '2025-1'
);

// ============================================================================
// SOLICITUDES A TALENTO HUMANO
// ============================================================================

export const solicitudesTH: SolicitudTalentoHumano[] = [
  {
    id: 'SOL-TH-2024-001',
    tipo: 'reporte-semestral',
    periodo: '2025-1',
    fechaSolicitud: '2024-12-01T10:00:00Z',
    solicitadoPor: 'gestion-profesoral-001',
    estado: 'respondida',
    fechaRespuesta: '2024-12-05T14:30:00Z',
    situacionesRecibidas: 7,
    observaciones: 'Reporte semestral procesado exitosamente. 7 situaciones registradas.'
  },
  {
    id: 'SOL-TH-2024-002',
    tipo: 'consulta-individual',
    periodo: '2025-1',
    fechaSolicitud: '2024-12-15T09:00:00Z',
    solicitadoPor: 'director-territorial-001',
    estado: 'enviada',
    observaciones: 'Solicitud de actualización de disponibilidad docente'
  }
];

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

/**
 * Obtener situaciones por docente
 */
export function obtenerSituacionesPorDocente(docenteId: string): SituacionAdministrativa[] {
  return todasLasSituaciones.filter(s => s.docenteId === docenteId);
}

/**
 * Obtener situaciones activas
 */
export function obtenerSituacionesActivas(): SituacionAdministrativa[] {
  return todasLasSituaciones.filter(s => s.estado === 'activa');
}

/**
 * Obtener situaciones próximas (30 días)
 */
export function obtenerSituacionesProximas(): SituacionAdministrativa[] {
  const hoy = new Date();
  const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return todasLasSituaciones.filter(s => {
    if (s.estado !== 'aprobada') return false;
    const inicio = new Date(s.fechaInicio);
    return inicio > hoy && inicio <= en30Dias;
  });
}

/**
 * Obtener situaciones pendientes de aprobación
 */
export function obtenerSituacionesPendientes(): SituacionAdministrativa[] {
  return todasLasSituaciones.filter(s => s.estado === 'solicitada');
}

/**
 * Calcular disponibilidad de un docente
 */
export function calcularDisponibilidadDocente(docenteId: string): {
  disponible: boolean;
  porcentaje: number;
  razon?: string;
} {
  const resultado = gestor.calcularDisponibilidad(
    docenteId,
    todasLasSituaciones,
    new Date().toISOString()
  );
  
  return {
    disponible: resultado.disponible,
    porcentaje: resultado.porcentajeDisponibilidad,
    razon: resultado.razon
  };
}
