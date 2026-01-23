/**
 * DATOS SOLICITUDES INFORMES
 * Datos de ejemplo para demostración de Términos e Informes a Órganos de Control
 */

export const solicitudesConsolidadas: any[] = [
  {
    id: 'SOL-001',
    consecutivo: 'INF-CGR-2024-001',
    organo: 'Contraloría General de la República',
    tipo: 'informe',
    asunto: 'Informe de contratación año fiscal 2023',
    fechaSolicitud: '2024-01-10',
    plazo: '2024-02-10',
    estado: 'en-proceso',
    responsable: 'Dirección Administrativa y Financiera',
    prioridad: 'alta',
    avance: 45,
    diasRestantes: 18,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'SOL-002',
    consecutivo: 'INF-PGN-2024-001',
    organo: 'Procuraduría General de la Nación',
    tipo: 'requerimiento',
    asunto: 'Solicitud documentación proceso disciplinario funcionario X',
    fechaSolicitud: '2024-01-15',
    plazo: '2024-01-30',
    estado: 'completado',
    responsable: 'Oficina de Control Interno Disciplinario',
    prioridad: 'alta',
    avance: 100,
    fechaRespuesta: '2024-01-28',
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'SOL-003',
    consecutivo: 'INF-MIN-2024-001',
    organo: 'Ministerio de Educación Nacional',
    tipo: 'informe',
    asunto: 'Informe de ejecución recursos SGP 2023',
    fechaSolicitud: '2024-01-12',
    plazo: '2024-02-15',
    estado: 'pendiente',
    responsable: 'Vicerrectoría Académica',
    prioridad: 'media',
    avance: 0,
    diasRestantes: 23,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'SOL-004',
    consecutivo: 'INF-DEF-2024-001',
    organo: 'Defensoría del Pueblo',
    tipo: 'derecho-peticion',
    asunto: 'Consulta sobre accesibilidad en programas académicos',
    fechaSolicitud: '2024-01-18',
    plazo: '2024-02-02',
    estado: 'en-proceso',
    responsable: 'Vicerrectoría Académica',
    prioridad: 'alta',
    avance: 60,
    diasRestantes: 10,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'SOL-005',
    consecutivo: 'INF-CGR-ANT-2024-001',
    organo: 'Contraloría General de la República',
    tipo: 'informe',
    asunto: 'Informe ejecución presupuestal Territorial Antioquia 2023',
    fechaSolicitud: '2024-01-08',
    plazo: '2024-01-23',
    estado: 'vencido',
    responsable: 'Territorial Antioquia',
    prioridad: 'critica',
    avance: 85,
    diasVencidos: 0,
    sede: 'Territorial Antioquia'
  }
];

export const estadisticasTerminosInformes = {
  totalSolicitudes: 5,
  porEstado: {
    pendiente: 1,
    'en-proceso': 2,
    completado: 1,
    vencido: 1
  },
  porOrgano: {
    'Contraloría General de la República': 2,
    'Procuraduría General de la Nación': 1,
    'Ministerio de Educación Nacional': 1,
    'Defensoría del Pueblo': 1
  } as Record<string, number>,
  alertasVencimiento: 2
};
