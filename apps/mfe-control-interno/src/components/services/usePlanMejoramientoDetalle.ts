/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: usePlanMejoramientoDetalle
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para cargar y gestionar el detalle completo de un plan de mejoramiento
 * Incluye: resumen, hallazgos, acciones
 * 
 * VERSIÓN: 1.0
 * ÚLTIMA ACTUALIZACIÓN: 20 Febrero 2026
 */

import { useState, useCallback, useEffect } from 'react';
import controlInternoService from '../../../../services/api/controlInternoService';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface HallazgoDetalle {
  id: string;
  codigo: string;
  descripcion: string;
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
  proceso: string;
  responsable: string;
  accionesCount: number;
  accionesCompletadas: number;
  progreso: number;
}

export interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA';
  progreso: number;
  evidencias: number;
  observaciones?: string;
}

export interface RegistroSeguimiento {
  id: string;
  accionId: string;
  accionDescripcion: string;
  accionesProgramadas: number;
  accionesImplementadas: number;
  puntajeCumplimiento: number;
  controlesImplementados: 'SI' | 'NO' | 'PARCIAL';
  hallazgoSeRepite: 'SI' | 'NO';
  puntajeEfectividad: number;
  observaciones?: string;
}

export interface SeguimientoTrimestral {
  id: string;
  trimestre: number;
  año: number;
  fechaInicio: string;
  fechaFin: string;
  fechaSeguimiento?: string;
  avanceGlobal: number;
  porcentajeCumplimiento: number;
  porcentajeEfectividad: number;
  accionesRevisadas: number;
  accionesTotales: number;
  observacionesGenerales?: string;
  registros: RegistroSeguimiento[];
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCIAS / DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoValidacion = 'pendiente' | 'aceptado' | 'rechazado' | 'con_observaciones';

export type TipoDocumento = 
  | 'evidencia_hallazgo' 
  | 'evidencia_accion' 
  | 'evidencia_plan' 
  | 'documento_plan' 
  | 'certificado' 
  | 'acta' 
  | 'informe' 
  | 'otro';

export interface EvidenciaDocumento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoDocumento: TipoDocumento;
  nombreArchivoOriginal: string;
  tipoMime: string;
  tamanioBytes: number;
  estadoValidacion: EstadoValidacion;
  subidoPor: string;
  fechaSubida: string;
  validadoPor?: string;
  fechaValidacion?: string;
  observacionesValidacion?: string;
  // Vinculaciones
  hallazgoId?: string;
  accionCorrectivaId?: string;
  planMejoramientoId?: string;
  auditoriaId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTOS TIMELINE - HISTORIAL
// ═══════════════════════════════════════════════════════════════════════════

export type TipoEventoTimeline = 
  | 'CREACION' 
  | 'ACTUALIZACION' 
  | 'APROBACION' 
  | 'COMPLETADA' 
  | 'EVIDENCIA' 
  | 'COMENTARIO'
  | 'PROGRESO'
  | 'ESTADO'
  | 'HALLAZGO_COMPLETADO';

export interface EventoTimeline {
  id: string;
  tipo: TipoEventoTimeline;
  descripcion: string;
  usuarioNombre?: string;
  fecha: string;
  metadata?: Record<string, any>;
}

export interface PlanMejoramientoDetalle {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  responsableGeneral: string;
  fechaCreacion: string;
  fechaVencimiento: string;
  estado: 'FORMULACION' | 'APROBACION' | 'EN_EJECUCION' | 'EN_SEGUIMIENTO' | 'CUMPLIDO';
  progresoGlobal: number;
  hallazgos: HallazgoDetalle[];
  acciones: AccionCorrectiva[];
  seguimientos: SeguimientoTrimestral[];
  timeline: EventoTimeline[];
  auditoria: string;
  auditoriaId?: string;
  observaciones?: string;
}

interface CreateAccionDto {
  hallazgoId: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;  // Backend usa fechaFin, no fechaVencimiento
  observaciones?: string;
}

// Estados válidos del backend (minúsculas)
type EstadoAccionBackend = 'programada' | 'en-progreso' | 'implementada' | 'vencida' | 'completada';

interface UpdateAccionDto {
  descripcion?: string;
  responsable?: string;
  fechaInicio?: string;
  fechaFin?: string;  // Backend usa fechaFin
  estado?: EstadoAccionBackend;
  porcentajeAvance?: number;  // Backend usa porcentajeAvance, no progreso
  observaciones?: string;
}

interface UpdatePlanDto {
  estado?: string;
  fechaVencimiento?: string;
  responsableGeneral?: string;
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function mapearCriticidad(gravedad: string): 'ALTA' | 'MEDIA' | 'BAJA' {
  const mapa: Record<string, 'ALTA' | 'MEDIA' | 'BAJA'> = {
    'GRAVE': 'ALTA',
    'grave': 'ALTA',
    'ALTA': 'ALTA',
    'alta': 'ALTA',
    'critico': 'ALTA',
    'MODERADO': 'MEDIA',
    'moderado': 'MEDIA',
    'MEDIA': 'MEDIA',
    'media': 'MEDIA',
    'LEVE': 'BAJA',
    'leve': 'BAJA',
    'BAJA': 'BAJA',
    'baja': 'BAJA',
  };
  return mapa[gravedad] || 'MEDIA';
}

function mapearEstadoAccion(estado: string): 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA' {
  const e = String(estado || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  const mapa: Record<string, 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA'> = {
    // Pendiente
    pendiente: 'PENDIENTE',
    programada: 'PENDIENTE',
    sin_iniciar: 'PENDIENTE',
    sin_iniciar_accion: 'PENDIENTE',
    // En Ejecución
    en_progreso: 'EN_EJECUCION',
    en_proceso: 'EN_EJECUCION',
    en_ejecucion: 'EN_EJECUCION',
    en_curso: 'EN_EJECUCION',
    activa: 'EN_EJECUCION',
    // Completada
    completada: 'COMPLETADA',
    implementada: 'COMPLETADA',
    completado: 'COMPLETADA',
    implementado: 'COMPLETADA',
    finalizada: 'COMPLETADA',
    cerrada: 'COMPLETADA',
    // Vencida
    vencida: 'VENCIDA',
    vencido: 'VENCIDA',
    retrasada: 'VENCIDA',
  };
  return mapa[e] ?? 'PENDIENTE';
}

function mapearEstadoPlan(estado: string): PlanMejoramientoDetalle['estado'] {
  const mapa: Record<string, PlanMejoramientoDetalle['estado']> = {
    'formulacion': 'FORMULACION',
    'FORMULACION': 'FORMULACION',
    'aprobacion': 'APROBACION',
    'APROBACION': 'APROBACION',
    'aprobado': 'APROBACION',
    'APROBADO': 'APROBACION',
    'en_ejecucion': 'EN_EJECUCION',
    'EN_EJECUCION': 'EN_EJECUCION',
    'en_seguimiento': 'EN_SEGUIMIENTO',
    'EN_SEGUIMIENTO': 'EN_SEGUIMIENTO',
    'cumplido': 'CUMPLIDO',
    'CUMPLIDO': 'CUMPLIDO',
    'completado': 'CUMPLIDO',
    'COMPLETADO': 'CUMPLIDO',
  };
  return mapa[estado] || 'FORMULACION';
}

/**
 * Transforma la respuesta del backend al formato del modal
 */
function transformarPlanDetalle(planBackend: any): PlanMejoramientoDetalle {
  // ═══════════════════════════════════════════════════════════════════════════
  // HALLAZGOS
  // ═══════════════════════════════════════════════════════════════════════════
  // El backend puede devolver:
  // 1. hallazgos[] (array) - múltiples hallazgos
  // 2. hallazgo (objeto único) - un solo hallazgo asociado al plan
  // 3. hallazgosAuditoria[] - hallazgos cargados de la auditoría (si el plan no tiene hallazgo)
  // Convertimos todo a array para el frontend
  
  let hallazgosBackend: any[] = [];
  
  // Opción 1: Array de hallazgos
  if (Array.isArray(planBackend.hallazgos) && planBackend.hallazgos.length > 0) {
    hallazgosBackend = planBackend.hallazgos;
  }
  // Opción 2: Un solo hallazgo (relación ManyToOne del backend)
  else if (planBackend.hallazgo && typeof planBackend.hallazgo === 'object') {
    hallazgosBackend = [planBackend.hallazgo];
  }
  // Opción 3: Hallazgos cargados de la auditoría
  else if (Array.isArray(planBackend.hallazgosAuditoria) && planBackend.hallazgosAuditoria.length > 0) {
    hallazgosBackend = planBackend.hallazgosAuditoria;
  }
  
  console.log('📋 [transformarPlanDetalle] Hallazgos encontrados:', hallazgosBackend.length, hallazgosBackend);
  
  // Acciones (primero) para poder calcular hallazgos con estados normalizados
  const accionesBackend = planBackend.acciones || [];
  const acciones: AccionCorrectiva[] = accionesBackend.map((a: any) => ({
    id: a.id,
    hallazgoId: a.hallazgoId || a.hallazgo_id || '',
    descripcion: a.descripcion || a.titulo || 'Sin descripción',
    responsable: a.responsable || 'Sin asignar',
    fechaInicio: a.fechaInicio || a.fecha_inicio || a.createdAt?.split('T')[0] || '',
    fechaVencimiento: a.fechaVencimiento || a.fecha_vencimiento || a.fechaLimite || '',
    estado: mapearEstadoAccion(a.estado),
    progreso: Number(a.progreso ?? a.porcentajeAvance ?? 0) || 0,
    evidencias: a.evidencias?.length || a.evidenciasCount || 0,
    observaciones: a.observaciones || a.comentarios || ''
  }));

  /** Progreso del hallazgo = % de acciones completadas (misma regla que filtros en Vista Acciones) */
  const hallazgos: HallazgoDetalle[] = hallazgosBackend.map((h: any) => {
    const hid = h.id;
    const accionesDelHallazgo = acciones.filter((a) => a.hallazgoId === hid);
    const completadas = accionesDelHallazgo.filter(
      (a) => a.estado === 'COMPLETADA' || (a.progreso ?? 0) >= 100
    ).length;
    const total = accionesDelHallazgo.length;

    return {
      id: hid,
      codigo: h.codigo || `H-${String(hid).substring(0, 4) || '001'}`,
      descripcion: h.descripcion || h.titulo || 'Sin descripción',
      criticidad: mapearCriticidad(h.gravedad || h.criticidad || h.categoria || 'MEDIA'),
      proceso: h.proceso || h.area || 'Sin proceso',
      responsable: h.responsable || 'Sin asignar',
      accionesCount: total,
      accionesCompletadas: completadas,
      progreso: total > 0 ? Math.round((completadas / total) * 100) : 0
    };
  });

  // Calcular progreso global (completada por estado o por %)
  const accionesCompletadas = acciones.filter(
    (a) => a.estado === 'COMPLETADA' || (a.progreso ?? 0) >= 100
  ).length;
  const progresoGlobal = acciones.length > 0 
    ? Math.round((accionesCompletadas / acciones.length) * 100) 
    : 0;

  // Manejar auditoría (puede ser objeto o string)
  const auditoriaObj = planBackend.auditoria;
  const nombreAuditoria = planBackend.nombreAuditoria || 
    planBackend.nombre_auditoria ||
    (typeof auditoriaObj === 'object' && auditoriaObj !== null 
      ? (auditoriaObj.nombre || auditoriaObj.titulo || auditoriaObj.codigo || 'Sin auditoría')
      : auditoriaObj) ||
    'Sin auditoría';

  // Seguimientos trimestrales
  const seguimientosBackend = planBackend.seguimientos || [];
  const seguimientos: SeguimientoTrimestral[] = seguimientosBackend.map((s: any) => ({
    id: s.id,
    trimestre: s.trimestre || 1,
    año: s.año || s.anio || new Date().getFullYear(),
    fechaInicio: s.fechaInicio || s.fecha_inicio || '',
    fechaFin: s.fechaFin || s.fecha_fin || '',
    fechaSeguimiento: s.fechaSeguimiento || s.fecha_seguimiento,
    avanceGlobal: s.avanceGlobal || s.avance_global || 0,
    porcentajeCumplimiento: s.porcentajeCumplimiento || s.porcentaje_cumplimiento || 0,
    porcentajeEfectividad: s.porcentajeEfectividad || s.porcentaje_efectividad || 0,
    accionesRevisadas: s.accionesRevisadas || s.acciones_revisadas || 0,
    accionesTotales: s.accionesTotales || s.acciones_totales || 0,
    observacionesGenerales: s.observacionesGenerales || s.observaciones_generales || '',
    registros: (s.registros || []).map((r: any) => ({
      id: r.id,
      accionId: r.accionId || r.accion_id,
      accionDescripcion: r.accionDescripcion || r.accion_descripcion || '',
      accionesProgramadas: r.accionesProgramadas || r.acciones_programadas || 1,
      accionesImplementadas: r.accionesImplementadas || r.acciones_implementadas || 0,
      puntajeCumplimiento: r.puntajeCumplimiento || r.puntaje_cumplimiento || 0,
      controlesImplementados: r.controlesImplementados || r.controles_implementados || 'NO',
      hallazgoSeRepite: r.hallazgoSeRepite || r.hallazgo_se_repite || 'NO',
      puntajeEfectividad: r.puntajeEfectividad || r.puntaje_efectividad || 0,
      observaciones: r.observaciones || ''
    })),
    createdAt: s.createdAt || s.created_at || ''
  }));

  return {
    id: planBackend.id,
    codigo: planBackend.codigo || `PM-${new Date().getFullYear()}-${planBackend.id?.substring(0, 4) || '001'}`,
    nombre: planBackend.titulo || planBackend.nombre || `Plan de Mejoramiento - ${nombreAuditoria}`,
    area: planBackend.area || planBackend.areaResponsable || '',
    responsableGeneral: planBackend.responsable || planBackend.responsableImplementacion || 'Sin asignar',
    fechaCreacion: planBackend.fechaCreacion || planBackend.fecha_creacion || planBackend.createdAt?.split('T')[0] || '',
    fechaVencimiento: planBackend.fechaLimite || planBackend.fechaVencimiento || planBackend.fecha_vencimiento || '',
    estado: mapearEstadoPlan(planBackend.estado),
    progresoGlobal,
    hallazgos,
    acciones,
    seguimientos,
    timeline: [], // Se cargará por separado
    auditoria: nombreAuditoria,
    auditoriaId: planBackend.auditoriaId || planBackend.auditoria_id || (typeof auditoriaObj === 'object' ? auditoriaObj?.id : undefined),
    observaciones: planBackend.observaciones || planBackend.descripcion || ''
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function usePlanMejoramientoDetalle(planId: string) {
  const [plan, setPlan] = useState<PlanMejoramientoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar plan del backend
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!planId) {
      setError('ID de plan no proporcionado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [usePlanMejoramientoDetalle] Cargando plan:', planId);
      
      const response = await controlInternoService.getPlanMejoramientoById(planId);
      console.log('📦 [usePlanMejoramientoDetalle] Respuesta plan:', response);
      
      if (response) {
        // ═══════════════════════════════════════════════════════════════════
        // Si el plan no tiene hallazgo directo pero tiene auditoría,
        // cargar los hallazgos de la auditoría
        // ═══════════════════════════════════════════════════════════════════
        let hallazgosAuditoria: any[] = [];
        const auditoriaId = response.auditoriaId || response.auditoria?.id;
        
        if (!response.hallazgo && auditoriaId) {
          console.log('🔍 [usePlanMejoramientoDetalle] Plan sin hallazgo, cargando de auditoría:', auditoriaId);
          try {
            hallazgosAuditoria = await controlInternoService.getHallazgosByAuditoria(auditoriaId);
            console.log('📋 [usePlanMejoramientoDetalle] Hallazgos de auditoría:', hallazgosAuditoria);
          } catch (err) {
            console.warn('[usePlanMejoramientoDetalle] No se pudieron cargar hallazgos de auditoría:', err);
          }
        }
        
        // Agregar los hallazgos al response antes de transformar
        const responseConHallazgos = {
          ...response,
          hallazgosAuditoria // Se procesará en transformarPlanDetalle
        };
        
        const planTransformado = transformarPlanDetalle(responseConHallazgos);
        console.log('🔄 [usePlanMejoramientoDetalle] Plan transformado:', planTransformado);

        // ═══════════════════════════════════════════════════════════════════
        // Cargar eventos del timeline (historial de cambios)
        // ═══════════════════════════════════════════════════════════════════
        try {
          console.log('📜 [usePlanMejoramientoDetalle] Cargando eventos del timeline...');
          const eventosBackend = await controlInternoService.getEventosTimelinePlan(planId);
          console.log('📜 [usePlanMejoramientoDetalle] Eventos cargados:', eventosBackend?.length || 0);
          
          if (Array.isArray(eventosBackend) && eventosBackend.length > 0) {
            const eventosFormateados: EventoTimeline[] = eventosBackend.map((e: any) => ({
              id: e.id,
              tipo: e.tipo as TipoEventoTimeline,
              descripcion: e.descripcion,
              usuarioNombre: e.usuarioNombre || e.usuario_nombre || 'Sistema',
              fecha: e.fecha || e.createdAt,
              metadata: e.metadata
            }));
            planTransformado.timeline = eventosFormateados;
          }
        } catch (timelineError) {
          console.warn('[usePlanMejoramientoDetalle] No se pudieron cargar eventos del timeline:', timelineError);
          // No fallar la carga del plan si no se pueden cargar los eventos
        }

        setPlan(planTransformado);
      } else {
        setError('Plan no encontrado');
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar plan';
      console.error('[usePlanMejoramientoDetalle] Error:', mensaje, err);
      setError(mensaje);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  // Mapeo de estado UI -> Backend (borrador, revision, aprobado, en_ejecucion, completado, vencido, rechazado)
  const mapearEstadoPlanABackend = (estadoUI: string): string => {
    const mapa: Record<string, string> = {
      'FORMULACION': 'borrador', 'formulacion': 'borrador',
      'APROBACION': 'revision', 'aprobacion': 'revision',
      'APROBADO': 'aprobado', 'aprobado': 'aprobado',
      'EN_EJECUCION': 'en_ejecucion', 'en_ejecucion': 'en_ejecucion',
      'EN_SEGUIMIENTO': 'en_ejecucion', 'en_seguimiento': 'en_ejecucion',
      'CUMPLIDO': 'completado', 'cumplido': 'completado',
      'COMPLETADO': 'completado', 'completado': 'completado',
      'VENCIDO': 'vencido', 'vencido': 'vencido',
      'RECHAZADO': 'rechazado', 'rechazado': 'rechazado',
      'BORRADOR': 'borrador', 'borrador': 'borrador',
      'REVISION': 'revision', 'revision': 'revision',
    };
    return mapa[estadoUI] || estadoUI.toLowerCase().replace(/-/g, '_');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar plan
  // ─────────────────────────────────────────────────────────────────────────
  const actualizarPlan = useCallback(async (data: UpdatePlanDto): Promise<boolean> => {
    if (!plan) return false;

    try {
      console.log('📝 [usePlanMejoramientoDetalle] Actualizando plan:', data);

      // Mapear datos UI -> Backend (solo campos aceptados por UpdatePlanMejoramientoDto)
      const datosBackend: Record<string, unknown> = {};
      if (data.estado) datosBackend.estado = mapearEstadoPlanABackend(data.estado);
      if (data.fechaVencimiento) datosBackend.fechaLimite = data.fechaVencimiento;
      if (data.responsableGeneral) datosBackend.responsableImplementacion = data.responsableGeneral;
      // observaciones no existe en DTO del plan; observacionesAprobacion es para aprobación
      if (data.observaciones) datosBackend.observacionesAprobacion = data.observaciones;

      await controlInternoService.updatePlanMejoramiento(plan.id, datosBackend);
      
      // Actualizar estado local
      setPlan(prev => prev ? {
        ...prev,
        ...(data.estado && { estado: mapearEstadoPlan(data.estado) }),
        ...(data.fechaVencimiento && { fechaVencimiento: data.fechaVencimiento }),
        ...(data.responsableGeneral && { responsableGeneral: data.responsableGeneral }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      } : null);
      
      toast.success('Plan actualizado exitosamente');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar plan';
      toast.error('Error al actualizar', { description: mensaje });
      return false;
    }
  }, [plan]);

  // ─────────────────────────────────────────────────────────────────────────
  // Crear acción
  // ─────────────────────────────────────────────────────────────────────────
  const crearAccion = useCallback(async (data: CreateAccionDto): Promise<boolean> => {
    if (!plan) return false;

    try {
      console.log('➕ [usePlanMejoramientoDetalle] Creando acción:', data);
      
      const response = await controlInternoService.crearAccionPlanMejoramiento(plan.id, data);
      
      // Agregar acción localmente
      const nuevaAccion: AccionCorrectiva = {
        id: response.id || `acc-${Date.now()}`,
        hallazgoId: data.hallazgoId,
        descripcion: data.descripcion,
        responsable: data.responsable,
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        estado: 'PENDIENTE',
        progreso: 0,
        evidencias: 0,
        observaciones: data.observaciones
      };
      
      setPlan(prev => {
        if (!prev) return null;
        
        // Actualizar contadores de hallazgo
        const hallazgosActualizados = prev.hallazgos.map(h => 
          h.id === data.hallazgoId 
            ? { ...h, accionesCount: h.accionesCount + 1 }
            : h
        );
        
        return {
          ...prev,
          acciones: [...prev.acciones, nuevaAccion],
          hallazgos: hallazgosActualizados
        };
      });
      
      toast.success('Acción creada exitosamente');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear acción';
      toast.error('Error al crear acción', { description: mensaje });
      return false;
    }
  }, [plan]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar acción
  // ─────────────────────────────────────────────────────────────────────────
  
  // Mapeo de estados UI -> Backend
  const mapearEstadoABackend = (estadoUI: string): EstadoAccionBackend => {
    const mapa: Record<string, EstadoAccionBackend> = {
      'PENDIENTE': 'programada',
      'EN_EJECUCION': 'en-progreso',
      'COMPLETADA': 'completada',
      'VENCIDA': 'vencida',
      'pendiente': 'programada',
      'en_ejecucion': 'en-progreso',
      'completada': 'completada',
      'implementada': 'implementada',
      'vencida': 'vencida'
    };
    return mapa[estadoUI] || 'programada';
  };
  
  const actualizarAccion = useCallback(async (accionId: string, data: any): Promise<boolean> => {
    if (!plan) return false;

    try {
      console.log('📝 [usePlanMejoramientoDetalle] Actualizando acción:', { accionId, data });
      
      // Preparar datos para el backend (mapear nombres de campos y valores)
      const datosBackend: any = {};
      if (data.descripcion) datosBackend.descripcion = data.descripcion;
      if (data.responsable) datosBackend.responsable = data.responsable;
      if (data.fechaInicio) datosBackend.fechaInicio = data.fechaInicio;
      if (data.fechaFin) datosBackend.fechaFin = data.fechaFin;
      if (data.fechaVencimiento) datosBackend.fechaFin = data.fechaVencimiento; // Mapear fechaVencimiento -> fechaFin
      
      // Mapear estado de UI a backend
      if (data.estado) {
        datosBackend.estado = mapearEstadoABackend(data.estado);
      }
      
      // Mapear progreso -> porcentajeAvance
      if (data.progreso !== undefined) datosBackend.porcentajeAvance = data.progreso;
      if (data.porcentajeAvance !== undefined) datosBackend.porcentajeAvance = data.porcentajeAvance;
      
      if (data.observaciones !== undefined) datosBackend.observaciones = data.observaciones;
      
      console.log('📤 [usePlanMejoramientoDetalle] Datos enviados al backend:', datosBackend);
      
      await controlInternoService.actualizarAccionPlanMejoramiento(plan.id, accionId, datosBackend);
      
      // Actualizar estado local (completada también si progreso ≥ 100)
      const accionCompleta = (a: { estado: string; progreso: number }) =>
        a.estado === 'COMPLETADA' || (a.progreso ?? 0) >= 100;

      setPlan(prev => {
        if (!prev) return null;

        const accionesActualizadas = prev.acciones.map(a => {
          if (a.id !== accionId) return a;
          let next: typeof a = {
            ...a,
            ...(data.descripcion && { descripcion: data.descripcion }),
            ...(data.responsable && { responsable: data.responsable }),
            ...(data.fechaInicio && { fechaInicio: data.fechaInicio }),
            ...(data.fechaVencimiento && { fechaVencimiento: data.fechaVencimiento }),
            ...(data.estado && { estado: mapearEstadoAccion(data.estado) }),
            ...(data.progreso !== undefined && { progreso: data.progreso }),
            ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
          };
          if ((next.progreso ?? 0) >= 100) {
            next = { ...next, estado: 'COMPLETADA', progreso: 100 };
          }
          return next;
        });

        const hallazgosActualizados = prev.hallazgos.map(h => {
          const accionesDelHallazgo = accionesActualizadas.filter(x => x.hallazgoId === h.id);
          const completadas = accionesDelHallazgo.filter(accionCompleta).length;
          return {
            ...h,
            accionesCompletadas: completadas,
            progreso:
              accionesDelHallazgo.length > 0
                ? Math.round((completadas / accionesDelHallazgo.length) * 100)
                : 0,
          };
        });

        const totalCompletadas = accionesActualizadas.filter(accionCompleta).length;
        const progresoGlobal =
          accionesActualizadas.length > 0
            ? Math.round((totalCompletadas / accionesActualizadas.length) * 100)
            : 0;

        return {
          ...prev,
          acciones: accionesActualizadas,
          hallazgos: hallazgosActualizados,
          progresoGlobal,
        };
      });
      
      toast.success('Acción actualizada exitosamente');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar acción';
      toast.error('Error al actualizar acción', { description: mensaje });
      return false;
    }
  }, [plan]);

  // ─────────────────────────────────────────────────────────────────────────
  // Eliminar acción
  // ─────────────────────────────────────────────────────────────────────────
  const eliminarAccion = useCallback(async (accionId: string): Promise<boolean> => {
    if (!plan) return false;

    try {
      console.log('🗑️ [usePlanMejoramientoDetalle] Eliminando acción:', accionId);
      
      await controlInternoService.eliminarAccionPlanMejoramiento(plan.id, accionId);
      
      // Actualizar estado local
      setPlan(prev => {
        if (!prev) return null;
        
        const accionEliminada = prev.acciones.find(a => a.id === accionId);
        const accionesActualizadas = prev.acciones.filter(a => a.id !== accionId);
        
        // Actualizar contadores de hallazgo
        const hallazgosActualizados = prev.hallazgos.map(h => {
          if (accionEliminada && h.id === accionEliminada.hallazgoId) {
            const completadasRestantes = accionesActualizadas
              .filter(a => a.hallazgoId === h.id && a.estado === 'COMPLETADA').length;
            const totalRestantes = accionesActualizadas.filter(a => a.hallazgoId === h.id).length;
            return {
              ...h,
              accionesCount: totalRestantes,
              accionesCompletadas: completadasRestantes,
              progreso: totalRestantes > 0 ? Math.round((completadasRestantes / totalRestantes) * 100) : 0
            };
          }
          return h;
        });
        
        // Recalcular progreso global
        const totalCompletadas = accionesActualizadas.filter(a => a.estado === 'COMPLETADA').length;
        const progresoGlobal = accionesActualizadas.length > 0 
          ? Math.round((totalCompletadas / accionesActualizadas.length) * 100) 
          : 0;
        
        return {
          ...prev,
          acciones: accionesActualizadas,
          hallazgos: hallazgosActualizados,
          progresoGlobal
        };
      });
      
      toast.success('Acción eliminada');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al eliminar acción';
      toast.error('Error al eliminar acción', { description: mensaje });
      return false;
    }
  }, [plan]);

  // ─────────────────────────────────────────────────────────────────────────
  // Efecto inicial
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    loading,
    error,
    refetch: fetchPlan,
    actualizarPlan,
    crearAccion,
    actualizarAccion,
    eliminarAccion
  };
}

export default usePlanMejoramientoDetalle;
