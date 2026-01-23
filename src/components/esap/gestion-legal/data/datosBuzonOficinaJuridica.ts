/**
 * DATOS BUZÓN OFICINA JURÍDICA
 * Datos de ejemplo para demostración de comunicaciones jurídicas
 */

export const correosOficinaJuridica: any[] = [
  {
    id: 'CORREO-001',
    consecutivo: 'COR-2024-001',
    remitente: 'Juzgado 33 Laboral del Circuito de Bogotá',
    asunto: 'Notificación Auto Admisorio - Radicado 11001-33-33-001-2024-00123-00',
    fechaRecepcion: '2024-01-15',
    estado: 'respondido',
    prioridad: 'alta',
    categoria: 'judicial',
    relacionado: 'EXP-JUD-001',
    responsable: 'Dra. María Fernanda Rodríguez',
    fechaRespuesta: '2024-01-18',
    adjuntos: 3,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'CORREO-002',
    consecutivo: 'COR-2024-002',
    remitente: 'Contraloría General de la República',
    asunto: 'Solicitud información contractual año 2023',
    fechaRecepcion: '2024-01-18',
    estado: 'en-proceso',
    prioridad: 'alta',
    categoria: 'organo-control',
    responsable: 'Dr. Carlos Eduardo Martínez',
    plazo: '2024-02-01',
    adjuntos: 1,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'CORREO-003',
    consecutivo: 'COR-2024-003',
    remitente: 'Personería Municipal de Cali',
    asunto: 'Consulta sobre proceso de selección docente',
    fechaRecepcion: '2024-01-20',
    estado: 'pendiente',
    prioridad: 'media',
    categoria: 'consulta-externa',
    adjuntos: 0,
    sede: 'Territorial Valle del Cauca'
  },
  {
    id: 'CORREO-004',
    consecutivo: 'COR-2024-004',
    remitente: 'Tribunal Administrativo de Antioquia',
    asunto: 'Auto de pruebas - Proceso contractual 05001-23-31-000-2023-00456-01',
    fechaRecepcion: '2024-01-22',
    estado: 'respondido',
    prioridad: 'alta',
    categoria: 'judicial',
    relacionado: 'EXP-JUD-002',
    responsable: 'Dr. Carlos Eduardo Martínez',
    fechaRespuesta: '2024-01-25',
    adjuntos: 5,
    sede: 'Territorial Antioquia'
  }
];
