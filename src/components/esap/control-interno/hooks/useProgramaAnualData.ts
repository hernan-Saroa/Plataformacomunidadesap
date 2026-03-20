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
  avance: number;
  horasEstimadas: number;
  horasReales: number;
  auditoriaOCIGId?: string;
  planMejoramientoId?: string;
  hallazgosCount: number;
  territorial: string; // 🆕 Territorial para cronograma
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
  totalProgramadas: number;
  completadas: number;
  enEjecucion: number;
  programadas: number;
  coberturaCriticos: number;
  coberturaAltos: number;
  horasTotales: number;
  horasEjecutadas: number;
  // Vinculación
  vinculadasOCIG: number;
  conHallazgos: number;
  conPlanesMejoramiento: number;
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

/** Mapea estado de auditoría del backend al UI */
function mapEstadoAuditoria(estado: string): EstadoAuditoria {
  const map: Record<string, EstadoAuditoria> = {
    'planeada': 'PROGRAMADA',
    'en_curso': 'EN_EJECUCION',
    'completada': 'COMPLETADA',
    'cancelada': 'CANCELADA',
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
      equipo.push(...auditoria.equipoAuditor);
    } else if (typeof auditoria.equipoAuditor === 'object') {
      const ea = auditoria.equipoAuditor;
      if (ea.auditores) equipo.push(...ea.auditores);
      if (ea.profesionalesEspecializados) equipo.push(...ea.profesionalesEspecializados);
      if (ea.profesionalesUniversitarios) equipo.push(...ea.profesionalesUniversitarios);
      if (ea.tecnicos) equipo.push(...ea.tecnicos);
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
    estado: mapEstadoAuditoria(auditoria.estado),
    avance: auditoria.avance || 0,
    horasEstimadas: (auditoria.duracionDias || 0) * 8,
    horasReales: auditoria.horasReales || 0,
    auditoriaOCIGId: auditoria.auditoriaOCIGId || undefined,
    planMejoramientoId: auditoria.planMejoramientoId || undefined,
    hallazgosCount: auditoria.hallazgosCount || 0,
    territorial: auditoria.territorial || procesoUI._territorial || 'Sede Central',
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

  return {
    totalProcesos: procesos.length,
    procesosAuditables: procesosAuditables.length,
    procesosCriticos: criticos.length,
    procesosAltos: altos.length,
    procesosMedios: procesosAuditables.filter(p => p.nivelRiesgo === 'Medio').length,
    procesosBajos: procesosAuditables.filter(p => p.nivelRiesgo === 'Bajo').length,
    
    totalProgramadas: auditorias.length,
    completadas: auditorias.filter(a => a.estado === 'COMPLETADA').length,
    enEjecucion: auditorias.filter(a => a.estado === 'EN_EJECUCION').length,
    programadas: auditorias.filter(a => a.estado === 'PROGRAMADA').length,
    
    coberturaCriticos: criticos.length > 0
      ? Math.round((audCriticosCubiertos / criticos.length) * 100)
      : 0,
    coberturaAltos: altos.length > 0
      ? Math.round((audAltosCubiertos / altos.length) * 100)
      : 0,
    
    horasTotales: auditorias.reduce((sum, a) => sum + a.horasEstimadas, 0),
    horasEjecutadas: auditorias.reduce((sum, a) => sum + a.horasReales, 0),
    
    vinculadasOCIG: auditorias.filter(a => a.auditoriaOCIGId).length,
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
              nombre: a.proceso.nombre,
              tipo: 'Apoyo' as const,
              descripcion: '',
              responsable: a.auditorLider,
              nivelRiesgo: 'Medio' as const,
              puntajeRiesgo: 50,
              calificacionDafp: 3,
              categoria: 'General',
              auditable: true,
              frecuenciaAuditoria: 'Anual' as const,
              activo: true,
              codigo: a.proceso.codigo || '',
              macroproceso: '',
              tipoProceso: 'Apoyo' as const,
              dependenciaResponsable: '',
              scoreRiesgo: 50,
              frecuenciaSugerida: 'Anual',
              horasEstimadas: a.horasEstimadas,
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
            avance: a.avance,
            horasEstimadas: a.horasEstimadas,
            horasReales: a.horasReales || 0,
            auditoriaOCIGId: a.auditoriaOCIGId,
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
