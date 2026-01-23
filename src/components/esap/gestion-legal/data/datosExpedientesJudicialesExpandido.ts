/**
 * DATOS EXPEDIENTES JUDICIALES
 * Datos de ejemplo para demostración de Defensa Judicial
 */

export const expedientesJudicialesMock: any[] = [
  {
    id: 'EXP-JUD-001',
    radicado: '11001-33-33-001-2024-00123-00',
    tipo: 'laboral',
    demandante: 'Juan Carlos Pérez González',
    demandado: 'ESAP - Escuela Superior de Administración Pública',
    cuantia: 85000000,
    fechaAdmision: '2024-01-15',
    etapa: 'pruebas',
    juzgado: 'Juzgado 33 Laboral del Circuito de Bogotá',
    apoderado: 'Dra. María Fernanda Rodríguez',
    pretension: 'Reintegro laboral y pago de salarios dejados de percibir',
    estado: 'activo',
    probabilidadExito: 'media',
    proximaAudiencia: '2025-02-15',
    documentos: 15,
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'EXP-JUD-002',
    radicado: '05001-23-31-000-2023-00456-01',
    tipo: 'contractual',
    demandante: 'Constructora ABC S.A.S.',
    demandado: 'ESAP - Escuela Superior de Administración Pública',
    cuantia: 250000000,
    fechaAdmision: '2023-08-22',
    etapa: 'sentencia',
    juzgado: 'Tribunal Administrativo de Antioquia',
    apoderado: 'Dr. Carlos Eduardo Martínez',
    pretension: 'Pago de saldo contractual por obra no ejecutada',
    estado: 'activo',
    probabilidadExito: 'alta',
    proximaAudiencia: '2025-01-30',
    documentos: 42,
    sede: 'Territorial Antioquia'
  },
  {
    id: 'EXP-JUD-003',
    radicado: '76001-23-33-000-2024-00789-00',
    tipo: 'administrativo',
    demandante: 'Laura Patricia Gómez Silva',
    demandado: 'ESAP - Escuela Superior de Administración Pública',
    cuantia: 45000000,
    fechaAdmision: '2024-03-10',
    etapa: 'admision',
    juzgado: 'Juzgado 1 Administrativo del Circuito de Cali',
    apoderado: 'Dr. Jorge Andrés López',
    pretension: 'Nulidad y restablecimiento del derecho - acto administrativo de retiro',
    estado: 'activo',
    probabilidadExito: 'baja',
    proximaAudiencia: '2025-02-28',
    documentos: 8,
    sede: 'Territorial Valle del Cauca'
  }
];

export const estadisticasDefensaJudicial = {
  totalExpedientes: 3,
  porEtapa: {
    admision: 1,
    pruebas: 1,
    alegatos: 0,
    sentencia: 1,
    'segunda-instancia': 0
  },
  porTipo: {
    laboral: 1,
    contractual: 1,
    administrativo: 1,
    penal: 0,
    constitucional: 0,
    otro: 0
  },
  pretensionesTotal: 380000000,
  promedioTiempo: 245
};
