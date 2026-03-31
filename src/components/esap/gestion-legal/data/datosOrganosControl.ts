/**
 * DATOS MOCK EXPANDIDOS - MÓDULO ÓRGANOS DE CONTROL
 * Base de datos completa para pruebas con cliente
 * Incluye requerimientos de diferentes órganos de control
 */

export interface RequerimientoOrgano {
  id: string;
  radicado: string;
  organo: 'CONTRALORIA' | 'PROCURADURIA' | 'CONTADURIA' | 'FISCALIA' | 'OTROS';
  tipo: 'AUDITORIA' | 'REQUERIMIENTO' | 'INVESTIGACION' | 'SOLICITUD_INFO' | 'VISITA';
  asunto: string;
  descripcion: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'EN PROCESO' | 'RESPONDIDO' | 'VENCIDO' | 'ARCHIVADO';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  responsable: string;
  dependenciaResponsable: string;
  documentosAdjuntos?: string[];
  respuestaEnviada?: {
    fecha: string;
    radicadoRespuesta: string;
    resumen: string;
  };
}

export const requerimientosOrganosMock: RequerimientoOrgano[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRALORÍA GENERAL DE LA REPÚBLICA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ORG-2025-001',
    radicado: 'CGR-2025-0123-EXT',
    organo: 'CONTRALORIA',
    tipo: 'AUDITORIA',
    asunto: 'Auditoría Regular a la Gestión Fiscal 2024',
    descripcion: 'La Contraloría General de la República inicia auditoría regular a la gestión fiscal de ESAP correspondiente a la vigencia 2024. Se requiere suministrar información presupuestal, financiera, contractual y de gestión.',
    fechaRecepcion: '2025-01-20',
    fechaVencimiento: '2025-02-10',
    estado: 'EN PROCESO',
    prioridad: 'ALTA',
    responsable: 'Dr. Carlos Méndez - Subdirector Financiero',
    dependenciaResponsable: 'Subdirección Financiera',
    documentosAdjuntos: [
      'oficio_cgr_123.pdf',
      'cronograma_auditoria.pdf',
      'requerimientos_detallados.xlsx'
    ]
  },
  {
    id: 'ORG-2025-002',
    radicado: 'CGR-2025-0456-EXT',
    organo: 'CONTRALORIA',
    tipo: 'REQUERIMIENTO',
    asunto: 'Requerimiento de información sobre ejecución presupuestal Q4 2024',
    descripcion: 'Solicitud de información detallada sobre la ejecución presupuestal del cuarto trimestre 2024, incluyendo compromisos, obligaciones y pagos por cada rubro presupuestal.',
    fechaRecepcion: '2025-01-26',
    fechaVencimiento: '2025-02-05',
    estado: 'PENDIENTE',
    prioridad: 'ALTA',
    responsable: 'Dra. María López - Jefe Oficina Presupuesto',
    dependenciaResponsable: 'Oficina de Presupuesto',
    documentosAdjuntos: ['requerimiento_cgr_456.pdf']
  },
  {
    id: 'ORG-2024-234',
    radicado: 'CGR-2024-1234-EXT',
    organo: 'CONTRALORIA',
    tipo: 'SOLICITUD_INFO',
    asunto: 'Solicitud información sobre contratos suscritos en 2024',
    descripcion: 'Requerimiento de relación completa de contratos suscritos durante 2024 con valor superior a $50 millones.',
    fechaRecepcion: '2024-12-10',
    fechaVencimiento: '2024-12-20',
    estado: 'RESPONDIDO',
    prioridad: 'MEDIA',
    responsable: 'Dr. Roberto Jiménez - Director de Contratación',
    dependenciaResponsable: 'Dirección de Contratación',
    documentosAdjuntos: ['solicitud_cgr_1234.pdf'],
    respuestaEnviada: {
      fecha: '2024-12-18',
      radicadoRespuesta: 'ESAP-CONT-2024-0567',
      resumen: 'Se remitió relación completa de 45 contratos suscritos con sus respectivos estudios previos, certificados de disponibilidad presupuestal y pólizas.'
    }
  },
  {
    id: 'ORG-2024-198',
    radicado: 'CGR-2024-0987-EXT',
    organo: 'CONTRALORIA',
    tipo: 'VISITA',
    asunto: 'Visita de control fiscal a inventarios',
    descripcion: 'Visita programada para verificación física de inventarios de activos fijos institucionales.',
    fechaRecepcion: '2024-11-05',
    fechaVencimiento: '2024-11-15',
    estado: 'RESPONDIDO',
    prioridad: 'ALTA',
    responsable: 'Ing. Pedro Sánchez - Jefe Almacén General',
    dependenciaResponsable: 'Almacén General',
    documentosAdjuntos: ['cronograma_visita.pdf'],
    respuestaEnviada: {
      fecha: '2024-11-15',
      radicadoRespuesta: 'ESAP-ALM-2024-0234',
      resumen: 'Visita realizada exitosamente. Se verificaron 1,245 activos fijos. Se levantaron actas de verificación sin observaciones.'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCURADURÍA GENERAL DE LA NACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ORG-2025-003',
    radicado: 'PGN-2025-0234-EXT',
    organo: 'PROCURADURIA',
    tipo: 'INVESTIGACION',
    asunto: 'Investigación disciplinaria a funcionario - Solicitud de información',
    descripcion: 'La Procuraduría adelanta investigación disciplinaria contra funcionario por presuntas irregularidades. Se solicita hoja de vida, evaluaciones de desempeño y soportes contractuales.',
    fechaRecepcion: '2025-01-27',
    fechaVencimiento: '2025-02-06',
    estado: 'EN PROCESO',
    prioridad: 'ALTA',
    responsable: 'Dra. Sandra Rojas - Jefe Gestión Humana',
    dependenciaResponsable: 'Gestión Humana',
    documentosAdjuntos: ['oficio_pgn_234.pdf', 'formato_informacion.xlsx']
  },
  {
    id: 'ORG-2025-004',
    radicado: 'PGN-2025-0567-EXT',
    organo: 'PROCURADURIA',
    tipo: 'REQUERIMIENTO',
    asunto: 'Requerimiento sobre procesos disciplinarios en curso',
    descripcion: 'Solicitud de relación de todos los procesos disciplinarios en curso contra funcionarios de ESAP, con estado actual y etapa procesal.',
    fechaRecepcion: '2025-01-28',
    fechaVencimiento: '2025-02-07',
    estado: 'PENDIENTE',
    prioridad: 'ALTA',
    responsable: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    dependenciaResponsable: 'Control Interno Disciplinario',
    documentosAdjuntos: ['requerimiento_pgn_567.pdf']
  },
  {
    id: 'ORG-2024-156',
    radicado: 'PGN-2024-0890-EXT',
    organo: 'PROCURADURIA',
    tipo: 'SOLICITUD_INFO',
    asunto: 'Información sobre inhabilidades e incompatibilidades',
    descripcion: 'Verificación de cumplimiento de requisitos de inhabilidades e incompatibilidades en nombramientos de 2024.',
    fechaRecepcion: '2024-10-15',
    fechaVencimiento: '2024-10-25',
    estado: 'RESPONDIDO',
    prioridad: 'MEDIA',
    responsable: 'Dra. Sandra Rojas - Jefe Gestión Humana',
    dependenciaResponsable: 'Gestión Humana',
    documentosAdjuntos: ['solicitud_pgn_890.pdf'],
    respuestaEnviada: {
      fecha: '2024-10-23',
      radicadoRespuesta: 'ESAP-GHUMANA-2024-0456',
      resumen: 'Se remitió información de 23 nombramientos realizados en 2024 con certificados de antecedentes disciplinarios, fiscales, judiciales y declaraciones juramentadas.'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTADURÍA GENERAL DE LA NACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ORG-2025-005',
    radicado: 'CGN-2025-0345-EXT',
    organo: 'CONTADURIA',
    tipo: 'REQUERIMIENTO',
    asunto: 'Reporte de información financiera bajo NICSP - Vigencia 2024',
    descripcion: 'Solicitud de estados financieros consolidados bajo Normas Internacionales de Contabilidad del Sector Público (NICSP) correspondientes a la vigencia 2024.',
    fechaRecepcion: '2025-01-29',
    fechaVencimiento: '2025-02-15',
    estado: 'PENDIENTE',
    prioridad: 'ALTA',
    responsable: 'Cont. Laura Mendoza - Jefe Oficina Contabilidad',
    dependenciaResponsable: 'Oficina de Contabilidad',
    documentosAdjuntos: ['requerimiento_cgn_345.pdf', 'instructivo_nicsp.pdf']
  },
  {
    id: 'ORG-2024-289',
    radicado: 'CGN-2024-1567-EXT',
    organo: 'CONTADURIA',
    tipo: 'SOLICITUD_INFO',
    asunto: 'Conciliación de saldos contables a 31 de diciembre 2024',
    descripcion: 'Requerimiento de conciliación de saldos contables entre el Módulo Financiero del CHIP y los registros de ESAP.',
    fechaRecepcion: '2024-12-28',
    fechaVencimiento: '2025-01-15',
    estado: 'RESPONDIDO',
    prioridad: 'ALTA',
    responsable: 'Cont. Laura Mendoza - Jefe Oficina Contabilidad',
    dependenciaResponsable: 'Oficina de Contabilidad',
    documentosAdjuntos: ['solicitud_cgn_1567.pdf'],
    respuestaEnviada: {
      fecha: '2025-01-14',
      radicadoRespuesta: 'ESAP-CONT-2025-0012',
      resumen: 'Se envió conciliación completa de 156 cuentas contables con cuadre perfecto entre CHIP y sistema contable institucional.'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FISCALÍA GENERAL DE LA NACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ORG-2024-345',
    radicado: 'FGN-2024-3456-EXT',
    organo: 'FISCALIA',
    tipo: 'INVESTIGACION',
    asunto: 'Investigación penal - Solicitud de documentación contractual',
    descripcion: 'Fiscal 127 Seccional solicita documentación completa del contrato 078-2023 dentro de investigación penal por presunto peculado.',
    fechaRecepcion: '2024-11-20',
    fechaVencimiento: '2024-12-05',
    estado: 'RESPONDIDO',
    prioridad: 'ALTA',
    responsable: 'Dr. Roberto Jiménez - Director de Contratación',
    dependenciaResponsable: 'Dirección de Contratación',
    documentosAdjuntos: ['oficio_fiscalia_3456.pdf'],
    respuestaEnviada: {
      fecha: '2024-12-03',
      radicadoRespuesta: 'ESAP-CONT-2024-0478',
      resumen: 'Se remitió expediente contractual completo con estudios previos, CDP, contratos, actas, informes de supervisión y documentos de pago.'
    }
  },
  {
    id: 'ORG-2024-298',
    radicado: 'FGN-2024-2890-EXT',
    organo: 'FISCALIA',
    tipo: 'SOLICITUD_INFO',
    asunto: 'Información laboral de ex funcionario',
    descripcion: 'Solicitud de certificado laboral y antecedentes disciplinarios de ex funcionario dentro de investigación penal.',
    fechaRecepcion: '2024-10-30',
    fechaVencimiento: '2024-11-10',
    estado: 'RESPONDIDO',
    prioridad: 'MEDIA',
    responsable: 'Dra. Sandra Rojas - Jefe Gestión Humana',
    dependenciaResponsable: 'Gestión Humana',
    documentosAdjuntos: ['solicitud_fiscalia_2890.pdf'],
    respuestaEnviada: {
      fecha: '2024-11-08',
      radicadoRespuesta: 'ESAP-GHUMANA-2024-0389',
      resumen: 'Se expidió certificado laboral del período 2018-2022 y certificación de procesos disciplinarios (ninguno en curso).'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OTROS ÓRGANOS DE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ORG-2025-006',
    radicado: 'DAFP-2025-0678-EXT',
    organo: 'OTROS',
    tipo: 'REQUERIMIENTO',
    asunto: 'Departamento Administrativo de la Función Pública - MIPG',
    descripcion: 'Solicitud de evidencias de implementación del Modelo Integrado de Planeación y Gestión (MIPG) vigencia 2024.',
    fechaRecepcion: '2025-01-30',
    fechaVencimiento: '2025-02-15',
    estado: 'PENDIENTE',
    prioridad: 'MEDIA',
    responsable: 'Dra. Carolina Torres - Jefe Oficina Planeación',
    dependenciaResponsable: 'Oficina de Planeación',
    documentosAdjuntos: ['requerimiento_dafp_678.pdf', 'guia_mipg.pdf']
  },
  {
    id: 'ORG-2024-412',
    radicado: 'AGR-2024-1234-EXT',
    organo: 'OTROS',
    tipo: 'AUDITORIA',
    asunto: 'Archivo General de la Nación - Auditoría documental',
    descripcion: 'Auditoría al cumplimiento de la Ley General de Archivos y Tablas de Retención Documental.',
    fechaRecepcion: '2024-09-10',
    fechaVencimiento: '2024-10-10',
    estado: 'RESPONDIDO',
    prioridad: 'MEDIA',
    responsable: 'Arq. Julián Martínez - Jefe Gestión Documental',
    dependenciaResponsable: 'Gestión Documental',
    documentosAdjuntos: ['cronograma_auditoria_agn.pdf'],
    respuestaEnviada: {
      fecha: '2024-10-08',
      radicadoRespuesta: 'ESAP-GDOC-2024-0234',
      resumen: 'Auditoría realizada con hallazgos menores. Plan de mejoramiento suscrito para ajustar 3 series documentales.'
    }
  },
  {
    id: 'ORG-2024-378',
    radicado: 'MINTIC-2024-4567-EXT',
    organo: 'OTROS',
    tipo: 'SOLICITUD_INFO',
    asunto: 'MinTIC - Encuesta de Gobierno Digital',
    descripcion: 'Ministerio de Tecnologías de la Información solicita diligenciar encuesta de Gobierno Digital 2024.',
    fechaRecepcion: '2024-11-15',
    fechaVencimiento: '2024-12-01',
    estado: 'RESPONDIDO',
    prioridad: 'BAJA',
    responsable: 'Ing. Diego Ramírez - Jefe Sistemas',
    dependenciaResponsable: 'Oficina de Sistemas',
    documentosAdjuntos: ['encuesta_mintic_4567.xlsx'],
    respuestaEnviada: {
      fecha: '2024-11-28',
      radicadoRespuesta: 'ESAP-SIST-2024-0567',
      resumen: 'Encuesta diligenciada y enviada con información sobre servicios digitales, seguridad informática y estrategia TI.'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUERIMIENTOS VENCIDOS (Para mostrar alertas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ORG-2025-007',
    radicado: 'CGR-2025-0089-EXT',
    organo: 'CONTRALORIA',
    tipo: 'REQUERIMIENTO',
    asunto: 'Información sobre PAC 2025 - VENCIDO',
    descripcion: 'Solicitud de Plan Anual de Adquisiciones 2025. REQUERIMIENTO VENCIDO - Se debe responder de inmediato.',
    fechaRecepcion: '2025-01-10',
    fechaVencimiento: '2025-01-25',
    estado: 'VENCIDO',
    prioridad: 'ALTA',
    responsable: 'Dr. Roberto Jiménez - Director de Contratación',
    dependenciaResponsable: 'Dirección de Contratación',
    documentosAdjuntos: ['requerimiento_cgr_089.pdf']
  },
  {
    id: 'ORG-2025-008',
    radicado: 'PGN-2025-0145-EXT',
    organo: 'PROCURADURIA',
    tipo: 'SOLICITUD_INFO',
    asunto: 'Certificación sobre registro de bienes y rentas - VENCIDO',
    descripcion: 'Verificación de cumplimiento de declaración de bienes y rentas de funcionarios. VENCIDO.',
    fechaRecepcion: '2025-01-08',
    fechaVencimiento: '2025-01-23',
    estado: 'VENCIDO',
    prioridad: 'ALTA',
    responsable: 'Dra. Sandra Rojas - Jefe Gestión Humana',
    dependenciaResponsable: 'Gestión Humana',
    documentosAdjuntos: ['solicitud_pgn_145.pdf']
  }
];

// Estadísticas precalculadas
export const estadisticasOrganosControl = {
  totalRequerimientos: requerimientosOrganosMock.length,
  pendientes: requerimientosOrganosMock.filter(r => r.estado === 'PENDIENTE').length,
  enProceso: requerimientosOrganosMock.filter(r => r.estado === 'EN PROCESO').length,
  respondidos: requerimientosOrganosMock.filter(r => r.estado === 'RESPONDIDO').length,
  vencidos: requerimientosOrganosMock.filter(r => r.estado === 'VENCIDO').length,
  porOrgano: {
    contraloria: requerimientosOrganosMock.filter(r => r.organo === 'CONTRALORIA').length,
    procuraduria: requerimientosOrganosMock.filter(r => r.organo === 'PROCURADURIA').length,
    contaduria: requerimientosOrganosMock.filter(r => r.organo === 'CONTADURIA').length,
    fiscalia: requerimientosOrganosMock.filter(r => r.organo === 'FISCALIA').length,
    otros: requerimientosOrganosMock.filter(r => r.organo === 'OTROS').length
  }
};
