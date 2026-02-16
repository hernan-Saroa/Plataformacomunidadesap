/**
 * DATOS MOCK: Solicitudes de Informes para el Módulo MOD-05
 */

import { SolicitudInforme } from '../core/types';

// Función helper para calcular días restantes
const calcularDiasRestantes = (fechaVencimiento: Date): number => {
  const hoy = new Date();
  const dias = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return dias;
};

// ============================================================================
// DATOS MOCK DE SOLICITUDES DE INFORMES
// ============================================================================

export const solicitudesConsolidadas: SolicitudInforme[] = [
  {
    id: 'SI-2025-001',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe de Gestión',
    enteSolicitante: 'Contraloría General de la República',
    radicadoExterno: 'RAD-CGR-2025-0123',
    asunto: 'Solicitud de informe trimestral de ejecución presupuestal',
    descripcion: 'La Contraloría solicita informe detallado de la ejecución presupuestal del primer trimestre 2025',
    responsable: 'María Fernanda López',
    fechaSolicitud: new Date('2025-01-15'),
    fechaVencimiento: new Date('2025-02-15'),
    diasTotales: 31,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-15')),
    datosRequeridos: [
      'Ejecución presupuestal por proyecto',
      'Certificados de disponibilidad',
      'Informes de interventoría'
    ],
    moduloOrigen: 'ORGANOS_CONTROL',
    tipoTermino: 'ENTE_CONTROL',
    prioridad: 'URGENTE',
    improrrogable: true,
    baseNormativa: 'Ley 42 de 1993',
    consecuenciaIncumplimiento: 'Apertura de proceso sancionatorio fiscal'
  },
  {
    id: 'SI-2025-002',
    etapa: 'EN_ELABORACION',
    tipoInforme: 'Informe de Auditoría',
    enteSolicitante: 'Procuraduría General de la Nación',
    radicadoExterno: 'RAD-PGN-2025-0456',
    asunto: 'Informe sobre procesos disciplinarios en curso',
    descripcion: 'Solicitud de información sobre todos los procesos disciplinarios activos',
    responsable: 'Carlos Alberto Rodríguez',
    fechaSolicitud: new Date('2025-01-20'),
    fechaVencimiento: new Date('2025-02-20'),
    diasTotales: 31,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-20')),
    datosRequeridos: [
      'Listado de procesos activos',
      'Estado de cada proceso',
      'Términos procesales'
    ],
    moduloOrigen: 'JUZGAMIENTO',
    tipoTermino: 'DISCIPLINARIO',
    prioridad: 'NORMAL',
    improrrogable: true,
    baseNormativa: 'Ley 734 de 2002',
    consecuenciaIncumplimiento: 'Investigación disciplinaria'
  },
  {
    id: 'SI-2025-003',
    etapa: 'EN_REVISION',
    tipoInforme: 'Respuesta Derecho de Petición',
    enteSolicitante: 'Ciudadano',
    radicadoExterno: 'RAD-EXT-2025-0789',
    asunto: 'Solicitud de información sobre concursos de méritos',
    descripcion: 'Ciudadano solicita información sobre convocatorias abiertas',
    responsable: 'Ana María Torres',
    fechaSolicitud: new Date('2025-01-25'),
    fechaVencimiento: new Date('2025-02-09'),
    diasTotales: 15,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-09')),
    datosRequeridos: [
      'Listado de convocatorias',
      'Requisitos de participación',
      'Cronograma'
    ],
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    tipoTermino: 'ADMINISTRATIVO',
    prioridad: 'NORMAL',
    improrrogable: false,
    baseNormativa: 'Código Contencioso Administrativo',
    consecuenciaIncumplimiento: 'Silencio administrativo positivo'
  },
  {
    id: 'SI-2025-004',
    etapa: 'APROBADO',
    tipoInforme: 'Informe Técnico',
    enteSolicitante: 'Ministerio de Educación',
    radicadoExterno: 'RAD-MINEDU-2025-0234',
    asunto: 'Informe de resultados de programas de capacitación',
    descripcion: 'Solicitud de informe sobre el impacto de los programas de capacitación 2024',
    responsable: 'Jorge Luis Martínez',
    fechaSolicitud: new Date('2025-01-10'),
    fechaVencimiento: new Date('2025-02-28'),
    diasTotales: 49,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-28')),
    datosRequeridos: [
      'Número de participantes',
      'Resultados de evaluaciones',
      'Certificaciones emitidas'
    ],
    moduloOrigen: 'PLAN_ACCION',
    tipoTermino: 'ADMINISTRATIVO',
    prioridad: 'NORMAL',
    improrrogable: false,
    baseNormativa: 'Convenio Interadministrativo 001-2024',
    consecuenciaIncumplimiento: 'Requerimiento formal'
  },
  {
    id: 'SI-2025-005',
    etapa: 'ENVIADO',
    tipoInforme: 'Informe Jurídico',
    enteSolicitante: 'Defensoría del Pueblo',
    radicadoExterno: 'RAD-DP-2025-0567',
    asunto: 'Informe sobre tutelas en trámite',
    descripcion: 'Solicitud de información sobre acciones de tutela contra la ESAP',
    responsable: 'Laura Patricia Gómez',
    fechaSolicitud: new Date('2025-01-05'),
    fechaVencimiento: new Date('2025-02-05'),
    diasTotales: 31,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-05')),
    datosRequeridos: [
      'Número de radicado de tutelas',
      'Estado procesal',
      'Pretensiones'
    ],
    moduloOrigen: 'DEFENSA_JUDICIAL',
    tipoTermino: 'JUDICIAL',
    prioridad: 'URGENTE',
    improrrogable: true,
    baseNormativa: 'Decreto 2591 de 1991',
    consecuenciaIncumplimiento: 'Incidente de desacato'
  },
  {
    id: 'SI-2025-006',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe de Control Interno',
    enteSolicitante: 'Oficina de Control Interno',
    radicadoExterno: 'RAD-OCI-2025-0012',
    asunto: 'Informe de seguimiento al Plan de Mejoramiento',
    descripcion: 'Solicitud de estado de avance de las acciones correctivas del Plan de Mejoramiento',
    responsable: 'Diego Fernando Ruiz',
    fechaSolicitud: new Date('2025-01-28'),
    fechaVencimiento: new Date('2025-02-12'),
    diasTotales: 15,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-12')),
    datosRequeridos: [
      'Estado de cada acción',
      'Evidencias de cumplimiento',
      'Porcentaje de avance'
    ],
    moduloOrigen: 'RIESGOS',
    tipoTermino: 'SLA_INTERNO',
    prioridad: 'NORMAL',
    improrrogable: false,
    baseNormativa: 'Manual de Control Interno ESAP',
    consecuenciaIncumplimiento: 'Hallazgo de control interno'
  },
  {
    id: 'SI-2025-007',
    etapa: 'VENCIDA',
    tipoInforme: 'Informe de Gestión',
    enteSolicitante: 'Archivo General de la Nación',
    radicadoExterno: 'RAD-AGN-2025-0890',
    asunto: 'Informe de gestión documental 2024',
    descripcion: 'Solicitud de informe anual de gestión documental y tablas de retención',
    responsable: 'Patricia Elena Vargas',
    fechaSolicitud: new Date('2025-01-02'),
    fechaVencimiento: new Date('2025-01-30'),
    diasTotales: 28,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-30')),
    datosRequeridos: [
      'Tablas de retención documental',
      'Inventario de archivos',
      'Plan de conservación'
    ],
    moduloOrigen: 'PLAN_ACCION',
    tipoTermino: 'ADMINISTRATIVO',
    prioridad: 'CRÍTICA',
    improrrogable: true,
    baseNormativa: 'Ley 594 de 2000',
    consecuenciaIncumplimiento: 'Sanción económica'
  },
  {
    id: 'SI-2025-008',
    etapa: 'EN_ELABORACION',
    tipoInforme: 'Informe Contractual',
    enteSolicitante: 'Contratista XYZ SAS',
    radicadoExterno: 'RAD-CONT-2025-0123',
    asunto: 'Informe de supervisión mensual',
    descripcion: 'Solicitud de informe de supervisión correspondiente al mes de enero 2025',
    responsable: 'Ricardo Andrés Moreno',
    fechaSolicitud: new Date('2025-01-30'),
    fechaVencimiento: new Date('2025-02-06'),
    diasTotales: 7,
    diasRestantes: calcularDiasRestantes(new Date('2025-02-06')),
    datosRequeridos: [
      'Actividades realizadas',
      'Cumplimiento de metas',
      'Observaciones'
    ],
    moduloOrigen: 'ASESORIA',
    tipoTermino: 'CONTRACTUAL',
    prioridad: 'NORMAL',
    improrrogable: false,
    baseNormativa: 'Contrato 001-2024',
    consecuenciaIncumplimiento: 'Incumplimiento contractual'
  }
];

// ============================================================================
// ESTADÍSTICAS PRECALCULADAS
// ============================================================================

export const estadisticasTerminosInformes = {
  totalSolicitudes: solicitudesConsolidadas.length,
  porEtapa: {
    recibida: solicitudesConsolidadas.filter(s => s.etapa === 'RECIBIDA').length,
    enElaboracion: solicitudesConsolidadas.filter(s => s.etapa === 'EN_ELABORACION').length,
    enRevision: solicitudesConsolidadas.filter(s => s.etapa === 'EN_REVISION').length,
    aprobado: solicitudesConsolidadas.filter(s => s.etapa === 'APROBADO').length,
    enviado: solicitudesConsolidadas.filter(s => s.etapa === 'ENVIADO').length,
    finalizada: solicitudesConsolidadas.filter(s => s.etapa === 'FINALIZADA').length,
    vencida: solicitudesConsolidadas.filter(s => s.etapa === 'VENCIDA').length
  },
  porSemaforo: {
    rojo: solicitudesConsolidadas.filter(s => s.diasRestantes <= 2).length,
    amarillo: solicitudesConsolidadas.filter(s => s.diasRestantes > 2 && s.diasRestantes <= 5).length,
    verde: solicitudesConsolidadas.filter(s => s.diasRestantes > 5).length
  },
  porModulo: {
    defensaJudicial: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'DEFENSA_JUDICIAL').length,
    juzgamiento: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'JUZGAMIENTO').length,
    asesoria: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'ASESORIA').length,
    organosControl: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'ORGANOS_CONTROL').length,
    centroComms: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'CENTRO_COMUNICACIONES').length,
    planAccion: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'PLAN_ACCION').length,
    riesgos: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'RIESGOS').length,
    terminosInformes: solicitudesConsolidadas.filter(s => s.moduloOrigen === 'TERMINOS_INFORMES').length
  },
  porPrioridad: {
    critica: solicitudesConsolidadas.filter(s => s.prioridad === 'CRÍTICA').length,
    urgente: solicitudesConsolidadas.filter(s => s.prioridad === 'URGENTE').length,
    normal: solicitudesConsolidadas.filter(s => s.prioridad === 'NORMAL').length
  }
};
