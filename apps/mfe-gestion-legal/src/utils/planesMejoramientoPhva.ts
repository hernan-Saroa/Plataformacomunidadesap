export const FASES_PHVA = ['PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'] as const;
export type FasePhva = (typeof FASES_PHVA)[number];

export type EstadoAccionPlan = 'PENDIENTE' | 'EJECUTADA';
export type EstadoPlanUI = 'FORMULACION' | 'EN_EJECUCION' | 'COMPLETADO' | 'SUSPENDIDO';

export interface AccionPlanMejoramiento {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fasePhva: FasePhva;
  pesoPorcentual: number;
  estado: EstadoAccionPlan;
  porcentajeAvance: number;
  responsable?: string | null;
  fechaLimite?: string | null;
  fechaEjecucion?: string | null;
  archivoUrl?: string | null;
  archivoNombre?: string | null;
  createdAt?: string | null;
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

export interface ConfigFasePhva {
  valor: FasePhva;
  etiqueta: string;
  sigla: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PHVA_CONFIG: Record<FasePhva, ConfigFasePhva> = {
  PLANEAR: {
    valor: 'PLANEAR',
    etiqueta: 'Planear',
    sigla: 'P',
    color: '#003DA5',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  HACER: {
    valor: 'HACER',
    etiqueta: 'Hacer',
    sigla: 'H',
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  VERIFICAR: {
    valor: 'VERIFICAR',
    etiqueta: 'Verificar',
    sigla: 'V',
    color: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  ACTUAR: {
    valor: 'ACTUAR',
    etiqueta: 'Actuar',
    sigla: 'A',
    color: '#6D28D9',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
};

export function normalizarFasePhvaUI(valor?: string | null): FasePhva {
  if (!valor) return 'PLANEAR';
  const limpio = valor
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (limpio === 'HACER') return 'HACER';
  if (limpio === 'VERIFICAR') return 'VERIFICAR';
  if (limpio === 'ACTUAR') return 'ACTUAR';
  return 'PLANEAR';
}

export function normalizarEstadoAccionUI(
  estado?: string | null,
  porcentajeAvance?: number | null,
): EstadoAccionPlan {
  if (typeof estado === 'string') {
    const limpio = estado.trim().toUpperCase();
    if (limpio === 'EJECUTADA' || limpio === 'COMPLETADA') return 'EJECUTADA';
    if (limpio === 'PENDIENTE' || limpio === 'EN_PROCESO') return 'PENDIENTE';
  }
  return Number(porcentajeAvance || 0) >= 100 ? 'EJECUTADA' : 'PENDIENTE';
}

export function normalizarEstadoPlanUI(estado?: string | null): EstadoPlanUI {
  const limpio = (estado || '').trim().toUpperCase();
  if (limpio === 'CERRADO' || limpio === 'COMPLETADO') return 'COMPLETADO';
  if (limpio === 'ABIERTO' || limpio === 'EN_EJECUCION' || limpio === 'VENCIDO') return 'EN_EJECUCION';
  if (limpio === 'SUSPENDIDO') return 'SUSPENDIDO';
  return 'FORMULACION';
}

export function mapearAccionBackend(raw: Record<string, unknown>): AccionPlanMejoramiento {
  const estado = normalizarEstadoAccionUI(
    raw.estado as string | undefined,
    raw.porcentajeAvance as number | undefined,
  );
  return {
    id: String(raw.id ?? ''),
    nombre: String(raw.nombre ?? ''),
    descripcion: (raw.descripcion as string | null) ?? null,
    fasePhva: normalizarFasePhvaUI(raw.fasePhva as string | undefined),
    pesoPorcentual: Number(raw.pesoPorcentual ?? 0),
    estado,
    porcentajeAvance: estado === 'EJECUTADA' ? 100 : Number(raw.porcentajeAvance ?? 0),
    responsable: (raw.responsable as string | null) ?? null,
    fechaLimite: (raw.fechaLimite as string | null) ?? null,
    fechaEjecucion: (raw.fechaEjecucion as string | null) ?? null,
    archivoUrl: (raw.archivoUrl as string | null) ?? null,
    archivoNombre: (raw.archivoNombre as string | null) ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
  };
}

export function formatearPorcentaje(valor: number | string | null | undefined): string {
  const num = Number(valor ?? 0);
  if (!Number.isFinite(num)) return '0%';
  const redondeado = Math.round(num * 100) / 100;
  return `${Number.isInteger(redondeado) ? redondeado : redondeado.toFixed(2).replace(/\.?0+$/, '')}%`;
}

export function calcularAvancePorFasePhvaUI(
  acciones: AccionPlanMejoramiento[],
): Record<FasePhva, ResumenFasePhva> {
  const resumen = {} as Record<FasePhva, ResumenFasePhva>;
  const centsTotal: Record<FasePhva, number> = { PLANEAR: 0, HACER: 0, VERIFICAR: 0, ACTUAR: 0 };
  const centsEjecutado: Record<FasePhva, number> = { PLANEAR: 0, HACER: 0, VERIFICAR: 0, ACTUAR: 0 };

  for (const fase of FASES_PHVA) {
    resumen[fase] = {
      fase,
      etiqueta: PHVA_CONFIG[fase].etiqueta,
      total: 0,
      ejecutadas: 0,
      pesoTotal: 0,
      pesoEjecutado: 0,
      porcentajeAvance: 0,
    };
  }

  for (const accion of acciones) {
    const fase = normalizarFasePhvaUI(accion.fasePhva);
    const pesoCents = Math.round(Number(accion.pesoPorcentual || 0) * 100);
    resumen[fase].total += 1;
    centsTotal[fase] += pesoCents;
    if (accion.estado === 'EJECUTADA') {
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

export function construirNombreArchivoPlan(
  codigoPlan: string,
  extension: 'pdf' | 'xlsx',
  fecha: Date = new Date(),
): string {
  const codigoLimpio = (codigoPlan || 'PLAN')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'PLAN';
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${codigoLimpio}_${yyyy}-${mm}-${dd}.${extension}`;
}
