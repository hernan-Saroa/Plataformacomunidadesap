/**
 * Configuración de Términos Legales por Tipo de Proceso
 * Base normativa y cálculo automático de vencimientos
 */

export type TipoDias = 'HABILES' | 'CALENDARIO';
export type ModuloOrigen = 
  | 'DEFENSA_JUDICIAL' 
  | 'JUZGAMIENTO' 
  | 'ASESORIA' 
  | 'ORGANOS_CONTROL' 
  | 'PROCESOS_COACTIVOS'
  | 'CENTRO_COMUNICACIONES';

export interface ConfiguracionTermino {
  tipo: string;
  diasPlazo: number;
  tipoDias: TipoDias;
  improrrogable: boolean;
  normativa: string;
  consecuenciaIncumplimiento: string;
  moduloOrigen: ModuloOrigen;
  etapaGeneradora?: string; // Etapa específica que genera el término
}

// ============================================================================
// TÉRMINOS DE DEFENSA JUDICIAL (PJ)
// ============================================================================
export const terminosDefensaJudicial: ConfiguracionTermino[] = [
  {
    tipo: 'Contestación de Tutela',
    diasPlazo: 2,
    tipoDias: 'CALENDARIO',
    improrrogable: true,
    normativa: 'Decreto 2591/1991 Art. 14',
    consecuenciaIncumplimiento: 'Fallo en rebeldía + presunción de veracidad de hechos',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'NOTIFICACION'
  },
  {
    tipo: 'Contestación NRD',
    diasPlazo: 30,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1437/2011 Art. 187',
    consecuenciaIncumplimiento: 'Sentencia anticipada desfavorable',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'NOTIFICACION'
  },
  {
    tipo: 'Recurso de Apelación',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'CGP Art. 321',
    consecuenciaIncumplimiento: 'Ejecutoria de sentencia de primera instancia',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'SENTENCIA'
  },
  {
    tipo: 'Alegatos de Conclusión',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'CGP Art. 372',
    consecuenciaIncumplimiento: 'Pérdida de oportunidad de argumentación final',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'PRUEBAS'
  },
  {
    tipo: 'Presentación de Pruebas',
    diasPlazo: 30,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'CGP Art. 168-180',
    consecuenciaIncumplimiento: 'Pérdida de oportunidad probatoria',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'CONTESTACION'
  },
  {
    tipo: 'Recurso de Casación',
    diasPlazo: 30,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'CGP Art. 343',
    consecuenciaIncumplimiento: 'Ejecutoria definitiva de sentencia',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'SEGUNDA_INSTANCIA'
  }
];

// ============================================================================
// TÉRMINOS DE JUZGAMIENTO DISCIPLINARIO (PD)
// ============================================================================
export const terminosJuzgamiento: ConfiguracionTermino[] = [
  {
    tipo: 'Presentación de Descargos',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 734/2002 Art. 150',
    consecuenciaIncumplimiento: 'Aceptación tácita de cargos imputados',
    moduloOrigen: 'JUZGAMIENTO',
    etapaGeneradora: 'FORMULACION_CARGOS'
  },
  {
    tipo: 'Solicitud de Pruebas',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 734/2002 Art. 151',
    consecuenciaIncumplimiento: 'Pérdida de oportunidad probatoria',
    moduloOrigen: 'JUZGAMIENTO',
    etapaGeneradora: 'DESCARGOS'
  },
  {
    tipo: 'Recurso de Apelación (Fallo)',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 734/2002 Art. 181',
    consecuenciaIncumplimiento: 'Ejecutoria del fallo disciplinario',
    moduloOrigen: 'JUZGAMIENTO',
    etapaGeneradora: 'FALLO'
  },
  {
    tipo: 'Alegatos de Conclusión',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 734/2002 Art. 152',
    consecuenciaIncumplimiento: 'Pérdida de argumentación final',
    moduloOrigen: 'JUZGAMIENTO',
    etapaGeneradora: 'PRUEBAS'
  },
  {
    tipo: 'Informe a RRHH (Post-Fallo)',
    diasPlazo: 5,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 734/2002 Art. 174',
    consecuenciaIncumplimiento: 'Incumplimiento de deber funcional',
    moduloOrigen: 'JUZGAMIENTO',
    etapaGeneradora: 'FALLO'
  }
];

// ============================================================================
// TÉRMINOS DE ASESORÍA JURÍDICA (AJ)
// ============================================================================
export const terminosAsesoria: ConfiguracionTermino[] = [
  {
    tipo: 'Concepto Jurídico Urgente',
    diasPlazo: 3,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Reglamento Interno ESAP',
    consecuenciaIncumplimiento: 'Demora en decisiones administrativas',
    moduloOrigen: 'ASESORIA',
    etapaGeneradora: 'ANALISIS'
  },
  {
    tipo: 'Concepto Jurídico Normal',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Reglamento Interno ESAP',
    consecuenciaIncumplimiento: 'Incumplimiento de SLA interno',
    moduloOrigen: 'ASESORIA',
    etapaGeneradora: 'ANALISIS'
  },
  {
    tipo: 'Revisión de Contratos',
    diasPlazo: 5,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Manual de Contratación ESAP',
    consecuenciaIncumplimiento: 'Retraso en procesos contractuales',
    moduloOrigen: 'ASESORIA',
    etapaGeneradora: 'REVISION'
  },
  {
    tipo: 'Concepto para Licitación',
    diasPlazo: 7,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 80/1993',
    consecuenciaIncumplimiento: 'Posible demora en cronograma de contratación',
    moduloOrigen: 'ASESORIA',
    etapaGeneradora: 'ANALISIS'
  }
];

// ============================================================================
// TÉRMINOS DE ÓRGANOS DE CONTROL (OC)
// ============================================================================
export const terminosOrganosControl: ConfiguracionTermino[] = [
  {
    tipo: 'Respuesta a Contraloría',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 42/1993',
    consecuenciaIncumplimiento: 'Hallazgo administrativo + posible sanción',
    moduloOrigen: 'ORGANOS_CONTROL',
    etapaGeneradora: 'REQUERIMIENTO'
  },
  {
    tipo: 'Respuesta a Procuraduría',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 734/2002',
    consecuenciaIncumplimiento: 'Incumplimiento de deber funcional',
    moduloOrigen: 'ORGANOS_CONTROL',
    etapaGeneradora: 'REQUERIMIENTO'
  },
  {
    tipo: 'Respuesta a Fiscalía',
    diasPlazo: 5,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 906/2004',
    consecuenciaIncumplimiento: 'Obstrucción a la justicia',
    moduloOrigen: 'ORGANOS_CONTROL',
    etapaGeneradora: 'REQUERIMIENTO'
  },
  {
    tipo: 'Informe de Gestión Trimestral',
    diasPlazo: 30,
    tipoDias: 'CALENDARIO',
    improrrogable: false,
    normativa: 'Acuerdo Interno ESAP',
    consecuenciaIncumplimiento: 'Falta de transparencia',
    moduloOrigen: 'ORGANOS_CONTROL',
    etapaGeneradora: 'SEGUIMIENTO'
  },
  {
    tipo: 'Descargos ante Contraloría',
    diasPlazo: 20,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 610/2000',
    consecuenciaIncumplimiento: 'Aceptación de hallazgos fiscales',
    moduloOrigen: 'ORGANOS_CONTROL',
    etapaGeneradora: 'DESCARGOS'
  }
];

// ============================================================================
// TÉRMINOS DE PROCESOS COACTIVOS (PC)
// ============================================================================
export const terminosProcesosCoactivos: ConfiguracionTermino[] = [
  {
    tipo: 'Mandamiento de Pago',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1066/2006 Art. 9',
    consecuenciaIncumplimiento: 'Pérdida de oportunidad de pago sin intereses',
    moduloOrigen: 'PROCESOS_COACTIVOS',
    etapaGeneradora: 'MANDAMIENTO'
  },
  {
    tipo: 'Excepciones (Deudor)',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1066/2006 Art. 10',
    consecuenciaIncumplimiento: 'Pérdida del derecho de defensa',
    moduloOrigen: 'PROCESOS_COACTIVOS',
    etapaGeneradora: 'MANDAMIENTO'
  },
  {
    tipo: 'Medidas Cautelares',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 1066/2006 Art. 11',
    consecuenciaIncumplimiento: 'Riesgo de insolvencia del deudor',
    moduloOrigen: 'PROCESOS_COACTIVOS',
    etapaGeneradora: 'COBRO'
  },
  {
    tipo: 'Remate de Bienes',
    diasPlazo: 30,
    tipoDias: 'CALENDARIO',
    improrrogable: false,
    normativa: 'Ley 1066/2006',
    consecuenciaIncumplimiento: 'Pérdida de recuperación de cartera',
    moduloOrigen: 'PROCESOS_COACTIVOS',
    etapaGeneradora: 'EMBARGO'
  }
];

// ============================================================================
// TÉRMINOS DE CENTRO DE COMUNICACIONES (CC)
// ============================================================================
export const terminosCentroComunicaciones: ConfiguracionTermino[] = [
  {
    tipo: 'Derecho de Petición',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1755/2015 Art. 14',
    consecuenciaIncumplimiento: 'Silencio administrativo positivo + sanción disciplinaria',
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    etapaGeneradora: 'CLASIFICACION'
  },
  {
    tipo: 'Queja (Respuesta)',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1755/2015',
    consecuenciaIncumplimiento: 'Escalamiento a órganos de control',
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    etapaGeneradora: 'CLASIFICACION'
  },
  {
    tipo: 'Reclamo (Respuesta)',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1755/2015',
    consecuenciaIncumplimiento: 'Pérdida de confianza ciudadana',
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    etapaGeneradora: 'CLASIFICACION'
  },
  {
    tipo: 'Solicitud de Información',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 1712/2014 (Transparencia)',
    consecuenciaIncumplimiento: 'Violación del derecho de acceso a información pública',
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    etapaGeneradora: 'CLASIFICACION'
  },
  {
    tipo: 'Consulta Ciudadana',
    diasPlazo: 30,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 1755/2015 Art. 20',
    consecuenciaIncumplimiento: 'Mala atención al ciudadano',
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    etapaGeneradora: 'CLASIFICACION'
  }
];

// ============================================================================
// CONSOLIDADO: Todas las configuraciones
// ============================================================================
export const todasLasConfiguraciones: ConfiguracionTermino[] = [
  ...terminosDefensaJudicial,
  ...terminosJuzgamiento,
  ...terminosAsesoria,
  ...terminosOrganosControl,
  ...terminosProcesosCoactivos,
  ...terminosCentroComunicaciones
];

// ============================================================================
// FUNCIÓN: Calcular fecha de vencimiento considerando días hábiles
// ============================================================================

export function calcularFechaVencimiento(
  fechaInicio: Date,
  diasLegales: number,
  esHabil: boolean
): Date {
  const fecha = new Date(fechaInicio);
  
  if (!esHabil) {
    // Días calendario - simplemente sumar días
    fecha.setDate(fecha.getDate() + diasLegales);
    return fecha;
  }
  
  // Días hábiles - saltar fines de semana
  let diasContados = 0;
  while (diasContados < diasLegales) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasContados++;
    }
  }
  
  return fecha;
}

// ============================================================================
// FUNCIÓN: Calcular días restantes considerando días hábiles
// ============================================================================

export function calcularDiasRestantes(
  fechaVencimiento: Date,
  esHabil: boolean
): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  
  if (!esHabil) {
    // Días calendario
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  // Días hábiles - contar solo días laborables
  let diasContados = 0;
  const fechaTemp = new Date(hoy);
  
  while (fechaTemp < vencimiento) {
    fechaTemp.setDate(fechaTemp.getDate() + 1);
    const diaSemana = fechaTemp.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasContados++;
    }
  }
  
  return diasContados;
}