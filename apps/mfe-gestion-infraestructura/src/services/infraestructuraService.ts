export interface Sede {
  idSede: string;
  codigo: string;
  nombre: string;
  tipo: string;
  departamento: string;
  municipio: string;
  direccion: string;
  telefono?: string;
  emailContacto?: string;
  isActivo: boolean;
  alcanceUmi?: boolean;
  bloques?: BloqueEdificio[];
}

export interface BloqueEdificio {
  idBloque: string;
  idSede: string;
  codigo: string;
  nombre: string;
  pisos: number;
  descripcion?: string;
  isActivo: boolean;
  sede?: Sede;
  espacios?: EspacioFisico[];
}

export interface EspacioFisico {
  idEspacio: string;
  idBloque: string;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  piso: number;
  areaM2?: number;
  tieneAireAcondicionado: boolean;
  tieneVideobeam: boolean;
  tieneComputadores: boolean;
  estado: string;
  isActivo: boolean;
  bloque?: BloqueEdificio;
}

export interface CatalogoItem {
  idCatalogo: number;
  catalogo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  isActivo: boolean;
  metadata: Record<string, any>;
}

// Catálogo cross-schema auth.dependencias (usado en formulario radicación mantenimiento como "Área solicitante")
export interface DependenciaCatalogo {
  idDependencia: number;
  codDependencia: string;
  nomDependencia: string;
  idSede: number | null;
  sedeUmiId: string | null;
  sedeCodigo: string | null;
}

// ---------------------------------------------------------------------------
// FASE 4 · REQ. #10: Interfaces Histórico Planner / GLPI
// ---------------------------------------------------------------------------
export interface MantenimientoHistoricoItem {
  idHistorico: string;
  origenSistema: string;
  idTareaExterna: string;
  tituloTarea: string;
  depositoSemana?: string;
  semanaNormalizada?: string;
  estadoOriginal?: string;
  estadoHomologado: string;
  prioridadOriginal?: string;
  fechaCreacion?: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  fechaFinalizacion?: string;
  creadoPorTexto?: string;
  completadoPorTexto?: string;
  asignadoATexto?: string;
  cantidadAsignados: number;
  idSedeHomologada?: string;
  nombreSedeSugerida?: string;
  categoriaSugerida?: string;
  nombreArchivoOrigen: string;
  numeroFilaOrigen?: number;
  cargadoPorNombre?: string;
  fechaIngesta: string;
  metadata?: Record<string, any>;
}

export interface HistoricoListResponse {
  data: MantenimientoHistoricoItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  semanasDisponibles: Array<{ semana: string; cantidad: number }>;
  tecnicosDisponibles?: Array<{ tecnico: string; cantidad: number }>;
  solicitantesDisponibles?: Array<{ solicitante: string; cantidad: number }>;
}

export interface HistoricoEstadisticas {
  totalRegistros: number;
  totalCompletados: number;
  totalSemanas: number;
  totalTecnicos: number;
  rangoFechas: { desde: string | null; hasta: string | null };
  tasaCumplimiento: number;
}

export interface ResumenImportacionHistorico {
  totalFilas: number;
  insertados: number;
  actualizados: number;
  omitidos: number;
  tiempoMs: number;
  archivo: string;
}

export interface SolicitudEvidencia {
  idEvidencia: string;
  idSolicitud?: string;
  nombreOriginal: string;
  nombreAlmacenado: string;
  rutaObjeto: string;
  bucket: string;
  urlPublica?: string;
  urlPresigned?: string;
  vencimientoPresigned?: string;
  mimeType?: string;
  tamanoBytes: number;
  usuarioQueSubioId?: string;
  usuarioQueSubioEmail?: string;
  orden?: number;
  notas?: string;
  fechaSubida: string;
}

export interface SolicitudMantenimiento {
  idSolicitud: string;
  consecutivo: string;
  idEspacio?: string;
  idSede: string;
  tipoMantenimiento: string;
  prioridad: string;
  descripcion: string;
  solicitanteEmail: string;
  solicitanteNombre: string;
  responsableAsignado?: string;
  fechaProgramada?: string;
  fechaEjecucion?: string;
  estado: string;
  observaciones?: string;
  costoEstimado?: number;
  idAreaSolicitante?: string;
  nombreAreaSolicitante?: string;
  piso?: string;
  salon?: string;
  ubicacionDetalle?: string;
  tipoAtencion: string;
  idCategoria?: number;
  idSubcategoria?: number;
  fechaRadicacion?: string;
  fechaLimiteAtencion?: string;
  usuarioSolicitanteId?: string;
  usuarioSolicitanteEmail?: string;
  evidenciaInicialUrl?: string;
  createdAt: string;
  areaResponsableActual?: 'UMI' | 'TI' | 'PENDIENTE_CLASIFICACION';
  remisiones?: Array<Record<string, any>>;
  asignaciones?: HistoricoAsignacionEntry[];
  motivoRechazo?: string | null;
  __meta?: { warning?: string };
  sede?: Sede;
  espacio?: EspacioFisico;
  evidencias?: SolicitudEvidencia[];
  // ----- EFDS-1735 RF-INF-006 -----
  estadoValoracion?: 'NO_APLICA' | 'EN_CURSO' | 'FINALIZADA' | null;
  fechaInicioValoracion?: string | null;
  fechaFinValoracion?: string | null;
  riesgoValoracion?: NivelRiesgoValoracion | null;
  requiereApagadoElectrico?: boolean | null;
  totalEstimadoInsumosCop?: number;
  esperaInsumosFlag?: boolean;
  fechaLimiteOriginalAntesExtension?: string | null;
  diasExtendidosPorInsumos?: number;
  valoraciones?: SolicitudValoracion[];
  // ----- EFDS-1736 RF-INF-007 -----
  fechaCierreTecnico?: string | null;
  usuarioCierreTecnicoId?: string | null;
  responsableCierreDisplay?: string | null;
  evidenciasCierre?: Array<Record<string, any>>;
  costoFinalEfectivoCop?: number;
  trabajoRealizado?: string | null;
  observacionesCierre?: string | null;
  requiereSeguimiento?: boolean;
  // ----- EFDS-1737 RF-INF-008 -----
  fechaConformidad?: string | null;
  usuarioConformidadId?: string | null;
  responsableConformidadDisplay?: string | null;
  resultadoConformidad?: 'CONFIRMADA' | 'SIN_RESPUESTA' | 'RECHAZADA_Y_REABIERTA' | null;
  observacionesConformidad?: string | null;
  fechaLimiteConformidad?: string | null;
  conteoReaperturasConformidad?: number;
  // ----- EFDS-1738 RF-INF-009 -----
  calificacionServicio?: 1 | 2 | 3 | 4 | 5 | null;
  fechaCalificacion?: string | null;
  usuarioCalificacionId?: string | null;
  responsableCalificacionDisplay?: string | null;
  // ----- Fase 3: Reglas de Negocio -----
  clasificacionMantenimiento?: 'MENOR' | 'MAYOR';
  requiereContratacion?: boolean;
  esBienAsignadoFuncionario?: boolean;
  nombreFuncionarioBienAsignado?: string | null;
  placaInventarioBien?: string | null;
  soporteBienAsignadoUrl?: string | null;
  requiereVoBo?: boolean;
  voboAprobado?: boolean | null;
  voboObservaciones?: string | null;
  voboUsuarioId?: string | null;
  voboFecha?: string | null;
}

export interface HistoricoAsignacionEntry {
  id: string;
  fecha: string;
  accion:
    | 'APROBADA_Y_ASIGNADA'
    | 'RECHAZADA'
    | 'REDISTRIBUIDA'
    | 'INICIO_VALORACION'
    | 'FINALIZA_VALORACION_CON_DISPONIBLES'
    | 'FINALIZA_VALORACION_EN_ESPERA'
    | 'EXTENSION_SLA_POR_INSUMOS'
    | 'RECEPCION_MATERIALES_Y_PASO_A_EJECUCION'
    | 'EDICION_VALORACION_POR_ENCARGADO'
    | 'INICIO_EJECUCION_DIRECTA'
    | 'CIERRE_TECNICO'
    | 'CONFORMIDAD_CONFIRMADA'
    | 'CONFORMIDAD_SIN_RESPUESTA'
    | 'CONFORMIDAD_RECHAZADA_Y_REABIERTA'
    | 'VOBO_VALORACION_APROBADO'
    | 'VOBO_VALORACION_OBSERVADO';
  tecnico_codigo: string | null;
  tecnico_nombre_display: string | null;
  motivo: string | null;
  observaciones: string | null;
  clasificacion_mantenimiento?: 'MENOR' | 'MAYOR' | null;
  requiere_contratacion?: boolean | null;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_roles: string | null;
}

// ---------------------------------------------------------------------------
// EFDS-1735 RF-INF-006 Valoración en campo e insumos
// ---------------------------------------------------------------------------

export type UnidadMedidaInsumo = 'un' | 'm' | 'm2' | 'kg' | 'L' | 'cj' | 'paq' | 'rol' | 'glb' | 'otro';
export type DisponibilidadInsumo = 'DISPONIBLE_EN_BODEGA' | 'NO_DISPONIBLE_A_SOLICITAR';
export type NivelRiesgoValoracion = 'BAJO' | 'MEDIO' | 'ALTO';
export type EstadoAlFinalizarValoracion = 'EN_PROGRESO' | 'EN_ESPERA_DE_INSUMOS';

export interface ValoracionInsumo {
  idInsumo?: string;
  idValoracion?: string;
  codigoInsumo?: string;
  nombre: string;
  cantidad: number;
  unidadMedida: UnidadMedidaInsumo;
  costoUnitarioCop?: number;
  subtotalCop?: number;
  disponibilidad: DisponibilidadInsumo;
  tiempoAdquisicionDias?: number;
  ordenItem?: number;
  createdAt?: string;
}

export interface SolicitudValoracion {
  idValoracion: string;
  idSolicitud: string;
  tecnicoCodigoValorador?: string;
  tecnicoNombreValorador?: string;
  idUsuarioValorador?: string;
  estadoAlFinalizar?: EstadoAlFinalizarValoracion;
  diagnostico: string;
  alcanceIdentificado: string;
  tiempoEstimadoHoras: number;
  nivelRiesgo: NivelRiesgoValoracion;
  requiereApagadoElectrico?: boolean | null;
  observaciones?: string;
  evidencias?: SolicitudEvidencia[];
  esVersionCorregidaPorEncargado?: boolean;
  idUsuarioCorrector?: string;
  createdAt?: string;
  updatedAt?: string;
  insumos?: ValoracionInsumo[];
  solicitud?: SolicitudMantenimiento;
}

export interface IniciarValoracionPayload {
  tecnicoCodigoForzado?: string;
}

export interface ValoracionInsumoPayload {
  codigoInsumo?: string;
  nombre: string;
  cantidad: number;
  unidadMedida: UnidadMedidaInsumo;
  costoUnitarioCop?: number;
  disponibilidad: DisponibilidadInsumo;
  tiempoAdquisicionDias?: number;
}

export interface GuardarValoracionCompletaPayload {
  diagnostico: string;
  alcanceIdentificado: string;
  tiempoEstimadoHoras: number;
  nivelRiesgo: NivelRiesgoValoracion;
  requiereApagadoElectrico?: boolean | null;
  observaciones?: string;
  evidencias?: Array<Record<string, any>>;
  insumos: ValoracionInsumoPayload[];
}

export interface ConfirmarRecepcionInsumosPayload {
  observaciones?: string;
}

export interface NotaRecepcionInsumosTecnicoPayload {
  resultado: 'COMPLETA' | 'PARCIAL' | 'OBSERVADA';
  observaciones?: string;
}

export interface EvidenciaCierreFoto {
  name: string;
  size: number;
  type: string;
  url: string;
  bucket?: string;
  key?: string;
}

export interface CierreTecnicoPayload {
  evidencias: EvidenciaCierreFoto[];
  trabajoRealizado: string;
  observaciones?: string;
  costoFinalEfectivoCop: number;
  requiereSeguimiento: boolean;
}

export interface CierreTecnicoResponse {
  cerrado: boolean;
  idSolicitud: string;
  consecutivo?: string;
  fechaCierreTecnico?: string | null;
  usuarioCierreTecnicoId?: string | null;
  responsableCierreDisplay?: string | null;
  trabajoRealizado?: string | null;
  observacionesCierre?: string | null;
  costoFinalEfectivoCop: number;
  evidenciasCierre: EvidenciaCierreFoto[];
  requiereSeguimiento: boolean;
}

// EFDS-1738 RF-INF-009 Calificación servicio consolidados
export interface DistribucionCalificacion {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}
export interface ConsolidadoCalificacionItem {
  tipoGrupo: 'tecnico' | 'categoria' | 'area' | 'global';
  idGrupo: number | string | null;
  nombreGrupo: string;
  numeroCalificaciones: number;
  sumaCalificaciones: number;
  promedio: number;
  distribucion: DistribucionCalificacion;
}

// ===== EFDS-1739 RF-INF-010 Reportes e Indicadores de Gestión =====
export type AreaFiltroReporte = 'UMI' | 'TI' | 'TODAS';
export interface FiltrosReporteGestionParams {
  fechaDesde?: string | Date | null;
  fechaHasta?: string | Date | null;
  idSede?: string | null;
  idCategoria?: number | string | null;
  areaResponsable?: AreaFiltroReporte | string | null;
  codigoTecnico?: string | null;
  estado?: string | null;
}
export interface ReportePeriodoDelta {
  valorActual: number;
  valorAnterior: number;
  variacionAbsoluta: number;
  variacionPorcentual: number;
}
export interface ReporteGestionTotalCasos {
  totalRadicados: ReportePeriodoDelta;
  porEstado: Array<{ estado: string; cantidad: number; porcentaje: number }>;
  porTipoAtencion: Array<{ tipoAtencion: string; cantidad: number; porcentaje: number }>;
}
export interface ReporteGestionPorCategoriaItem {
  idCategoria: number | null;
  codigoCategoria?: string | null;
  nombreCategoria: string;
  radicados: number;
  completados: number;
  enCurso: number;
  vencidos: number;
  promedioCalificacion: number;
  color?: string | null;
}
export interface ReporteGestionPorTecnicoItem {
  codigoTecnico: string | null;
  nombreTecnico: string;
  asignados: number;
  completados: number;
  enCurso: number;
  promedioCalificacion: number;
  cargaVigente: number;
}
export interface ReporteGestionTiemposAtencionItem {
  idCategoria: number | null;
  nombreCategoria: string;
  metaSlaDias: number;
  casosCumplenSLA: number;
  casosExcedenSLA: number;
  porcentajeCumplimiento: number;
  promedioRealDias: number;
}
export interface ReporteGestionPercepcionServicio {
  promedioGlobal: number;
  totalCalificaciones: number;
  porDistribucion: DistribucionCalificacion;
  porCategoria: ConsolidadoCalificacionItem[];
  porTecnico: ConsolidadoCalificacionItem[];
}
export interface ReporteGestionRollupGeograficoItem {
  idSede: string | null;
  nombreSede: string;
  radicados: number;
  completados: number;
  enCurso: number;
  porPiso?: Array<{ piso: string; cantidad: number }>;
}
export interface ReporteGestionDto {
  periodo: {
    fechaDesdeISO: string | null;
    fechaHastaISO: string | null;
    fechaDesdeAnteriorISO: string | null;
    fechaHastaAnteriorISO: string | null;
  };
  totalCasos: ReporteGestionTotalCasos;
  porCategoria: ReporteGestionPorCategoriaItem[];
  porTecnico: ReporteGestionPorTecnicoItem[];
  tiemposAtencionVsMeta: ReporteGestionTiemposAtencionItem[];
  percepcionServicio: ReporteGestionPercepcionServicio;
  rollupGeografico: ReporteGestionRollupGeograficoItem[];
}

export interface CreateMantenimientoPayload {
  idSede: string;
  idEspacio?: string;
  nombreAreaSolicitante: string;
  idAreaSolicitante?: string;
  piso: string;
  salon: string;
  ubicacionDetalle?: string;
  tipoMantenimiento: string;
  descripcion: string;
  evidenciaInicialUrl?: string;
  uploadedEvidenciaIds?: string[];
  prioridad?: string;
  tipoAtencion: 'FISICA' | 'TECNOLOGICA';
  idCategoria?: number;
  idSubcategoria?: number;
  // ===== Fase 3 =====
  esBienAsignadoFuncionario?: boolean;
  nombreFuncionarioBienAsignado?: string;
  placaInventarioBien?: string;
  soporteBienAsignadoUrl?: string;
}

export interface RemitirATIPayload {
  motivo: string;
  consecutivoCruzadoTi?: string;
  canalRemision?: 'EMAIL_SIN_INTEGRAR' | 'MANUAL';
}

export interface CategoriaServicioPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  isActivo?: boolean;
  color?: string;
}

export interface TecnicoMantenimientoPayload {
  codigo: string;
  nombre: string;
  email?: string;
  telefono?: string;
  especialidades?: string[];
  orden?: number;
  isActivo?: boolean;
}

export interface SugerenciaAsignacion {
  regla: 'ESPECIALIZACION' | 'EQUIDAD_DISPONIBILIDAD_CARGA_MENOR' | 'SIN_REGLA';
  idCategoria: number | null;
  sugerido: (CatalogoItem & { cargaVigente?: number }) | null;
  obligatorio: boolean;
  opciones: Array<CatalogoItem & { cargaVigente?: number }>;
  advertencia?: string;
}

export interface AprobarAsignarPayload {
  tecnicoCodigo?: string | null;
  idTecnicoAsignado?: string | null;
  observaciones?: string | null;
  clasificacionMantenimiento?: 'MENOR' | 'MAYOR';
  requiereContratacion?: boolean;
}

export interface RechazarPayload {
  motivo: string;
  observaciones?: string | null;
}

export interface RedistribuirPayload {
  tecnicoCodigo?: string;
  idTecnicoAsignado?: string | null;
  motivoRedistribucion?: string | null;
  observaciones?: string | null;
}

export interface EstadisticasInfraestructura {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  reservadas: number;
  porcentajeOcupacion: number;
}

export function clasificarSLA(fechaLimiteISO?: string | number | Date | null):
  | { clase: 'vencido' | 'alerta' | 'ok' | 'sin'; horasRestantes: number | null; texto: string } {
  if (!fechaLimiteISO) return { clase: 'sin', horasRestantes: null, texto: 'Sin fecha límite' };
  const ms = new Date(fechaLimiteISO as any).getTime();
  if (!isFinite(ms)) return { clase: 'sin', horasRestantes: null, texto: 'Fecha inválida' };
  const diff = ms - Date.now();
  const horas = diff / (1000 * 60 * 60);
  if (horas < 0) {
    const h = Math.round(-1 * horas);
    return { clase: 'vencido', horasRestantes: Math.round(horas), texto: `Vencida · ${h} h` };
  }
  if (horas <= 24) return { clase: 'alerta', horasRestantes: Math.round(horas), texto: `Urgente · ≤24 h (${Math.round(horas)} h)` };
  if (horas <= 48) return { clase: 'alerta', horasRestantes: Math.round(horas), texto: `Próximo · ≤48 h (${Math.round(horas)} h)` };
  return { clase: 'ok', horasRestantes: Math.round(horas), texto: `Dentro plazo · ${Math.round(horas)} h` };
}

export interface SesionUsuarioUMI {
  userId: string | null;
  email: string | null;
  username: string | null;
  roles: string[];
  permissions: string[];
}

const normPerm = (s: unknown): string =>
  String(s ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

const FE_GRUPOS: Record<string, string[]> = {
  INFRA_GLOBAL_ASSIGN_REJECT_REDIST_CONF_REPORTES: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.VIEW_ALL',
    'INFRAESTRUCTURA.VIEW_ALL_TI',
    'INFRAESTRUCTURA.SOLICITUD.CREATE',
    'INFRAESTRUCTURA.SOLICITUD.READ',
    'INFRAESTRUCTURA.SOLICITUD.EDIT',
    'INFRAESTRUCTURA.SOLICITUD.ASSIGN',
    'INFRAESTRUCTURA.SOLICITUD.REJECT',
    'INFRAESTRUCTURA.SOLICITUD.REDISTRIBUTE',
    'INFRAESTRUCTURA.SOLICITUD.FORWARD_TI',
    'INFRAESTRUCTURA.SOLICITUD.CONFORMIDAD',
    'INFRAESTRUCTURA.SOLICITUD.CALIFICACION',
    'INFRAESTRUCTURA.REPORTES.CONSOLIDADOS',
    'INFRAESTRUCTURA.REPORTES.GESTION',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
  INFRA_GLOBAL_REPORTES_CONF_CIERRE_PARAM: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.SOLICITUD.READ',
    'INFRAESTRUCTURA.SOLICITUD.AUTHORIZE_SPECIAL_CATEGORIES',
    'INFRAESTRUCTURA.PARAM.CATEGORIES_CRUD',
    'INFRAESTRUCTURA.PARAM.RULES_EDIT',
    'INFRAESTRUCTURA.PARAM.SLA_TIMES_EDIT',
    'INFRAESTRUCTURA.PARAM.TECHNICIANS_CRUD',
    'INFRAESTRUCTURA.PARAM.APPROVE_CONFIG',
    'INFRAESTRUCTURA.REPORTES.GESTION',
    'INFRAESTRUCTURA.ESTADISTICAS.CALIFICACIONES.CONSOLIDADAS',
    'INFRAESTRUCTURA.REPORTING.EXPORT_EXCEL',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
  INFRA_GLOBAL_ASSIGN_REJECT_REDIST_CONF: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.VIEW_ALL',
    'INFRAESTRUCTURA.VIEW_ALL_TI',
    'INFRAESTRUCTURA.SOLICITUD.CREATE',
    'INFRAESTRUCTURA.SOLICITUD.READ',
    'INFRAESTRUCTURA.SOLICITUD.EDIT',
    'INFRAESTRUCTURA.SOLICITUD.ASSIGN',
    'INFRAESTRUCTURA.SOLICITUD.REJECT',
    'INFRAESTRUCTURA.SOLICITUD.REDISTRIBUTE',
    'INFRAESTRUCTURA.SOLICITUD.FORWARD_TI',
    'INFRAESTRUCTURA.SOLICITUD.CONFORMIDAD',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
  INFRA_SOLICITUD_CIERRE_TECNICO_VALORACION_EJECUCION: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.SOLICITUD.READ',
    'INFRAESTRUCTURA.SOLICITUD.READ_ASSIGNED',
    'INFRAESTRUCTURA.SOLICITUD.EXECUTE_ASSIGNED',
    'INFRAESTRUCTURA.SOLICITUD.CIERRE_TECNICO',
    'INFRAESTRUCTURA.SOLICITUD.CLOSE_WITH_EVIDENCE',
    'INFRAESTRUCTURA.SOLICITUD.READ_REJECTION_REASON_OWN',
  ],
  INFRA_SOLICITUD_CREATE_READ_CALIFICACION_CONF_MIASIGNADOR: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.SOLICITUD.CREATE',
    'INFRAESTRUCTURA.SOLICITUD.READ_OWN',
    'INFRAESTRUCTURA.SOLICITUD.READ_REJECTION_REASON_OWN',
    'INFRAESTRUCTURA.SOLICITUD.CONFIRM_CLOSE_OWN',
    'INFRAESTRUCTURA.SOLICITUD.RATE_CLOSE_OWN',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
  INFRA_REPORTES_CONSOLIDADOS_GESTION_TRAZABILIDAD: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.VIEW_ALL',
    'INFRAESTRUCTURA.VIEW_ALL_TI',
    'INFRAESTRUCTURA.SOLICITUD.READ',
    'INFRAESTRUCTURA.REPORTES.CONSOLIDADOS',
    'INFRAESTRUCTURA.REPORTES.GESTION',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
  INFRA_PARAM_ALL_CRU: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.PARAM.CATEGORIES_CRU',
    'INFRAESTRUCTURA.PARAM.SLA_CRU',
    'INFRAESTRUCTURA.PARAM.TECNICOS_CRU',
    'INFRAESTRUCTURA.PARAM.REGLAS_CRU',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
  INFRA_ANALISTA_ASIGNADOR_OPERATIVO: [
    'INFRAESTRUCTURA.VIEW',
    'INFRAESTRUCTURA.SOLICITUD.CREATE',
    'INFRAESTRUCTURA.SOLICITUD.READ',
    'INFRAESTRUCTURA.SOLICITUD.READ_ALL',
    'INFRAESTRUCTURA.SOLICITUD.READ_TI',
    'INFRAESTRUCTURA.SOLICITUD.ASSIGN',
    'INFRAESTRUCTURA.SOLICITUD.REJECT',
    'INFRAESTRUCTURA.SOLICITUD.REDISTRIBUTE',
    'INFRAESTRUCTURA.SOLICITUD.FORWARD_TI',
    'INFRAESTRUCTURA.SOLICITUD.CONFIRM_CLOSE_OWN',
    'INFRAESTRUCTURA.SOLICITUD.READ_AUDIT_HISTORY_ANY',
    'INFRAESTRUCTURA.REPORTES.GESTION',
    'INFRAESTRUCTURA.AUDIT.TRAZABILIDAD',
  ],
};

const FE_LEGACY_MAP: Record<string, string[]> = {
  SUPER_ADMIN: ['__ALL__'],
  ADMIN: ['INFRA_GLOBAL_ASSIGN_REJECT_REDIST_CONF_REPORTES'],
  GESTOR_MANTENIMIENTO: ['INFRA_GLOBAL_ASSIGN_REJECT_REDIST_CONF_REPORTES'],
  ADMINISTRADOR_FUNCIONAL: ['INFRA_GLOBAL_REPORTES_CONF_CIERRE_PARAM'],
  ADMINISTRADOR_FUNCIONAL_INFRA: ['INFRA_GLOBAL_REPORTES_CONF_CIERRE_PARAM'],
  COORDINADOR_INFRAESTRUCTURA: ['INFRA_GLOBAL_REPORTES_CONF_CIERRE_PARAM'],
  UMI: ['INFRA_GLOBAL_ASSIGN_REJECT_REDIST_CONF'],
  INFRAESTRUCTURA: ['INFRA_GLOBAL_ASSIGN_REJECT_REDIST_CONF'],
  TECNICO_UMI: ['INFRA_SOLICITUD_CIERRE_TECNICO_VALORACION_EJECUCION'],
  USER: ['INFRA_SOLICITUD_CREATE_READ_CALIFICACION_CONF_MIASIGNADOR'],
  SOLICITANTE_INFRA: ['INFRA_SOLICITUD_CREATE_READ_CALIFICACION_CONF_MIASIGNADOR'],
  ANALISTA_ASIGNADOR_UMI: ['INFRA_ANALISTA_ASIGNADOR_OPERATIVO'],
  TECNICO_ELECTRICO_ESPECIALIZADO: ['INFRA_SOLICITUD_CIERRE_TECNICO_VALORACION_EJECUCION'],
  TECNICO_UMI_MULTIPROPOSITO: ['INFRA_SOLICITUD_CIERRE_TECNICO_VALORACION_EJECUCION'],
  CONSULTA_CALIDAD_INFRA: ['INFRA_REPORTES_CONSOLIDADOS_GESTION_TRAZABILIDAD'],
  ADMINISTRADOR_MODULO_INFRA: ['INFRA_PARAM_ALL_CRU'],
};

export const hasPerm = (
  ses: SesionUsuarioUMI | null | undefined,
  codigoPermiso: string | string[] | null | undefined,
): boolean => {
  if (!ses || !codigoPermiso) return false;
  const codigos = Array.isArray(codigoPermiso) ? codigoPermiso : [codigoPermiso];
  if (codigos.length === 0) return false;
  const rolesNorm = (ses.roles ?? []).map(normPerm);
  if (rolesNorm.includes('SUPER_ADMIN')) return true;
  const perms = new Set((ses.permissions ?? []).map(normPerm).filter(Boolean));
  const legacySet = new Set<string>();
  for (const rol of rolesNorm) {
    const grupos = FE_LEGACY_MAP[rol] || [];
    for (const g of grupos) {
      if (g === '__ALL__') {
        for (const list of Object.values(FE_GRUPOS)) for (const p of list) legacySet.add(normPerm(p));
      } else {
        const list = FE_GRUPOS[g] || [];
        for (const p of list) legacySet.add(normPerm(p));
      }
    }
  }
  for (const raw of codigos) {
    const needle = normPerm(raw);
    if (!needle) continue;
    if (perms.has(needle) || legacySet.has(needle)) return true;
  }
  return false;
};

const extraerCodigosPermisosDeObjeto = (obj: any): string[] => {
  if (obj == null) return [];
  if (Array.isArray(obj)) return obj.map((x) => String(x)).filter(Boolean);
  if (typeof obj !== 'object') return [];
  if (Array.isArray((obj as any).codes)) return (obj as any).codes.map((x: any) => String(x)).filter(Boolean);
  if (Array.isArray((obj as any).data)) return extraerCodigosPermisosDeObjeto((obj as any).data);
  if (Array.isArray((obj as any).permissions)) return extraerCodigosPermisosDeObjeto((obj as any).permissions);
  if (typeof (obj as any).code === 'string') return [(obj as any).code];
  if (typeof (obj as any).permission === 'string') return [(obj as any).permission];
  return [];
};

const leerCookie = (nombre: string): string | null => {
  if (typeof document === 'undefined') return null;
  const partes = `; ${document.cookie}`.split(`; ${nombre}=`);
  if (partes.length !== 2) return null;
  const valor = partes.pop()?.split(';').shift();
  return typeof valor === 'string' ? decodeURIComponent(valor) : null;
};

const urlB64Decode = (s: string): string => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob !== 'undefined') return atob(b64);
  const buf = Buffer.from(b64, 'base64');
  return buf.toString('utf-8');
};

export const obtenerSesionUMI = (): SesionUsuarioUMI => {
  const vacio: SesionUsuarioUMI = { userId: null, email: null, username: null, roles: [], permissions: [] };
  if (typeof window !== 'undefined') {
    const cache = (window as any).__esap_auth_cache;
    if (cache && typeof cache === 'object') {
      const userObj = (cache?.user && typeof cache.user === 'object') ? cache.user : cache;
      const userId: string | null =
        typeof userObj?.id_user === 'string' && userObj.id_user.length > 2 ? userObj.id_user
        : typeof userObj?.userId === 'string' ? userObj.userId
        : typeof userObj?.id === 'string' ? userObj.id
        : typeof userObj?.sub === 'string' ? userObj.sub
        : typeof cache?.id_user === 'string' ? cache.id_user
        : typeof cache?.sub === 'string' ? cache.sub
        : null;
      const email: string | null =
        typeof userObj?.email === 'string' && userObj.email.includes('@') ? userObj.email
        : typeof userObj?.person?.email === 'string' ? userObj.person.email
        : typeof userObj?.mail === 'string' ? userObj.mail
        : typeof cache?.email === 'string' ? cache.email
        : null;
      const username: string | null =
        typeof userObj?.fullName === 'string' && userObj.fullName ? userObj.fullName
        : typeof userObj?.full_name === 'string' ? userObj.full_name
        : typeof userObj?.name === 'string' ? userObj.name
        : (userObj?.person && (userObj.person.first_name || userObj.person.last_name))
          ? `${userObj.person.first_name ?? ''} ${userObj.person.last_name ?? ''}`.trim()
          : typeof userObj?.username === 'string' ? userObj.username
          : email ? email.split('@')[0] : null;
      let roles: string[] = [];
      if (Array.isArray(cache?.roles)) roles = cache.roles;
      else if (Array.isArray(userObj?.roles)) roles = userObj.roles;
      if (roles.length > 0 && typeof roles[0] !== 'string') {
        roles = roles
          .map((role: any) => typeof role === 'string' ? role : role?.code || role?.name || '')
          .filter(Boolean) as string[];
      }
      let permissions: string[] = [];
      if (Array.isArray(cache?.permissions)) permissions = cache.permissions as string[];
      else if (Array.isArray(userObj?.permissions)) permissions = userObj.permissions as string[];
      else if (userObj?.permissions != null) permissions = extraerCodigosPermisosDeObjeto(userObj.permissions);
      if (cache?.permissions != null && !Array.isArray(cache.permissions)) {
        permissions = Array.from(new Set([...permissions, ...extraerCodigosPermisosDeObjeto(cache.permissions)]));
      }
      return {
        userId,
        email,
        username,
        roles: Array.isArray(roles) ? roles.filter((r: any) => typeof r === 'string' && r.length > 0) : [],
        permissions: permissions.filter((p: any) => typeof p === 'string' && p.length > 0),
      };
    }
  }
  const token = leerCookie('esap_access_token') || '';
  if (!token) return vacio;
  try {
    const partes = token.split('.');
    if (partes.length < 2) return vacio;
    const payload = JSON.parse(urlB64Decode(partes[1]));
    const userId: string | null =
      typeof payload?.sub === 'string' && payload.sub.length > 2 ? payload.sub
      : typeof payload?.userId === 'string' ? payload.userId
      : typeof payload?.id_user === 'string' ? payload.id_user
      : typeof payload?.idUser === 'string' ? payload.idUser
      : null;
    const email: string | null =
      typeof payload?.email === 'string' && payload.email.includes('@') ? payload.email
      : typeof payload?.username === 'string' && payload.username.includes('@') ? payload.username
      : typeof payload?.mail === 'string' ? payload.mail
      : null;
    const username: string | null =
      typeof payload?.username === 'string' ? payload.username
      : typeof payload?.preferred_username === 'string' ? payload.preferred_username
      : email ? email.split('@')[0] : null;
    let roles: string[] = [];
    if (Array.isArray(payload?.roles)) roles = payload.roles as string[];
    else if (Array.isArray(payload?.authorities)) roles = payload.authorities as string[];
    else if (typeof payload?.realm_access?.roles !== 'undefined' && Array.isArray(payload.realm_access.roles))
      roles = payload.realm_access.roles as string[];
    else if (typeof payload?.rol === 'string') roles = [payload.rol];
    let permissions: string[] = [];
    if (Array.isArray(payload?.permissions)) permissions = payload.permissions as string[];
    else if (Array.isArray(payload?.perm_codes)) permissions = payload.perm_codes as string[];
    else if (payload?.scope && typeof payload.scope === 'string') permissions = payload.scope.split(/\s+/).filter(Boolean);
    else if (payload?.permissions != null) permissions = extraerCodigosPermisosDeObjeto(payload.permissions);
    return {
      userId,
      email,
      username,
      roles: Array.isArray(roles) ? (roles as any[]).filter((r: any) => typeof r === 'string' && r.length > 0) : [],
      permissions: permissions.filter((p: any) => typeof p === 'string' && p.length > 0),
    };
  } catch {
    return vacio;
  }
};

const extraerCodigoTecnicoDeResponsable = (responsableAsignado: string): string | null => {
  const s = String(responsableAsignado || '').trim();
  if (!s) return null;
  const m = s.match(/TEC[-_][A-Za-z0-9]+[-_][A-Za-z0-9]+/);
  if (m && m[0]) return m[0].toUpperCase();
  return null;
};

const catalogoTecnicosCache: { ts: number; data: CatalogoItem[] } = { ts: 0, data: [] };
const TECNICOS_CACHE_MS = 2 * 60 * 1000;
const obtenerCatalogoTecnicosUMI = async (): Promise<CatalogoItem[]> => {
  const ahora = Date.now();
  if (ahora - catalogoTecnicosCache.ts < TECNICOS_CACHE_MS && catalogoTecnicosCache.data.length > 0) {
    return catalogoTecnicosCache.data;
  }
  try {
    const lista = await infraestructuraService.getTecnicos(false);
    const safe = Array.isArray(lista) ? lista : [];
    if (safe.length > 0) {
      catalogoTecnicosCache.ts = ahora;
      catalogoTecnicosCache.data = safe;
    } else if (catalogoTecnicosCache.data.length > 0) {
      catalogoTecnicosCache.ts = ahora;
    }
    return safe.length > 0 ? safe : catalogoTecnicosCache.data;
  } catch {
    return catalogoTecnicosCache.data;
  }
};

export const tecnicoPerteneceASesionUMI = (tecnico: CatalogoItem, ses: SesionUsuarioUMI): boolean => {
  const norm = (s: any): string => String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toLowerCase();
  const md = (tecnico?.metadata && typeof tecnico.metadata === 'object') ? (tecnico.metadata as Record<string, any>) : {};
  const correos: string[] = Array.isArray(md.correos) ? (md.correos as string[]) : [];
  if (typeof md.email === 'string' && md.email && !correos.includes(md.email)) correos.push(md.email);
  if (typeof md.correo === 'string' && md.correo && !correos.includes(md.correo)) correos.push(md.correo);
  const idsUsuarios: string[] = Array.isArray(md.usuarioIdsAutorizados) ? (md.usuarioIdsAutorizados as string[]) : [];
  if (typeof md.usuarioIdAutorizado === 'string' && md.usuarioIdAutorizado && !idsUsuarios.includes(md.usuarioIdAutorizado)) {
    idsUsuarios.push(md.usuarioIdAutorizado);
  }
  const nombresAutorizados: string[] = Array.isArray(md.usuariosAutorizados) ? (md.usuariosAutorizados as string[]) : [];
  const normSesEmail = norm(ses.email?.split('@')[0]);
  const normSesUserId = norm(ses.userId);
  const normSesUsername = norm(ses.username);
  const normNombreTec = norm(tecnico?.nombre);
  const splitNombre = String(tecnico?.nombre ?? '').split('·').map(p => p.trim());
  const normNombreSolo = splitNombre.length > 1 ? norm(splitNombre[splitNombre.length - 1]) : normNombreTec;
  if (ses.email) {
    const needle = ses.email.trim().toLowerCase();
    if (needle && correos.some((c) => typeof c === 'string' && c.trim().toLowerCase() === needle)) return true;
    if (normSesEmail && normNombreSolo && normNombreSolo.includes(normSesEmail)) return true;
    if (normSesEmail && normNombreTec && normNombreTec.includes(normSesEmail)) return true;
    const nombreDisplay = String(tecnico?.nombre || '').trim().toLowerCase();
    if (nombreDisplay && needle && (nombreDisplay.includes(needle.replace(/@.*$/, '')) ||
      needle.replace(/@.*$/, '').length >= 4 && nombreDisplay.includes(needle.replace(/@.*$/, '')))) {
      return true;
    }
  }
  if (ses.userId) {
    const needle = ses.userId.trim().toLowerCase();
    if (needle && idsUsuarios.some((u) => typeof u === 'string' && u.trim().toLowerCase() === needle)) return true;
    if (normSesUserId && normNombreTec.includes(normSesUserId)) return true;
  }
  if (ses.username) {
    const needle = ses.username.trim().toLowerCase();
    if (needle) {
      const nU = norm(needle);
      if (nU && (normNombreTec === nU || normNombreTec.includes(nU) || nU.includes(normNombreTec))) return true;
      if (nU && normNombreSolo && (normNombreSolo === nU || normNombreSolo.includes(nU) || nU.includes(normNombreSolo))) return true;
      const nombreDisplay = String(tecnico?.nombre || '').trim().toLowerCase();
      if (nombreDisplay && (nombreDisplay === needle || nombreDisplay.includes(needle) || needle.includes(nombreDisplay))) return true;
      if (nombresAutorizados.some((u) => typeof u === 'string' && norm(u) === nU)) return true;
    }
  }
  if (ses.email && correos.length === 0) {
    if (normSesEmail && normSesEmail.length >= 4 && normNombreSolo.includes(normSesEmail)) return true;
    if (normSesEmail && normSesEmail.length >= 4 && normNombreTec.includes(normSesEmail)) return true;
    const nombre = String(tecnico?.nombre || '').trim().toLowerCase();
    const mail = ses.email.trim().toLowerCase().replace(/@.*$/, '');
    if (mail.length >= 4 && nombre.includes(mail)) return true;
  }
  if (normSesUsername && normSesUsername.length >= 4 && normNombreSolo.includes(normSesUsername)) return true;
  if (nombresAutorizados.length > 0) {
    const needles = new Set([normSesUsername, normSesEmail, norm(ses.username)]);
    for (const autorizado of nombresAutorizados) {
      const nA = norm(autorizado);
      if (!nA) continue;
      if (needles.has(nA)) return true;
      for (const n of needles) if (n && (nA.includes(n) || n.includes(nA))) return true;
    }
  }
  return false;
};

export const solicitudAsignadaAUsuarioUMI = async (
  s: SolicitudMantenimiento,
  ses: SesionUsuarioUMI,
  catalogoTecnicosOpt?: CatalogoItem[],
): Promise<boolean> => {
  const resp = String(s.responsableAsignado || '').trim().toLowerCase();
  if (!resp) return false;
  if (ses.email && resp.includes(String(ses.email).toLowerCase())) return true;
  if (ses.userId && resp.includes(String(ses.userId).toLowerCase())) return true;
  if (ses.username && resp.includes(String(ses.username).toLowerCase())) return true;
  const nombreSesion =
    (ses.email ? ses.email.split('@')[0].toLowerCase() : '') ||
    (ses.username ? ses.username.toLowerCase() : '');
  if (nombreSesion.length >= 4 && resp.includes(nombreSesion)) return true;
  const codTecnico = extraerCodigoTecnicoDeResponsable(s.responsableAsignado || '');
  if (!codTecnico) return false;
  let tecnicos: CatalogoItem[] = Array.isArray(catalogoTecnicosOpt) ? catalogoTecnicosOpt : [];
  if (tecnicos.length === 0) {
    try {
      tecnicos = await obtenerCatalogoTecnicosUMI();
    } catch {
      tecnicos = [];
    }
  }
  if (tecnicos.length === 0) return false;
  const tecnico = tecnicos.find((t) => (t.codigo || '').toUpperCase() === codTecnico);
  if (!tecnico) return false;
  return tecnicoPerteneceASesionUMI(tecnico, ses);
};

export const listarCodigosTecnicosDeSesionUMI = async (
  ses: SesionUsuarioUMI,
  catalogoTecnicosOpt?: CatalogoItem[],
): Promise<string[]> => {
  let tecnicos: CatalogoItem[] = Array.isArray(catalogoTecnicosOpt) ? catalogoTecnicosOpt : [];
  if (tecnicos.length === 0) {
    try {
      tecnicos = await obtenerCatalogoTecnicosUMI();
    } catch {
      tecnicos = [];
    }
  }
  const out: string[] = [];
  for (const t of tecnicos) {
    if (tecnicoPerteneceASesionUMI(t, ses)) {
      const c = (t.codigo || '').trim().toUpperCase();
      if (c) out.push(c);
    }
  }
  return out;
};

const GATEWAY_BASE: string = (typeof window !== 'undefined' && (window as any).__ESAP_CONFIG__?.API_URL)
  ? (window as any).__ESAP_CONFIG__.API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:4000' : '/services');

const API_BASE_URL = `${GATEWAY_BASE}/infraestructura/api/v1`;

function notificarEventoFrontend(accion: string, idSolicitud?: string, extra?: any) {
  if (typeof window !== 'undefined') {
    console.log(
      `%c[NOTIFICACIONES_DEV][MANTENIMIENTO] 🚀 Evento "${accion}" procesado con éxito${idSolicitud ? ` (Solicitud: ${idSolicitud})` : ''}`,
      'color: #2563eb; font-weight: bold;',
      extra || ''
    );
    window.dispatchEvent(new CustomEvent('esap:refresh-notifications'));
  }
}

export type NombreCatalogo = 'TIPO_MANTENIMIENTO' | 'PRIORIDAD' | 'TIPO_ATENCION' | 'ESTADO_SOLICITUD' | 'CATEGORIA_SERVICIO';

export const infraestructuraService = {
  async getCatalogo(nombre: NombreCatalogo): Promise<CatalogoItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/catalogos/${nombre}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener catálogo ${nombre} (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getCatalogo(${nombre}) falló:`, err);
      return [];
    }
  },

  async getSedes(): Promise<Sede[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/sedes`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener sedes (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getSedes fallback a lista vacía:', err);
      return [];
    }
  },

  async getEspacios(params?: { idBloque?: string; tipo?: string; estado?: string }): Promise<EspacioFisico[]> {
    try {
      const q = new URLSearchParams();
      if (params?.idBloque) q.append('idBloque', params.idBloque);
      if (params?.tipo) q.append('tipo', params.tipo);
      if (params?.estado) q.append('estado', params.estado);
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/espacios${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener espacios (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getEspacios fallback a lista vacía:', err);
      return [];
    }
  },

  async getEstadisticas(): Promise<EstadisticasInfraestructura> {
    try {
      const res = await fetch(`${API_BASE_URL}/espacios/estadisticas`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener estadísticas (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getEstadisticas fallback a default:', err);
      return {
        total: 0,
        disponibles: 0,
        enMantenimiento: 0,
        reservadas: 0,
        porcentajeOcupacion: 0,
      };
    }
  },

  async getMantenimientos(params?: { incluirTI?: boolean; estado?: string; prioridad?: string; idCategoria?: number }): Promise<SolicitudMantenimiento[]> {
    try {
      const q = new URLSearchParams();
      if (params?.incluirTI === true) q.append('incluirTI', 'true');
      if (params?.estado) q.append('estado', params.estado);
      if (params?.prioridad) q.append('prioridad', params.prioridad);
      if (Number.isInteger(params?.idCategoria)) q.append('idCategoria', String(params?.idCategoria));
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener mantenimientos');
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getMantenimientos falló, retornando []:', err);
      return [];
    }
  },

  async getRemisiones(idSolicitud: string): Promise<Array<Record<string, any>>> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/remisiones`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error al obtener remisiones (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getRemisiones(${idSolicitud}):`, err);
      return [];
    }
  },

  async remitirATI(idSolicitud: string, payload: RemitirATIPayload): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/remitir-a-ti`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let mensaje = 'Error al remitir a TI';
      try {
        const errorBody = await res.json();
        if (errorBody?.message) {
          mensaje = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : String(errorBody.message);
        }
      } catch {}
      throw new Error(mensaje);
    }
    return await res.json();
  },

  async getMantenimientoById(idSolicitud: string): Promise<SolicitudMantenimiento | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}`, {
        credentials: 'include',
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Error al obtener detalle (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getMantenimientoById(${idSolicitud}):`, err);
      return null;
    }
  },

  async getMisSolicitudes(): Promise<SolicitudMantenimiento[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/mis-solicitudes`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error al obtener mis solicitudes');
      return await res.json();
    } catch (err) {
      console.warn('No se pudieron cargar mis solicitudes (sin sesion o endpoint indisponible). Retornando placeholder.', err);
      return [];
    }
  },

  async createMantenimiento(payload: CreateMantenimientoPayload): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let mensaje = 'Error al radicar la solicitud';
      try {
        const errorBody = await res.json();
        if (errorBody?.message) {
          mensaje = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : String(errorBody.message);
        }
      } catch {
        // Ignorar error de parseo del body
      }
      throw new Error(mensaje);
    }
    const data = await res.json();
    notificarEventoFrontend('RADICACION_SOLICITUD', data.idSolicitud, data);
    return data;
  },

  async uploadEvidencia(
    file: File,
    opts?: { onProgress?: (porcentaje: number) => void; idSolicitud?: string; orden?: number; notas?: string },
  ): Promise<SolicitudEvidencia> {
    return new Promise<SolicitudEvidencia>((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      if (opts?.idSolicitud) form.append('idSolicitud', opts.idSolicitud);
      if (opts?.orden != null) form.append('orden', String(opts.orden));
      if (opts?.notas) form.append('notas', opts.notas);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/mantenimiento/evidencias/upload`, true);
      xhr.withCredentials = true;
      const token = leerCookie('esap_access_token') || (typeof window !== 'undefined' ? ((window as any).__esap_auth_cache?.token || (window as any).__esap_auth_cache?.access_token) : null);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      if (opts?.onProgress && xhr.upload) {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const p = Math.round((ev.loaded / ev.total) * 100);
            opts.onProgress?.(p);
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as SolicitudEvidencia);
          } catch (err) {
            reject(new Error('Respuesta inválida al subir evidencia'));
          }
        } else {
          let mensaje = `Error al subir evidencia (${xhr.status})`;
          try {
            const errorBody = JSON.parse(xhr.responseText);
            if (errorBody?.message) {
              mensaje = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : String(errorBody.message);
            }
          } catch {
            // ignore
          }
          reject(new Error(mensaje));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red al subir evidencia'));
      xhr.send(form);
    });
  },

  async getEvidenciasBySolicitud(idSolicitud: string): Promise<SolicitudEvidencia[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${idSolicitud}/evidencias`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener evidencias (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getEvidenciasBySolicitud(${idSolicitud}):`, err);
      return [];
    }
  },

  async getCategoriasServicio(opts?: { soloActivos?: boolean }): Promise<CatalogoItem[]> {
    try {
      const q = new URLSearchParams();
      if (opts?.soloActivos === true) q.append('soloActivos', 'true');
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Listar categorías ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[getCategoriasServicio] falló:', err);
      return [];
    }
  },

  // Catálogo dependencias/áreas solicitantes desde auth.dependencias (cross-schema).
  // Reemplaza el input de texto libre en NuevaSolicitudForm. Nunca cachear arrays vacíos.
  async getDependenciasCatalogo(): Promise<DependenciaCatalogo[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/catalogos/dependencias`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Listar dependencias ${res.status}`);
      const data = (await res.json()) as DependenciaCatalogo[];
      return Array.isArray(data) && data.length > 0 ? data : [];
    } catch (err) {
      console.warn('[getDependenciasCatalogo] falló:', err);
      return [];
    }
  },

  async crearCategoriaServicio(payload: CategoriaServicioPayload): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando categoría';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarCategoriaServicio(idCatalogo: number, payload: Partial<CategoriaServicioPayload>): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando categoría';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleCategoriaServicio(idCatalogo: number): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio/${encodeURIComponent(String(idCatalogo))}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Toggle categoría falló');
    return await res.json();
  },

  async eliminarCategoriaServicio(idCatalogo: number): Promise<{ idCatalogo: number; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Eliminar categoría falló');
    return await res.json();
  },

  async getSedesAlcanceUMI(): Promise<Sede[]> {
    const todas = await this.getSedes();
    const conBandera = todas.filter((s) => s.isActivo && s.alcanceUmi === true);
    if (conBandera.length > 0) {
      return conBandera;
    }
    return todas.filter(
      (s) => s.isActivo && (s.tipo === 'SEDE_CENTRAL' || s.tipo === 'SEDE_ALTERNA'),
    );
  },

  async getJerarquiaSedesDemo(): Promise<{
    sedesActuales: any[];
    territorialesNacionales: any[];
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sedes/jerarquia-completa`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] getJerarquiaSedesDemo falló:', err);
      return { sedesActuales: [], territorialesNacionales: [] };
    }
  },

  async crearSede(payload: Partial<Sede> & { codigo: string; nombre: string; departamento: string; municipio: string; direccion: string }): Promise<Sede> {
    const res = await fetch(`${API_BASE_URL}/sedes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando la sede';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarSede(idSede: string, payload: Partial<Sede>): Promise<Sede> {
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando la sede';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleSedeActiva(idSede: string): Promise<Sede> {
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Activar/desactivar sede falló');
    return await res.json();
  },

  async eliminarSede(idSede: string): Promise<{ idSede: string; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error eliminando la sede';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async crearEspacio(payload: Partial<EspacioFisico> & { idBloque: string; codigo: string; nombre: string; tipo: string }): Promise<EspacioFisico> {
    const res = await fetch(`${API_BASE_URL}/espacios`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando el espacio físico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarEspacio(idEspacio: string, payload: Partial<EspacioFisico>): Promise<EspacioFisico> {
    const res = await fetch(`${API_BASE_URL}/espacios/${encodeURIComponent(idEspacio)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando el espacio físico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleEspacioActivo(idEspacio: string): Promise<EspacioFisico> {
    const res = await fetch(`${API_BASE_URL}/espacios/${encodeURIComponent(idEspacio)}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Activar/desactivar espacio falló');
    return await res.json();
  },

  async eliminarEspacio(idEspacio: string): Promise<{ idEspacio: string; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/espacios/${encodeURIComponent(idEspacio)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error eliminando el espacio';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // Bloques / Edificios por sede (EFDS 1732)
  // ---------------------------------------------------------------------------
  async getBloquesPorSede(idSede: string, soloActivos: boolean = true): Promise<BloqueEdificio[]> {
    const qs = new URLSearchParams();
    if (!soloActivos) qs.set('soloActivos', 'false');
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}/bloques?${qs.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Error cargando bloques de la sede');
    return await res.json();
  },

  async crearBloque(payload: Partial<BloqueEdificio> & { idSede: string; codigo: string; nombre: string }): Promise<BloqueEdificio> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando el bloque';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarBloque(idBloque: string, payload: Partial<BloqueEdificio>): Promise<BloqueEdificio> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques/${encodeURIComponent(idBloque)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando el bloque';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleBloqueActivo(idBloque: string): Promise<BloqueEdificio> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques/${encodeURIComponent(idBloque)}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Activar/desactivar bloque falló');
    return await res.json();
  },

  async eliminarBloque(idBloque: string): Promise<{ idBloque: string; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques/${encodeURIComponent(idBloque)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error eliminando el bloque';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // EFDS-1733: Parámetros UMI / Reglas / Técnicos / Sugerir asignación
  // ---------------------------------------------------------------------------
  async getParametroTiempoRespuesta(): Promise<CatalogoItem | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET param tiempo ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] getParametroTiempoRespuesta fail:', err);
      return null;
    }
  },

  async setParametroTiempoRespuesta(dias: number): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias }),
    });
    if (!res.ok) {
      let m = 'Error actualizando parámetro días respuesta';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async getReglasEscalamiento(): Promise<CatalogoItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/reglas-escalamiento`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET reglas ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] reglas falló:', err);
      return [];
    }
  },

  async actualizarReglaEscalamiento(
    idRegla: number,
    body: { tecnicoCodigo?: string | null; isActivo?: boolean; metadata?: Record<string, any> },
  ): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/reglas-escalamiento/${encodeURIComponent(String(idRegla))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let m = 'Error actualizando regla escalamiento';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async getVoBoConfig(): Promise<{
    requiereVoBoGlobal: boolean;
    requiereVoBoMantenimientoMayor: boolean;
    requiereVoBoInsumos: boolean;
    montoMinimoInsumosVoBoCop: number;
    categoriasVoBoObligatorio: number[];
    requiereVoBoContratacion: boolean;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/vobo-config`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] getVoBoConfig fail, fallback defaults:', err);
      return {
        requiereVoBoGlobal: false,
        requiereVoBoMantenimientoMayor: true,
        requiereVoBoInsumos: true,
        montoMinimoInsumosVoBoCop: 500000,
        categoriasVoBoObligatorio: [48, 54],
        requiereVoBoContratacion: true,
      };
    }
  },

  async actualizarVoBoConfig(body: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/vobo-config`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let m = 'Error actualizando configuración de VoBo';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async getTecnicos(soloActivos: boolean = true): Promise<CatalogoItem[]> {
    try {
      const q = new URLSearchParams();
      if (!soloActivos) q.append('soloActivos', 'false');
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET técnicos ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] getTecnicos falló:', err);
      return [];
    }
  },

  async getTecnicosConCargaVigente(opts?: { incluirInactivos?: boolean }): Promise<Array<CatalogoItem & { cargaVigente?: number }>> {
    try {
      const qs = new URLSearchParams();
      if (opts?.incluirInactivos) qs.set('incluirInactivos', 'true');
      const q = qs.toString();
      const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/con-carga-vigente${q ? `?${q}` : ''}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET técnicos carga ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] técnicos carga falló:', err);
      return [];
    }
  },

  async crearTecnico(payload: TecnicoMantenimientoPayload): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando técnico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarTecnico(idCatalogo: number, payload: Partial<TecnicoMantenimientoPayload>): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando técnico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleTecnico(idCatalogo: number): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/${encodeURIComponent(String(idCatalogo))}/toggle`, {
      method: 'PATCH', credentials: 'include',
    });
    if (!res.ok) throw new Error('Toggle técnico falló');
    return await res.json();
  },

  async eliminarTecnico(idCatalogo: number): Promise<{ idCatalogo: number; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) throw new Error('Eliminar técnico falló');
    return await res.json();
  },

  async sugerirAsignacion(idSolicitud: string): Promise<SugerenciaAsignacion | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/sugerir-asignacion`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`sugerir-asignacion ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[infra] sugerirAsignacion ${idSolicitud}:`, err);
      return null;
    }
  },

  // ---------------------------------------------------------------------------
  // EFDS-1733 bis HUECO 1 (RF-INF-004 L104): Tiempo POR CATEGORÍA (47..54)
  // ---------------------------------------------------------------------------
  async listarParametrosTiempoPorCategoria(opts?: { idCategoria?: number }): Promise<CatalogoItem[] | CatalogoItem | null> {
    try {
      const q = new URLSearchParams();
      if (Number.isInteger(opts?.idCategoria)) q.append('idCategoria', String(opts?.idCategoria));
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`GET param tiempo por categoría ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] listarParametrosTiempoPorCategoria fail:', err);
      return Number.isInteger(opts?.idCategoria) ? null : [];
    }
  },

  async actualizarParametroTiempoRespuestaPorCategoria(
    idCategoria: number,
    dias: number,
  ): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idCategoria: Number(idCategoria), dias: Number(dias) }),
    });
    if (!res.ok) {
      let m = 'Error actualizando parámetro días respuesta por categoría';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // EFDS-1734 RF-INF-005: 3 acciones análisis (aprobar-asignar / rechazar / redistribuir)
  // Requieren rol SUPER_ADMIN o GESTOR_MANTENIMIENTO; de lo contrario 403 Forbidden.
  // ---------------------------------------------------------------------------
  async aprobarYAsignar(
    idSolicitud: string,
    payload: AprobarAsignarPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/aprobar-asignar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al aprobar y asignar la solicitud';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('APROBAR_ASIGNAR', idSolicitud, payload);
    return data;
  },

  async rechazarSolicitud(
    idSolicitud: string,
    payload: RechazarPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/rechazar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al rechazar la solicitud';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('RECHAZAR_SOLICITUD', idSolicitud, payload);
    return data;
  },

  async redistribuirAsignacion(
    idSolicitud: string,
    payload: RedistribuirPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/redistribuir`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al redistribuir la asignación';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('REDISTRIBUIR_ASIGNACION', idSolicitud, payload);
    return data;
  },

  // ---------------------------------------------------------------------------
  // EFDS-1735 RF-INF-006: Valoración campo + insumos
  // 6 endpoints nuevos implementados en mantenimiento.controller.ts
  // ---------------------------------------------------------------------------
  async iniciarEjecucionDirecta(idSolicitud: string): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/iniciar-ejecucion-directa`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      let m = 'Error al iniciar ejecución directa';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('INICIAR_EJECUCION_DIRECTA', idSolicitud);
    return data;
  },

  async iniciarValoracion(
    idSolicitud: string,
    payload: IniciarValoracionPayload = {},
  ): Promise<{ solicitud: SolicitudMantenimiento; valoracion: SolicitudValoracion }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/iniciar-valoracion`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al iniciar la valoración previa';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('INICIAR_VALORACION', idSolicitud, payload);
    return data;
  },

  async guardarValoracionCompleta(
    idValoracion: string,
    payload: GuardarValoracionCompletaPayload,
  ): Promise<{ solicitud: SolicitudMantenimiento; valoracion: SolicitudValoracion }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/valoraciones/${encodeURIComponent(idValoracion)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al guardar la valoración';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('GUARDAR_VALORACION', data?.solicitud?.idSolicitud || idValoracion, payload);
    return data;
  },

  async confirmarRecepcionInsumos(
    idSolicitud: string,
    payload: ConfirmarRecepcionInsumosPayload = {},
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/confirmar-recepcion-insumos`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al confirmar recepción de materiales';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('CONFIRMAR_RECEPCION_INSUMOS', idSolicitud, payload);
    return data;
  },

  async registrarRecepcionInsumosTecnico(
    idSolicitud: string,
    payload: NotaRecepcionInsumosTecnicoPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/recepcion-insumos-tecnico`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al registrar verificación de entrega de insumos';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('RECEPCION_INSUMOS_TECNICO', idSolicitud, payload);
    return data;
  },

  async registrarVoBo(
    idSolicitud: string,
    payload: { aprobado?: boolean; voboAprobado?: boolean; observaciones?: string; voboObservaciones?: string },
  ): Promise<SolicitudMantenimiento> {
    const aprobadoValor = payload.aprobado !== undefined ? payload.aprobado : (payload.voboAprobado ?? true);
    const obsValor = payload.observaciones ?? payload.voboObservaciones ?? undefined;
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/vobo`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aprobado: aprobadoValor,
        voboAprobado: aprobadoValor,
        observaciones: obsValor,
        voboObservaciones: obsValor,
      }),
    });
    if (!res.ok) {
      let m = 'Error al registrar visto bueno de la valoración';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('VOBO_VALORACION', idSolicitud, payload);
    return data;
  },

  async listarValoracionesPorSolicitud(idSolicitud: string): Promise<SolicitudValoracion[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/valoraciones`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`GET valoraciones ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[infra] listarValoracionesPorSolicitud ${idSolicitud}:`, err);
      return [];
    }
  },

  async listarMisValoracionesAsignadas(filtro?: { estado?: string }): Promise<SolicitudValoracion[]> {
    try {
      const q = new URLSearchParams();
      if (filtro?.estado) q.append('estado', filtro.estado);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/valoraciones/mis-asignadas${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`GET mis valoraciones ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] listarMisValoracionesAsignadas falló:', err);
      return [];
    }
  },

  async obtenerCierreTecnico(idSolicitud: string): Promise<CierreTecnicoResponse> {
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/cierre-tecnico`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      let m = 'Error consultando resumen del cierre técnico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async cerrarTecnicamente(
    idSolicitud: string,
    payload: CierreTecnicoPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/cerrar-tecnicamente`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      let m = 'Error registrando el cierre técnico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('CIERRE_TECNICO', idSolicitud, payload);
    return data;
  },

  // ---------------------------------------------------------------------------
  // EFDS-1737 RF-INF-008 Conformidad del área solicitante
  // ---------------------------------------------------------------------------

  async confirmarConformidad(
    idSolicitud: string,
    payload: {
      observacionesConformidad?: string;
      // EFDS-1738 RF-INF-009: calificación opcional 1-5 (OQ-1 default opcional)
      calificacionServicio?: 1 | 2 | 3 | 4 | 5;
    },
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/conformidad/confirmar`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      let m = 'Error confirmando conformidad';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('CONFIRMAR_CONFORMIDAD', idSolicitud, payload);
    return data;
  },

  async rechazarConformidad(
    idSolicitud: string,
    payload: { observacionesConformidad: string },
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/conformidad/rechazar`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      let m = 'Error devolviendo conformidad';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    const data = await res.json();
    notificarEventoFrontend('RECHAZAR_CONFORMIDAD', idSolicitud, payload);
    return data;
  },

  async ejecutarCierresSinRespuesta(): Promise<{ actualizadas: number; ids: string[] }> {
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/ejecutar-cierres-sin-respuesta`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    if (!res.ok) {
      let m = 'Error ejecutando cierres automáticos sin respuesta';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // EFDS-1738 RF-INF-009 Consolidados promedio calificación servicio
  // ---------------------------------------------------------------------------

  async getCalificacionesConsolidadas(params?: {
    por?: 'tecnico' | 'categoria' | 'area' | 'global';
    fechaDesde?: string | Date | null;
    fechaHasta?: string | Date | null;
    idCategoria?: number | null;
    codigoTecnico?: string | null;
    idAreaSolicitante?: string | null;
  }): Promise<ConsolidadoCalificacionItem[]> {
    const sp = new URLSearchParams();
    const append = (k: string, v: unknown) => {
      if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return;
      sp.append(k, typeof v === 'object' && v instanceof Date ? v.toISOString() : String(v));
    };
    append('por', params?.por);
    append('fechaDesde', params?.fechaDesde);
    append('fechaHasta', params?.fechaHasta);
    append('idCategoria', params?.idCategoria);
    append('codigoTecnico', params?.codigoTecnico);
    append('idAreaSolicitante', params?.idAreaSolicitante);
    const qs = sp.toString();
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/estadisticas/calificaciones-consolidadas${qs.length ? `?${qs}` : ''}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );
    if (!res.ok) {
      let m = 'Error consultando consolidados de calificación servicio';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // EFDS-1739 RF-INF-010 Reportes e Indicadores de Gestión
  // ---------------------------------------------------------------------------

  async getReporteGestion(params?: FiltrosReporteGestionParams): Promise<ReporteGestionDto> {
    const sp = new URLSearchParams();
    const append = (k: string, v: unknown) => {
      if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return;
      sp.append(k, typeof v === 'object' && v instanceof Date ? v.toISOString() : String(v));
    };
    append('fechaDesde', params?.fechaDesde);
    append('fechaHasta', params?.fechaHasta);
    append('idSede', params?.idSede);
    append('idCategoria', params?.idCategoria);
    append('areaResponsable', params?.areaResponsable);
    append('codigoTecnico', params?.codigoTecnico);
    append('estado', params?.estado);
    const qs = sp.toString();
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/estadisticas/reporte-gestion${qs.length ? `?${qs}` : ''}`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      let m = 'Error consultando reporte de gestión';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async descargarExcelReporte(params?: FiltrosReporteGestionParams): Promise<Blob> {
    const sp = new URLSearchParams();
    const append = (k: string, v: unknown) => {
      if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return;
      sp.append(k, typeof v === 'object' && v instanceof Date ? v.toISOString() : String(v));
    };
    append('fechaDesde', params?.fechaDesde);
    append('fechaHasta', params?.fechaHasta);
    append('idSede', params?.idSede);
    append('idCategoria', params?.idCategoria);
    append('areaResponsable', params?.areaResponsable);
    append('codigoTecnico', params?.codigoTecnico);
    append('estado', params?.estado);
    const qs = sp.toString();
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/estadisticas/reporte-gestion/excel${qs.length ? `?${qs}` : ''}`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      let m = 'Error descargando reporte Excel';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.blob();
  },

  async descargarExcelConsolidadoOperacional(params?: {
    estado?: string;
    prioridad?: string;
    idCategoria?: number;
    idSede?: string;
    areaResponsable?: string;
    codigoTecnico?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    ids?: string[];
  }): Promise<Blob> {
    const sp = new URLSearchParams();
    const append = (k: string, v: unknown) => {
      if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return;
      sp.append(k, typeof v === 'object' && v instanceof Date ? v.toISOString() : String(v));
    };
    append('estado', params?.estado);
    append('prioridad', params?.prioridad);
    append('idCategoria', params?.idCategoria);
    append('idSede', params?.idSede);
    append('areaResponsable', params?.areaResponsable);
    append('codigoTecnico', params?.codigoTecnico);
    append('fechaDesde', params?.fechaDesde);
    append('fechaHasta', params?.fechaHasta);
    if (Array.isArray(params?.ids) && params.ids.length > 0) {
      append('ids', params.ids.join(','));
    }
    const qs = sp.toString();
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/exportar-operacional/excel${qs.length ? `?${qs}` : ''}`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      let m = 'Error descargando consolidado operacional Excel';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.blob();
  },

  async descargarPdfReporte(params?: FiltrosReporteGestionParams): Promise<Blob> {
    const sp = new URLSearchParams();
    const append = (k: string, v: unknown) => {
      if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return;
      sp.append(k, typeof v === 'object' && v instanceof Date ? v.toISOString() : String(v));
    };
    append('fechaDesde', params?.fechaDesde);
    append('fechaHasta', params?.fechaHasta);
    append('idSede', params?.idSede);
    append('idCategoria', params?.idCategoria);
    append('areaResponsable', params?.areaResponsable);
    append('codigoTecnico', params?.codigoTecnico);
    append('estado', params?.estado);
    const qs = sp.toString();
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/estadisticas/reporte-gestion/pdf${qs.length ? `?${qs}` : ''}`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      let m = 'Error descargando reporte PDF';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.blob();
  },

  getUrlDescargaEvidencia(idEvidencia: string): string {
    return `${API_BASE_URL}/mantenimiento/evidencias/${encodeURIComponent(idEvidencia)}/download`;
  },

  async descargarZipEvidenciasSolicitud(idSolicitud: string): Promise<Blob> {
    const res = await fetch(
      `${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/evidencias/zip`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      let m = 'Error descargando ZIP de evidencias';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.blob();
  },

  // ---------------------------------------------------------------------------
  // Fase 4 Req. #10: Repositorio e Ingesta Histórica (Microsoft Planner / GLPI)
  // ---------------------------------------------------------------------------
  async getHistorico(filtros?: {
    page?: number;
    limit?: number;
    search?: string;
    semana?: string;
    estado?: string;
    tecnico?: string;
    solicitante?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<HistoricoListResponse> {
    const sp = new URLSearchParams();
    if (filtros?.page) sp.append('page', String(filtros.page));
    if (filtros?.limit) sp.append('limit', String(filtros.limit));
    if (filtros?.search) sp.append('search', filtros.search);
    if (filtros?.semana && filtros.semana !== 'TODAS') sp.append('semana', filtros.semana);
    if (filtros?.estado && filtros.estado !== 'TODOS') sp.append('estado', filtros.estado);
    if (filtros?.tecnico && filtros.tecnico !== 'TODOS') sp.append('tecnico', filtros.tecnico);
    if (filtros?.solicitante && filtros.solicitante !== 'TODOS') sp.append('solicitante', filtros.solicitante);
    if (filtros?.fechaDesde) sp.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) sp.append('fechaHasta', filtros.fechaHasta);
    const qs = sp.toString();
    const res = await fetch(`${API_BASE_URL}/mantenimiento/historico${qs ? `?${qs}` : ''}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error consultando histórico de mantenimientos';
      try { const b = await res.json(); if (b?.message) m = String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async getHistoricoEstadisticas(): Promise<HistoricoEstadisticas> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/historico/estadisticas`, {
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error consultando estadísticas históricas';
      try { const b = await res.json(); if (b?.message) m = String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async importarHistoricoArchivo(file: File): Promise<ResumenImportacionHistorico> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE_URL}/mantenimiento/historico/importar`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error importando archivo histórico';
      try { const b = await res.json(); if (b?.message) m = String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async cargarHistoricoDesdeServidor(): Promise<ResumenImportacionHistorico> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/historico/cargar-servidor`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error cargando histórico desde servidor';
      try { const b = await res.json(); if (b?.message) m = String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async descargarHistoricoExcel(filtros?: {
    search?: string;
    semana?: string;
    estado?: string;
    tecnico?: string;
    solicitante?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<Blob> {
    const sp = new URLSearchParams();
    if (filtros?.search) sp.append('search', filtros.search);
    if (filtros?.semana && filtros.semana !== 'TODAS') sp.append('semana', filtros.semana);
    if (filtros?.estado && filtros.estado !== 'TODOS') sp.append('estado', filtros.estado);
    if (filtros?.tecnico && filtros.tecnico !== 'TODOS') sp.append('tecnico', filtros.tecnico);
    if (filtros?.solicitante && filtros.solicitante !== 'TODOS') sp.append('solicitante', filtros.solicitante);
    if (filtros?.fechaDesde) sp.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) sp.append('fechaHasta', filtros.fechaHasta);
    const qs = sp.toString();
    const res = await fetch(`${API_BASE_URL}/mantenimiento/historico/exportar-excel${qs ? `?${qs}` : ''}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error exportando histórico a Excel';
      try { const b = await res.json(); if (b?.message) m = String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.blob();
  },

  async vaciarHistorico(): Promise<{ eliminados: number }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/historico`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error vaciando registros históricos';
      try { const b = await res.json(); if (b?.message) m = String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },
};


export const getMisSolicitudes = (): Promise<SolicitudMantenimiento[]> =>
  infraestructuraService.getMisSolicitudes();

