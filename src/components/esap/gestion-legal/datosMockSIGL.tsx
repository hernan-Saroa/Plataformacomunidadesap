/**
 * ============================================
 * DATOS MOCK - SIGL
 * ============================================
 * 
 * Datos de ejemplo para poblar todos los módulos del
 * Sistema Integral de Gestión Legal (SIGL)
 * 
 * Incluye:
 * - Casos distribuidos en todas las columnas del Kanban
 * - Usuarios del equipo jurídico
 * - Datos realistas de cada módulo
 */

// ============================================
// TIPOS
// ============================================

export type EstadoCaso = 
  | 'inicial' 
  | 'en_revision' 
  | 'asignado' 
  | 'en_proceso' 
  | 'requiere_accion'
  | 'pendiente_aprobacion'
  | 'en_espera'
  | 'completado' 
  | 'archivado'
  | 'vencido';

export type Prioridad = 'baja' | 'media' | 'alta' | 'critica';

export interface Caso {
  id: string;
  titulo: string;
  descripcion: string;
  modulo: string;
  estado: EstadoCaso;
  prioridad: Prioridad;
  asignadoA?: string;
  fechaCreacion: Date;
  fechaVencimiento: Date;
  etiquetas: string[];
  progreso?: number;
  metadata?: Record<string, any>;
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  avatar: string;
  email: string;
}

// ============================================
// USUARIOS MOCK
// ============================================

export const USUARIOS_MOCK: Usuario[] = [
  {
    id: 'usr-001',
    nombre: 'Dr. Luis Ramírez',
    rol: 'Jefe Oficina Jurídica',
    avatar: '👨‍⚖️',
    email: 'luis.ramirez@esap.gov.co',
  },
  {
    id: 'usr-002',
    nombre: 'Dra. Patricia González',
    rol: 'Abogada Senior',
    avatar: '👩‍⚖️',
    email: 'patricia.gonzalez@esap.gov.co',
  },
  {
    id: 'usr-003',
    nombre: 'Dr. Carlos Mendoza',
    rol: 'Abogado Litigante',
    avatar: '👨‍💼',
    email: 'carlos.mendoza@esap.gov.co',
  },
  {
    id: 'usr-004',
    nombre: 'Dra. María Torres',
    rol: 'Abogada Contractual',
    avatar: '👩‍💼',
    email: 'maria.torres@esap.gov.co',
  },
  {
    id: 'usr-005',
    nombre: 'Dr. Andrés Castillo',
    rol: 'Abogado Junior',
    avatar: '👨‍💻',
    email: 'andres.castillo@esap.gov.co',
  },
];

// ============================================
// CASOS MOCK - MOD-01: DEFENSA JUDICIAL
// ============================================

const CASOS_MOD01: Caso[] = [
  // POR ASIGNAR (inicial)
  {
    id: 'PJ-2025-00007',
    titulo: 'Acción de Tutela - Derecho a la Educación',
    descripcion: 'Estudiante solicita amparo por presunta vulneración del derecho a la educación tras cancelación de matrícula',
    modulo: 'mod-01',
    estado: 'inicial',
    prioridad: 'critica',
    fechaCreacion: new Date('2024-12-18'),
    fechaVencimiento: new Date('2024-12-28'),
    etiquetas: ['Tutela', 'Urgente', 'Educación'],
    metadata: {
      jurisdiccion: 'CONSTITUCIONAL',
      demandante: 'Carlos Andrés López',
      juzgado: 'Juzgado 30 Civil Municipal',
    },
  },
  {
    id: 'PJ-2025-00008',
    titulo: 'Nulidad y Restablecimiento - Acto Administrativo',
    descripcion: 'Demanda contra resolución que negó reconocimiento de prestaciones sociales',
    modulo: 'mod-01',
    estado: 'inicial',
    prioridad: 'alta',
    fechaCreacion: new Date('2024-12-17'),
    fechaVencimiento: new Date('2025-01-20'),
    etiquetas: ['Contencioso', 'Laboral'],
    metadata: {
      jurisdiccion: 'CONTENCIOSO',
      demandante: 'Sindicato ESAP',
      valorDemanda: 85000000,
    },
  },

  // ASIGNADO (asignado)
  {
    id: 'PJ-2025-00009',
    titulo: 'Proceso Ejecutivo - Cobro de Honorarios',
    descripcion: 'Demanda ejecutiva de firma de abogados externos por honorarios pendientes',
    modulo: 'mod-01',
    estado: 'asignado',
    prioridad: 'media',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2025-01-15'),
    etiquetas: ['Ejecutivo', 'Contractual'],
    progreso: 15,
    metadata: {
      jurisdiccion: 'ORDINARIA',
      valorDemanda: 15000000,
    },
  },
  {
    id: 'PJ-2025-00010',
    titulo: 'Demanda Laboral - Reintegro',
    descripcion: 'Ex-empleado solicita reintegro y pago de salarios caídos',
    modulo: 'mod-01',
    estado: 'asignado',
    prioridad: 'alta',
    asignadoA: 'usr-003',
    fechaCreacion: new Date('2024-12-05'),
    fechaVencimiento: new Date('2025-01-10'),
    etiquetas: ['Laboral', 'Reintegro'],
    progreso: 20,
    metadata: {
      jurisdiccion: 'LABORAL',
      valorDemanda: 120000000,
    },
  },

  // EN TRABAJO (en_proceso)
  {
    id: 'PJ-2025-00011',
    titulo: 'Acción Popular - Daño Ambiental',
    descripcion: 'Comunidad demanda por presuntos daños ambientales en sede ESAP',
    modulo: 'mod-01',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-11-25'),
    fechaVencimiento: new Date('2025-02-15'),
    etiquetas: ['Popular', 'Ambiental'],
    progreso: 45,
    metadata: {
      jurisdiccion: 'CONTENCIOSO',
      etapa: 'Contestación de demanda',
    },
  },
  {
    id: 'PJ-2025-00012',
    titulo: 'Nulidad Simple - Reglamento Académico',
    descripcion: 'Solicitud de nulidad de modificación al reglamento estudiantil',
    modulo: 'mod-01',
    estado: 'en_proceso',
    prioridad: 'baja',
    asignadoA: 'usr-005',
    fechaCreacion: new Date('2024-11-20'),
    fechaVencimiento: new Date('2025-01-25'),
    etiquetas: ['Nulidad', 'Académico'],
    progreso: 60,
    metadata: {
      jurisdiccion: 'CONTENCIOSO',
      etapa: 'Práctica de pruebas',
    },
  },
  {
    id: 'PJ-2024-00234',
    titulo: 'Acción de Cumplimiento - Concurso',
    descripcion: 'Funcionario exige cumplimiento de nombramiento por concurso de méritos',
    modulo: 'mod-01',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-10-15'),
    fechaVencimiento: new Date('2025-01-30'),
    etiquetas: ['Cumplimiento', 'Carrera'],
    progreso: 70,
  },

  // POR ACORDAR (requiere_accion)
  {
    id: 'PJ-2024-00187',
    titulo: 'Conciliación Prejudicial - Daños',
    descripcion: 'Audiencia de conciliación programada por daños en bien inmueble',
    modulo: 'mod-01',
    estado: 'requiere_accion',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-09-10'),
    fechaVencimiento: new Date('2024-12-22'),
    etiquetas: ['Conciliación', 'Urgente'],
    progreso: 80,
    metadata: {
      audiencia: new Date('2024-12-22'),
      valorConciliacion: 45000000,
    },
  },
  {
    id: 'PJ-2024-00156',
    titulo: 'Tutela - Segunda Instancia',
    descripcion: 'Impugnación de fallo de tutela, requiere revisión para recurso',
    modulo: 'mod-01',
    estado: 'requiere_accion',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-11-15'),
    fechaVencimiento: new Date('2024-12-20'),
    etiquetas: ['Tutela', 'Impugnación', 'Urgente'],
    progreso: 85,
  },

  // COMPLETADO
  {
    id: 'PJ-2024-00098',
    titulo: 'Sentencia Favorable - Nulidad',
    descripcion: 'Sentencia de primera instancia favorable a ESAP, demanda rechazada',
    modulo: 'mod-01',
    estado: 'completado',
    prioridad: 'media',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-03-10'),
    fechaVencimiento: new Date('2024-12-15'),
    etiquetas: ['Sentencia', 'Favorable'],
    progreso: 100,
    metadata: {
      resultado: 'Favorable',
      fechaSentencia: new Date('2024-12-15'),
    },
  },
];

// ============================================
// CASOS MOCK - MOD-02: ÓRGANOS DE CONTROL
// ============================================

const CASOS_MOD02: Caso[] = [
  {
    id: 'OC-2025-00015',
    titulo: 'Requerimiento Contraloría - Auditoría Financiera',
    descripcion: 'Contraloría General solicita documentación sobre ejecución presupuestal 2024',
    modulo: 'mod-02',
    estado: 'inicial',
    prioridad: 'alta',
    fechaCreacion: new Date('2024-12-16'),
    fechaVencimiento: new Date('2024-12-28'),
    etiquetas: ['Contraloría', 'Financiero'],
  },
  {
    id: 'OC-2025-00016',
    titulo: 'Auto de Apertura - Investigación Disciplinaria',
    descripcion: 'Procuraduría abre investigación por presunta falta disciplinaria de servidor',
    modulo: 'mod-02',
    estado: 'asignado',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-12-12'),
    fechaVencimiento: new Date('2025-01-05'),
    etiquetas: ['Procuraduría', 'Disciplinario'],
    progreso: 25,
  },
  {
    id: 'OC-2024-00234',
    titulo: 'Respuesta Derecho de Petición - CGR',
    descripcion: 'Contestación a solicitud de información sobre contratación 2023',
    modulo: 'mod-02',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-11-20'),
    fechaVencimiento: new Date('2024-12-25'),
    etiquetas: ['Petición', 'Contratación'],
    progreso: 55,
  },
  {
    id: 'OC-2024-00198',
    titulo: 'Hallazgo Fiscal - Descargo',
    descripcion: 'Descargos ante hallazgo fiscal por presunta irregularidad en compra',
    modulo: 'mod-02',
    estado: 'requiere_accion',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-10-15'),
    fechaVencimiento: new Date('2024-12-20'),
    etiquetas: ['Fiscal', 'Urgente'],
    progreso: 75,
  },
  {
    id: 'OC-2024-00145',
    titulo: 'Informe Gestión CGR - Cerrado',
    descripcion: 'Informe de gestión presentado exitosamente ante Contraloría',
    modulo: 'mod-02',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-09-01'),
    fechaVencimiento: new Date('2024-11-30'),
    etiquetas: ['Informe', 'Gestión'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-03: ASESORÍA JURÍDICA
// ============================================

const CASOS_MOD03: Caso[] = [
  {
    id: 'AJ-2025-00032',
    titulo: 'Concepto - Modificación Estatutos',
    descripcion: 'Solicitud de concepto jurídico sobre modificación de estatutos internos',
    modulo: 'mod-03',
    estado: 'inicial',
    prioridad: 'media',
    fechaCreacion: new Date('2024-12-18'),
    fechaVencimiento: new Date('2025-01-10'),
    etiquetas: ['Concepto', 'Estatutos'],
  },
  {
    id: 'AJ-2025-00033',
    titulo: 'Revisión Contrato - Convenio Interadministrativo',
    descripcion: 'Revisión jurídica de minuta de convenio con universidad pública',
    modulo: 'mod-03',
    estado: 'asignado',
    prioridad: 'alta',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-12-15'),
    fechaVencimiento: new Date('2024-12-30'),
    etiquetas: ['Contrato', 'Convenio'],
    progreso: 30,
  },
  {
    id: 'AJ-2024-00456',
    titulo: 'Asesoría - Proceso Disciplinario Interno',
    descripcion: 'Orientación jurídica para apertura de proceso disciplinario',
    modulo: 'mod-03',
    estado: 'en_proceso',
    prioridad: 'alta',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-11-28'),
    fechaVencimiento: new Date('2024-12-22'),
    etiquetas: ['Asesoría', 'Disciplinario'],
    progreso: 65,
  },
  {
    id: 'AJ-2024-00389',
    titulo: 'Concepto - Protección de Datos',
    descripcion: 'Concepto sobre cumplimiento RGPD en nueva plataforma digital',
    modulo: 'mod-03',
    estado: 'requiere_accion',
    prioridad: 'media',
    asignadoA: 'usr-005',
    fechaCreacion: new Date('2024-11-10'),
    fechaVencimiento: new Date('2024-12-25'),
    etiquetas: ['RGPD', 'Datos'],
    progreso: 80,
  },
  {
    id: 'AJ-2024-00301',
    titulo: 'Concepto Favorable - Licitación',
    descripcion: 'Concepto jurídico aprobado para proceso de licitación pública',
    modulo: 'mod-03',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-10-05'),
    fechaVencimiento: new Date('2024-11-20'),
    etiquetas: ['Licitación', 'Aprobado'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-04: JUZGAMIENTO DISCIPLINARIO
// ============================================

const CASOS_MOD04: Caso[] = [
  {
    id: 'JD-2025-00012',
    titulo: 'Queja Disciplinaria - Incumplimiento Horario',
    descripcion: 'Queja por presunto incumplimiento reiterado de horario laboral',
    modulo: 'mod-04',
    estado: 'inicial',
    prioridad: 'baja',
    fechaCreacion: new Date('2024-12-17'),
    fechaVencimiento: new Date('2025-01-15'),
    etiquetas: ['Queja', 'Horario'],
  },
  {
    id: 'JD-2025-00013',
    titulo: 'Investigación Preliminar - Presunta Falta Grave',
    descripcion: 'Investigación por presunta falta gravísima en manejo de recursos',
    modulo: 'mod-04',
    estado: 'asignado',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2025-01-20'),
    etiquetas: ['Grave', 'Recursos'],
    progreso: 20,
  },
  {
    id: 'JD-2024-00087',
    titulo: 'Descargos - Falta Leve',
    descripcion: 'Audiencia de descargos programada por falta leve administrativa',
    modulo: 'mod-04',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-003',
    fechaCreacion: new Date('2024-11-05'),
    fechaVencimiento: new Date('2024-12-28'),
    etiquetas: ['Descargos', 'Leve'],
    progreso: 60,
  },
  {
    id: 'JD-2024-00065',
    titulo: 'Fallo - Requiere Firma Rector',
    descripcion: 'Fallo disciplinario listo, requiere firma del Rector',
    modulo: 'mod-04',
    estado: 'requiere_accion',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-10-15'),
    fechaVencimiento: new Date('2024-12-21'),
    etiquetas: ['Fallo', 'Firma'],
    progreso: 90,
  },
  {
    id: 'JD-2024-00034',
    titulo: 'Sanción Ejecutoriada - Amonestación',
    descripcion: 'Proceso cerrado con sanción de amonestación escrita',
    modulo: 'mod-04',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-003',
    fechaCreacion: new Date('2024-08-10'),
    fechaVencimiento: new Date('2024-11-15'),
    etiquetas: ['Sanción', 'Cerrado'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-05: PROCESOS COACTIVOS
// ============================================

const CASOS_MOD05: Caso[] = [
  {
    id: 'PC-2025-00008',
    titulo: 'Cobro Coactivo - Cartera Vencida',
    descripcion: 'Inicio cobro coactivo por matrícula estudiantil vencida',
    modulo: 'mod-05',
    estado: 'inicial',
    prioridad: 'media',
    fechaCreacion: new Date('2024-12-16'),
    fechaVencimiento: new Date('2025-01-30'),
    etiquetas: ['Cobro', 'Matrícula'],
    metadata: {
      deudor: 'Estudiante XYZ',
      monto: 4500000,
    },
  },
  {
    id: 'PC-2024-00145',
    titulo: 'Mandamiento de Pago - Multa Contractual',
    descripcion: 'Mandamiento de pago por incumplimiento contractual',
    modulo: 'mod-05',
    estado: 'asignado',
    prioridad: 'alta',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-11-20'),
    fechaVencimiento: new Date('2025-01-15'),
    etiquetas: ['Multa', 'Contrato'],
    progreso: 35,
    metadata: {
      monto: 12000000,
    },
  },
  {
    id: 'PC-2024-00132',
    titulo: 'Embargo - Bienes Deudor',
    descripcion: 'Trámite de embargo de bienes por deuda superior a $50M',
    modulo: 'mod-05',
    estado: 'en_proceso',
    prioridad: 'critica',
    asignadoA: 'usr-003',
    fechaCreacion: new Date('2024-10-10'),
    fechaVencimiento: new Date('2025-02-01'),
    etiquetas: ['Embargo', 'Crítico'],
    progreso: 70,
    metadata: {
      monto: 58000000,
    },
  },
  {
    id: 'PC-2024-00098',
    titulo: 'Acuerdo de Pago - Requiere Aprobación',
    descripcion: 'Propuesta de acuerdo de pago pendiente de aprobación',
    modulo: 'mod-05',
    estado: 'requiere_accion',
    prioridad: 'media',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-09-15'),
    fechaVencimiento: new Date('2024-12-22'),
    etiquetas: ['Acuerdo', 'Aprobación'],
    progreso: 85,
  },
  {
    id: 'PC-2024-00067',
    titulo: 'Cobro Exitoso - Deuda Cancelada',
    descripcion: 'Proceso coactivo finalizado exitosamente, deuda cancelada',
    modulo: 'mod-05',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-07-01'),
    fechaVencimiento: new Date('2024-11-30'),
    etiquetas: ['Exitoso', 'Cancelado'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-06: BUZÓN DE NOTIFICACIONES
// ============================================

const CASOS_MOD06: Caso[] = [
  {
    id: 'BN-2025-00021',
    titulo: 'Notificación Electrónica - Sentencia Primera Instancia',
    descripcion: 'Notificación de sentencia de primera instancia en proceso de nulidad',
    modulo: 'mod-06',
    estado: 'inicial',
    prioridad: 'critica',
    fechaCreacion: new Date('2024-12-18'),
    fechaVencimiento: new Date('2024-12-23'),
    etiquetas: ['Sentencia', 'Urgente', 'Electrónica'],
    metadata: {
      radicado: 'PJ-2024-00234',
      tipoNotificacion: 'Electrónica',
      juzgado: 'Tribunal Administrativo',
    },
  },
  {
    id: 'BN-2025-00022',
    titulo: 'Auto Admisorio - Tutela',
    descripcion: 'Auto admisorio de tutela, requiere asignación inmediata de abogado',
    modulo: 'mod-06',
    estado: 'inicial',
    prioridad: 'critica',
    fechaCreacion: new Date('2024-12-17'),
    fechaVencimiento: new Date('2024-12-20'),
    etiquetas: ['Tutela', 'Crítico'],
  },
  {
    id: 'BN-2024-00567',
    titulo: 'Notificación Personal - Demanda Laboral',
    descripcion: 'Citación para notificación personal de demanda laboral',
    modulo: 'mod-06',
    estado: 'asignado',
    prioridad: 'alta',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2024-12-25'),
    etiquetas: ['Personal', 'Laboral'],
    progreso: 40,
  },
  {
    id: 'BN-2024-00489',
    titulo: 'Revisión Estado - Notificación Pendiente',
    descripcion: 'Verificación de estado de notificación en el sistema judicial',
    modulo: 'mod-06',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-005',
    fechaCreacion: new Date('2024-11-25'),
    fechaVencimiento: new Date('2024-12-22'),
    etiquetas: ['Verificación', 'Seguimiento'],
    progreso: 60,
  },
  {
    id: 'BN-2024-00401',
    titulo: 'Notificación Vencida - Requiere Acción',
    descripcion: 'Notificación sin atender, requiere acción urgente del jefe jurídico',
    modulo: 'mod-06',
    estado: 'requiere_accion',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-11-05'),
    fechaVencimiento: new Date('2024-12-19'),
    etiquetas: ['Vencida', 'Urgente'],
    progreso: 75,
  },
  {
    id: 'BN-2024-00312',
    titulo: 'Notificación Atendida - Archivo',
    descripcion: 'Notificación atendida correctamente y radicada en expediente',
    modulo: 'mod-06',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-003',
    fechaCreacion: new Date('2024-10-15'),
    fechaVencimiento: new Date('2024-11-30'),
    etiquetas: ['Atendida', 'Archivada'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-07: BUZÓN OFICINA JURÍDICA
// ============================================

const CASOS_MOD07: Caso[] = [
  {
    id: 'BOJ-2025-00034',
    titulo: 'Solicitud Concepto - Rectoría',
    descripcion: 'Rectoría solicita concepto urgente sobre modificación de estatuto',
    modulo: 'mod-07',
    estado: 'inicial',
    prioridad: 'alta',
    fechaCreacion: new Date('2024-12-18'),
    fechaVencimiento: new Date('2024-12-27'),
    etiquetas: ['Concepto', 'Rectoría'],
    metadata: {
      remitente: 'Rector Nacional',
      dependencia: 'Rectoría',
    },
  },
  {
    id: 'BOJ-2025-00035',
    titulo: 'Derecho de Petición - Estudiante',
    descripcion: 'Estudiante solicita información sobre proceso disciplinario',
    modulo: 'mod-07',
    estado: 'asignado',
    prioridad: 'media',
    asignadoA: 'usr-005',
    fechaCreacion: new Date('2024-12-15'),
    fechaVencimiento: new Date('2025-01-05'),
    etiquetas: ['Petición', 'Estudiante'],
    progreso: 25,
  },
  {
    id: 'BOJ-2024-00678',
    titulo: 'Revisión Contrato - Talento Humano',
    descripcion: 'Talento Humano requiere revisión de contrato laboral',
    modulo: 'mod-07',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-11-28'),
    fechaVencimiento: new Date('2024-12-28'),
    etiquetas: ['Contrato', 'TH'],
    progreso: 55,
  },
  {
    id: 'BOJ-2024-00589',
    titulo: 'Consulta Urgente - Dirección Financiera',
    descripcion: 'Consulta urgente sobre legalidad de pago extraordinario',
    modulo: 'mod-07',
    estado: 'requiere_accion',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-11-10'),
    fechaVencimiento: new Date('2024-12-20'),
    etiquetas: ['Urgente', 'Financiera'],
    progreso: 80,
  },
  {
    id: 'BOJ-2024-00432',
    titulo: 'Respuesta Enviada - Archivo',
    descripcion: 'Respuesta a consulta enviada y archivada correctamente',
    modulo: 'mod-07',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-10-05'),
    fechaVencimiento: new Date('2024-11-20'),
    etiquetas: ['Respondida', 'Archivada'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-08: PLAN DE ACCIÓN
// ============================================

const CASOS_MOD08: Caso[] = [
  {
    id: 'PA-2025-00015',
    titulo: 'Plan Acción - Hallazgo Contraloría 2024',
    descripcion: 'Formulación de plan de acción por hallazgo de Contraloría en auditoría 2024',
    modulo: 'mod-08',
    estado: 'inicial',
    prioridad: 'alta',
    fechaCreacion: new Date('2024-12-16'),
    fechaVencimiento: new Date('2025-01-15'),
    etiquetas: ['Hallazgo', 'CGR'],
    metadata: {
      hallazgoId: 'HAL-2024-045',
      responsable: 'Subdirección Administrativa',
    },
  },
  {
    id: 'PA-2024-00234',
    titulo: 'Seguimiento Plan - Mejora Contratación',
    descripcion: 'Seguimiento a plan de acción sobre mejora en procesos de contratación',
    modulo: 'mod-08',
    estado: 'asignado',
    prioridad: 'media',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-11-20'),
    fechaVencimiento: new Date('2025-02-20'),
    etiquetas: ['Seguimiento', 'Contratación'],
    progreso: 30,
  },
  {
    id: 'PA-2024-00189',
    titulo: 'Avance Plan - Fortalecimiento PQRS',
    descripcion: 'Revisión de avance en plan de fortalecimiento del sistema PQRS',
    modulo: 'mod-08',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-10-15'),
    fechaVencimiento: new Date('2025-01-30'),
    etiquetas: ['PQRS', 'Avance'],
    progreso: 65,
  },
  {
    id: 'PA-2024-00145',
    titulo: 'Cierre Plan - Requiere Aprobación',
    descripcion: 'Plan de acción cumplido, requiere aprobación para cierre oficial',
    modulo: 'mod-08',
    estado: 'requiere_accion',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-09-01'),
    fechaVencimiento: new Date('2024-12-22'),
    etiquetas: ['Cierre', 'Aprobación'],
    progreso: 95,
  },
  {
    id: 'PA-2024-00098',
    titulo: 'Plan Cerrado - Cumplimiento Total',
    descripcion: 'Plan de acción cerrado con cumplimiento del 100% de actividades',
    modulo: 'mod-08',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-06-15'),
    fechaVencimiento: new Date('2024-11-30'),
    etiquetas: ['Cerrado', 'Exitoso'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-09: RIESGOS
// ============================================

const CASOS_MOD09: Caso[] = [
  {
    id: 'RG-2025-00012',
    titulo: 'Riesgo Legal - Demandas Laborales',
    descripcion: 'Identificación de riesgo por incremento de demandas laborales',
    modulo: 'mod-09',
    estado: 'inicial',
    prioridad: 'critica',
    fechaCreacion: new Date('2024-12-17'),
    fechaVencimiento: new Date('2025-01-10'),
    etiquetas: ['Legal', 'Laboral', 'Alto'],
    metadata: {
      probabilidad: 'Alta',
      impacto: 'Crítico',
      valorEstimado: 500000000,
    },
  },
  {
    id: 'RG-2024-00178',
    titulo: 'Riesgo Reputacional - Redes Sociales',
    descripcion: 'Evaluación de riesgo por denuncias en redes sociales',
    modulo: 'mod-09',
    estado: 'asignado',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2024-12-30'),
    etiquetas: ['Reputacional', 'Comunicaciones'],
    progreso: 35,
  },
  {
    id: 'RG-2024-00145',
    titulo: 'Análisis Riesgo - Contratación 2025',
    descripcion: 'Análisis de riesgos jurídicos en plan de contratación 2025',
    modulo: 'mod-09',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-004',
    fechaCreacion: new Date('2024-11-15'),
    fechaVencimiento: new Date('2025-01-20'),
    etiquetas: ['Contractual', 'Preventivo'],
    progreso: 60,
  },
  {
    id: 'RG-2024-00098',
    titulo: 'Mitigación Riesgo - Requiere Decisión',
    descripcion: 'Plan de mitigación listo, requiere decisión de Alta Dirección',
    modulo: 'mod-09',
    estado: 'requiere_accion',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-10-20'),
    fechaVencimiento: new Date('2024-12-21'),
    etiquetas: ['Mitigación', 'Decisión'],
    progreso: 85,
  },
  {
    id: 'RG-2024-00067',
    titulo: 'Riesgo Mitigado - Cerrado',
    descripcion: 'Riesgo mitigado exitosamente, acciones implementadas',
    modulo: 'mod-09',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-08-10'),
    fechaVencimiento: new Date('2024-11-25'),
    etiquetas: ['Mitigado', 'Cerrado'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-10: PLANES DE MEJORAMIENTO
// ============================================

const CASOS_MOD10: Caso[] = [
  {
    id: 'PM-2025-00008',
    titulo: 'Plan Mejoramiento - Gestión Documental',
    descripcion: 'Formulación de plan de mejoramiento para gestión documental de la oficina',
    modulo: 'mod-10',
    estado: 'inicial',
    prioridad: 'media',
    fechaCreacion: new Date('2024-12-15'),
    fechaVencimiento: new Date('2025-03-15'),
    etiquetas: ['Documental', 'Interno'],
    metadata: {
      origen: 'Auditoría Interna',
      area: 'Oficina Jurídica',
    },
  },
  {
    id: 'PM-2024-00234',
    titulo: 'Avance Plan - Capacitación Equipo',
    descripcion: 'Seguimiento a plan de capacitación del equipo jurídico',
    modulo: 'mod-10',
    estado: 'asignado',
    prioridad: 'media',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-11-10'),
    fechaVencimiento: new Date('2025-02-10'),
    etiquetas: ['Capacitación', 'TH'],
    progreso: 40,
  },
  {
    id: 'PM-2024-00178',
    titulo: 'Implementación - Mejora Tiempos Respuesta',
    descripcion: 'Implementación de mejoras para reducir tiempos de respuesta',
    modulo: 'mod-10',
    estado: 'en_proceso',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-10-01'),
    fechaVencimiento: new Date('2025-01-30'),
    etiquetas: ['Eficiencia', 'Procesos'],
    progreso: 70,
  },
  {
    id: 'PM-2024-00134',
    titulo: 'Verificación - Requiere Validación',
    descripcion: 'Actividades completadas, requiere verificación de Control Interno',
    modulo: 'mod-10',
    estado: 'requiere_accion',
    prioridad: 'alta',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-08-15'),
    fechaVencimiento: new Date('2024-12-23'),
    etiquetas: ['Verificación', 'Control'],
    progreso: 90,
  },
  {
    id: 'PM-2024-00089',
    titulo: 'Plan Cerrado - Verificado',
    descripcion: 'Plan de mejoramiento cerrado y verificado por Control Interno',
    modulo: 'mod-10',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-05-10'),
    fechaVencimiento: new Date('2024-11-20'),
    etiquetas: ['Cerrado', 'Verificado'],
    progreso: 100,
  },
];

// ============================================
// CASOS MOCK - MOD-11: TÉRMINOS PARA INFORMES
// ============================================

const CASOS_MOD11: Caso[] = [
  {
    id: 'TI-2025-00005',
    titulo: 'Informe CGR - Gestión Legal 2024',
    descripcion: 'Preparación de informe anual de gestión legal para Contraloría',
    modulo: 'mod-11',
    estado: 'inicial',
    prioridad: 'critica',
    fechaCreacion: new Date('2024-12-16'),
    fechaVencimiento: new Date('2025-01-31'),
    etiquetas: ['CGR', 'Anual', 'Urgente'],
    metadata: {
      periodo: '2024',
      destinatario: 'Contraloría General',
    },
  },
  {
    id: 'TI-2024-00234',
    titulo: 'Informe Trimestral - Defensa Judicial',
    descripcion: 'Informe trimestral de resultados en defensa judicial Q4 2024',
    modulo: 'mod-11',
    estado: 'asignado',
    prioridad: 'alta',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2025-01-15'),
    etiquetas: ['Trimestral', 'Judicial'],
    progreso: 45,
  },
  {
    id: 'TI-2024-00189',
    titulo: 'Consolidado Mensual - Noviembre',
    descripcion: 'Consolidación de estadísticas mensuales de gestión legal',
    modulo: 'mod-11',
    estado: 'en_proceso',
    prioridad: 'media',
    asignadoA: 'usr-005',
    fechaCreacion: new Date('2024-11-25'),
    fechaVencimiento: new Date('2024-12-20'),
    etiquetas: ['Mensual', 'Estadísticas'],
    progreso: 75,
  },
  {
    id: 'TI-2024-00156',
    titulo: 'Informe Congreso - Requiere Firma',
    descripcion: 'Informe al Congreso listo, requiere firma del Jefe Jurídico',
    modulo: 'mod-11',
    estado: 'requiere_accion',
    prioridad: 'critica',
    asignadoA: 'usr-001',
    fechaCreacion: new Date('2024-11-05'),
    fechaVencimiento: new Date('2024-12-19'),
    etiquetas: ['Congreso', 'Firma'],
    progreso: 95,
  },
  {
    id: 'TI-2024-00123',
    titulo: 'Informe Enviado - Archivo',
    descripcion: 'Informe presentado exitosamente y archivado',
    modulo: 'mod-11',
    estado: 'completado',
    prioridad: 'baja',
    asignadoA: 'usr-002',
    fechaCreacion: new Date('2024-10-01'),
    fechaVencimiento: new Date('2024-11-15'),
    etiquetas: ['Enviado', 'Archivado'],
    progreso: 100,
  },
];

// ============================================
// CONSOLIDADO DE TODOS LOS CASOS
// ============================================

export const CASOS_MOCK: Caso[] = [
  ...CASOS_MOD01,
  ...CASOS_MOD02,
  ...CASOS_MOD03,
  ...CASOS_MOD04,
  ...CASOS_MOD05,
  ...CASOS_MOD06,
  ...CASOS_MOD07,
  ...CASOS_MOD08,
  ...CASOS_MOD09,
  ...CASOS_MOD10,
  ...CASOS_MOD11,
];

// ============================================
// ESTADÍSTICAS CALCULADAS
// ============================================

export const getEstadisticasPorModulo = (modulo: string) => {
  const casosModulo = CASOS_MOCK.filter(c => c.modulo === modulo);
  
  return {
    total: casosModulo.length,
    porAsignar: casosModulo.filter(c => c.estado === 'inicial').length,
    asignado: casosModulo.filter(c => c.estado === 'asignado').length,
    enProceso: casosModulo.filter(c => c.estado === 'en_proceso').length,
    porAcordar: casosModulo.filter(c => c.estado === 'requiere_accion').length,
    completado: casosModulo.filter(c => c.estado === 'completado').length,
    critica: casosModulo.filter(c => c.prioridad === 'critica').length,
    alta: casosModulo.filter(c => c.prioridad === 'alta').length,
    media: casosModulo.filter(c => c.prioridad === 'media').length,
    baja: casosModulo.filter(c => c.prioridad === 'baja').length,
  };
};