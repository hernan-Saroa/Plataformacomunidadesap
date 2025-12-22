/**
 * ============================================
 * DATOS MOCK - SIGL
 * ============================================
 * 
 * Datos de prueba para el Sistema Integrado de Gestión Legal
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
  | 'finalizado'
  | 'archivado';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  iniciales: string;
  color: string;
  avatar?: string;
}

export interface Caso {
  id: string;
  moduloId: string;
  moduloNombre: string;
  radicado: string;
  asunto: string;
  estado: EstadoCaso;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  responsable: {
    id: string;
    nombre: string;
    rol: string;
    iniciales: string;
    color: string;
  };
  asignadoA: string; // ID del usuario responsable
  fechaCreacion: Date;
  fechaVencimiento?: Date;
  diasRestantes?: number;
  demandante?: string;
  demandado?: string;
  cuantia?: number;
  etiquetas?: string[];
  comentarios?: number;
  documentos?: number;
  progreso?: number;
  descripcion?: string;
}

// ============================================
// USUARIOS MOCK
// ============================================

export const USUARIOS_MOCK: Usuario[] = [
  {
    id: 'U001',
    nombre: 'Luis Rodríguez',
    email: 'luis.rodriguez@esap.edu.co',
    rol: 'Abogado Jefe',
    iniciales: 'LR',
    color: '#4A90E2',
  },
  {
    id: 'U002',
    nombre: 'María García',
    email: 'maria.garcia@esap.edu.co',
    rol: 'Abogada Senior',
    iniciales: 'MG',
    color: '#E24A90',
  },
  {
    id: 'U003',
    nombre: 'Carlos Méndez',
    email: 'carlos.mendez@esap.edu.co',
    rol: 'Abogado Junior',
    iniciales: 'CM',
    color: '#90E24A',
  },
  {
    id: 'U004',
    nombre: 'Ana Martínez',
    email: 'ana.martinez@esap.edu.co',
    rol: 'Coordinadora Legal',
    iniciales: 'AM',
    color: '#E2904A',
  },
  {
    id: 'U005',
    nombre: 'Pedro Sánchez',
    email: 'pedro.sanchez@esap.edu.co',
    rol: 'Asistente Legal',
    iniciales: 'PS',
    color: '#20B2AA',
  },
];

// ============================================
// CASOS MOCK
// ============================================

export const CASOS_MOCK: Caso[] = [
  // DEFENSA JUDICIAL (MOD-01)
  {
    id: 'C001',
    moduloId: 'MOD-01',
    moduloNombre: 'Defensa Judicial',
    radicado: '2024-DEF-001',
    asunto: 'Acción de Tutela - Derecho a la educación',
    estado: 'en_proceso',
    prioridad: 'alta',
    responsable: {
      id: 'U001',
      nombre: 'Luis Rodríguez',
      rol: 'Abogado Jefe',
      iniciales: 'LR',
      color: '#4A90E2',
    },
    asignadoA: 'U001',
    fechaCreacion: new Date('2024-12-01'),
    fechaVencimiento: new Date('2024-12-25'),
    diasRestantes: 15,
    demandante: 'Juan Pérez González',
    demandado: 'ESAP',
    cuantia: 0,
    etiquetas: ['Tutela', 'Urgente', 'Educación'],
    comentarios: 5,
    documentos: 8,
    progreso: 65,
    descripcion: 'Acción de tutela interpuesta por estudiante solicitando reintegro al programa académico.',
  },
  {
    id: 'C002',
    moduloId: 'MOD-01',
    moduloNombre: 'Defensa Judicial',
    radicado: '2024-DEF-002',
    asunto: 'Nulidad y Restablecimiento del Derecho - Acto Administrativo',
    estado: 'asignado',
    prioridad: 'media',
    responsable: {
      id: 'U002',
      nombre: 'María García',
      rol: 'Abogada Senior',
      iniciales: 'MG',
      color: '#E24A90',
    },
    asignadoA: 'U002',
    fechaCreacion: new Date('2024-12-05'),
    fechaVencimiento: new Date('2024-12-30'),
    diasRestantes: 20,
    demandante: 'Ex-funcionario ESAP',
    demandado: 'ESAP',
    cuantia: 45000000,
    etiquetas: ['Nulidad', 'Laboral'],
    comentarios: 2,
    documentos: 12,
    progreso: 30,
    descripcion: 'Demanda de nulidad contra acto administrativo de retiro del servicio.',
  },
  {
    id: 'C003',
    moduloId: 'MOD-01',
    moduloNombre: 'Defensa Judicial',
    radicado: '2024-DEF-003',
    asunto: 'Proceso Ejecutivo - Cobro de Obligaciones',
    estado: 'inicial',
    prioridad: 'baja',
    responsable: {
      id: 'U003',
      nombre: 'Carlos Méndez',
      rol: 'Abogado Junior',
      iniciales: 'CM',
      color: '#90E24A',
    },
    asignadoA: 'U003',
    fechaCreacion: new Date('2024-12-10'),
    diasRestantes: 45,
    demandante: 'ESAP',
    demandado: 'Proveedor XYZ',
    cuantia: 15000000,
    etiquetas: ['Cobro', 'Contractual'],
    comentarios: 1,
    documentos: 5,
    progreso: 10,
    descripcion: 'Cobro de obligación contractual pendiente de pago.',
  },

  // JUZGAMIENTO DISCIPLINARIO (MOD-02)
  {
    id: 'C004',
    moduloId: 'MOD-02',
    moduloNombre: 'Juzgamiento Disciplinario',
    radicado: '2024-DISC-001',
    asunto: 'Proceso Disciplinario - Falta gravísima por peculado',
    estado: 'en_proceso',
    prioridad: 'urgente',
    responsable: {
      id: 'U004',
      nombre: 'Ana Martínez',
      rol: 'Coordinadora Legal',
      iniciales: 'AM',
      color: '#E2904A',
    },
    asignadoA: 'U004',
    fechaCreacion: new Date('2024-11-15'),
    fechaVencimiento: new Date('2024-12-20'),
    diasRestantes: 10,
    etiquetas: ['Disciplinario', 'Grave', 'Urgente'],
    comentarios: 15,
    documentos: 25,
    progreso: 75,
    descripcion: 'Proceso disciplinario por presunto desvío de recursos públicos.',
  },
  {
    id: 'C005',
    moduloId: 'MOD-02',
    moduloNombre: 'Juzgamiento Disciplinario',
    radicado: '2024-DISC-002',
    asunto: 'Proceso Disciplinario - Incumplimiento de deberes',
    estado: 'en_revision',
    prioridad: 'media',
    responsable: {
      id: 'U005',
      nombre: 'Pedro Sánchez',
      rol: 'Asistente Legal',
      iniciales: 'PS',
      color: '#20B2AA',
    },
    asignadoA: 'U005',
    fechaCreacion: new Date('2024-12-01'),
    fechaVencimiento: new Date('2025-01-15'),
    diasRestantes: 35,
    etiquetas: ['Disciplinario', 'Administrativo'],
    comentarios: 8,
    documentos: 15,
    progreso: 45,
    descripcion: 'Investigación por incumplimiento de funciones asignadas.',
  },

  // ASESORÍA JURÍDICA (MOD-03)
  {
    id: 'C006',
    moduloId: 'MOD-03',
    moduloNombre: 'Asesoría Jurídica',
    radicado: '2024-ASES-001',
    asunto: 'Revisión de Contrato de Servicios Profesionales',
    estado: 'asignado',
    prioridad: 'alta',
    responsable: {
      id: 'U001',
      nombre: 'Luis Rodríguez',
      rol: 'Abogado Jefe',
      iniciales: 'LR',
      color: '#4A90E2',
    },
    asignadoA: 'U001',
    fechaCreacion: new Date('2024-12-08'),
    fechaVencimiento: new Date('2024-12-18'),
    diasRestantes: 8,
    cuantia: 85000000,
    etiquetas: ['Contractual', 'Urgente'],
    comentarios: 6,
    documentos: 10,
    progreso: 40,
    descripcion: 'Revisión jurídica de minuta de contrato de servicios profesionales.',
  },
  {
    id: 'C007',
    moduloId: 'MOD-03',
    moduloNombre: 'Asesoría Jurídica',
    radicado: '2024-ASES-002',
    asunto: 'Concepto Jurídico - Interpretación Normativa',
    estado: 'en_proceso',
    prioridad: 'media',
    responsable: {
      id: 'U002',
      nombre: 'María García',
      rol: 'Abogada Senior',
      iniciales: 'MG',
      color: '#E24A90',
    },
    asignadoA: 'U002',
    fechaCreacion: new Date('2024-12-05'),
    diasRestantes: 25,
    etiquetas: ['Concepto', 'Normativo'],
    comentarios: 3,
    documentos: 7,
    progreso: 60,
    descripcion: 'Concepto sobre aplicación de normas de contratación pública.',
  },

  // PROCESOS COACTIVOS (MOD-04)
  {
    id: 'C008',
    moduloId: 'MOD-04',
    moduloNombre: 'Procesos Coactivos',
    radicado: '2024-COAC-001',
    asunto: 'Cobro Coactivo - Obligación Tributaria',
    estado: 'en_proceso',
    prioridad: 'media',
    responsable: {
      id: 'U003',
      nombre: 'Carlos Méndez',
      rol: 'Abogado Junior',
      iniciales: 'CM',
      color: '#90E24A',
    },
    asignadoA: 'U003',
    fechaCreacion: new Date('2024-11-20'),
    cuantia: 12000000,
    etiquetas: ['Coactivo', 'Tributario'],
    comentarios: 4,
    documentos: 9,
    progreso: 55,
    descripcion: 'Proceso de cobro coactivo por obligación tributaria pendiente.',
  },

  // ÓRGANOS DE CONTROL (MOD-05)
  {
    id: 'C009',
    moduloId: 'MOD-05',
    moduloNombre: 'Órganos de Control',
    radicado: '2024-CONT-001',
    asunto: 'Requerimiento Contraloría - Auditoría Contractual',
    estado: 'requiere_accion',
    prioridad: 'urgente',
    responsable: {
      id: 'U004',
      nombre: 'Ana Martínez',
      rol: 'Coordinadora Legal',
      iniciales: 'AM',
      color: '#E2904A',
    },
    asignadoA: 'U004',
    fechaCreacion: new Date('2024-12-08'),
    fechaVencimiento: new Date('2024-12-15'),
    diasRestantes: 5,
    etiquetas: ['Contraloría', 'Urgente', 'Auditoría'],
    comentarios: 12,
    documentos: 20,
    progreso: 70,
    descripcion: 'Respuesta a requerimiento de Contraloría sobre proceso contractual.',
  },
  {
    id: 'C010',
    moduloId: 'MOD-05',
    moduloNombre: 'Órganos de Control',
    radicado: '2024-CONT-002',
    asunto: 'Derecho de Petición - Procuraduría',
    estado: 'asignado',
    prioridad: 'alta',
    responsable: {
      id: 'U005',
      nombre: 'Pedro Sánchez',
      rol: 'Asistente Legal',
      iniciales: 'PS',
      color: '#20B2AA',
    },
    asignadoA: 'U005',
    fechaCreacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2024-12-23'),
    diasRestantes: 13,
    etiquetas: ['Procuraduría', 'Derecho de Petición'],
    comentarios: 3,
    documentos: 6,
    progreso: 25,
    descripcion: 'Respuesta a derecho de petición de la Procuraduría.',
  },

  // TÉRMINOS E INFORMES (MOD-06)
  {
    id: 'C011',
    moduloId: 'MOD-06',
    moduloNombre: 'Términos e Informes',
    radicado: '2024-TERM-001',
    asunto: 'Informe Trimestral de Gestión Legal',
    estado: 'en_proceso',
    prioridad: 'alta',
    responsable: {
      id: 'U001',
      nombre: 'Luis Rodríguez',
      rol: 'Abogado Jefe',
      iniciales: 'LR',
      color: '#4A90E2',
    },
    asignadoA: 'U001',
    fechaCreacion: new Date('2024-12-01'),
    fechaVencimiento: new Date('2024-12-20'),
    diasRestantes: 10,
    etiquetas: ['Informe', 'Trimestral', 'Gestión'],
    comentarios: 7,
    documentos: 15,
    progreso: 80,
    descripcion: 'Consolidación de informe trimestral de gestión legal Q4 2024.',
  },

  // RIESGOS (MOD-07)
  {
    id: 'C012',
    moduloId: 'MOD-07',
    moduloNombre: 'Riesgos',
    radicado: '2024-RIESG-001',
    asunto: 'Evaluación de Riesgo Legal - Nuevo Proceso Contractual',
    estado: 'en_revision',
    prioridad: 'media',
    responsable: {
      id: 'U002',
      nombre: 'María García',
      rol: 'Abogada Senior',
      iniciales: 'MG',
      color: '#E24A90',
    },
    asignadoA: 'U002',
    fechaCreacion: new Date('2024-12-05'),
    diasRestantes: 20,
    etiquetas: ['Riesgo', 'Contractual'],
    comentarios: 5,
    documentos: 8,
    progreso: 50,
    descripción: 'Análisis de riesgos legales en proceso contractual de gran cuantía.',
  },
];

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Obtiene casos por módulo
 */
export const getCasosPorModulo = (moduloId: string): Caso[] => {
  return CASOS_MOCK.filter(caso => caso.moduloId === moduloId);
};

/**
 * Obtiene casos por estado
 */
export const getCasosPorEstado = (estado: EstadoCaso): Caso[] => {
  return CASOS_MOCK.filter(caso => caso.estado === estado);
};

/**
 * Obtiene casos por responsable
 */
export const getCasosPorResponsable = (usuarioId: string): Caso[] => {
  return CASOS_MOCK.filter(caso => caso.asignadoA === usuarioId);
};

/**
 * Obtiene usuario por ID
 */
export const getUsuarioPorId = (usuarioId: string): Usuario | undefined => {
  return USUARIOS_MOCK.find(usuario => usuario.id === usuarioId);
};
