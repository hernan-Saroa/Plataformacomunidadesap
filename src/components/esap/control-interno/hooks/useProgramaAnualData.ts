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
import { toast } from 'sonner@2.0.3';
import { controlInternoService } from '@/services/api/controlInternoService';
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
  tipo: TipoAuditoria;
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

  return {
    id: auditoria.id,
    procesoId: auditoria.procesoId,
    proceso: procesoUI,
    tipo: mapTipoAuditoria(auditoria.tipo),
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
  
  // Operaciones
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
      // 1. Primero obtener los programas anuales
      const yearStr = vigencia?.toString();
      const programas = await controlInternoService.getProgramasAnuales(yearStr);
      
      let allAuditorias: AuditoriaProgramadaUI[] = [];
      
      if (Array.isArray(programas) && programas.length > 0) {
        // 2. Para cada programa, obtener sus auditorías
        for (const programa of programas) {
          try {
            const auds = await controlInternoService.getAuditoriasPrograma(programa.id);
            if (Array.isArray(auds)) {
              const mapped = auds.map(a => mapAuditoriaBackendToUI(a, procesosMap));
              allAuditorias.push(...mapped);
            }
          } catch {
            // Si falla un programa individual, continuar con los demás
            console.warn(`[useProgramaAnualData] Error cargando auditorías del programa ${programa.id}`);
          }
        }
        setIsOnline(true);
      } else if (programas && !Array.isArray(programas) && (programas as any).id) {
        // Respuesta es un solo programa (no un array)
        try {
          const auds = await controlInternoService.getAuditoriasPrograma((programas as any).id);
          if (Array.isArray(auds)) {
            allAuditorias = auds.map(a => mapAuditoriaBackendToUI(a, procesosMap));
          }
        } catch {
          console.warn('[useProgramaAnualData] Error cargando auditorías del programa único');
        }
        setIsOnline(true);
      } else {
        setIsOnline(true);
      }
      
      setAuditorias(allAuditorias);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar programa anual';
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

  return {
    auditorias,
    estadisticas,
    loading,
    error,
    isOnline,
    fetchAuditorias,
    refetch: fetchAuditorias,
  };
}
