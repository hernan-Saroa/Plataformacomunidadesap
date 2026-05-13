/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useProgramaAnualData 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para integración con backend del Programa Anual de Auditorías.
 * Reemplaza los datos mock AUDITORIAS_PROGRAMADAS y AUDITORES.
 * 
 * Usa: controlInternoService (src/services/api/controlInternoService.ts)
 * Backend: internal-institutional-control-service
 * Endpoints: /programa-anual (CRUD)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { controlInternoService } from '@/services/api/controlInternoService';
import { auditoriaService, mapBackendToUI, type AuditoriaFormData } from '../services/auditoriaService';
import { useCrearNotificacion } from './useCrearNotificacion';
import type { ProcesoAuditableUI, NivelRiesgo } from './useUniversoAuditableData';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS FRONTEND (usados por el componente UniversoAuditableUnificado)
// ════════════════════════════════════════════════════════════════════════════

export type EstadoAuditoria = 'PROGRAMADA' | 'EN_EJECUCION' | 'COMPLETADA' | 'CANCELADA';
export type TipoAuditoria = 'CUMPLIMIENTO' | 'GESTION' | 'FINANCIERA' | 'TI' | 'ESPECIAL';

export interface AuditoriaProgramadaUI {
  id: string;
  procesoId: string;
  proceso: ProcesoAuditableUI;
  // Tipo técnico (Gestión, Cumplimiento, etc.)
  tipo: TipoAuditoria;
  // 🆕 Tipo operativo original (Regular / Territorial / Especial) para filtros del cronograma
  tipoOperativo?: 'regular' | 'territorial' | 'especial';
  nombre: string;
  objetivo: string;
  alcance: string;
  fechaInicio: string;
  fechaFin: string;
  trimestre: 1 | 2 | 3 | 4;
  auditorLider: string;
  equipo: string[];
  estado: EstadoAuditoria;
  // ✅ Estado Kanban original del backend para filtros (Planeación, Ejecución, Comunicación, Finalizada)
  estadoKanban?: string;
  /** Fase backend (planeacion, en-curso, revision, completada) — respaldo si falta estadoKanban */
  fase?: string;
  avance: number;
  horasEstimadas: number;
  horasReales: number;
  auditoriaOCIId?: string;
  planMejoramientoId?: string;
  hallazgosCount: number;
  territorial: string; // 🆕 Territorial para cronograma
  // ✅ Fechas de etapas persistidas
  fechaFinPlaneacion?: string;
  fechaInicioEjecucion?: string;
  fechaFinEjecucion?: string;
  fechaInicioComunicacion?: string;
}

export interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  especialidad: string[];
}

export interface Estadisticas {
  // Universo Auditable
  totalProcesos: number;
  procesosAuditables: number;
  procesosCriticos: number;
  procesosAltos: number;
  procesosMedios: number;
  procesosBajos: number;
  // Programa Anual
  /** Total de auditorías cargadas (mismo universo que el Kanban) */
  totalProgramadas: number;
  /** Auditorías en columna Kanban Finalizada */
  completadas: number;
  enEjecucion: number;
  /** Plan Anual + Planeación (etapas previas a ejecución) */
  programadas: number;
  /** Desglose alineado con columnas del tablero */
  enPlanAnual: number;
  enPlaneacion: number;
  enComunicacion: number;
  enSeguimiento: number;
  coberturaCriticos: number;
  coberturaAltos: number;
  horasTotales: number;
  horasEjecutadas: number;
  // Vinculación
  vinculadasOCI: number;
  conHallazgos: number;
  conPlanesMejoramiento: number;
}

/** Columnas normalizadas (misma lógica que `mapearFaseAEstado` en useAuditoriasKanban) */
export type ColumnaKanban =
  | 'plan_anual'
  | 'planeacion'
  | 'ejecucion'
  | 'comunicacion'
  | 'seguimiento'
  | 'finalizada'
  | 'desconocido';

/**
 * Resuelve la columna del tablero a partir de estadoKanban / fase / estado UI agregado.
 */
export function resolverColumnaKanban(
  estadoKanban?: string | null,
  faseBackend?: string | null,
  estadoUi?: EstadoAuditoria
): ColumnaKanban {
  const raw = (estadoKanban || '').trim();
  if (raw) {
    const n = raw.toLowerCase();
    if (
      n === 'plan anual' ||
      n === 'plan-anual' ||
      n === 'backlog' ||
      n === 'pendiente' ||
      n === 'programada' ||
      n === 'programado'
    ) {
      return 'plan_anual';
    }
    if (n === 'planeación' || n === 'planeacion' || n === 'planificación' || n === 'planificacion') {
      return 'planeacion';
    }
    if (n === 'ejecución' || n === 'ejecucion') return 'ejecucion';
    if (n === 'comunicación' || n === 'comunicacion' || n === 'informe') return 'comunicacion';
    if (n === 'seguimiento') return 'seguimiento';
    if (n === 'finalizada' || n === 'cierre' || n === 'completada') return 'finalizada';
  }
  const f = (faseBackend || '').toLowerCase().replace(/_/g, '-');
  if (f === 'planeacion') return 'planeacion';
  if (f === 'en-curso' || f === 'encurso') return 'ejecucion';
  if (f === 'revision') return 'comunicacion';
  if (f === 'completada') return 'finalizada';
  if (estadoUi === 'EN_EJECUCION') return 'ejecucion';
  if (estadoUi === 'PROGRAMADA') return 'planeacion';
  if (estadoUi === 'COMPLETADA') return 'seguimiento';
  if (estadoUi === 'CANCELADA') return 'desconocido';
  return 'desconocido';
}

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS: Backend → Frontend
// ════════════════════════════════════════════════════════════════════════════

/** Mapea tipo de auditoría del backend al UI */
function mapTipoAuditoria(tipo: string): TipoAuditoria {
  const map: Record<string, TipoAuditoria> = {
    'gestion': 'GESTION',
    'cumplimiento': 'CUMPLIMIENTO',
    'financiera': 'FINANCIERA',
    'tic': 'TI',
    'desempeno': 'GESTION',
  };
  return map[tipo?.toLowerCase()] || 'GESTION';
}

/** 
 * Mapea estado de auditoría del backend al UI
 * Reconoce tanto valores legacy como estadoKanban real
 * 
 * Estados Kanban reales: 'Planeación', 'Ejecución', 'Comunicación', 'Finalizada'
 * Estados legacy: 'planeada', 'en_curso', 'completada', 'cancelada'
 */
function mapEstadoAuditoria(estado: string, estadoKanban?: string): EstadoAuditoria {
  // ✅ PRIORIDAD 1: usar estadoKanban si está presente (valor real del backend)
  if (estadoKanban) {
    const kanbanNorm = estadoKanban.toLowerCase().trim();
    if (kanbanNorm === 'planeación' || kanbanNorm === 'planeacion' || kanbanNorm === 'plan anual') return 'PROGRAMADA';
    if (kanbanNorm === 'ejecución' || kanbanNorm === 'ejecucion') return 'EN_EJECUCION';
    if (kanbanNorm === 'comunicación' || kanbanNorm === 'comunicacion') return 'COMPLETADA';
    if (kanbanNorm === 'seguimiento') return 'COMPLETADA';
    if (kanbanNorm === 'finalizada') return 'COMPLETADA'; // Finalizadas mapean a COMPLETADA
  }
  
  // PRIORIDAD 2: usar estado legacy
  const map: Record<string, EstadoAuditoria> = {
    'planeada': 'PROGRAMADA',
    'en_curso': 'EN_EJECUCION',
    'completada': 'COMPLETADA',
    'cancelada': 'CANCELADA',
    // También mapear valores directos
    'planeación': 'PROGRAMADA',
    'planeacion': 'PROGRAMADA',
    'ejecución': 'EN_EJECUCION',
    'ejecucion': 'EN_EJECUCION',
    'comunicación': 'COMPLETADA',
    'comunicacion': 'COMPLETADA',
    'finalizada': 'COMPLETADA',
  };
  return map[estado?.toLowerCase()] || 'PROGRAMADA';
}

/** Calcula el trimestre a partir de una fecha */
function calcularTrimestre(fecha: string): 1 | 2 | 3 | 4 {
  const month = new Date(fecha).getMonth(); // 0-11
  if (month < 3) return 1;
  if (month < 6) return 2;
  if (month < 9) return 3;
  return 4;
}

/** Crea un ProcesoAuditableUI placeholder desde datos parciales */
function crearProcesoPlaceholder(
  procesoId: string,
  procesoNombre: string,
  procesoCodigo?: string
): ProcesoAuditableUI {
  return {
    id: procesoId,
    nombre: procesoNombre || 'Proceso desconocido',
    tipo: 'Apoyo',
    descripcion: '',
    responsable: '',
    nivelRiesgo: 'Medio',
    puntajeRiesgo: 50,
    calificacionDafp: 3,
    categoria: 'General',
    auditable: true,
    frecuenciaAuditoria: 'Anual',
    activo: true,
    _codigo: procesoCodigo,
  };
}

/** Convierte una auditoría programada del backend al formato UI */
function mapAuditoriaBackendToUI(
  auditoria: any,
  procesosMap: Map<string, ProcesoAuditableUI>
): AuditoriaProgramadaUI {
  const fechaInicio = auditoria.fechaInicioPlaneada || auditoria.fechaInicio || '';
  const fechaFin = auditoria.fechaFinPlaneada || auditoria.fechaFin || '';
  
  // Buscar proceso en el mapa, o crear uno placeholder
  const procesoUI = procesosMap.get(auditoria.procesoId) || 
    crearProcesoPlaceholder(
      auditoria.procesoId,
      auditoria.procesoNombre || auditoria.nombre,
      auditoria.procesoCodigo
    );

  // Extraer equipo de la estructura JSONB del backend
  const equipo: string[] = [];
  if (auditoria.equipoAuditor) {
    if (Array.isArray(auditoria.equipoAuditor)) {
      // El backend puede devolver EquipoAuditor[] (entidades ORM) o string[].
      // Si son objetos (entidad), extraer nombre legible; si son strings, usar directo.
      for (const item of auditoria.equipoAuditor) {
        if (typeof item === 'string') {
          equipo.push(item);
        } else if (item && typeof item === 'object') {
          // Prioridad: nombre del usuario relacionado > personaId > rol
          const nombre =
            item.usuario?.nombre ||
            item.usuario?.nombreCompleto ||
            item.nombre ||
            item.nombreCompleto ||
            item.personaId ||
            item.rol ||
            String(item.id ?? '');
          if (nombre) equipo.push(nombre);
        }
      }
    } else if (typeof auditoria.equipoAuditor === 'object') {
      const ea = auditoria.equipoAuditor;
      if (ea.auditores) equipo.push(...ea.auditores.map((a: any) => typeof a === 'string' ? a : (a?.nombre || a?.personaId || String(a))));
      if (ea.profesionalesEspecializados) equipo.push(...ea.profesionalesEspecializados.map((a: any) => typeof a === 'string' ? a : (a?.nombre || a?.personaId || String(a))));
      if (ea.profesionalesUniversitarios) equipo.push(...ea.profesionalesUniversitarios.map((a: any) => typeof a === 'string' ? a : (a?.nombre || a?.personaId || String(a))));
      if (ea.tecnicos) equipo.push(...ea.tecnicos.map((a: any) => typeof a === 'string' ? a : (a?.nombre || a?.personaId || String(a))));
    }
  }

  // Detectar tipo operativo (Regular / Territorial / Especial) desde backend.
  // 🔁 IMPORTANTE: Damos prioridad al campo "tipo" (Regular / Territorial / Especial)
  // y dejamos "tipoKanban" solo como respaldo.
  const tipoOperativoRaw: string | undefined =
    (auditoria.tipo as string | undefined) || (auditoria.tipoKanban as string | undefined);
  const tipoOperativoNormalizado = tipoOperativoRaw?.toLowerCase();
  const tipoOperativoValido =
    tipoOperativoNormalizado === 'regular' ||
    tipoOperativoNormalizado === 'territorial' ||
    tipoOperativoNormalizado === 'especial'
      ? (tipoOperativoNormalizado as 'regular' | 'territorial' | 'especial')
      : undefined;

  return {
    id: auditoria.id,
    procesoId: auditoria.procesoId,
    proceso: procesoUI,
    tipo: mapTipoAuditoria(auditoria.tipo),
    tipoOperativo: tipoOperativoValido,
    nombre: auditoria.nombre,
    objetivo: auditoria.alcance || '', // Backend no tiene campo "objetivo" separado
    alcance: auditoria.alcance || '',
    fechaInicio: typeof fechaInicio === 'string' ? fechaInicio : new Date(fechaInicio).toISOString().split('T')[0],
    fechaFin: typeof fechaFin === 'string' ? fechaFin : new Date(fechaFin).toISOString().split('T')[0],
    trimestre: calcularTrimestre(fechaInicio),
    auditorLider: auditoria.auditorLider || '',
    equipo,
    // ✅ Usar estadoKanban del backend para mapeo correcto
    estado: mapEstadoAuditoria(auditoria.estado, auditoria.estadoKanban),
    // ✅ Conservar estadoKanban original para filtros
    estadoKanban: auditoria.estadoKanban,
    fase: typeof auditoria.fase === 'string' ? auditoria.fase : undefined,
    avance: auditoria.avance || 0,
    horasEstimadas: (auditoria.duracionDias || 0) * 8,
    horasReales: auditoria.horasReales || 0,
    auditoriaOCIId: auditoria.auditoriaOCIId || undefined,
    planMejoramientoId: auditoria.planMejoramientoId || undefined,
    hallazgosCount: auditoria.hallazgosCount || 0,
    territorial: auditoria.territorial || procesoUI._territorial || 'Sede Central',
    fechaFinPlaneacion: auditoria.fechaFinPlaneacion || auditoria.etapas?.planeacion?.fechaFin,
    fechaInicioEjecucion: auditoria.fechaInicioEjecucion || auditoria.etapas?.ejecucion?.fechaInicio,
    fechaFinEjecucion: auditoria.fechaFinEjecucion || auditoria.etapas?.ejecucion?.fechaFin,
    fechaInicioComunicacion: auditoria.fechaInicioComunicacion || auditoria.etapas?.comunicacion?.fechaInicio,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN: Calcular estadísticas desde datos reales
// ════════════════════════════════════════════════════════════════════════════

export function calcularEstadisticas(
  procesos: ProcesoAuditableUI[],
  auditorias: AuditoriaProgramadaUI[]
): Estadisticas {
  const procesosAuditables = procesos.filter(p => p.auditable);
  const criticos = procesosAuditables.filter(p => p.nivelRiesgo === 'Crítico');
  const altos = procesosAuditables.filter(p => p.nivelRiesgo === 'Alto');

  const audCriticosCubiertos = auditorias.filter(a => a.proceso.nivelRiesgo === 'Crítico').length;
  const audAltosCubiertos = auditorias.filter(a => a.proceso.nivelRiesgo === 'Alto').length;

  let enPlanAnual = 0;
  let enPlaneacion = 0;
  let enEjecucion = 0;
  let enComunicacion = 0;
  let enSeguimiento = 0;
  let finalizadas = 0;

  for (const a of auditorias) {
    const col = resolverColumnaKanban(a.estadoKanban, a.fase, a.estado);
    switch (col) {
      case 'plan_anual':
        enPlanAnual += 1;
        break;
      case 'planeacion':
        enPlaneacion += 1;
        break;
      case 'ejecucion':
        enEjecucion += 1;
        break;
      case 'comunicacion':
        enComunicacion += 1;
        break;
      case 'seguimiento':
        enSeguimiento += 1;
        break;
      case 'finalizada':
        finalizadas += 1;
        break;
      default:
        if (a.estado === 'EN_EJECUCION') enEjecucion += 1;
        else if (a.estado === 'PROGRAMADA') enPlaneacion += 1;
        else if (a.estado === 'COMPLETADA') enSeguimiento += 1;
        break;
    }
  }

  const programadasFases = enPlanAnual + enPlaneacion;

  return {
    totalProcesos: procesos.length,
    procesosAuditables: procesosAuditables.length,
    procesosCriticos: criticos.length,
    procesosAltos: altos.length,
    procesosMedios: procesosAuditables.filter(p => p.nivelRiesgo === 'Medio').length,
    procesosBajos: procesosAuditables.filter(p => p.nivelRiesgo === 'Bajo').length,
    
    totalProgramadas: auditorias.length,
    completadas: finalizadas,
    enEjecucion,
    programadas: programadasFases,
    enPlanAnual,
    enPlaneacion,
    enComunicacion,
    enSeguimiento,
    
    coberturaCriticos: criticos.length > 0
      ? Math.round((audCriticosCubiertos / criticos.length) * 100)
      : 0,
    coberturaAltos: altos.length > 0
      ? Math.round((audAltosCubiertos / altos.length) * 100)
      : 0,
    
    horasTotales: auditorias.reduce((sum, a) => sum + a.horasEstimadas, 0),
    horasEjecutadas: auditorias.reduce((sum, a) => sum + a.horasReales, 0),
    
    vinculadasOCI: auditorias.filter(a => a.auditoriaOCIId).length,
    conHallazgos: auditorias.filter(a => a.hallazgosCount > 0).length,
    conPlanesMejoramiento: auditorias.filter(a => a.planMejoramientoId).length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS PARA CREAR/EDITAR AUDITORÍAS
// ════════════════════════════════════════════════════════════════════════════

/** Datos para crear una nueva auditoría programada */
export interface AuditoriaCreateData {
  tipoAuditoria: string;
  titulo: string;
  descripcion: string;
  territorial?: string;
  sede?: string;
  areaObjetivo?: string;
  procesoAuditado?: string;
  alcance?: string;
  auditorLider?: string;
  auditorAsignado?: string;
  equipoAuditores?: string[];
  supervisorAsignado?: string;
  // Responsable del área auditada (auditado). Permite enviar al backend la persona
  // que recibirá el informe preliminar y entrará al portal del auditado.
  responsableAreaIdPersona?: string;
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  fechaInicio: string;
  fechaFinPlaneacion?: string; // Fin de Planeación
  fechaInicioEjecucion?: string; // Inicio de Ejecución
  fechaFinEjecucion?: string; // Fin de Ejecución
  fechaInicioComunicacion?: string; // Inicio de Comunicación
  fechaFin: string;
  periodicidad?: string;
  objetivos?: string[];
  criteriosAuditoria?: string[];
  normatividadAplicable?: string[];
  metodologia?: string;
  nivelRiesgo?: string;
  riesgosIdentificados?: string[];
  controlesAplicar?: string[];
  presupuestoEstimado?: string;
  recursos?: any[];
  productosEsperados?: any[];
  hitos?: any[];
  vinculadaPlanAnual?: boolean;
  planAnualId?: string;
  planAnualAño?: number;
  rolDecretoAsociado?: string;
  estadoKanban?: string; // Estado inicial para el tablero Kanban
  incluirHallazgosPreliminares?: boolean;
  hallazgos?: Array<{
    id: string;
    descripcion: string;
    criterio: string;
    causa?: string;
    efecto?: string;
    recomendacion?: string;
    fechaIdentificacion?: string;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface UseProgramaAnualDataOptions {
  vigencia?: number;
  procesos?: ProcesoAuditableUI[];
  autoFetch?: boolean;
  showToasts?: boolean;
}

interface UseProgramaAnualDataReturn {
  // Data
  auditorias: AuditoriaProgramadaUI[];
  estadisticas: Estadisticas;
  
  // Estado
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  
  // Operaciones CRUD
  agregarAuditoria: (data: AuditoriaCreateData) => Promise<boolean>;
  editarAuditoria: (id: string, data: Partial<AuditoriaCreateData>) => Promise<boolean>;
  eliminarAuditoria: (id: string) => Promise<boolean>;
  fetchAuditorias: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProgramaAnualData(
  options: UseProgramaAnualDataOptions = {}
): UseProgramaAnualDataReturn {
  const { vigencia, procesos = [], autoFetch = true, showToasts = true } = options;
  
  const [auditorias, setAuditorias] = useState<AuditoriaProgramadaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const fetchedRef = useRef(false);

  // Crear mapa de procesos para lookup rápido
  const procesosMap = new Map<string, ProcesoAuditableUI>();
  procesos.forEach(p => procesosMap.set(p.id, p));

  // ✅ Hook para crear notificaciones
  const { notificarAuditoriaCreada, notificarAccesoRestringido } = useCrearNotificacion();

  /**
   * Verifica si el usuario tiene permiso para crear auditorías
   */
  const verificarPermisoCrear = useCallback(() => {
    if (!authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIAS_CREATE)) {
      toast.error('Acceso restringido', {
        description: 'No tienes los permisos necesarios para programar auditorías.'
      });
      
      // Notificar al sistema para que aparezca en la campana
      notificarAccesoRestringido('Programar Auditoría');
      
      return false;
    }
    return true;
  }, [notificarAccesoRestringido]);

  // ── Fetch auditorías programadas ──
  const fetchAuditorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let allAuditorias: AuditoriaProgramadaUI[] = [];
      
      // ✅ 1. Cargar auditorías directamente del endpoint /auditorias
      try {
        const auditoriasDirectas = await auditoriaService.listar();
        if (Array.isArray(auditoriasDirectas) && auditoriasDirectas.length > 0) {
          // Convertir AuditoriaUI a AuditoriaProgramadaUI
          const mapped = auditoriasDirectas.map(a => ({
            id: a.id,
            procesoId: a.procesoId || '',
            proceso: {
              id: a.procesoId || a.id,
              nombre: a.proceso?.nombre || a.nombre,
              tipo: a.proceso?.tipo || 'Apoyo',
              descripcion: a.proceso?.descripcion || '',
              responsable: a.proceso?.responsable || a.auditorLider,
              nivelRiesgo: a.proceso?.nivelRiesgo || 'Medio',
              puntajeRiesgo: a.proceso?.scoreRiesgo || 50,
              calificacionDafp: a.proceso?.ponderacionFinalDafp || 3,
              categoria: a.proceso?.macroproceso || 'General',
              auditable: true,
              frecuenciaAuditoria: 'Anual' as const,
              activo: true,
              codigo: a.proceso?.codigo || '',
              macroproceso: a.proceso?.macroproceso || '',
              tipoProceso: a.proceso?.tipo || 'Apoyo',
              dependenciaResponsable: a.proceso?.dependencia || '',
              scoreRiesgo: a.proceso?.scoreRiesgo || 50,
              frecuenciaSugerida: 'Anual',
              horasEstimadas: a.horasEstimadas || a.proceso?.horasEstimadas || 40,
            },
            tipo: a.tipo,
            // Propagar tipo operativo (Regular / Territorial / Especial) para filtros del cronograma
            tipoOperativo: a.tipoOperativo,
            nombre: a.nombre,
            objetivo: a.objetivo || '',
            alcance: a.alcance || '',
            fechaInicio: a.fechaInicio,
            fechaFin: a.fechaFin,
            trimestre: a.trimestre,
            auditorLider: a.auditorLider,
            equipo: a.equipo,
            estado: a.estado,
            // ✅ Propagar estadoKanban original para filtros del cronograma
            estadoKanban: a.estadoKanban,
            fase: a.fase,
            avance: a.avance,
            horasEstimadas: a.horasEstimadas,
            horasReales: a.horasReales || 0,
            auditoriaOCIId: a.auditoriaOCIId,
            planMejoramientoId: a.planMejoramientoId,
            hallazgosCount: a.hallazgosCount || 0,
            territorial: a.territorial,
          }));
          allAuditorias.push(...mapped);
          console.log('[useProgramaAnualData] ✅ Cargadas', auditoriasDirectas.length, 'auditorías de /auditorias');
        }
      } catch (err) {
        console.warn('[useProgramaAnualData] No se pudieron cargar auditorías directas:', err);
      }
      
      // 2. También intentar cargar de programas anuales (si existen)
      try {
        const yearStr = vigencia?.toString();
        const programas = await controlInternoService.getProgramasAnuales(yearStr);
        
        if (Array.isArray(programas) && programas.length > 0) {
          for (const programa of programas) {
            try {
              const auds = await controlInternoService.getAuditoriasPrograma(programa.id);
              if (Array.isArray(auds)) {
                const mapped = auds.map(a => mapAuditoriaBackendToUI(a, procesosMap));
                // Evitar duplicados por ID
                const idsExistentes = new Set(allAuditorias.map(a => a.id));
                const novedades = mapped.filter(a => !idsExistentes.has(a.id));
                allAuditorias.push(...novedades);
              }
            } catch {
              // Si falla un programa individual, continuar con los demás
            }
          }
        }
      } catch {
        // Si no hay programas anuales, continuar con las auditorías directas
      }
      
      setIsOnline(true);
      setAuditorias(allAuditorias);
      console.log('[useProgramaAnualData] Total auditorías cargadas:', allAuditorias.length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar auditorías';
      console.warn('[useProgramaAnualData] Error al conectar con backend:', msg);
      setError(msg);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [vigencia]);

  // ── Auto-fetch al montar ──
  useEffect(() => {
    if (autoFetch && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAuditorias();
    }
  }, [autoFetch, fetchAuditorias]);

  // ── Calcular estadísticas ──
  const estadisticas = calcularEstadisticas(procesos, auditorias);

  // ── Agregar nueva auditoría ──
  const agregarAuditoria = useCallback(async (data: AuditoriaCreateData): Promise<boolean> => {
    try {
      // ✅ Usar el servicio centralizado que mapea correctamente al DTO del backend
      const formData: AuditoriaFormData = {
        tipoAuditoria: data.tipoAuditoria as any,
        titulo: data.titulo,
        descripcion: data.descripcion,
        territorial: data.territorial || 'Sede Central',
        sede: data.territorial || 'Sede Principal',
        areaObjetivo: data.areaObjetivo,
        procesoAuditado: data.procesoAuditado,
        alcance: data.alcance,
        auditorLider: data.auditorLider || 'Por asignar',
        auditorAsignado: data.auditorAsignado,
        equipoAuditores: data.equipoAuditores,
        supervisorAsignado: data.supervisorAsignado,
        responsable: data.auditorLider || 'Por asignar',
        // Responsable del área auditada (auditado): se envía al servicio para que
        // viaje al backend y la auditoría quede vinculada a esa persona.
        responsableAreaNombre: data.responsableAreaNombre,
        responsableAreaCargo: data.responsableAreaCargo,
        responsableAreaEmail: data.responsableAreaEmail,
        fechaInicio: data.fechaInicio,
        fechaFinPlaneacion: data.fechaFinPlaneacion,
        fechaInicioEjecucion: data.fechaInicioEjecucion,
        fechaFinEjecucion: data.fechaFinEjecucion,
        fechaInicioComunicacion: data.fechaInicioComunicacion,
        fechaFin: data.fechaFin,
        periodicidad: data.periodicidad,
        objetivos: data.objetivos,
        criteriosAuditoria: data.criteriosAuditoria,
        normatividadAplicable: data.normatividadAplicable,
        metodologia: data.metodologia,
        nivelRiesgo: data.nivelRiesgo,
        riesgosIdentificados: data.riesgosIdentificados,
        controlesAplicar: data.controlesAplicar,
        presupuestoEstimado: data.presupuestoEstimado,
        recursos: data.recursos,
        productosEsperados: data.productosEsperados,
        hitos: data.hitos,
        vinculadaPlanAnual: data.vinculadaPlanAnual,
        planAnualId: data.planAnualId,
        planAnualAño: data.planAnualAño,
        rolDecretoAsociado: data.rolDecretoAsociado,
        estadoKanban: data.estadoKanban || 'Plan Anual', // Por defecto Plan Anual
      };

      console.log('[useProgramaAnualData] Creando auditoría con servicio:', formData);
      
      const auditoriaId = await auditoriaService.crear(formData, showToasts);
      
      if (auditoriaId) {
        // ✅ NOTIFICAR A LOS INVOLUCRADOS
        try {
          // 1. Notificar al Auditor Líder
          if (data.auditorLider && data.auditorLider !== 'Por asignar') {
            await notificarAuditoriaCreada(
              auditoriaId,
              data.titulo, // Código temporal o título
              data.titulo,
              data.auditorLider,
              data.fechaInicio
            );
          }

          // 2. Notificar al Equipo de Auditores
          if (data.equipoAuditores && data.equipoAuditores.length > 0) {
            for (const auditorId of data.equipoAuditores) {
              if (auditorId !== data.auditorLider) { // Evitar duplicado si el líder está en el equipo
                await notificarAuditoriaCreada(
                  auditoriaId,
                  data.titulo,
                  data.titulo,
                  auditorId,
                  data.fechaInicio
                );
              }
            }
          }

          // 3. Notificar al Supervisor
          if (data.supervisorAsignado) {
            await notificarAuditoriaCreada(
              auditoriaId,
              data.titulo,
              data.titulo,
              data.supervisorAsignado,
              data.fechaInicio
            );
          }
          console.log('[useProgramaAnualData] ✅ Notificaciones enviadas a los responsables');
        } catch (errN) {
          console.warn('[useProgramaAnualData] Error al enviar notificaciones:', errN);
        }

        // Crear hallazgos preliminares si se incluyeron
        if (data.incluirHallazgosPreliminares && data.hallazgos?.length) {
          try {
            const aud = await controlInternoService.getAuditoriaById(auditoriaId);
            const codigoAuditoria = aud?.codigo || data.titulo;
            const areaBase = data.areaObjetivo || 'Por asignar';
            const hoy = new Date().toISOString().split('T')[0];
            for (const h of data.hallazgos) {
              if (h.descripcion?.trim() && h.criterio?.trim()) {
                await controlInternoService.createHallazgo({
                  titulo: h.descripcion.substring(0, 100),
                  categoria: 'borrador',
                  area: areaBase,
                  descripcion: h.descripcion,
                  criterioIncumplido: h.criterio,
                  causa: h.causa || undefined,
                  efecto: h.efecto || undefined,
                  recomendaciones: h.recomendacion ? [h.recomendacion] : [],
                  fechaDeteccion: h.fechaIdentificacion || hoy,
                  auditoria: codigoAuditoria,
                  auditoriaId,
                });
              }
            }
          } catch (errH) {
            console.error('Error creando hallazgos preliminares:', errH);
            if (showToasts) toast.warning('Auditoría creada, pero hubo un error al guardar algunos hallazgos preliminares');
          }
        }
        // Refrescar datos
        await fetchAuditorias();
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear auditoría';
      console.error('[useProgramaAnualData] Error al crear auditoría:', msg);
      if (showToasts) {
        toast.error(`Error: ${msg}`);
      }
      return false;
    }
  }, [vigencia, showToasts, fetchAuditorias]);

  // ── Editar auditoría existente ──
  const editarAuditoria = useCallback(async (
    id: string, 
    data: Partial<AuditoriaCreateData>
  ): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = {};
      
      if (data.titulo) updates.nombre = data.titulo;
      if (data.tipoAuditoria) updates.tipo = data.tipoAuditoria.toLowerCase();
      if (data.descripcion) updates.alcance = data.descripcion;
      if (data.alcance) updates.alcance = data.alcance;
      if (data.fechaInicio) updates.fechaInicioPlaneada = data.fechaInicio;
      if (data.fechaFin) updates.fechaFinPlaneada = data.fechaFin;
      if (data.auditorLider) updates.auditorLider = data.auditorLider;
      if (data.nivelRiesgo) updates.nivelRiesgo = data.nivelRiesgo.toLowerCase();
      if (data.territorial) updates.territorial = data.territorial;
      
      console.log('[useProgramaAnualData] Actualizando auditoría:', { id, updates });
      
      const resultado = await controlInternoService.updateAuditoria(id, updates);
      
      if (resultado) {
        if (showToasts) {
          toast.success('Auditoría actualizada');
        }
        await fetchAuditorias();
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar auditoría';
      console.error('[useProgramaAnualData] Error al actualizar:', msg);
      if (showToasts) {
        toast.error(`Error: ${msg}`);
      }
      return false;
    }
  }, [showToasts, fetchAuditorias]);

  // ── Eliminar auditoría ──
  const eliminarAuditoria = useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log('[useProgramaAnualData] Eliminando auditoría:', id);
      
      await controlInternoService.deleteAuditoria(id);
      
      if (showToasts) {
        toast.success('Auditoría eliminada');
      }
      await fetchAuditorias();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar auditoría';
      console.error('[useProgramaAnualData] Error al eliminar:', msg);
      if (showToasts) {
        toast.error(`Error: ${msg}`);
      }
      return false;
    }
  }, [showToasts, fetchAuditorias]);

  return {
    auditorias,
    estadisticas,
    loading,
    error,
    isOnline,
    agregarAuditoria,
    editarAuditoria,
    eliminarAuditoria,
    fetchAuditorias,
    refetch: fetchAuditorias,
  };
}
