/**
 * PROCESOS MOCK PARA KANBAN - TODAS LAS ETAPAS
 * Dataset reducido con 1 proceso por cada estado del Kanban (OPTIMIZADO)
 * Fecha: 10 de febrero de 2026
 */

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT' | 'INTERNO' | 'Anónimo';
  numeroIdentificacion: string;
}

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona;
  denunciado: Persona;
  cedula: string;
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  estadoActual: string;
  profesionalAsignado: Persona;
  profesionalAsignadoId?: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  borradores: any[];
  documentos: any[];
  pendienteAprobacion: boolean;
  ultimaActuacion: string;
  fechaCreacion: string;
  tipo: 'proceso';
  hechos?: string;
  cargo?: string;
  dependencia?: string;
  historialAuditoria?: any[];
}

export const PROCESOS_KANBAN_COMPLETO: Proceso[] = [
  // ==================== RECEPCIÓN ====================
  {
    id: 'proc-rec-001',
    numeroProceso: 'PROC-2026-0089',
    noticiaOrigen: 'NOT-2026-0265',
    denunciante: {
      nombre: 'Sindicato de Trabajadores ESAP',
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '900.123.456-7'
    },
    denunciado: {
      nombre: 'Roberto Carlos Mendoza Silva',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79.234.567'
    },
    cedula: '79234567',
    etapaActual: 'Recepción',
    estadoActual: 'Recibida - Pendiente Asignación',
    profesionalAsignado: {
      nombre: 'Por Asignar',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '0'
    },
    profesionalAsignadoId: undefined,
    semaforo: 'verde',
    diasRestantes: 30,
    porcentajeTiempo: 10,
    borradores: [],
    documentos: [{ id: 'd1', nombre: 'Denuncia inicial sindical' }],
    pendienteAprobacion: false,
    ultimaActuacion: 'Radicado recibido el 08-Feb-2026. Pendiente asignación de profesional.',
    fechaCreacion: '2026-02-08',
    tipo: 'proceso',
    hechos: 'Presunto maltrato verbal y acoso laboral sistemático.',
    cargo: 'Jefe de Mantenimiento',
    dependencia: 'Dirección Administrativa'
  },

  // ==================== VALORACIÓN ====================
  {
    id: 'proc-val-001',
    numeroProceso: 'PROC-2026-0082',
    noticiaOrigen: 'NOT-2026-0220',
    denunciante: {
      nombre: 'Asociación de Estudiantes ESAP',
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '900.234.567-8'
    },
    denunciado: {
      nombre: 'Julián Andrés Vargas Pérez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '1.023.456.789'
    },
    cedula: '1023456789',
    etapaActual: 'Valoración',
    estadoActual: 'En Valoración Jurídica',
    profesionalAsignado: {
      nombre: 'Dra. Ana María López Sánchez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52.123.456'
    },
    profesionalAsignadoId: '2',
    semaforo: 'verde',
    diasRestantes: 25,
    porcentajeTiempo: 20,
    borradores: [{ id: 'b1', nombre: 'Borrador análisis preliminar' }],
    documentos: [
      { id: 'd1', nombre: 'Petición estudiantes' },
      { id: 'd2', nombre: 'Actas reuniones previas' }
    ],
    pendienteAprobacion: false,
    ultimaActuacion: 'Análisis de competencia y procedencia en curso.',
    fechaCreacion: '2026-01-28',
    tipo: 'proceso',
    hechos: 'Presunta negación arbitraria de derechos de petición.',
    cargo: 'Director de Programa Académico',
    dependencia: 'Facultad de Posgrados'
  },

  // ==================== INDAGACIÓN ====================
  {
    id: 'proc-ind-001',
    numeroProceso: 'PROC-2026-0025',
    noticiaOrigen: 'NOT-2026-0102',
    denunciante: {
      nombre: 'Carlos Alberto Mora Suárez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79.123.456'
    },
    denunciado: {
      nombre: 'María Fernanda Rodríguez Castro',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52.987.654'
    },
    cedula: '52987654',
    etapaActual: 'Indagación',
    estadoActual: 'Indagación Preliminar',
    profesionalAsignado: {
      nombre: 'Dr. Luis Eduardo García Martínez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80.456.789'
    },
    profesionalAsignadoId: '1',
    semaforo: 'amarillo',
    diasRestantes: 22,
    porcentajeTiempo: 60,
    borradores: [{ id: 'b1', nombre: 'Auto de apertura indagación' }],
    documentos: [
      { id: 'd1', nombre: 'Denuncia original' },
      { id: 'd2', nombre: 'Pruebas testimoniales' },
      { id: 'd3', nombre: 'Oficio Contraloría' }
    ],
    pendienteAprobacion: true,
    ultimaActuacion: 'Recepción de hallazgos Contraloría. Pendiente auto de vinculación.',
    fechaCreacion: '2026-01-20',
    tipo: 'proceso',
    hechos: 'Presunto uso indebido de recursos institucionales.',
    cargo: 'Coordinadora Administrativa',
    dependencia: 'Territorial Cundinamarca'
  },

  // ==================== INVESTIGACIÓN ====================
  {
    id: 'proc-inv-001',
    numeroProceso: 'PROC-2025-0178',
    noticiaOrigen: 'NOT-2025-0489',
    denunciante: {
      nombre: 'Contraloría General',
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '899.999.061-2'
    },
    denunciado: {
      nombre: 'Eduardo Javier Montoya Ríos',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '16.789.012'
    },
    cedula: '16789012',
    etapaActual: 'Investigación',
    estadoActual: 'Investigación Formal',
    profesionalAsignado: {
      nombre: 'Dr. Luis Eduardo García Martínez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80.456.789'
    },
    profesionalAsignadoId: '1',
    semaforo: 'amarillo',
    diasRestantes: 52,
    porcentajeTiempo: 50,
    borradores: [{ id: 'b1', nombre: 'Borrador pliego de cargos' }],
    documentos: [
      { id: 'd1', nombre: 'Auto apertura investigación' },
      { id: 'd2', nombre: 'Hallazgos Contraloría' },
      { id: 'd3', nombre: 'Proceso contractual completo' }
    ],
    pendienteAprobacion: true,
    ultimaActuacion: 'Práctica de pruebas en curso. Pendiente cierre de investigación.',
    fechaCreacion: '2025-08-15',
    tipo: 'proceso',
    hechos: 'Presunta irregularidad en proceso contractual.',
    cargo: 'Director de Contratación',
    dependencia: 'Dirección Administrativa'
  },

  // ==================== JUZGAMIENTO ====================
  {
    id: 'proc-juz-001',
    numeroProceso: 'PROC-2025-0112',
    noticiaOrigen: 'NOT-2025-0312',
    denunciante: {
      nombre: 'Auditoría Interna ESAP',
      tipoIdentificacion: 'INTERNO',
      numeroIdentificacion: 'N/A'
    },
    denunciado: {
      nombre: 'Martha Cecilia Rojas Velandia',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '41.567.890'
    },
    cedula: '41567890',
    etapaActual: 'Juzgamiento',
    estadoActual: 'Etapa de Juzgamiento',
    profesionalAsignado: {
      nombre: 'Dr. Carlos Andrés Rodríguez',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79.345.678'
    },
    profesionalAsignadoId: '3',
    semaforo: 'amarillo',
    diasRestantes: 18,
    porcentajeTiempo: 78,
    borradores: [{ id: 'b1', nombre: 'Borrador fallo primera instancia' }],
    documentos: [
      { id: 'd1', nombre: 'Pliego de cargos' },
      { id: 'd2', nombre: 'Descargos investigada' },
      { id: 'd3', nombre: 'Acta audiencia de descargos' }
    ],
    pendienteAprobacion: true,
    ultimaActuacion: 'Audiencia de descargos realizada. Pendiente emisión de fallo.',
    fechaCreacion: '2025-05-20',
    tipo: 'proceso',
    hechos: 'Presunta falsedad en documento público.',
    cargo: 'Asistente Administrativo Grado 09',
    dependencia: 'Secretaría General'
  },

  // ==================== FALLO ====================
  {
    id: 'proc-fal-001',
    numeroProceso: 'PROC-2024-0156',
    noticiaOrigen: 'NOT-2024-0412',
    denunciante: {
      nombre: 'Director Territorial Antioquia',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '19.123.456'
    },
    denunciado: {
      nombre: 'Julián Alberto Gómez Castro',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '71.234.567'
    },
    cedula: '71234567',
    etapaActual: 'Fallo',
    estadoActual: 'Fallo Ejecutoriado',
    profesionalAsignado: {
      nombre: 'Dra. María Camila García López',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52.234.567'
    },
    profesionalAsignadoId: '4',
    semaforo: 'verde',
    diasRestantes: 0,
    porcentajeTiempo: 100,
    borradores: [],
    documentos: [
      { id: 'd1', nombre: 'Fallo primera instancia' },
      { id: 'd2', nombre: 'Recurso de apelación' },
      { id: 'd3', nombre: 'Fallo segunda instancia' }
    ],
    pendienteAprobacion: false,
    ultimaActuacion: 'Fallo ejecutoriado. Sanción: Suspensión de 15 días.',
    fechaCreacion: '2024-03-15',
    tipo: 'proceso',
    hechos: 'Incumplimiento reiterado de funciones.',
    cargo: 'Profesional Universitario Grado 11',
    dependencia: 'Territorial Antioquia'
  }
];

// RESUMEN OPTIMIZADO:
// - 1 proceso en RECEPCIÓN (verde)
// - 1 proceso en VALORACIÓN (verde)
// - 1 proceso en INDAGACIÓN (amarillo)
// - 1 proceso en INVESTIGACIÓN (amarillo)
// - 1 proceso en JUZGAMIENTO (amarillo)
// - 1 proceso en FALLO (verde - completado)
// TOTAL: 6 procesos (reducido de 12) - Ahorro: ~15 KB