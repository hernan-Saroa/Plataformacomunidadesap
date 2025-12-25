/**
 * Datos Mock - Notificaciones (MOD-04: Buzón de Notificaciones)
 * Recepción centralizada de notificaciones judiciales y administrativas
 * 
 * Sistema de clasificación automática y distribución a módulos
 */

import { Notificacion, TipoNotificacion, EstadoNotificacion, ModuloDestino } from '../core/types';

// Función para crear fecha relativa
function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

// Función para determinar prioridad según días restantes
function determinarPrioridadNotificacion(diasParaResponder: number): 'ALTA' | 'MEDIA' | 'BAJA' {
  if (diasParaResponder <= 5) return 'ALTA';
  if (diasParaResponder <= 15) return 'MEDIA';
  return 'BAJA';
}

export const notificacionesMock: Notificacion[] = [
  // ========================================
  // ESTADO: SIN_REVISAR (5 notificaciones - URGENTE)
  // ========================================
  {
    id: 'NOT-2025-001',
    tipo: 'DEMANDA_JUDICIAL',
    moduloDestino: 'MOD-01',
    estado: 'SIN_REVISAR',
    fechaRecepcion: fechaHace(1),
    fechaNotificacionOficial: fechaHace(1),
    remitente: 'Tribunal Administrativo de Cundinamarca',
    radicadoExterno: '2025-00145-00',
    asunto: 'Notificación auto admisorio demanda Nulidad y Restablecimiento del Derecho - Expediente 2025-00145',
    resumen: 'La señora MARTHA LUCÍA GONZÁLEZ presenta demanda de Nulidad y Restablecimiento del Derecho contra ESAP por acto administrativo que declaró insubsistencia de su nombramiento como Directora Regional. Se admite demanda y se ordena notificación a ESAP para contestación.',
    diasParaResponder: 3,
    terminoLegal: '90 días (Ley 1437/2011)',
    prioridad: 'ALTA',
    documentosAdjuntos: [],
    asignadoA: undefined,
    observaciones: '',
    fechaCreacion: fechaHace(1),
    fechaActualizacion: fechaHace(1),
  },
  {
    id: 'NOT-2025-002',
    tipo: 'QUEJA_DISCIPLINARIA',
    moduloDestino: 'MOD-02',
    estado: 'SIN_REVISAR',
    fechaRecepcion: fechaHace(0), // Hoy
    fechaNotificacionOficial: fechaHace(0),
    remitente: 'Procuraduría General de la Nación - Regional Bogotá',
    radicadoExterno: 'IUC-D-2025-0098',
    asunto: 'Traslado de queja disciplinaria contra funcionario de ESAP - Investigación preliminar',
    resumen: 'La Procuraduría traslada queja presentada contra el Dr. ANDRÉS FELIPE MORALES, Director Administrativo, por presuntas irregularidades en proceso de selección de personal. Se ordena dar traslado a la Oficina de Control Interno Disciplinario de ESAP para investigación correspondiente.',
    diasParaResponder: 2,
    terminoLegal: '10 días taxativos (Ley 1952/2019)',
    prioridad: 'ALTA',
    documentosAdjuntos: [],
    asignadoA: undefined,
    observaciones: '',
    fechaCreacion: fechaHace(0),
    fechaActualizacion: fechaHace(0),
  },
  {
    id: 'NOT-2025-003',
    tipo: 'CONSULTA_INTERNA',
    moduloDestino: 'MOD-03',
    estado: 'SIN_REVISAR',
    fechaRecepcion: fechaHace(2),
    fechaNotificacionOficial: fechaHace(2),
    remitente: 'Dirección Financiera - Sede Nacional',
    radicadoExterno: 'DF-2025-0234',
    asunto: 'Consulta jurídica sobre tratamiento contable de glosa de Contraloría General',
    resumen: 'La Dirección Financiera consulta sobre el procedimiento legal y contable para atender glosa impuesta por la Contraloría General de la República por valor de $45.000.000. Se requiere concepto sobre recursos procedentes y términos aplicables.',
    diasParaResponder: 28,
    terminoLegal: '30 días (Decreto 019/2012)',
    prioridad: 'BAJA',
    documentosAdjuntos: [],
    asignadoA: undefined,
    observaciones: '',
    fechaCreacion: fechaHace(2),
    fechaActualizacion: fechaHace(2),
  },
  {
    id: 'NOT-2025-004',
    tipo: 'ACCION_TUTELA',
    moduloDestino: 'MOD-01',
    estado: 'SIN_REVISAR',
    fechaRecepcion: fechaHace(0), // Hoy
    fechaNotificacionOficial: fechaHace(0),
    remitente: 'Juzgado 45 Penal del Circuito de Bogotá',
    radicadoExterno: 'TUTELA-2025-00012',
    asunto: 'Acción de Tutela por presunta vulneración del derecho a la educación',
    resumen: 'El ciudadano JUAN CARLOS PÉREZ interpone acción de tutela contra ESAP por negación de matrícula en programa de Maestría en Gestión Pública, argumentando vulneración del derecho fundamental a la educación. Juzgado ordena notificación y solicita informe detallado en 48 horas.',
    diasParaResponder: 2,
    terminoLegal: '48 horas (término tutela)',
    prioridad: 'ALTA',
    documentosAdjuntos: [],
    asignadoA: undefined,
    observaciones: '',
    fechaCreacion: fechaHace(0),
    fechaActualizacion: fechaHace(0),
  },
  {
    id: 'NOT-2025-005',
    tipo: 'REQUERIMIENTO_ENTE_CONTROL',
    moduloDestino: 'MOD-03',
    estado: 'SIN_REVISAR',
    fechaRecepcion: fechaHace(3),
    fechaNotificacionOficial: fechaHace(3),
    remitente: 'Contraloría General de la República',
    radicadoExterno: 'CGR-2025-AUD-0456',
    asunto: 'Requerimiento de información para auditoría de cumplimiento año fiscal 2024',
    resumen: 'La Contraloría General requiere información sobre procesos contractuales, nómina y ejecución presupuestal del año 2024. Se solicita concepto jurídico sobre alcance de información que debe entregarse y términos legales aplicables.',
    diasParaResponder: 12,
    terminoLegal: '15 días (Decreto 403/2020)',
    prioridad: 'MEDIA',
    documentosAdjuntos: [],
    asignadoA: undefined,
    observaciones: '',
    fechaCreacion: fechaHace(3),
    fechaActualizacion: fechaHace(3),
  },

  // ========================================
  // ESTADO: REVISADA (3 notificaciones)
  // ========================================
  {
    id: 'NOT-2024-156',
    tipo: 'DEMANDA_JUDICIAL',
    moduloDestino: 'MOD-01',
    estado: 'REVISADA',
    fechaRecepcion: fechaHace(7),
    fechaNotificacionOficial: fechaHace(7),
    remitente: 'Juzgado Administrativo del Circuito de Cali',
    radicadoExterno: '2024-00789-00',
    asunto: 'Demanda laboral por despido sin justa causa',
    resumen: 'Ex funcionaria PATRICIA GONZÁLEZ demanda a ESAP por despido sin justa causa. Solicita reintegro, pago de salarios dejados de percibir e indemnización. Se admite demanda y se ordena contestación.',
    diasParaResponder: 83,
    terminoLegal: '90 días (Ley 1437/2011)',
    prioridad: 'BAJA',
    documentosAdjuntos: [],
    asignadoA: 'Dr. Juan Pérez López',
    observaciones: 'Revisada por jefe jurídico. Pendiente asignación formal a abogado.',
    fechaCreacion: fechaHace(7),
    fechaActualizacion: fechaHace(6),
  },
  {
    id: 'NOT-2024-162',
    tipo: 'QUEJA_DISCIPLINARIA',
    moduloDestino: 'MOD-02',
    estado: 'REVISADA',
    fechaRecepcion: fechaHace(10),
    fechaNotificacionOficial: fechaHace(10),
    remitente: 'Personería Municipal de Medellín',
    radicadoExterno: 'PM-MED-2024-1234',
    asunto: 'Queja ciudadana por presunto maltrato en atención al público',
    resumen: 'Ciudadano presenta queja contra funcionaria de ventanilla única por presunto maltrato y dilación injustificada en trámite de certificación académica.',
    diasParaResponder: 0,
    terminoLegal: '10 días taxativos (Ley 1952/2019)',
    prioridad: 'ALTA',
    documentosAdjuntos: [],
    asignadoA: 'Dra. Ana López García',
    observaciones: 'Revisada. Término vencido. Requiere respuesta urgente.',
    fechaCreacion: fechaHace(10),
    fechaActualizacion: fechaHace(9),
  },
  {
    id: 'NOT-2024-170',
    tipo: 'CONSULTA_INTERNA',
    moduloDestino: 'MOD-03',
    estado: 'REVISADA',
    fechaRecepcion: fechaHace(12),
    fechaNotificacionOficial: fechaHace(12),
    remitente: 'Gestión Humana - Sede Barranquilla',
    radicadoExterno: 'GH-BAQ-2024-0567',
    asunto: 'Consulta sobre aplicación de comisión de servicios en exterior',
    resumen: 'Se consulta sobre requisitos y procedimiento para otorgar comisión de servicios a funcionario que debe participar en evento académico internacional en Madrid, España.',
    diasParaResponder: 18,
    terminoLegal: '30 días (Decreto 019/2012)',
    prioridad: 'MEDIA',
    documentosAdjuntos: [],
    asignadoA: 'Dr. Pedro Gómez Sánchez',
    observaciones: 'En revisión de normativa aplicable.',
    fechaCreacion: fechaHace(12),
    fechaActualizacion: fechaHace(11),
  },

  // ========================================
  // ESTADO: ASIGNADA (3 notificaciones)
  // ========================================
  {
    id: 'NOT-2024-142',
    tipo: 'DEMANDA_JUDICIAL',
    moduloDestino: 'MOD-01',
    estado: 'ASIGNADA',
    fechaRecepcion: fechaHace(20),
    fechaNotificacionOficial: fechaHace(20),
    remitente: 'Tribunal Administrativo de Antioquia',
    radicadoExterno: '2024-00567-00',
    asunto: 'Controversias contractuales - Incumplimiento contrato de obra',
    resumen: 'Contratista demanda a ESAP por presunto incumplimiento en Contrato 045-2023 para remodelación Sede Medellín. Solicita pago de obras ejecutadas y lucro cesante.',
    diasParaResponder: 70,
    terminoLegal: '90 días (Ley 1437/2011)',
    prioridad: 'MEDIA',
    documentosAdjuntos: [],
    asignadoA: 'Dr. Juan Pérez López',
    observaciones: 'Asignada formalmente. Abogado elaborando contestación.',
    fechaCreacion: fechaHace(20),
    fechaActualizacion: fechaHace(18),
  },
  {
    id: 'NOT-2024-148',
    tipo: 'QUEJA_DISCIPLINARIA',
    moduloDestino: 'MOD-02',
    estado: 'ASIGNADA',
    fechaRecepcion: fechaHace(25),
    fechaNotificacionOficial: fechaHace(25),
    remitente: 'Procuraduría Regional Santander',
    radicadoExterno: 'IUC-D-2024-0789',
    asunto: 'Investigación disciplinaria por presunto conflicto de intereses',
    resumen: 'Investigación disciplinaria contra funcionario de contratación por presunto conflicto de intereses en adjudicación de contrato a empresa de familiar.',
    diasParaResponder: -15,
    terminoLegal: '10 días taxativos (Ley 1952/2019)',
    prioridad: 'ALTA',
    documentosAdjuntos: [],
    asignadoA: 'Dra. Ana López García',
    observaciones: 'Proceso en curso. Término vencido.',
    fechaCreacion: fechaHace(25),
    fechaActualizacion: fechaHace(23),
  },
  {
    id: 'NOT-2024-135',
    tipo: 'CONSULTA_INTERNA',
    moduloDestino: 'MOD-03',
    estado: 'ASIGNADA',
    fechaRecepcion: fechaHace(18),
    fechaNotificacionOficial: fechaHace(18),
    remitente: 'Vicerrectoría Académica',
    radicadoExterno: 'VA-2024-0890',
    asunto: 'Consulta sobre homologación de títulos extranjeros',
    resumen: 'Se consulta sobre requisitos legales para homologar títulos de doctorado obtenidos en universidades extranjeras para docentes de planta.',
    diasParaResponder: 12,
    terminoLegal: '30 días (Decreto 019/2012)',
    prioridad: 'MEDIA',
    documentosAdjuntos: [],
    asignadoA: 'Dr. Pedro Gómez Sánchez',
    observaciones: 'En elaboración de concepto jurídico.',
    fechaCreacion: fechaHace(18),
    fechaActualizacion: fechaHace(16),
  },

  // ========================================
  // ESTADO: ARCHIVADA (2 notificaciones)
  // ========================================
  {
    id: 'NOT-2024-098',
    tipo: 'CONSULTA_INTERNA',
    moduloDestino: 'MOD-03',
    estado: 'ARCHIVADA',
    fechaRecepcion: fechaHace(60),
    fechaNotificacionOficial: fechaHace(60),
    remitente: 'Dirección Administrativa - Sede Nacional',
    radicadoExterno: 'DA-2024-0456',
    asunto: 'Consulta sobre viabilidad jurídica de convenio interadministrativo',
    resumen: 'Consulta sobre viabilidad de suscribir convenio interadministrativo con Municipio de Bogotá para uso compartido de auditorio.',
    diasParaResponder: -30,
    terminoLegal: '30 días (Decreto 019/2012)',
    prioridad: 'BAJA',
    documentosAdjuntos: [],
    asignadoA: 'Dr. Juan Pérez López',
    observaciones: 'Concepto emitido y remitido al solicitante. Archivada.',
    fechaCreacion: fechaHace(60),
    fechaActualizacion: fechaHace(35),
  },
  {
    id: 'NOT-2024-087',
    tipo: 'REQUERIMIENTO_ENTE_CONTROL',
    moduloDestino: 'MOD-03',
    estado: 'ARCHIVADA',
    fechaRecepcion: fechaHace(75),
    fechaNotificacionOficial: fechaHace(75),
    remitente: 'Procuraduría General - Vigilancia Administrativa',
    radicadoExterno: 'PGN-VA-2024-0234',
    asunto: 'Requerimiento de información sobre estructura organizacional',
    resumen: 'Procuraduría requiere información actualizada sobre estructura organizacional, planta de personal y manual de funciones de ESAP.',
    diasParaResponder: -60,
    terminoLegal: '15 días (Decreto 403/2020)',
    prioridad: 'MEDIA',
    documentosAdjuntos: [],
    asignadoA: 'Dra. Ana López García',
    observaciones: 'Información remitida completa. Proceso cerrado.',
    fechaCreacion: fechaHace(75),
    fechaActualizacion: fechaHace(58),
  },
];

// Función helper para obtener notificaciones por estado
export function obtenerNotificacionesPorEstado(estado: EstadoNotificacion): Notificacion[] {
  return notificacionesMock.filter((not) => not.estado === estado);
}

// Función helper para obtener notificación por ID
export function obtenerNotificacionPorId(id: string): Notificacion | undefined {
  return notificacionesMock.find((not) => not.id === id);
}

// Función helper para obtener notificaciones por módulo destino
export function obtenerNotificacionesPorModulo(modulo: ModuloDestino): Notificacion[] {
  return notificacionesMock.filter((not) => not.moduloDestino === modulo);
}

// Función helper para obtener notificaciones por tipo
export function obtenerNotificacionesPorTipo(tipo: TipoNotificacion): Notificacion[] {
  return notificacionesMock.filter((not) => not.tipo === tipo);
}

// Estadísticas generales
export const estadisticasBuzonNotificaciones = {
  total: notificacionesMock.length,
  porEstado: {
    SIN_REVISAR: obtenerNotificacionesPorEstado('SIN_REVISAR').length,
    REVISADA: obtenerNotificacionesPorEstado('REVISADA').length,
    ASIGNADA: obtenerNotificacionesPorEstado('ASIGNADA').length,
    ARCHIVADA: obtenerNotificacionesPorEstado('ARCHIVADA').length,
  },
  porModulo: {
    'MOD-01': obtenerNotificacionesPorModulo('MOD-01').length,
    'MOD-02': obtenerNotificacionesPorModulo('MOD-02').length,
    'MOD-03': obtenerNotificacionesPorModulo('MOD-03').length,
  },
  porTipo: {
    DEMANDA_JUDICIAL: obtenerNotificacionesPorTipo('DEMANDA_JUDICIAL').length,
    ACCION_TUTELA: obtenerNotificacionesPorTipo('ACCION_TUTELA').length,
    QUEJA_DISCIPLINARIA: obtenerNotificacionesPorTipo('QUEJA_DISCIPLINARIA').length,
    CONSULTA_INTERNA: obtenerNotificacionesPorTipo('CONSULTA_INTERNA').length,
    REQUERIMIENTO_ENTE_CONTROL: obtenerNotificacionesPorTipo('REQUERIMIENTO_ENTE_CONTROL').length,
  },
  urgentes: notificacionesMock.filter(
    (n) => n.estado !== 'ARCHIVADA' && n.prioridad === 'ALTA'
  ).length,
  vencidas: notificacionesMock.filter(
    (n) => n.estado !== 'ARCHIVADA' && n.diasParaResponder <= 0
  ).length,
  sinRevisar: obtenerNotificacionesPorEstado('SIN_REVISAR').length,
  hoy: notificacionesMock.filter(
    (n) => n.fechaRecepcion.toDateString() === new Date().toDateString()
  ).length,
};
