/**
 * DATOS TÉRMINOS E INFORMES
 * Datos de ejemplo para demostración de gestión de términos judiciales
 */

export const terminosJudicialesMock: any[] = [
  {
    id: 'TERM-001',
    consecutivo: 'TJ-2024-001',
    tipo: 'judicial',
    descripcion: 'Término para contestar demanda laboral',
    expedienteRelacionado: 'EXP-JUD-001',
    fechaInicio: '2024-01-15',
    plazo: 10,
    fechaVencimiento: '2024-01-25',
    estado: 'cumplido',
    responsable: 'Dra. María Fernanda Rodríguez',
    categoria: 'judicial',
    prioridad: 'alta',
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'TERM-002',
    consecutivo: 'TJ-2024-002',
    tipo: 'judicial',
    descripcion: 'Término para presentar pruebas - proceso contractual',
    expedienteRelacionado: 'EXP-JUD-002',
    fechaInicio: '2024-01-20',
    plazo: 15,
    fechaVencimiento: '2024-02-04',
    estado: 'activo',
    responsable: 'Dr. Carlos Eduardo Martínez',
    categoria: 'judicial',
    prioridad: 'alta',
    diasRestantes: 12,
    sede: 'Territorial Antioquia'
  },
  {
    id: 'TERM-003',
    consecutivo: 'TA-2024-001',
    tipo: 'administrativo',
    descripcion: 'Término para responder requerimiento CGR',
    solicitudRelacionada: 'SOL-001',
    fechaInicio: '2024-01-10',
    plazo: 30,
    fechaVencimiento: '2024-02-10',
    estado: 'activo',
    responsable: 'Dirección Administrativa',
    categoria: 'administrativo',
    prioridad: 'alta',
    diasRestantes: 18,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'TERM-004',
    consecutivo: 'TD-2024-001',
    tipo: 'disciplinario',
    descripcion: 'Término para formular descargos en proceso disciplinario',
    procesoDisciplinarioRelacionado: 'DISC-001',
    fechaInicio: '2024-01-22',
    plazo: 5,
    fechaVencimiento: '2024-01-27',
    estado: 'vencido',
    responsable: 'Dr. Carlos Eduardo Martínez',
    categoria: 'disciplinario',
    prioridad: 'critica',
    diasVencidos: 0,
    sede: 'Sede Central Bogotá'
  }
];

export const estadisticasTerminosCompleto = {
  totalTerminos: 4,
  porEstado: {
    activo: 2,
    vencido: 1,
    cumplido: 1,
    suspendido: 0
  },
  porCategoria: {
    judicial: 2,
    administrativo: 1,
    disciplinario: 1
  },
  alertasProximas: 2
};
