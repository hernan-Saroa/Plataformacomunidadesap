/**
 * Lógica pura del Plan de Acción Institucional (filtros, agrupación, consolidados, semáforo).
 * Vive fuera del componente para poder probarla de forma aislada.
 */

export type EjeEstrategico = 'GESTION_INSTITUCIONAL' | 'TALENTO_HUMANO' | 'TRANSPARENCIA' | 'TECNOLOGIA';
export type EstadoIndicador = 'EN_TIEMPO' | 'EN_RIESGO' | 'VENCIDO' | 'COMPLETADO';

export interface RegistroAvanceIndicador {
  id: number | string;
  valorReportado: number;
  porcentajeAvance: number;
  observaciones?: string;
  evidenciaUrl?: string;
  fechaRegistro: string | Date;
  usuarioRegistraId?: string;
}

export interface Indicador {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  ejeEstrategico: EjeEstrategico;
  responsable: string;
  /** id_user del responsable (auth-service); null en indicadores históricos con responsable en texto libre. */
  responsableId?: string | null;
  meta: number;
  valorActual: number;
  avance: number; // % de cumplimiento
  fechaInicio: Date;
  fechaFin: Date;
  estado: EstadoIndicador;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  periodicidad: 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  tipoIndicador: 'EFICIENCIA' | 'EFICACIA' | 'GESTION' | 'TRANSPARENCIA';
  unidadMedida: string;
  ultimaActualizacion: Date;
  registros?: RegistroAvanceIndicador[];
}

export const EJES: EjeEstrategico[] = ['GESTION_INSTITUCIONAL', 'TALENTO_HUMANO', 'TRANSPARENCIA', 'TECNOLOGIA'];
export const ESTADOS: EstadoIndicador[] = ['EN_TIEMPO', 'EN_RIESGO', 'VENCIDO', 'COMPLETADO'];

export const EJE_NOMBRES: Record<EjeEstrategico, string> = {
  GESTION_INSTITUCIONAL: 'Gestión Institucional',
  TALENTO_HUMANO: 'Talento Humano',
  TRANSPARENCIA: 'Transparencia',
  TECNOLOGIA: 'Tecnología',
};

export const ESTADO_NOMBRES: Record<EstadoIndicador, string> = {
  EN_TIEMPO: 'En Tiempo',
  EN_RIESGO: 'En Riesgo',
  VENCIDO: 'Vencido',
  COMPLETADO: 'Completado',
};

// ==================== SEMÁFORO (parametrizable) ====================
export interface SemaforoConfig {
  /** Avance mínimo (%) para verde. */
  verde: number;
  /** Avance mínimo (%) para amarillo; por debajo es rojo. */
  amarillo: number;
}

export const SEMAFORO_DEFAULT: SemaforoConfig = { verde: 90, amarillo: 60 };

let semaforoActual: SemaforoConfig = { ...SEMAFORO_DEFAULT };

/** Cambia los umbrales del semáforo. Ignora valores inválidos (amarillo debe ser < verde). */
export const configurarSemaforo = (cfg: Partial<SemaforoConfig>): SemaforoConfig => {
  const next = { ...semaforoActual, ...cfg };
  if (
    Number.isFinite(next.verde) && Number.isFinite(next.amarillo) &&
    next.amarillo >= 0 && next.amarillo < next.verde && next.verde <= 100
  ) {
    semaforoActual = next;
  }
  return semaforoActual;
};

export const getSemaforoConfig = (): SemaforoConfig => semaforoActual;
export const resetSemaforo = () => { semaforoActual = { ...SEMAFORO_DEFAULT }; };

export type NivelSemaforo = 'verde' | 'amarillo' | 'rojo';

export const getNivelSemaforo = (avance: number, cfg: SemaforoConfig = semaforoActual): NivelSemaforo => {
  if (avance >= cfg.verde) return 'verde';
  if (avance >= cfg.amarillo) return 'amarillo';
  return 'rojo';
};

// ==================== FILTROS ====================
export interface FiltrosPlanAccion {
  busqueda: string;
  /** Vacío = Todos. */
  ejes: EjeEstrategico[];
  /** Vacío = Todos. */
  estados: EstadoIndicador[];
  ocultarCompletados: boolean;
  /** Fechas ISO (yyyy-mm-dd) sobre la fecha de corte; vacío = sin límite. */
  periodoDesde: string;
  periodoHasta: string;
}

export const FILTROS_VACIOS: FiltrosPlanAccion = {
  busqueda: '',
  ejes: [],
  estados: [],
  ocultarCompletados: false,
  periodoDesde: '',
  periodoHasta: '',
};

export const hayFiltrosActivos = (f: FiltrosPlanAccion): boolean =>
  !!f.busqueda || f.ejes.length > 0 || f.estados.length > 0 || f.ocultarCompletados ||
  !!f.periodoDesde || !!f.periodoHasta;

/** Fecha de corte: la del último avance reportado; si no hay avances, la fecha fin del indicador. */
export const getFechaCorte = (ind: Indicador): Date => {
  const fechas = (ind.registros ?? [])
    .map(r => new Date(r.fechaRegistro))
    .filter(d => !isNaN(d.getTime()));
  if (fechas.length === 0) return ind.fechaFin;
  return new Date(Math.max(...fechas.map(d => d.getTime())));
};

const aDiaLocal = (iso: string, finDeDia: boolean): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return finDeDia
    ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
    : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
};

export const filtrarIndicadores = (indicadores: Indicador[], f: FiltrosPlanAccion): Indicador[] => {
  const q = f.busqueda.trim().toLowerCase();
  const desde = f.periodoDesde ? aDiaLocal(f.periodoDesde, false) : null;
  const hasta = f.periodoHasta ? aDiaLocal(f.periodoHasta, true) : null;

  return indicadores.filter(i => {
    if (q && !(
      i.codigo.toLowerCase().includes(q) ||
      i.nombre.toLowerCase().includes(q) ||
      i.responsable.toLowerCase().includes(q)
    )) return false;
    if (f.ejes.length > 0 && !f.ejes.includes(i.ejeEstrategico)) return false;
    if (f.estados.length > 0 && !f.estados.includes(i.estado)) return false;
    if (f.ocultarCompletados && i.avance >= 100) return false;
    if (desde !== null || hasta !== null) {
      const corte = getFechaCorte(i).getTime();
      if (desde !== null && corte < desde) return false;
      if (hasta !== null && corte > hasta) return false;
    }
    return true;
  });
};

// ==================== AGRUPACIÓN Y CONSOLIDADOS ====================
export const agruparPorEje = (indicadores: Indicador[]): Record<EjeEstrategico, Indicador[]> => {
  const grupos = {
    GESTION_INSTITUCIONAL: [], TALENTO_HUMANO: [], TRANSPARENCIA: [], TECNOLOGIA: [],
  } as Record<EjeEstrategico, Indicador[]>;
  indicadores.forEach(i => { grupos[i.ejeEstrategico]?.push(i); });
  return grupos;
};

/** Avance consolidado de un eje: promedio simple del avance de sus indicadores. */
export const calcularAvanceConsolidado = (indicadores: Indicador[]): number =>
  indicadores.length === 0
    ? 0
    : Math.round(indicadores.reduce((sum, i) => sum + i.avance, 0) / indicadores.length);

export interface MetricasPlanAccion {
  total: number;
  avancePromedio: number;
  enTiempo: number;
  enRiesgo: number;
  vencidos: number;
}

export const calcularMetricas = (indicadores: Indicador[]): MetricasPlanAccion => ({
  total: indicadores.length,
  avancePromedio: calcularAvanceConsolidado(indicadores),
  enTiempo: indicadores.filter(i => i.estado === 'EN_TIEMPO' || i.estado === 'COMPLETADO').length,
  enRiesgo: indicadores.filter(i => i.estado === 'EN_RIESGO').length,
  vencidos: indicadores.filter(i => i.estado === 'VENCIDO').length,
});

export const MENSAJE_SIN_RESULTADOS = 'No hay indicadores que coincidan con los filtros seleccionados';
