/**
 * Lógica pura del Plan de Acción Institucional (filtros, agrupación, consolidados, semáforo).
 * Vive fuera del componente para poder probarla de forma aislada.
 */

export type EjeEstrategico = string;
export type EstadoIndicador = 'EN_TIEMPO' | 'EN_RIESGO' | 'VENCIDO' | 'COMPLETADO';

export interface EjeEstrategicoConfig {
  id: string;
  nombre: string;
  icono: string;
  descripcion?: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface EjeVisual {
  id: string;
  nombre: string;
  color: string;
  bgColor: string;
  icon: string;
  descripcion: string;
  activo: boolean;
}

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

export const EJE_NOMBRES: Record<string, string> = {
  GESTION_INSTITUCIONAL: 'Gestión Institucional',
  TALENTO_HUMANO: 'Talento Humano',
  TRANSPARENCIA: 'Transparencia',
  TECNOLOGIA: 'Tecnología',
};

export const EJES_VISUALES_DEFAULT: Record<string, EjeVisual> = {
  GESTION_INSTITUCIONAL: {
    id: 'GESTION_INSTITUCIONAL',
    nombre: 'Gestión Institucional',
    color: '#2962FF',
    bgColor: '#E3F2FD',
    icon: '🏛️',
    descripcion: 'Procesos y acciones relacionadas con la administración y gestión institucional',
    activo: true,
  },
  TALENTO_HUMANO: {
    id: 'TALENTO_HUMANO',
    nombre: 'Talento Humano',
    color: '#F57C00',
    bgColor: '#FFF3E0',
    icon: '👥',
    descripcion: 'Desarrollo, bienestar y gestión del talento humano',
    activo: true,
  },
  TRANSPARENCIA: {
    id: 'TRANSPARENCIA',
    nombre: 'Transparencia',
    color: '#00C853',
    bgColor: '#E8F5E9',
    icon: '🔍',
    descripcion: 'Transparencia, acceso a la información y rendición de cuentas',
    activo: true,
  },
  TECNOLOGIA: {
    id: 'TECNOLOGIA',
    nombre: 'Tecnología',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    icon: '💻',
    descripcion: 'Innovación tecnológica y transformación digital',
    activo: true,
  },
};

export const EJES_CONFIG_DEFAULT: EjeEstrategicoConfig[] = [
  { id: 'GESTION_INSTITUCIONAL', nombre: 'Gestión Institucional', icono: '🏛️', descripcion: EJES_VISUALES_DEFAULT.GESTION_INSTITUCIONAL.descripcion, color: '#2962FF', activo: true, orden: 1 },
  { id: 'TALENTO_HUMANO', nombre: 'Talento Humano', icono: '👥', descripcion: EJES_VISUALES_DEFAULT.TALENTO_HUMANO.descripcion, color: '#F57C00', activo: true, orden: 2 },
  { id: 'TRANSPARENCIA', nombre: 'Transparencia', icono: '🔍', descripcion: EJES_VISUALES_DEFAULT.TRANSPARENCIA.descripcion, color: '#00C853', activo: true, orden: 3 },
  { id: 'TECNOLOGIA', nombre: 'Tecnología', icono: '💻', descripcion: EJES_VISUALES_DEFAULT.TECNOLOGIA.descripcion, color: '#9C27B0', activo: true, orden: 4 },
];

/** Normaliza códigos legados del backend manteniendo intactos los ejes personalizados creados por el usuario. */
export const mapEjeFromBackend = (eje?: string | null): string => {
  const limpio = (eje ?? '').trim();
  switch (limpio) {
    case 'GESTION': return 'GESTION_INSTITUCIONAL';
    case 'TALENTO': return 'TALENTO_HUMANO';
    case 'TRANSPARENCIA': return 'TRANSPARENCIA';
    case 'TECNOLOGIA': return 'TECNOLOGIA';
    case '': return 'GESTION_INSTITUCIONAL';
    default: return limpio;
  }
};

/** Convierte al código esperado por el backend preservando ejes personalizados (máx. 50 caracteres). */
export const mapEjeToBackend = (eje?: string | null): string => {
  const limpio = (eje ?? '').trim();
  switch (limpio) {
    case 'GESTION_INSTITUCIONAL': return 'GESTION';
    case 'TALENTO_HUMANO': return 'TALENTO';
    case 'TRANSPARENCIA': return 'TRANSPARENCIA';
    case 'TECNOLOGIA': return 'TECNOLOGIA';
    case '': return 'GESTION';
    default: return limpio.slice(0, 50);
  }
};

/** Genera un fondo suave legible para badges/avatares a partir de cualquier color HEX configurado. */
export const hexToSoftBg = (color?: string): string => {
  const match = /^#?([0-9a-f]{6})$/i.exec((color ?? '').trim());
  if (!match) return '#E3F2FD';
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
};

/** Devuelve los ejes configurados ordenados (con fallback a los 4 iniciales si no hay configuración cargada). */
export const obtenerEjesOrdenados = (
  ejesConfigurados?: EjeEstrategicoConfig[] | null,
  soloActivos = false,
): EjeEstrategicoConfig[] => {
  const base = ejesConfigurados && ejesConfigurados.length > 0
    ? ejesConfigurados
    : EJES_CONFIG_DEFAULT;
  return [...base]
    .filter(e => !soloActivos || e.activo)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
};

/** Resuelve nombre, ícono, color y fondo de un eje desde Configuraciones SIGL (con respaldo para ejes legados/eliminados). */
export const resolverEjeVisual = (
  ejeId: string,
  ejesConfigurados?: EjeEstrategicoConfig[] | null,
): EjeVisual => {
  const normalizado = mapEjeFromBackend(ejeId);
  const encontrado = ejesConfigurados?.find(
    e => e.id === ejeId || e.id === normalizado || mapEjeFromBackend(e.id) === normalizado,
  );
  if (encontrado) {
    const color = encontrado.color?.trim() || '#003DA5';
    return {
      id: encontrado.id,
      nombre: encontrado.nombre?.trim() || encontrado.id,
      color,
      bgColor: hexToSoftBg(color),
      icon: encontrado.icono?.trim() || '🎯',
      descripcion: encontrado.descripcion?.trim() || '',
      activo: encontrado.activo,
    };
  }
  if (EJES_VISUALES_DEFAULT[normalizado]) {
    return EJES_VISUALES_DEFAULT[normalizado];
  }
  return {
    id: normalizado,
    nombre: normalizado,
    color: '#475569',
    bgColor: '#F1F5F9',
    icon: '🎯',
    descripcion: '',
    activo: false,
  };
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
export const agruparPorEje = (
  indicadores: Indicador[],
  ejesOrden?: string[],
): Record<string, Indicador[]> => {
  const grupos: Record<string, Indicador[]> = {};
  const iniciales = ejesOrden ?? EJES;
  iniciales.forEach(eje => {
    grupos[eje] = [];
  });
  indicadores.forEach(i => {
    if (!grupos[i.ejeEstrategico]) {
      grupos[i.ejeEstrategico] = [];
    }
    grupos[i.ejeEstrategico].push(i);
  });
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
