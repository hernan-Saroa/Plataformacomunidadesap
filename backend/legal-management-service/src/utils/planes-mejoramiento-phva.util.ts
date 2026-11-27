export const FASES_PHVA = ['PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'] as const;
export type FasePhva = (typeof FASES_PHVA)[number];

export const ESTADOS_ACCION_PLAN = ['PENDIENTE', 'EJECUTADA'] as const;
export type EstadoAccionPlan = (typeof ESTADOS_ACCION_PLAN)[number];

export interface AccionCumplimientoInput {
  fasePhva?: string | null;
  pesoPorcentual: number | string | null | undefined;
  estado?: string | null;
  porcentajeAvance?: number | null;
}

export interface ResultadoCumplimientoPlan {
  porcentaje: number;
  todasEjecutadas: boolean;
  ejecutadas: number;
  total: number;
}

export interface ResumenFasePhva {
  fase: FasePhva;
  etiqueta: string;
  total: number;
  ejecutadas: number;
  pesoTotal: number;
  pesoEjecutado: number;
  porcentajeAvance: number;
}

const ETIQUETAS_PHVA: Record<FasePhva, string> = {
  PLANEAR: 'Planear',
  HACER: 'Hacer',
  VERIFICAR: 'Verificar',
  ACTUAR: 'Actuar',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuidValido(valor?: string | null): boolean {
  return typeof valor === 'string' && UUID_REGEX.test(valor.trim());
}

export function normalizarFasePhva(valor?: string | null): FasePhva | null {
  if (!valor || typeof valor !== 'string') return null;
  const limpio = valor
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (limpio === 'PLANEAR') return 'PLANEAR';
  if (limpio === 'HACER') return 'HACER';
  if (limpio === 'VERIFICAR') return 'VERIFICAR';
  if (limpio === 'ACTUAR') return 'ACTUAR';
  return null;
}

export function etiquetaFasePhva(fase?: string | null): string {
  const normalizada = normalizarFasePhva(fase);
  return normalizada ? ETIQUETAS_PHVA[normalizada] : 'Planear';
}

export function normalizarEstadoAccion(
  estado?: string | null,
  porcentajeAvance?: number | null,
): EstadoAccionPlan {
  if (typeof estado === 'string') {
    const limpio = estado.trim().toUpperCase();
    if (limpio === 'EJECUTADA' || limpio === 'COMPLETADA') return 'EJECUTADA';
    if (limpio === 'PENDIENTE' || limpio === 'EN_PROCESO') return 'PENDIENTE';
  }
  if (typeof porcentajeAvance === 'number' && porcentajeAvance >= 100) {
    return 'EJECUTADA';
  }
  return 'PENDIENTE';
}

/**
 * Distribuye 100.00% entre `cantidad` acciones.
 * Si la división no es exacta, aplica el ajuste de decimales a la última acción
 * para que la suma sea exactamente 100.00%.
 */
export function calcularPesosAcciones(cantidad: number): number[] {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return [];
  if (cantidad === 1) return [100];

  const baseCents = Math.floor(10000 / cantidad);
  const pesos: number[] = [];

  for (let i = 0; i < cantidad - 1; i++) {
    pesos.push(baseCents / 100);
  }

  const ultimoCents = 10000 - baseCents * (cantidad - 1);
  pesos.push(ultimoCents / 100);

  return pesos;
}

export function calcularCumplimientoPlan(
  acciones: AccionCumplimientoInput[],
): ResultadoCumplimientoPlan {
  const total = acciones.length;
  if (total === 0) {
    return { porcentaje: 0, todasEjecutadas: false, ejecutadas: 0, total: 0 };
  }

  let ejecutadas = 0;
  let centsEjecutados = 0;

  for (const accion of acciones) {
    const estado = normalizarEstadoAccion(accion.estado, accion.porcentajeAvance);
    if (estado === 'EJECUTADA') {
      ejecutadas += 1;
      centsEjecutados += Math.round(Number(accion.pesoPorcentual || 0) * 100);
    }
  }

  const todasEjecutadas = ejecutadas === total;
  const porcentaje = todasEjecutadas
    ? 100
    : Math.max(0, Math.min(100, Math.round(centsEjecutados) / 100));

  return { porcentaje, todasEjecutadas, ejecutadas, total };
}

export function calcularAvancePorFasePhva(
  acciones: AccionCumplimientoInput[],
): Record<FasePhva, ResumenFasePhva> {
  const resumen = {} as Record<FasePhva, ResumenFasePhva>;

  for (const fase of FASES_PHVA) {
    resumen[fase] = {
      fase,
      etiqueta: ETIQUETAS_PHVA[fase],
      total: 0,
      ejecutadas: 0,
      pesoTotal: 0,
      pesoEjecutado: 0,
      porcentajeAvance: 0,
    };
  }

  const centsTotal: Record<FasePhva, number> = {
    PLANEAR: 0,
    HACER: 0,
    VERIFICAR: 0,
    ACTUAR: 0,
  };
  const centsEjecutado: Record<FasePhva, number> = {
    PLANEAR: 0,
    HACER: 0,
    VERIFICAR: 0,
    ACTUAR: 0,
  };

  for (const accion of acciones) {
    const fase = normalizarFasePhva(accion.fasePhva) ?? 'PLANEAR';
    const estado = normalizarEstadoAccion(accion.estado, accion.porcentajeAvance);
    const pesoCents = Math.round(Number(accion.pesoPorcentual || 0) * 100);

    resumen[fase].total += 1;
    centsTotal[fase] += pesoCents;

    if (estado === 'EJECUTADA') {
      resumen[fase].ejecutadas += 1;
      centsEjecutado[fase] += pesoCents;
    }
  }

  for (const fase of FASES_PHVA) {
    const item = resumen[fase];
    item.pesoTotal = centsTotal[fase] / 100;
    item.pesoEjecutado = centsEjecutado[fase] / 100;
    if (item.total === 0) {
      item.porcentajeAvance = 0;
    } else if (item.ejecutadas === item.total) {
      item.porcentajeAvance = 100;
    } else if (centsTotal[fase] > 0) {
      item.porcentajeAvance = Math.round((centsEjecutado[fase] / centsTotal[fase]) * 10000) / 100;
    } else {
      item.porcentajeAvance = Math.round((item.ejecutadas / item.total) * 10000) / 100;
    }
  }

  return resumen;
}

/**
 * Determina el estado canónico en BD (`ABIERTO`, `EN_EJECUCION`, `VENCIDO`, `CERRADO`).
 * Cuando todas las acciones están ejecutadas (100%), el plan cambia automáticamente a `CERRADO`
 * (mostrado como Completado en UI). Si estaba `CERRADO` y se reabre una acción o se agrega
 * una nueva pendiente, vuelve a `EN_EJECUCION`.
 */
export function determinarEstadoPlanPorCumplimiento(
  estadoActual: string | null | undefined,
  cumplimiento: ResultadoCumplimientoPlan,
): string {
  const estado = (estadoActual || 'ABIERTO').toUpperCase();

  if (cumplimiento.total === 0) {
    return estado === 'CERRADO' || estado === 'COMPLETADO' ? 'EN_EJECUCION' : estado;
  }

  if (cumplimiento.todasEjecutadas) {
    return 'CERRADO';
  }

  if (estado === 'CERRADO' || estado === 'COMPLETADO') {
    return 'EN_EJECUCION';
  }

  return estado;
}
