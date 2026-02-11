/**
 * DATOS MOCK: Consultas Jurídicas para el Módulo MOD-03
 */

import { ConsultaJuridica } from '../core/types';

// Función helper para calcular días restantes
const calcularDiasRestantes = (fechaRadicacion: Date, diasTotales: number = 30): number => {
  const hoy = new Date();
  const fechaLimite = new Date(fechaRadicacion);
  fechaLimite.setDate(fechaLimite.getDate() + diasTotales);
  const dias = Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return dias;
};

// ============================================================================
// DATOS MOCK DE CONSULTAS JURÍDICAS
// ============================================================================

export const consultasJuridicasMock: ConsultaJuridica[] = [
  {
    id: 'CJ-2025-001',
    etapa: 'RADICADA',
    temaJuridico: 'Contractual',
    tema: 'Interpretación de cláusula de permanencia en contrato',
    solicitante: 'Dirección Administrativa',
    funcionarioSolicitante: 'Carlos Andrés Pérez',
    consulta: '¿Es válida la cláusula de permanencia de 24 meses en el contrato de prestación de servicios profesionales para consultoría especializada?',
    fechaRadicacion: new Date('2025-01-25'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-25'), 30),
    abogadoAsignado: 'Dra. María Fernanda López',
    prioridad: 'ALTA',
    normativaAplicable: [
      'Ley 80 de 1993',
      'Ley 1150 de 2007',
      'Decreto 1082 de 2015'
    ],
    documentosAdjuntos: [
      {
        id: 'DOC-001',
        nombre: 'Contrato_001_2025.pdf',
        tipo: 'Contrato',
        url: '#',
        fechaCarga: new Date('2025-01-25'),
        tamaño: '2.5 MB'
      }
    ],
    timeline: [
      {
        id: 'EV-001',
        tipo: 'Radicación',
        fecha: new Date('2025-01-25'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      }
    ],
    fechaCreacion: new Date('2025-01-25'),
    estado: 'ACTIVO'
  },
  {
    id: 'CJ-2025-002',
    etapa: 'ANÁLISIS',
    temaJuridico: 'Laboral',
    tema: 'Licencia de maternidad para madre adoptante',
    solicitante: 'Gestión Humana',
    funcionarioSolicitante: 'Ana María Torres',
    consulta: '¿Cuál es el procedimiento y duración de la licencia de maternidad en caso de adopción de un menor de 3 años?',
    fechaRadicacion: new Date('2025-01-20'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-20'), 30),
    abogadoAsignado: 'Dr. Jorge Luis Martínez',
    prioridad: 'URGENTE',
    normativaAplicable: [
      'Código Sustantivo del Trabajo',
      'Ley 755 de 2002',
      'Ley 1822 de 2017'
    ],
    documentosAdjuntos: [
      {
        id: 'DOC-002',
        nombre: 'Solicitud_Licencia.pdf',
        tipo: 'Solicitud',
        url: '#',
        fechaCarga: new Date('2025-01-20'),
        tamaño: '1.2 MB'
      }
    ],
    timeline: [
      {
        id: 'EV-002',
        tipo: 'Radicación',
        fecha: new Date('2025-01-20'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      },
      {
        id: 'EV-003',
        tipo: 'Asignación',
        fecha: new Date('2025-01-20'),
        usuario: 'Admin',
        descripcion: 'Asignada a Dr. Jorge Luis Martínez'
      },
      {
        id: 'EV-004',
        tipo: 'Comentario',
        fecha: new Date('2025-01-22'),
        usuario: 'Dr. Jorge Luis Martínez',
        descripcion: 'En revisión de normativa aplicable'
      }
    ],
    fechaCreacion: new Date('2025-01-20'),
    estado: 'ACTIVO'
  },
  {
    id: 'CJ-2025-003',
    etapa: 'RESPUESTA',
    temaJuridico: 'Disciplinario',
    tema: 'Procedimiento disciplinario por falta leve',
    solicitante: 'Control Interno Disciplinario',
    funcionarioSolicitante: 'Patricia Elena Vargas',
    consulta: '¿Se requiere apertura de investigación disciplinaria formal para una falta leve documentada por primera vez?',
    fechaRadicacion: new Date('2025-01-15'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-15'), 30),
    abogadoAsignado: 'Dra. Laura Patricia Gómez',
    prioridad: 'MEDIA',
    normativaAplicable: [
      'Ley 734 de 2002',
      'Ley 1952 de 2019',
      'Código Único Disciplinario'
    ],
    respuesta: 'De acuerdo con el artículo 43 de la Ley 1952 de 2019, las faltas leves pueden ser sancionadas mediante procedimiento verbal, sin necesidad de apertura de investigación formal cuando exista plena prueba de la falta y reconocimiento del investigado.',
    documentosAdjuntos: [
      {
        id: 'DOC-003',
        nombre: 'Informe_Falta.pdf',
        tipo: 'Informe',
        url: '#',
        fechaCarga: new Date('2025-01-15'),
        tamaño: '800 KB'
      },
      {
        id: 'DOC-004',
        nombre: 'Concepto_Juridico.pdf',
        tipo: 'Concepto',
        url: '#',
        fechaCarga: new Date('2025-01-28'),
        tamaño: '1.5 MB'
      }
    ],
    timeline: [
      {
        id: 'EV-005',
        tipo: 'Radicación',
        fecha: new Date('2025-01-15'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      },
      {
        id: 'EV-006',
        tipo: 'Asignación',
        fecha: new Date('2025-01-15'),
        usuario: 'Admin',
        descripcion: 'Asignada a Dra. Laura Patricia Gómez'
      },
      {
        id: 'EV-007',
        tipo: 'Respuesta',
        fecha: new Date('2025-01-28'),
        usuario: 'Dra. Laura Patricia Gómez',
        descripcion: 'Concepto jurídico emitido'
      }
    ],
    fechaCreacion: new Date('2025-01-15'),
    estado: 'ACTIVO'
  },
  {
    id: 'CJ-2025-004',
    etapa: 'ENVIADA',
    temaJuridico: 'Presupuestal',
    tema: 'Disponibilidad presupuestal para vigencia futura',
    solicitante: 'Subdirección Financiera',
    funcionarioSolicitante: 'Ricardo Andrés Moreno',
    consulta: '¿Es posible comprometer recursos para vigencias futuras en un contrato de arrendamiento de 3 años sin autorización del Confis?',
    fechaRadicacion: new Date('2025-01-10'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-10'), 30),
    abogadoAsignado: 'Dr. Diego Fernando Ruiz',
    prioridad: 'ALTA',
    normativaAplicable: [
      'Estatuto Orgánico de Presupuesto',
      'Decreto 111 de 1996',
      'Ley 819 de 2003'
    ],
    respuesta: 'Según el artículo 12 de la Ley 819 de 2003, los compromisos que afecten presupuestos de vigencias futuras requieren autorización del Confis cuando superen el monto establecido. Para contratos de arrendamiento, se aplican las excepciones del artículo 9 del mismo decreto.',
    fechaRespuesta: new Date('2025-02-01'),
    documentosAdjuntos: [
      {
        id: 'DOC-005',
        nombre: 'Proyecto_Contrato.pdf',
        tipo: 'Contrato',
        url: '#',
        fechaCarga: new Date('2025-01-10'),
        tamaño: '1.8 MB'
      },
      {
        id: 'DOC-006',
        nombre: 'Concepto_Presupuestal.pdf',
        tipo: 'Concepto',
        url: '#',
        fechaCarga: new Date('2025-02-01'),
        tamaño: '2.1 MB'
      }
    ],
    timeline: [
      {
        id: 'EV-008',
        tipo: 'Radicación',
        fecha: new Date('2025-01-10'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      },
      {
        id: 'EV-009',
        tipo: 'Asignación',
        fecha: new Date('2025-01-10'),
        usuario: 'Admin',
        descripcion: 'Asignada a Dr. Diego Fernando Ruiz'
      },
      {
        id: 'EV-010',
        tipo: 'Respuesta',
        fecha: new Date('2025-02-01'),
        usuario: 'Dr. Diego Fernando Ruiz',
        descripcion: 'Concepto jurídico emitido'
      },
      {
        id: 'EV-011',
        tipo: 'Envío',
        fecha: new Date('2025-02-01'),
        usuario: 'Sistema',
        descripcion: 'Respuesta enviada al solicitante'
      }
    ],
    fechaCreacion: new Date('2025-01-10'),
    estado: 'CERRADO'
  },
  {
    id: 'CJ-2025-005',
    etapa: 'RADICADA',
    temaJuridico: 'Administrativo',
    tema: 'Silencio administrativo en solicitud de permiso',
    solicitante: 'Secretaría General',
    funcionarioSolicitante: 'Mónica Andrea Silva',
    consulta: '¿Opera el silencio administrativo positivo en solicitudes de permiso para uso de espacios institucionales?',
    fechaRadicacion: new Date('2025-01-28'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-28'), 30),
    abogadoAsignado: 'Dra. María Fernanda López',
    prioridad: 'BAJA',
    normativaAplicable: [
      'Código de Procedimiento Administrativo - Ley 1437 de 2011',
      'Artículo 83 CPACA'
    ],
    documentosAdjuntos: [
      {
        id: 'DOC-007',
        nombre: 'Solicitud_Permiso.pdf',
        tipo: 'Solicitud',
        url: '#',
        fechaCarga: new Date('2025-01-28'),
        tamaño: '600 KB'
      }
    ],
    timeline: [
      {
        id: 'EV-012',
        tipo: 'Radicación',
        fecha: new Date('2025-01-28'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      }
    ],
    fechaCreacion: new Date('2025-01-28'),
    estado: 'ACTIVO'
  },
  {
    id: 'CJ-2025-006',
    etapa: 'ANÁLISIS',
    temaJuridico: 'Contractual',
    tema: 'Cesión de contrato estatal',
    solicitante: 'Dirección de Contratación',
    funcionarioSolicitante: 'Luis Alberto Ramírez',
    consulta: '¿Bajo qué condiciones es válida la cesión de un contrato de prestación de servicios profesionales?',
    fechaRadicacion: new Date('2025-01-22'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-22'), 30),
    abogadoAsignado: 'Dr. Jorge Luis Martínez',
    prioridad: 'MEDIA',
    normativaAplicable: [
      'Ley 80 de 1993',
      'Artículo 41 Ley 80',
      'Concepto 20161900002461 de 2016'
    ],
    documentosAdjuntos: [
      {
        id: 'DOC-008',
        nombre: 'Contrato_Original.pdf',
        tipo: 'Contrato',
        url: '#',
        fechaCarga: new Date('2025-01-22'),
        tamaño: '3.2 MB'
      },
      {
        id: 'DOC-009',
        nombre: 'Solicitud_Cesion.pdf',
        tipo: 'Solicitud',
        url: '#',
        fechaCarga: new Date('2025-01-22'),
        tamaño: '1.1 MB'
      }
    ],
    timeline: [
      {
        id: 'EV-013',
        tipo: 'Radicación',
        fecha: new Date('2025-01-22'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      },
      {
        id: 'EV-014',
        tipo: 'Asignación',
        fecha: new Date('2025-01-22'),
        usuario: 'Admin',
        descripcion: 'Asignada a Dr. Jorge Luis Martínez'
      },
      {
        id: 'EV-015',
        tipo: 'Comentario',
        fecha: new Date('2025-01-25'),
        usuario: 'Dr. Jorge Luis Martínez',
        descripcion: 'Revisando jurisprudencia del Consejo de Estado'
      }
    ],
    fechaCreacion: new Date('2025-01-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'CJ-2025-007',
    etapa: 'RESPUESTA',
    temaJuridico: 'Laboral',
    tema: 'Horas extras en contratos de prestación de servicios',
    solicitante: 'Gestión Humana',
    funcionarioSolicitante: 'Sandra Milena Castro',
    consulta: '¿Se pueden reconocer horas extras a contratistas bajo la modalidad de prestación de servicios profesionales?',
    fechaRadicacion: new Date('2025-01-18'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-18'), 30),
    abogadoAsignado: 'Dra. Laura Patricia Gómez',
    prioridad: 'MEDIA',
    normativaAplicable: [
      'Código Sustantivo del Trabajo',
      'Ley 80 de 1993',
      'Sentencia SL1360-2020'
    ],
    respuesta: 'Los contratos de prestación de servicios profesionales no están sujetos al régimen laboral, por lo tanto no procede el reconocimiento de horas extras. La remuneración se establece por el objeto contratado, no por tiempo trabajado.',
    documentosAdjuntos: [
      {
        id: 'DOC-010',
        nombre: 'Contrato_Servicios.pdf',
        tipo: 'Contrato',
        url: '#',
        fechaCarga: new Date('2025-01-18'),
        tamaño: '1.9 MB'
      },
      {
        id: 'DOC-011',
        nombre: 'Concepto_Laboral.pdf',
        tipo: 'Concepto',
        url: '#',
        fechaCarga: new Date('2025-01-30'),
        tamaño: '2.3 MB'
      }
    ],
    timeline: [
      {
        id: 'EV-016',
        tipo: 'Radicación',
        fecha: new Date('2025-01-18'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      },
      {
        id: 'EV-017',
        tipo: 'Asignación',
        fecha: new Date('2025-01-18'),
        usuario: 'Admin',
        descripcion: 'Asignada a Dra. Laura Patricia Gómez'
      },
      {
        id: 'EV-018',
        tipo: 'Respuesta',
        fecha: new Date('2025-01-30'),
        usuario: 'Dra. Laura Patricia Gómez',
        descripcion: 'Concepto jurídico emitido'
      }
    ],
    fechaCreacion: new Date('2025-01-18'),
    estado: 'ACTIVO'
  },
  {
    id: 'CJ-2025-008',
    etapa: 'RADICADA',
    temaJuridico: 'Otros',
    tema: 'Protección de datos personales - Habeas Data',
    solicitante: 'Oficina de Sistemas',
    funcionarioSolicitante: 'Andrés Felipe Morales',
    consulta: '¿Cuál es el procedimiento para atender solicitudes de rectificación de datos personales en bases de datos institucionales?',
    fechaRadicacion: new Date('2025-01-30'),
    diasTotales: 30,
    diasRestantes: calcularDiasRestantes(new Date('2025-01-30'), 30),
    abogadoAsignado: 'Dr. Diego Fernando Ruiz',
    prioridad: 'ALTA',
    normativaAplicable: [
      'Ley 1581 de 2012',
      'Decreto 1377 de 2013',
      'Sentencia T-414/1992'
    ],
    documentosAdjuntos: [
      {
        id: 'DOC-012',
        nombre: 'Solicitud_HabeasData.pdf',
        tipo: 'Solicitud',
        url: '#',
        fechaCarga: new Date('2025-01-30'),
        tamaño: '900 KB'
      }
    ],
    timeline: [
      {
        id: 'EV-019',
        tipo: 'Radicación',
        fecha: new Date('2025-01-30'),
        usuario: 'Sistema',
        descripcion: 'Consulta radicada en el sistema'
      }
    ],
    fechaCreacion: new Date('2025-01-30'),
    estado: 'ACTIVO'
  }
];

// ============================================================================
// ESTADÍSTICAS PRECALCULADAS
// ============================================================================

export const estadisticasAsesoriaJuridica = {
  totalConsultas: consultasJuridicasMock.length,
  porEtapa: {
    radicada: consultasJuridicasMock.filter(c => c.etapa === 'RADICADA').length,
    analisis: consultasJuridicasMock.filter(c => c.etapa === 'ANÁLISIS').length,
    respuesta: consultasJuridicasMock.filter(c => c.etapa === 'RESPUESTA').length,
    enviada: consultasJuridicasMock.filter(c => c.etapa === 'ENVIADA').length
  },
  porTema: {
    contractual: consultasJuridicasMock.filter(c => c.temaJuridico === 'Contractual').length,
    laboral: consultasJuridicasMock.filter(c => c.temaJuridico === 'Laboral').length,
    disciplinario: consultasJuridicasMock.filter(c => c.temaJuridico === 'Disciplinario').length,
    presupuestal: consultasJuridicasMock.filter(c => c.temaJuridico === 'Presupuestal').length,
    administrativo: consultasJuridicasMock.filter(c => c.temaJuridico === 'Administrativo').length,
    otros: consultasJuridicasMock.filter(c => c.temaJuridico === 'Otros').length
  },
  porPrioridad: {
    urgente: consultasJuridicasMock.filter(c => c.prioridad === 'URGENTE').length,
    alta: consultasJuridicasMock.filter(c => c.prioridad === 'ALTA').length,
    media: consultasJuridicasMock.filter(c => c.prioridad === 'MEDIA').length,
    baja: consultasJuridicasMock.filter(c => c.prioridad === 'BAJA').length
  },
  porSemaforo: {
    rojo: consultasJuridicasMock.filter(c => c.diasRestantes <= 3).length,
    amarillo: consultasJuridicasMock.filter(c => c.diasRestantes > 3 && c.diasRestantes <= 5).length,
    verde: consultasJuridicasMock.filter(c => c.diasRestantes > 5).length
  },
  porAbogado: {
    'Dra. María Fernanda López': consultasJuridicasMock.filter(c => c.abogadoAsignado === 'Dra. María Fernanda López').length,
    'Dr. Jorge Luis Martínez': consultasJuridicasMock.filter(c => c.abogadoAsignado === 'Dr. Jorge Luis Martínez').length,
    'Dra. Laura Patricia Gómez': consultasJuridicasMock.filter(c => c.abogadoAsignado === 'Dra. Laura Patricia Gómez').length,
    'Dr. Diego Fernando Ruiz': consultasJuridicasMock.filter(c => c.abogadoAsignado === 'Dr. Diego Fernando Ruiz').length
  },
  tiempoPromedioRespuesta: 12 // días
};
