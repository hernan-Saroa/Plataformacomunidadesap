/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useAuditoriasKanban
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para cargar auditorías desde el backend y transformarlas al formato
 * requerido por el componente GestionAuditoriasKanbanSimple.
 * 
 * También carga los auditores disponibles para asignación.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { controlInternoService } from '../../../../services/api/controlInternoService';
import { auditoresApi } from './plan-anual/api';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type EstadoAuditoria =
  | 'Plan Anual'
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada';

type RiesgoAuditoria = 'Alto' | 'Medio' | 'Bajo';
type SemaforoColor = 'verde' | 'amarillo' | 'rojo';
type TipoAuditoria = 'regular' | 'territorial' | 'especial';
type Prioridad = 'crítica' | 'alta' | 'media' | 'baja';

interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

interface ObjetivoAuditoria {
  id: string;
  descripcion: string;
}

export interface AuditoriaKanban {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoAuditoria;
  riesgo: RiesgoAuditoria;
  semaforo: SemaforoColor;
  territorial: string;
  auditorLider: Persona;
  auditorAsignado: Persona;
  // ✅ CRONOGRAMA DE 3 ETAPAS
  // Etapa 1: Planeación
  fechaInicio: string;           // = fechaInicioPlaneacion
  fechaFinPlaneacion?: string;   // Fin de Planeación
  // Etapa 2: Ejecución
  fechaInicioEjecucion?: string; // Inicio de Ejecución
  fechaFinEjecucion?: string;    // Fin de Ejecución
  // Etapa 3: Comunicación
  fechaInicioComunicacion?: string; // Inicio de Comunicación
  fechaFin: string;              // = fechaFinComunicacion (fin de auditoría)
  progreso: number;
  hallazgos: number;
  diasRestantes: number;
  porcentajeTiempo: number;
  ultimaActuacion: string;
  objetivos: ObjetivoAuditoria[];
  calificacionRiesgo: string;
  documentos: number;
  informes: number;
  tareas: number;
  tipo: TipoAuditoria;
  prioridad: Prioridad;
  areaObjetivo: string;
  permiteCambiarObjetivos: boolean;
  equipoAuditores: string[];
  territorialInfo?: {
    nombre: string;
    ciudad: string;
    departamento: string;
  };
  especial?: {
    tipoMotivo: string;
    solicitante: string;
    justificacion: string;
  };
  actividadesCompletas?: boolean;
  actividadesPendientes?: number;
  // Criterios de auditoría
  criterios?: CriterioAuditoria[];
  // ID del auditor líder asignado
  auditorLiderId?: string | number;
}

export interface CriterioAuditoria {
  id: string;
  criterio: string;
}

export interface AuditorDisponible {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  iniciales?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE TRANSFORMACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapea fase/estadoKanban del backend a estado del Kanban
 */
function mapearFaseAEstado(estadoKanban?: string, fase?: string, progreso?: number): EstadoAuditoria {
  // Priorizar estadoKanban si existe (viene del drag & drop)
  const estado = estadoKanban || fase;
  
  if (!estado) {
    if (progreso && progreso >= 100) return 'Finalizada';
    return 'Planeación';
  }
  
  const estadoNorm = estado.toLowerCase();
  
  if (
    estadoNorm === 'plan anual' ||
    estadoNorm === 'plan-anual' ||
    estadoNorm === 'backlog' ||
    estadoNorm === 'pendiente' ||
    estadoNorm === 'programada' ||
    estadoNorm === 'programado'
  ) return 'Plan Anual';
  if (estadoNorm === 'planeación' || estadoNorm === 'planeacion' || estadoNorm === 'planificación') return 'Planeación';
  if (estadoNorm === 'ejecución' || estadoNorm === 'ejecucion') return 'Ejecución';
  if (estadoNorm === 'comunicación' || estadoNorm === 'comunicacion' || estadoNorm === 'informe') return 'Comunicación';
  if (estadoNorm === 'seguimiento') return 'Seguimiento';
  if (estadoNorm === 'finalizada' || estadoNorm === 'cierre' || estadoNorm === 'completada') return 'Finalizada';
  
  return 'Planeación';
}

/**
 * Mapea prioridad del backend
 */
function mapearPrioridad(prioridad?: string, nivelRiesgo?: string): Prioridad {
  const valor = (prioridad || nivelRiesgo || 'media').toLowerCase();
  
  if (valor === 'crítica' || valor === 'critica') return 'crítica';
  if (valor === 'alta' || valor === 'alto' || valor === 'crítico' || valor === 'critico') return 'alta';
  if (valor === 'media' || valor === 'medio' || valor === 'moderado') return 'media';
  return 'baja';
}

/**
 * Mapea nivel de riesgo
 */
function mapearRiesgo(nivelRiesgo?: string): RiesgoAuditoria {
  if (!nivelRiesgo) return 'Medio';
  
  const valor = nivelRiesgo.toLowerCase();
  if (valor.includes('alto') || valor.includes('crítico') || valor.includes('critico')) return 'Alto';
  if (valor.includes('bajo')) return 'Bajo';
  return 'Medio';
}

/**
 * Calcula el semáforo basado en progreso y tiempo restante
 */
function calcularSemaforo(progreso: number, diasRestantes: number, porcentajeTiempo: number): SemaforoColor {
  // Si está muy retrasado (progreso < tiempo consumido - 20%)
  if (progreso < porcentajeTiempo - 20) return 'rojo';
  // Si está algo retrasado
  if (progreso < porcentajeTiempo - 10 || diasRestantes < 5) return 'amarillo';
  // En buen camino
  return 'verde';
}

/**
 * Calcula días restantes y porcentaje de tiempo
 */
function calcularTiempos(fechaInicio: string, fechaFin: string): { diasRestantes: number; porcentajeTiempo: number } {
  const hoy = new Date();
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  const totalDias = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const diasTranscurridos = Math.ceil((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)));
  
  const porcentajeTiempo = Math.min(100, Math.round((diasTranscurridos / totalDias) * 100));
  
  return { diasRestantes, porcentajeTiempo };
}

/**
 * Detecta si un string parece ser un ID en lugar de un nombre real
 * - IDs comunes: UUID, aud-XXX, usr-XXX, números puros
 */
function esIdNoNombre(valor: string): boolean {
  if (!valor) return true;
  const valorNorm = valor.toLowerCase().trim();
  
  // Patrones de ID comunes
  const patronesId = [
    /^aud-\d+$/i,           // aud-001, aud-123
    /^usr-\d+$/i,           // usr-001
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID
    /^[a-f0-9]{24}$/i,      // MongoDB ObjectId
    /^\d+$/,                // Solo números
    /^id[-_]?\d+$/i,        // id-123, id_456
  ];
  
  return patronesId.some(patron => patron.test(valorNorm));
}

/**
 * Genera iniciales de un nombre
 */
function generarIniciales(nombre: string): string {
  if (!nombre) return 'NA';
  const partes = nombre.trim().split(' ');
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
}

/**
 * Formatea fecha al formato DD/MM/YYYY
 */
function formatearFecha(fecha: string): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return fecha;
  
  const dia = date.getDate().toString().padStart(2, '0');
  const mes = (date.getMonth() + 1).toString().padStart(2, '0');
  const año = date.getFullYear();
  
  return `${dia}/${mes}/${año}`;
}

/**
 * Mapea tipo del backend
 */
function mapearTipo(tipo?: string): TipoAuditoria {
  if (!tipo) return 'regular';
  
  const tipoNorm = tipo.toLowerCase();
  if (tipoNorm.includes('territorial')) return 'territorial';
  if (tipoNorm.includes('especial')) return 'especial';
  return 'regular';
}

/**
 * Transforma una auditoría del backend al formato del Kanban
 */
function transformarAuditoria(auditoriaBackend: any, auditoresDisponibles?: AuditorDisponible[]): AuditoriaKanban {
  const tiempos = calcularTiempos(auditoriaBackend.fechaInicio, auditoriaBackend.fechaFin);
  const progreso = auditoriaBackend.progreso || 0;
  // Usar semáforo del backend si existe, sino calcularlo
  const semaforo = (auditoriaBackend.semaforo as SemaforoColor) || calcularSemaforo(progreso, tiempos.diasRestantes, tiempos.porcentajeTiempo);
  
  // Función auxiliar para resolver nombre de auditor
  const resolverAuditor = (auditorData: any, tipoDefault: string): Persona => {
    // Si viene como objeto completo
    if (typeof auditorData === 'object' && auditorData !== null) {
      // Verificar si el nombre es un ID
      const nombreReal = auditorData.nombre && !esIdNoNombre(auditorData.nombre) 
        ? auditorData.nombre 
        : 'Por asignar';
      return {
        nombre: nombreReal,
        cargo: auditorData.cargo || tipoDefault,
        iniciales: nombreReal !== 'Por asignar' ? generarIniciales(nombreReal) : 'PA',
        tipoIdentificacion: auditorData.tipoIdentificacion || 'CC',
        numeroIdentificacion: auditorData.numeroIdentificacion || ''
      };
    }
    
    // Si viene como string
    if (typeof auditorData === 'string' && auditorData) {
      // Verificar si es un ID
      if (esIdNoNombre(auditorData)) {
        // Buscar en la lista de auditores disponibles
        if (auditoresDisponibles && auditoresDisponibles.length > 0) {
          const auditorEncontrado = auditoresDisponibles.find(a => a.id === auditorData);
          if (auditorEncontrado) {
            return {
              nombre: auditorEncontrado.nombre,
              cargo: auditorEncontrado.cargo || tipoDefault,
              iniciales: auditorEncontrado.iniciales || generarIniciales(auditorEncontrado.nombre),
              tipoIdentificacion: 'CC',
              numeroIdentificacion: ''
            };
          }
        }
        // ID no encontrado en la lista
        return {
          nombre: 'Por asignar',
          cargo: tipoDefault,
          iniciales: 'PA',
          tipoIdentificacion: 'CC',
          numeroIdentificacion: ''
        };
      }
      
      // Es un nombre real
      return {
        nombre: auditorData,
        cargo: tipoDefault,
        iniciales: generarIniciales(auditorData),
        tipoIdentificacion: 'CC',
        numeroIdentificacion: ''
      };
    }
    
    // Fallback
    return {
      nombre: 'Por asignar',
      cargo: tipoDefault,
      iniciales: 'PA',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: ''
    };
  };

  // Construir personas de auditores
  const auditorLider = resolverAuditor(
    auditoriaBackend.auditorLider || auditoriaBackend.responsable,
    'Auditor Líder'
  );
  
  const auditorAsignado = resolverAuditor(
    auditoriaBackend.auditorAsignado,
    'Auditor'
  );

  // ⚡ IMPORTANTE: Usar estadoKanban que viene del drag & drop del backend
  const estado = mapearFaseAEstado(auditoriaBackend.estadoKanban, auditoriaBackend.fase, progreso);

  return {
    id: auditoriaBackend.id,
    codigo: auditoriaBackend.codigo || `AUD-${new Date().getFullYear()}-${auditoriaBackend.id?.substring(0, 4) || '001'}`,
    titulo: auditoriaBackend.nombre || 'Auditoría sin título',
    descripcion: auditoriaBackend.descripcion || auditoriaBackend.alcance || '',
    estado,
    riesgo: mapearRiesgo(auditoriaBackend.riesgoKanban || auditoriaBackend.nivelRiesgo),
    semaforo,
    territorial: auditoriaBackend.territorial || 'Nacional',
    auditorLider,
    auditorAsignado,
    fechaInicio: formatearFecha(auditoriaBackend.fechaInicio),
    // ✅ CRONOGRAMA 3 ETAPAS COMPLETO
    // Etapa 1: Planeación
    fechaFinPlaneacion: auditoriaBackend.fechaFinPlaneacion ? formatearFecha(auditoriaBackend.fechaFinPlaneacion) : undefined,
    // Etapa 2: Ejecución
    fechaInicioEjecucion: auditoriaBackend.fechaInicioEjecucion ? formatearFecha(auditoriaBackend.fechaInicioEjecucion) : undefined,
    fechaFinEjecucion: auditoriaBackend.fechaFinEjecucion ? formatearFecha(auditoriaBackend.fechaFinEjecucion) : undefined,
    // Etapa 3: Comunicación
    fechaInicioComunicacion: auditoriaBackend.fechaInicioComunicacion ? formatearFecha(auditoriaBackend.fechaInicioComunicacion) : undefined,
    fechaFin: formatearFecha(auditoriaBackend.fechaFin),
    progreso,
    // Asegurar que hallazgos sea un número
    hallazgos: typeof auditoriaBackend.hallazgos === 'number' 
      ? auditoriaBackend.hallazgos 
      : (Array.isArray(auditoriaBackend.hallazgos) 
          ? auditoriaBackend.hallazgos.length 
          : (auditoriaBackend.hallazgosCount || 0)),
    diasRestantes: auditoriaBackend.diasRestantes || tiempos.diasRestantes,
    porcentajeTiempo: auditoriaBackend.porcentajeTiempo || tiempos.porcentajeTiempo,
    ultimaActuacion: auditoriaBackend.ultimaActuacion || 'Sin actuaciones registradas',
    objetivos: (auditoriaBackend.objetivos || []).map((obj: any, i: number) => ({
      id: obj.id || `obj-${i}`,
      descripcion: typeof obj === 'string' ? obj : (obj.descripcion || '')
    })),
    criterios: (auditoriaBackend.criterios || []).map((crit: any, i: number) => ({
      id: crit.id || `crit-${i}`,
      criterio: typeof crit === 'string' ? crit : (crit.criterio || '')
    })),
    calificacionRiesgo: auditoriaBackend.calificacionRiesgo || `Riesgo ${mapearRiesgo(auditoriaBackend.nivelRiesgo)}`,
    documentos: (auditoriaBackend.totalDocumentos || auditoriaBackend.documentosCount || 0) + (auditoriaBackend.documentoCierre?.url ? 1 : 0),
    informes: auditoriaBackend.totalInformes || auditoriaBackend.informesCount || 0,
    tareas: auditoriaBackend.totalTareas || auditoriaBackend.tareasCount || 0,
    tipo: (auditoriaBackend.tipoKanban as TipoAuditoria) || mapearTipo(auditoriaBackend.tipo),
    prioridad: (auditoriaBackend.prioridadKanban as Prioridad) || mapearPrioridad(auditoriaBackend.prioridad, auditoriaBackend.nivelRiesgo),
    areaObjetivo: auditoriaBackend.areaObjetivo || auditoriaBackend.procesoAuditado || '',
    permiteCambiarObjetivos: auditoriaBackend.permiteCambiarObjetivos ?? true,
    equipoAuditores: auditoriaBackend.equipoAuditores || [],
    territorialInfo: auditoriaBackend.territorial ? {
      nombre: auditoriaBackend.territorial,
      ciudad: '',
      departamento: auditoriaBackend.territorial
    } : undefined,
    actividadesCompletas: true,
    actividadesPendientes: 0,
    auditorLiderId: auditoriaBackend.auditorLiderId,
    // ✅ Preservar documento de cierre del backend para pasarlo al Expediente
    documentoCierre: auditoriaBackend.documentoCierre || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface UseAuditoriasKanbanResult {
  auditorias: AuditoriaKanban[];
  auditores: AuditorDisponible[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  crearAuditoria: (data: any) => Promise<string | null>;
  actualizarAuditoria: (id: string, data: any) => Promise<boolean>;
  eliminarAuditoria: (id: string) => Promise<boolean>;
  cambiarFase: (id: string, fase: string) => Promise<boolean>;
  // ✅ NUEVOS: Métodos para notas
  getNotas: (auditoriaId: string) => Promise<any[]>;
  agregarNota: (auditoriaId: string, contenido: string, tipo?: string) => Promise<boolean>;
  eliminarNota: (auditoriaId: string, notaId: string) => Promise<boolean>;
  // ✅ NUEVOS: Métodos para historial
  getHistorial: (auditoriaId: string) => Promise<any[]>;
  // ✅ NUEVOS: Métodos para aprobación
  aprobarAuditoria: (id: string, comentarios?: string) => Promise<boolean>;
  rechazarAuditoria: (id: string, justificacion: string) => Promise<boolean>;
  // ✅ NUEVOS: Métodos para hallazgos
  getHallazgos: (auditoriaId: string) => Promise<any[]>;
  crearHallazgo: (auditoriaId: string, data: {
    titulo?: string;
    categoria: string;
    tipo?: string;
    area: string;
    descripcion: string;
    criterioIncumplido: string;
    fechaDeteccion: string;
    responsable?: string;
  }) => Promise<boolean>;
  // ✅ NUEVO: Método para finalizar auditoría con documento
  finalizarAuditoria: (
    id: string,
    archivo: File,
    observaciones: string,
    finalizadaPor: string,
    finalizadaPorId: number
  ) => Promise<boolean>;
}

export function useAuditoriasKanban(): UseAuditoriasKanbanResult {
  const [auditorias, setAuditorias] = useState<AuditoriaKanban[]>([]);
  const [auditores, setAuditores] = useState<AuditorDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar auditores del backend (se ejecuta primero)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchAuditores = useCallback(async (): Promise<AuditorDisponible[]> => {
    try {
      const response = await auditoresApi.getAll();
      
      if (response.success && response.data) {
        const auditoresTransformados: AuditorDisponible[] = response.data.map(a => ({
          id: a.id,
          nombre: a.nombre,
          cargo: a.cargo,
          email: a.email,
          iniciales: generarIniciales(a.nombre)
        }));
        setAuditores(auditoresTransformados);
        console.log(`✅ [useAuditoriasKanban] ${auditoresTransformados.length} auditores cargados`);
        return auditoresTransformados;
      }
      return [];
    } catch (err) {
      console.warn('[useAuditoriasKanban] Error cargando auditores:', err);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar auditorías del backend (usa auditores para resolver nombres)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchAuditorias = useCallback(async (auditoresDisponibles?: AuditorDisponible[]) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [useAuditoriasKanban] Iniciando carga de auditorías...');

      // Obtener auditorías del backend
      const response = await controlInternoService.getAuditorias();
      
      console.log('📦 [useAuditoriasKanban] Respuesta del backend:', response);
      
      if (Array.isArray(response)) {
        // ✅ MEJORADO: Pasar auditores disponibles para resolver nombres
        const auditoriasTransformadas = response.map(aud => 
          transformarAuditoria(aud, auditoresDisponibles)
        );
        console.log('🔄 [useAuditoriasKanban] Auditorías transformadas:', auditoriasTransformadas);
        setAuditorias(auditoriasTransformadas);
        console.log(`✅ [useAuditoriasKanban] ${auditoriasTransformadas.length} auditorías cargadas del backend`);
      } else {
        console.warn('[useAuditoriasKanban] Respuesta no es array:', response);
        setAuditorias([]);
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar auditorías';
      console.error('[useAuditoriasKanban] Error:', mensaje, err);
      setError(mensaje);
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ FIX: Sin dependencias para evitar bucle infinito

  // ─────────────────────────────────────────────────────────────────────────
  // Refetch (recargar datos) - Primero auditores, luego auditorías
  // ─────────────────────────────────────────────────────────────────────────
  const refetch = useCallback(async () => {
    // ✅ MEJORADO: Cargar auditores primero, luego auditorías con esos auditores
    const auditoresCargados = await fetchAuditores();
    await fetchAuditorias(auditoresCargados);
  }, [fetchAuditorias, fetchAuditores]);

  // ─────────────────────────────────────────────────────────────────────────
  // Crear auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const crearAuditoria = useCallback(async (data: any): Promise<string | null> => {
    try {
      const resultado = await controlInternoService.createAuditoria(data);
      
      if (resultado && resultado.id) {
        toast.success('Auditoría creada exitosamente');
        await fetchAuditorias(); // Recargar lista
        return resultado.id;
      }
      
      throw new Error('No se recibió ID de la auditoría');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear auditoría';
      toast.error(mensaje);
      return null;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const actualizarAuditoria = useCallback(async (id: string, data: any): Promise<boolean> => {
    try {
      await controlInternoService.updateAuditoria(id, data);
      toast.success('Auditoría actualizada correctamente');
      await fetchAuditorias();
      return true;
    } catch (err: any) {
      const mensaje = err?.message || 'Error al actualizar auditoría';
      toast.error('Error al actualizar', { description: mensaje });
      return false;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // Eliminar auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const eliminarAuditoria = useCallback(async (id: string): Promise<boolean> => {
    try {
      await controlInternoService.deleteAuditoria(id);
      toast.success('Auditoría eliminada');
      await fetchAuditorias();
      return true;
    } catch (err) {
      toast.error('Error al eliminar auditoría');
      return false;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cambiar estado Kanban de auditoría (para drag & drop)
  // Ahora usa el endpoint directo de estado Kanban que soporta todos los estados
  // ─────────────────────────────────────────────────────────────────────────
  const cambiarFase = useCallback(async (id: string, estadoKanban: string): Promise<boolean> => {
    try {
      // ✅ MEJORADO: Usar endpoint de estado Kanban que soporta todos los estados
      await controlInternoService.updateEstadoKanbanAuditoria(id, estadoKanban);
      toast.success(`Estado actualizado a: ${estadoKanban}`);
      await fetchAuditorias();
      return true;
    } catch (err) {
      console.error('[useAuditoriasKanban] Error al cambiar estado:', err);
      toast.error('Error al cambiar estado');
      return false;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Obtener notas de una auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const getNotas = useCallback(async (auditoriaId: string): Promise<any[]> => {
    try {
      const notas = await controlInternoService.getNotasAuditoria(auditoriaId);
      return Array.isArray(notas) ? notas : [];
    } catch (err) {
      console.error('[useAuditoriasKanban] Error al obtener notas:', err);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Agregar nota a una auditoría
  // Categorías válidas: General, Hallazgo, Seguimiento, Evidencia, Recomendación, Observación
  // ─────────────────────────────────────────────────────────────────────────
  const agregarNota = useCallback(async (
    auditoriaId: string, 
    contenido: string, 
    categoria: string = 'General'
  ): Promise<boolean> => {
    try {
      await controlInternoService.createNotaAuditoria(auditoriaId, {
        contenido,
        categoria: categoria as 'General' | 'Hallazgo' | 'Seguimiento' | 'Evidencia' | 'Recomendación' | 'Observación',
      });
      toast.success('Nota guardada exitosamente');
      return true;
    } catch (err) {
      toast.error('Error al guardar nota');
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Eliminar nota de una auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const eliminarNota = useCallback(async (auditoriaId: string, notaId: string): Promise<boolean> => {
    try {
      await controlInternoService.deleteNotaAuditoria(auditoriaId, notaId);
      toast.success('Nota eliminada');
      return true;
    } catch (err) {
      toast.error('Error al eliminar nota');
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Obtener historial de una auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const getHistorial = useCallback(async (auditoriaId: string): Promise<any[]> => {
    try {
      const historial = await controlInternoService.getHistorialAuditoria(auditoriaId);
      return Array.isArray(historial) ? historial : [];
    } catch (err) {
      console.error('[useAuditoriasKanban] Error al obtener historial:', err);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Aprobar auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const aprobarAuditoria = useCallback(async (id: string, comentarios?: string): Promise<boolean> => {
    try {
      await controlInternoService.aprobarAuditoria(id, { comentarios });
      toast.success('Auditoría aprobada exitosamente');
      await fetchAuditorias();
      return true;
    } catch (err) {
      toast.error('Error al aprobar auditoría');
      return false;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Rechazar auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const rechazarAuditoria = useCallback(async (id: string, justificacion: string): Promise<boolean> => {
    try {
      await controlInternoService.rechazarAuditoria(id, justificacion);
      toast.success('Auditoría rechazada');
      await fetchAuditorias();
      return true;
    } catch (err) {
      toast.error('Error al rechazar auditoría');
      return false;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Obtener hallazgos de una auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const getHallazgos = useCallback(async (auditoriaId: string): Promise<any[]> => {
    try {
      const hallazgos = await controlInternoService.getHallazgosByAuditoria(auditoriaId);
      return Array.isArray(hallazgos) ? hallazgos : [];
    } catch (err) {
      console.error('[useAuditoriasKanban] Error al obtener hallazgos:', err);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Crear hallazgo para una auditoría
  // ─────────────────────────────────────────────────────────────────────────
  const crearHallazgo = useCallback(async (auditoriaId: string, data: {
    titulo?: string;
    categoria: string;
    tipo?: string;
    area: string;
    descripcion: string;
    criterioIncumplido: string;
    fechaDeteccion: string;
    responsable?: string;
  }): Promise<boolean> => {
    try {
      // Obtener la auditoría para tener el nombre
      const auditoriaData = auditorias.find(a => a.id === auditoriaId);
      const auditoriaNombre = auditoriaData?.titulo || 'Auditoría';

      await controlInternoService.createHallazgo({
        ...data,
        auditoriaId,
        auditoria: auditoriaNombre,
      });
      toast.success('Hallazgo registrado exitosamente');
      // Incrementar contador de hallazgos
      await controlInternoService.incrementarHallazgosAuditoria(auditoriaId);
      await fetchAuditorias();
      return true;
    } catch (err) {
      console.error('[useAuditoriasKanban] Error al crear hallazgo:', err);
      toast.error('Error al registrar hallazgo');
      return false;
    }
  }, [auditorias, fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ NUEVO: Finalizar auditoría con documento de cierre
  // ─────────────────────────────────────────────────────────────────────────
  const finalizarAuditoria = useCallback(async (
    id: string,
    archivo: File,
    observaciones: string,
    finalizadaPor: string,
    finalizadaPorId: number
  ): Promise<boolean> => {
    try {
      await controlInternoService.finalizarAuditoria(
        id,
        archivo,
        observaciones,
        finalizadaPor,
        finalizadaPorId
      );
      toast.success('Auditoría finalizada exitosamente');
      await fetchAuditorias();
      return true;
    } catch (err: any) {
      console.error('[useAuditoriasKanban] Error al finalizar auditoría:', err);
      toast.error(err.message || 'Error al finalizar auditoría');
      return false;
    }
  }, [fetchAuditorias]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar datos al montar (solo una vez)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: Solo ejecutar al montar, no cuando refetch cambie

  return {
    auditorias,
    auditores,
    loading,
    error,
    refetch,
    crearAuditoria,
    actualizarAuditoria,
    eliminarAuditoria,
    cambiarFase,
    // ✅ Nuevos métodos
    getNotas,
    agregarNota,
    eliminarNota,
    getHistorial,
    aprobarAuditoria,
    rechazarAuditoria,
    // ✅ Métodos de hallazgos
    getHallazgos,
    crearHallazgo,
    // ✅ Método de finalización
    finalizarAuditoria
  };
}

export default useAuditoriasKanban;
