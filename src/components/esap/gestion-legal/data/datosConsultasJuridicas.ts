/**
 * DATOS CONSULTAS JURÍDICAS
 * Datos de ejemplo para demostración de Asesoría Jurídica
 */

export const consultasJuridicasMock: any[] = [
  {
    id: 'CONS-001',
    consecutivo: 'CJ-2024-001',
    solicitante: 'Vicerrectoría Académica',
    asunto: 'Interpretación normativa sobre modificación de calendario académico',
    tipo: 'administrativo',
    prioridad: 'alta',
    fechaSolicitud: '2024-01-10',
    estado: 'respondida',
    abogadoAsignado: 'Dra. María Fernanda Rodríguez',
    fechaRespuesta: '2024-01-15',
    tiempoRespuesta: 5,
    descripcion: 'Se solicita concepto jurídico sobre la viabilidad de modificar el calendario académico 2024-1 por situaciones de orden público.',
    respuesta: 'De acuerdo con el Estatuto Académico y la normatividad vigente, es viable la modificación del calendario académico...',
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'CONS-002',
    consecutivo: 'CJ-2024-002',
    solicitante: 'Territorial Antioquia',
    asunto: 'Consulta sobre proceso de contratación docente hora cátedra',
    tipo: 'contractual',
    prioridad: 'media',
    fechaSolicitud: '2024-01-18',
    estado: 'en-revision',
    abogadoAsignado: 'Dr. Carlos Eduardo Martínez',
    tiempoRespuesta: 0,
    descripcion: 'Se requiere asesoría sobre los requisitos legales para la vinculación de docentes hora cátedra para el periodo 2024-2.',
    sede: 'Territorial Antioquia'
  },
  {
    id: 'CONS-003',
    consecutivo: 'CJ-2024-003',
    solicitante: 'Dirección Administrativa y Financiera',
    asunto: 'Concepto sobre aplicación de régimen disciplinario',
    tipo: 'disciplinario',
    prioridad: 'alta',
    fechaSolicitud: '2024-01-20',
    estado: 'pendiente',
    tiempoRespuesta: 0,
    descripcion: 'Se solicita concepto sobre el procedimiento disciplinario aplicable a funcionario de planta por presuntas irregularidades administrativas.',
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'CONS-004',
    consecutivo: 'CJ-2023-045',
    solicitante: 'Territorial Valle del Cauca',
    asunto: 'Consulta sobre uso de instalaciones para eventos externos',
    tipo: 'administrativo',
    prioridad: 'baja',
    fechaSolicitud: '2023-12-15',
    estado: 'archivada',
    abogadoAsignado: 'Dr. Jorge Andrés López',
    fechaRespuesta: '2023-12-20',
    tiempoRespuesta: 5,
    descripcion: 'Se consulta sobre la viabilidad jurídica de permitir el uso de auditorio institucional para evento de entidad externa.',
    respuesta: 'Es viable el uso de instalaciones para eventos externos, siempre que se suscriba acuerdo de uso...',
    sede: 'Territorial Valle del Cauca'
  }
];

export const estadisticasAsesoriaJuridica = {
  totalConsultas: 4,
  porEstado: {
    pendiente: 1,
    'en-revision': 1,
    respondida: 1,
    archivada: 1
  },
  porTipo: {
    contractual: 1,
    laboral: 0,
    administrativo: 2,
    disciplinario: 1,
    otro: 0
  },
  tiempoPromedioRespuesta: 5
};
