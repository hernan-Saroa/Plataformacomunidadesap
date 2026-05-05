/**
 * DATOS MOCK EXPANDIDOS - MÓDULO PROCESOS COACTIVOS
 * Base de datos completa para pruebas con cliente
 * Procesos de cobro coactivo por diferentes conceptos
 */

export interface ProcesoCoactivo {
  id: string;
  radicado: string;
  deudor: string;
  tipoDeudor: 'ESTUDIANTE' | 'EXFUNCIONARIO' | 'CONTRATISTA' | 'OTRO';
  identificacion: string;
  concepto: string;
  valorAdeudado: number;
  valorIntereses: number;
  valorCostas: number;
  valorTotal: number;
  etapa: 'COBRO PERSUASIVO' | 'MANDAMIENTO PAGO' | 'EMBARGO' | 'REMATE' | 'ACUERDO PAGO' | 'FINALIZADO';
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'ARCHIVADO';
  fechaInicio: string;
  fechaUltimaActuacion: string;
  abogadoResponsable: string;
  observaciones: string;
}

export const procesosCoactivosMock: ProcesoCoactivo[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: COBRO PERSUASIVO (Intento de pago voluntario)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2025-001',
    radicado: 'COA-BOG-2025-00001',
    deudor: 'María Camila Rodríguez García',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '1012345678',
    concepto: 'Matrícula académica semestre 2024-2',
    valorAdeudado: 3500000,
    valorIntereses: 245000,
    valorCostas: 0,
    valorTotal: 3745000,
    etapa: 'COBRO PERSUASIVO',
    estado: 'ACTIVO',
    fechaInicio: '2025-01-15',
    fechaUltimaActuacion: '2025-01-28',
    abogadoResponsable: 'Dr. Felipe Martínez - Oficina Jurídica',
    observaciones: 'Se envió carta de cobro persuasivo el 28/01/2025. Estudiante solicitó plazo de 15 días para pago.'
  },
  {
    id: 'COA-2025-002',
    radicado: 'COA-BOG-2025-00002',
    deudor: 'Carlos Andrés Pérez Gómez',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '1015678901',
    concepto: 'Cursos de extensión y diplomados',
    valorAdeudado: 2800000,
    valorIntereses: 168000,
    valorCostas: 0,
    valorTotal: 2968000,
    etapa: 'COBRO PERSUASIVO',
    estado: 'ACTIVO',
    fechaInicio: '2025-01-20',
    fechaUltimaActuacion: '2025-01-29',
    abogadoResponsable: 'Dra. Sandra Rojas - Oficina Jurídica',
    observaciones: 'Primera comunicación de cobro persuasivo enviada. Pendiente respuesta del deudor.'
  },
  {
    id: 'COA-2025-003',
    radicado: 'COA-BOG-2025-00003',
    deudor: 'Laura Stefanía Gómez Torres',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '52987654',
    concepto: 'Derechos de grado y diploma',
    valorAdeudado: 850000,
    valorIntereses: 42500,
    valorCostas: 0,
    valorTotal: 892500,
    etapa: 'COBRO PERSUASIVO',
    estado: 'ACTIVO',
    fechaInicio: '2025-01-22',
    fechaUltimaActuacion: '2025-01-30',
    abogadoResponsable: 'Dr. Felipe Martínez - Oficina Jurídica',
    observaciones: 'Deudora manifestó interés en pago. Se concedió plazo de 10 días.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: MANDAMIENTO DE PAGO (Orden de pago emitida)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2024-156',
    radicado: 'COA-BOG-2024-00156',
    deudor: 'Roberto José Martínez Silva',
    tipoDeudor: 'EXFUNCIONARIO',
    identificacion: '79234567',
    concepto: 'Salarios pagados de más por error administrativo',
    valorAdeudado: 8500000,
    valorIntereses: 1020000,
    valorCostas: 500000,
    valorTotal: 10020000,
    etapa: 'MANDAMIENTO PAGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-11-10',
    fechaUltimaActuacion: '2025-01-15',
    abogadoResponsable: 'Dr. Hernán Díaz - Oficina Jurídica',
    observaciones: 'Mandamiento de pago notificado personalmente. Deudor presentó excepciones que fueron rechazadas.'
  },
  {
    id: 'COA-2024-162',
    radicado: 'COA-BOG-2024-00162',
    deudor: 'Gloria Patricia Herrera Campos',
    tipoDeudor: 'EXFUNCIONARIO',
    identificacion: '52456789',
    concepto: 'Anticipo de cesantías - Desvinculación sin justa causa',
    valorAdeudado: 12000000,
    valorIntereses: 1560000,
    valorCostas: 650000,
    valorTotal: 14210000,
    etapa: 'MANDAMIENTO PAGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-11-25',
    fechaUltimaActuacion: '2025-01-20',
    abogadoResponsable: 'Dra. Isabel Ramírez - Oficina Jurídica',
    observaciones: 'Mandamiento de pago ejecutoriado. No se presentaron excepciones en el término legal.'
  },
  {
    id: 'COA-2024-178',
    radicado: 'COA-BOG-2024-00178',
    deudor: 'Diego Fernando Castillo Ruiz',
    tipoDeudor: 'CONTRATISTA',
    identificacion: '1017890123',
    concepto: 'Devolución pago por incumplimiento contractual',
    valorAdeudado: 25000000,
    valorIntereses: 3500000,
    valorCostas: 1200000,
    valorTotal: 29700000,
    etapa: 'MANDAMIENTO PAGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-12-05',
    fechaUltimaActuacion: '2025-01-25',
    abogadoResponsable: 'Dr. Pablo Guerrero - Oficina Jurídica',
    observaciones: 'Contratista incumplió contrato 078-2024. Mandamiento de pago notificado por aviso.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: EMBARGO (Medidas cautelares decretadas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2024-089',
    radicado: 'COA-BOG-2024-00089',
    deudor: 'Andrés Felipe García Moreno',
    tipoDeudor: 'EXFUNCIONARIO',
    identificacion: '79567890',
    concepto: 'Multas por daños a bienes institucionales',
    valorAdeudado: 4500000,
    valorIntereses: 630000,
    valorCostas: 800000,
    valorTotal: 5930000,
    etapa: 'EMBARGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-08-15',
    fechaUltimaActuacion: '2025-01-10',
    abogadoResponsable: 'Dr. Carlos Mendoza - Oficina Jurídica',
    observaciones: 'Embargo de cuentas bancarias decretado. Banco reportó saldos insuficientes. Se estudia embargo de salarios.'
  },
  {
    id: 'COA-2024-095',
    radicado: 'COA-BOG-2024-00095',
    deudor: 'Servicios Integrales y Consultoría SAS',
    tipoDeudor: 'CONTRATISTA',
    identificacion: '900234567-3',
    concepto: 'Cláusula penal por incumplimiento contrato 056-2024',
    valorAdeudado: 45000000,
    valorIntereses: 6750000,
    valorCostas: 2500000,
    valorTotal: 54250000,
    etapa: 'EMBARGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-09-01',
    fechaUltimaActuacion: '2025-01-18',
    abogadoResponsable: 'Dra. Mariana Ospina - Oficina Jurídica',
    observaciones: 'Embargo de cuentas por cobrar decretado. Se identificaron 3 clientes que adeudan a la empresa.'
  },
  {
    id: 'COA-2024-102',
    radicado: 'COA-BOG-2024-00102',
    deudor: 'Patricia Elena Vargas Salazar',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '52345678',
    concepto: 'Matrícula y derechos académicos acumulados',
    valorAdeudado: 7200000,
    valorIntereses: 1080000,
    valorCostas: 650000,
    valorTotal: 8930000,
    etapa: 'EMBARGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-09-20',
    fechaUltimaActuacion: '2025-01-22',
    abogadoResponsable: 'Dr. Felipe Martínez - Oficina Jurídica',
    observaciones: 'Embargo de salarios decretado. Empleador reportó descuentos iniciados desde enero 2025.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: REMATE (Bienes embargados en proceso de remate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2024-045',
    radicado: 'COA-BOG-2024-00045',
    deudor: 'Constructora Obras Civiles Ltda',
    tipoDeudor: 'CONTRATISTA',
    identificacion: '900567890-2',
    concepto: 'Multas e incumplimiento contrato infraestructura',
    valorAdeudado: 95000000,
    valorIntereses: 18050000,
    valorCostas: 5000000,
    valorTotal: 118050000,
    etapa: 'REMATE',
    estado: 'ACTIVO',
    fechaInicio: '2024-05-10',
    fechaUltimaActuacion: '2025-01-12',
    abogadoResponsable: 'Dr. Gustavo Moreno - Oficina Jurídica',
    observaciones: 'Avalúo de maquinaria embargada realizado. Se programó primera audiencia de remate para febrero 2025.'
  },
  {
    id: 'COA-2023-234',
    radicado: 'COA-BOG-2023-00234',
    deudor: 'Tecnología y Servicios Empresariales SAS',
    tipoDeudor: 'CONTRATISTA',
    identificacion: '900456789-1',
    concepto: 'Devolución pagos anticipados contrato 034-2023',
    valorAdeudado: 68000000,
    valorIntereses: 13600000,
    valorCostas: 4200000,
    valorTotal: 85800000,
    etapa: 'REMATE',
    estado: 'ACTIVO',
    fechaInicio: '2023-11-05',
    fechaUltimaActuacion: '2024-12-18',
    abogadoResponsable: 'Dra. Carolina Restrepo - Oficina Jurídica',
    observaciones: 'Vehículo embargado valorado en $95 millones. Segunda audiencia de remate programada tras declararse desierta la primera.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: ACUERDO DE PAGO (Facilidades de pago concedidas)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2024-187',
    radicado: 'COA-BOG-2024-00187',
    deudor: 'Claudia Fernanda Torres Mendoza',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '52234567',
    concepto: 'Matrícula semestres 2023-2 y 2024-1',
    valorAdeudado: 5600000,
    valorIntereses: 560000,
    valorCostas: 300000,
    valorTotal: 6460000,
    etapa: 'ACUERDO PAGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-12-01',
    fechaUltimaActuacion: '2025-01-30',
    abogadoResponsable: 'Dr. Felipe Martínez - Oficina Jurídica',
    observaciones: 'Acuerdo de pago en 12 cuotas mensuales de $538,333. Primera cuota pagada puntualmente en enero 2025.'
  },
  {
    id: 'COA-2024-192',
    radicado: 'COA-BOG-2024-00192',
    deudor: 'Jorge Enrique Palacios Ruiz',
    tipoDeudor: 'EXFUNCIONARIO',
    identificacion: '79890123',
    concepto: 'Préstamo de vivienda - Desvinculación voluntaria',
    valorAdeudado: 18000000,
    valorIntereses: 2160000,
    valorCostas: 800000,
    valorTotal: 20960000,
    etapa: 'ACUERDO PAGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-12-10',
    fechaUltimaActuacion: '2025-01-28',
    abogadoResponsable: 'Dra. Sandra Rojas - Oficina Jurídica',
    observaciones: 'Acuerdo de pago en 24 cuotas mensuales de $873,333. Dos cuotas pagadas al día.'
  },
  {
    id: 'COA-2024-198',
    radicado: 'COA-BOG-2024-00198',
    deudor: 'Mónica Andrea Salazar Castro',
    tipoDeudor: 'EXFUNCIONARIO',
    identificacion: '52456789',
    concepto: 'Bonificación por retiro - Reintegro ordenado judicialmente',
    valorAdeudado: 9500000,
    valorIntereses: 1140000,
    valorCostas: 450000,
    valorTotal: 11090000,
    etapa: 'ACUERDO PAGO',
    estado: 'ACTIVO',
    fechaInicio: '2024-12-15',
    fechaUltimaActuacion: '2025-01-25',
    abogadoResponsable: 'Dr. Hernán Díaz - Oficina Jurídica',
    observaciones: 'Acuerdo de pago en 18 cuotas mensuales de $616,111. Cumplimiento al día.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: FINALIZADO (Procesos terminados exitosamente)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2024-067',
    radicado: 'COA-BOG-2024-00067',
    deudor: 'Luis Alberto Ramírez González',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '1019876543',
    concepto: 'Cursos de educación continuada',
    valorAdeudado: 1800000,
    valorIntereses: 180000,
    valorCostas: 150000,
    valorTotal: 2130000,
    etapa: 'FINALIZADO',
    estado: 'FINALIZADO',
    fechaInicio: '2024-07-15',
    fechaUltimaActuacion: '2024-12-20',
    abogadoResponsable: 'Dr. Felipe Martínez - Oficina Jurídica',
    observaciones: 'Deuda cancelada en su totalidad. Proceso finalizado y archivado.'
  },
  {
    id: 'COA-2024-078',
    radicado: 'COA-BOG-2024-00078',
    deudor: 'Sandra Milena Vargas López',
    tipoDeudor: 'EXFUNCIONARIO',
    identificacion: '52678901',
    concepto: 'Auxilio de vivienda - Reintegro',
    valorAdeudado: 6200000,
    valorIntereses: 744000,
    valorCostas: 380000,
    valorTotal: 7324000,
    etapa: 'FINALIZADO',
    estado: 'FINALIZADO',
    fechaInicio: '2024-08-01',
    fechaUltimaActuacion: '2024-12-28',
    abogadoResponsable: 'Dra. Sandra Rojas - Oficina Jurídica',
    observaciones: 'Pago total realizado mediante consignación bancaria. Certificado de paz y salvo expedido.'
  },
  {
    id: 'COA-2023-298',
    radicado: 'COA-BOG-2023-00298',
    deudor: 'Alberto José Ramírez Gutiérrez',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '1015678901',
    concepto: 'Matrícula semestre 2023-1',
    valorAdeudado: 3200000,
    valorIntereses: 384000,
    valorCostas: 280000,
    valorTotal: 3864000,
    etapa: 'FINALIZADO',
    estado: 'FINALIZADO',
    fechaInicio: '2023-09-10',
    fechaUltimaActuacion: '2024-06-15',
    abogadoResponsable: 'Dr. Carlos Mendoza - Oficina Jurídica',
    observaciones: 'Acuerdo de pago cumplido en su totalidad. Deuda saldada completamente.'
  },
  {
    id: 'COA-2023-312',
    radicado: 'COA-BOG-2023-00312',
    deudor: 'Empresa de Aseo y Servicios Ltda',
    tipoDeudor: 'CONTRATISTA',
    identificacion: '900345678-9',
    concepto: 'Multa por incumplimiento contrato limpieza',
    valorAdeudado: 8500000,
    valorIntereses: 1190000,
    valorCostas: 650000,
    valorTotal: 10340000,
    etapa: 'FINALIZADO',
    estado: 'FINALIZADO',
    fechaInicio: '2023-10-05',
    fechaUltimaActuacion: '2024-08-22',
    abogadoResponsable: 'Dr. Pablo Guerrero - Oficina Jurídica',
    observaciones: 'Pago realizado tras embargo de cuentas bancarias. Embargo levantado y proceso finalizado.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESOS ARCHIVADOS (Por diferentes causales)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COA-2024-034',
    radicado: 'COA-BOG-2024-00034',
    deudor: 'Diana Carolina Rojas Martínez',
    tipoDeudor: 'ESTUDIANTE',
    identificacion: '52123456',
    concepto: 'Matrícula semestre 2023-2',
    valorAdeudado: 2900000,
    valorIntereses: 290000,
    valorCostas: 200000,
    valorTotal: 3390000,
    etapa: 'FINALIZADO',
    estado: 'ARCHIVADO',
    fechaInicio: '2024-04-10',
    fechaUltimaActuacion: '2024-11-15',
    abogadoResponsable: 'Dr. Felipe Martínez - Oficina Jurídica',
    observaciones: 'Archivado por insolvencia económica comprobada. Deudora declarada en insolvencia judicial.'
  },
  {
    id: 'COA-2023-456',
    radicado: 'COA-BOG-2023-00456',
    deudor: 'Ricardo Alonso Pérez Silva',
    tipoDeudor: 'OTRO',
    identificacion: '79890123',
    concepto: 'Daños a instalaciones institucionales',
    valorAdeudado: 3500000,
    valorIntereses: 525000,
    valorCostas: 320000,
    valorTotal: 4345000,
    etapa: 'FINALIZADO',
    estado: 'ARCHIVADO',
    fechaInicio: '2023-12-01',
    fechaUltimaActuacion: '2024-09-10',
    abogadoResponsable: 'Dr. Carlos Mendoza - Oficina Jurídica',
    observaciones: 'Archivado por fallecimiento del deudor sin bienes heredables identificados.'
  }
];

// Estadísticas precalculadas
export const estadisticasProcesosCoactivos = {
  totalProcesos: procesosCoactivosMock.length,
  activos: procesosCoactivosMock.filter(p => p.estado === 'ACTIVO').length,
  finalizados: procesosCoactivosMock.filter(p => p.estado === 'FINALIZADO').length,
  archivados: procesosCoactivosMock.filter(p => p.estado === 'ARCHIVADO').length,
  valorTotalAdeudado: procesosCoactivosMock
    .filter(p => p.estado === 'ACTIVO')
    .reduce((sum, p) => sum + p.valorTotal, 0),
  porEtapa: {
    cobroPersuasivo: procesosCoactivosMock.filter(p => p.etapa === 'COBRO PERSUASIVO').length,
    mandamientoPago: procesosCoactivosMock.filter(p => p.etapa === 'MANDAMIENTO PAGO').length,
    embargo: procesosCoactivosMock.filter(p => p.etapa === 'EMBARGO').length,
    remate: procesosCoactivosMock.filter(p => p.etapa === 'REMATE').length,
    acuerdoPago: procesosCoactivosMock.filter(p => p.etapa === 'ACUERDO PAGO').length,
    finalizado: procesosCoactivosMock.filter(p => p.etapa === 'FINALIZADO').length
  },
  porTipoDeudor: {
    estudiante: procesosCoactivosMock.filter(p => p.tipoDeudor === 'ESTUDIANTE').length,
    exfuncionario: procesosCoactivosMock.filter(p => p.tipoDeudor === 'EXFUNCIONARIO').length,
    contratista: procesosCoactivosMock.filter(p => p.tipoDeudor === 'CONTRATISTA').length,
    otro: procesosCoactivosMock.filter(p => p.tipoDeudor === 'OTRO').length
  }
};
