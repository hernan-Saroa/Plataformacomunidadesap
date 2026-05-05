/**
 * Configuración de Términos Legales por Tipo de Proceso (REDUCIDO)
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
  etapaGeneradora?: string;
}

// ============================================================================
// TÉRMINOS DE DEFENSA JUDICIAL (PJ) - EXPANDIDO
// ============================================================================
export const terminosDefensaJudicial: ConfiguracionTermino[] = [
  {
    tipo: 'Contestación de Tutela',
    diasPlazo: 2,
    tipoDias: 'CALENDARIO',
    improrrogable: true,
    normativa: 'Decreto 2591/1991 Art. 14',
    consecuenciaIncumplimiento: 'Fallo en rebeldía',
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
    tipo: 'Contestación Reparación Directa',
    diasPlazo: 30,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1437/2011',
    consecuenciaIncumplimiento: 'Pérdida de oportunidad defensa',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'NOTIFICACION'
  },
  {
    tipo: 'Contestación Controversias Contractuales',
    diasPlazo: 30,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1437/2011',
    consecuenciaIncumplimiento: 'Pérdida de oportunidad defensa',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'NOTIFICACION'
  },
  {
    tipo: 'Contestación Acción de Grupo',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 472/1998',
    consecuenciaIncumplimiento: 'Indicio grave en contra',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'NOTIFICACION'
  },
  {
    tipo: 'Contestación Acción Popular',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 472/1998',
    consecuenciaIncumplimiento: 'Indicio grave en contra',
    moduloOrigen: 'DEFENSA_JUDICIAL',
    etapaGeneradora: 'NOTIFICACION'
  },
];

// ============================================================================
// TÉRMINOS DE JUZGAMIENTO DISCIPLINARIO (PD) - REDUCIDOS
// ============================================================================
export const terminosJuzgamiento: ConfiguracionTermino[] = [
  {
    tipo: 'Descargos',
    diasPlazo: 10,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Ley 734/2002 Art. 150',
    consecuenciaIncumplimiento: 'Proceso continúa sin descargos',
    moduloOrigen: 'JUZGAMIENTO',
    etapaGeneradora: 'PLIEGO_CARGOS'
  },
];

// ============================================================================
// TÉRMINOS DE ASESORÍA JURÍDICA - REDUCIDOS
// ============================================================================
export const terminosAsesoria: ConfiguracionTermino[] = [
  {
    tipo: 'Concepto Jurídico Interno',
    diasPlazo: 5,
    tipoDias: 'HABILES',
    improrrogable: false,
    normativa: 'Manual de Procedimientos ESAP',
    consecuenciaIncumplimiento: 'Retardo en trámite solicitante',
    moduloOrigen: 'ASESORIA',
    etapaGeneradora: 'RECEPCION'
  },
];

// ============================================================================
// TÉRMINOS ÓRGANOS DE CONTROL - REDUCIDOS
// ============================================================================
export const terminosOrganosControl: ConfiguracionTermino[] = [
  {
    tipo: 'Respuesta Contraloría',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 610/2000 Art. 7',
    consecuenciaIncumplimiento: 'Hallazgo administrativo + sanción',
    moduloOrigen: 'ORGANOS_CONTROL',
    etapaGeneradora: 'REQUERIMIENTO'
  },
];

// ============================================================================
// TÉRMINOS PROCESOS COACTIVOS - REDUCIDOS
// ============================================================================
export const terminosProcesosCoactivos: ConfiguracionTermino[] = [
  {
    tipo: 'Excepciones al Mandamiento de Pago',
    diasPlazo: 15,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Ley 1066/2006 Art. 831',
    consecuenciaIncumplimiento: 'Orden de remate de bienes',
    moduloOrigen: 'PROCESOS_COACTIVOS',
    etapaGeneradora: 'MANDAMIENTO_PAGO'
  },
];

// ============================================================================
// TÉRMINOS CENTRO COMUNICACIONES - REDUCIDOS
// ============================================================================
export const terminosCentroComunicaciones: ConfiguracionTermino[] = [
  {
    tipo: 'Clasificación Comunicación Judicial',
    diasPlazo: 1,
    tipoDias: 'HABILES',
    improrrogable: true,
    normativa: 'Manual SIGL',
    consecuenciaIncumplimiento: 'Pérdida de término inicial',
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    etapaGeneradora: 'RECEPCION'
  },
];

// ============================================================================
// CONSOLIDADO - REDUCIDO
// ============================================================================
export const todasLasConfiguraciones: ConfiguracionTermino[] = [
  ...terminosDefensaJudicial,
  ...terminosJuzgamiento,
  ...terminosAsesoria,
  ...terminosOrganosControl,
  ...terminosProcesosCoactivos,
  ...terminosCentroComunicaciones,
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