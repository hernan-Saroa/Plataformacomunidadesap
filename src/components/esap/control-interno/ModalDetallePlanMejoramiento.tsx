/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL DETALLE PLAN DE MEJORAMIENTO - VERSIÓN PREMIUM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal completo para visualización y gestión de Planes de Mejoramiento
 * 
 * CARACTERÍSTICAS:
 * - 5 tabs: Resumen, Hallazgos, Acciones, Documentos, Seguimiento
 * - Dashboard con KPIs detallados
 * - Gestión de acciones (crear, editar, completar)
 * - Carga de evidencias
 * - Timeline de actividades
 * - Semáforos de vencimiento
 * - Progreso visual por hallazgo y global
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
  TrendingUp, Activity, Target, Flag, Plus, Upload, Download,
  Edit2, Trash2, Eye, MessageSquare, Paperclip, History,
  BarChart3, Users, Building2, AlertCircle, Check, XCircle, Loader2, ChevronDown, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { planesMejoramientoApi, hallazgosApi, evidenciasApi } from './services/api';
import type { PlanMejoramiento as PlanMejoramientoBD, AccionMejoramiento, Hallazgo as HallazgoBD } from './services/types';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface Hallazgo {
  id: string;
  codigo: string;
  descripcion: string;
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
  proceso: string;
  area: string;
  responsable: string;
  accionesCount: number;
  accionesCompletadas: number;
  progreso: number;
}

interface AccionCorrectiva {
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

interface DocumentoPlan {
  id: string;
  nombre: string;
  tipo: string;
  fechaCarga: string;
  autor: string;
  tamanio: string;
}

interface ActividadTimeline {
  id: string;
  tipo: 'CREACION' | 'ACTUALIZACION' | 'COMPLETADA' | 'EVIDENCIA' | 'COMENTARIO';
  descripcion: string;
  usuario: string;
  fecha: string;
}

interface PlanMejoramientoDetalle {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  responsableGeneral: string;
  responsableAreaNombre?: string;
  fechaCreacion: string;
  fechaVencimiento: string;
  estado: 'FORMULACION' | 'APROBACION' | 'EN_EJECUCION' | 'EN_SEGUIMIENTO' | 'CUMPLIDO';
  progresoGlobal: number;
  hallazgos: Hallazgo[];
  acciones: AccionCorrectiva[];
  documentos: DocumentoPlan[];
  timeline: ActividadTimeline[];
  auditoria: string;
  observaciones?: string;
}

type TabActiva = 'resumen' | 'hallazgos' | 'acciones' | 'documentos' | 'seguimiento';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const PLAN_MOCK: PlanMejoramientoDetalle = {
  id: 'pm-2024-004',
  codigo: 'PM-2024-004',
  nombre: 'Plan de Mejoramiento - Auditoría TIC - Seguridad de la Información',
  area: 'Dirección de Tecnología',
  responsableGeneral: 'Jorge Silva',
  fechaCreacion: '2024-10-15',
  fechaVencimiento: '2025-04-15',
  estado: 'EN_EJECUCION',
  progresoGlobal: 45,
  auditoria: 'AU-2024-008 - Auditoría Control Interno TIC',
  observaciones: 'Plan en ejecución con avance según cronograma. Requiere seguimiento cercano en acciones de criticidad alta.',
  
  hallazgos: [
    {
      id: 'h1',
      codigo: 'H-001',
      descripcion: 'Falta de políticas documentadas de seguridad de la información',
      criticidad: 'ALTA',
      proceso: 'Gestión de Seguridad TI',
      area: 'Gestión de TI',
      responsable: 'Jorge Silva',
      accionesCount: 3,
      accionesCompletadas: 1,
      progreso: 33
    },
    {
      id: 'h2',
      codigo: 'H-002',
      descripcion: 'Ausencia de backups periódicos de bases de datos críticas',
      criticidad: 'ALTA',
      proceso: 'Infraestructura TI',
      area: 'Gestión de TI',
      responsable: 'María González',
      accionesCount: 2,
      accionesCompletadas: 1,
      progreso: 50
    },
    {
      id: 'h3',
      codigo: 'H-003',
      descripcion: 'Falta de capacitación en ciberseguridad para funcionarios',
      criticidad: 'MEDIA',
      proceso: 'Talento Humano TI',
      area: 'Gestión de TI',
      responsable: 'Carlos Méndez',
      accionesCount: 2,
      accionesCompletadas: 2,
      progreso: 100
    },
    {
      id: 'h4',
      codigo: 'H-004',
      descripcion: 'Documentación desactualizada de procedimientos técnicos',
      criticidad: 'BAJA',
      proceso: 'Gestión Documental TI',
      area: 'Gestión de TI',
      responsable: 'Ana Torres',
      accionesCount: 1,
      accionesCompletadas: 0,
      progreso: 0
    }
  ],

  acciones: [
    // Hallazgo H-001
    {
      id: 'a1',
      hallazgoId: 'h1',
      descripcion: 'Elaborar Manual de Políticas de Seguridad de la Información según ISO 27001',
      responsable: 'Jorge Silva',
      fechaInicio: '2024-10-20',
      fechaVencimiento: '2024-12-15',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 3,
      observaciones: 'Completado y socializado con el equipo'
    },
    {
      id: 'a2',
      hallazgoId: 'h1',
      descripcion: 'Aprobación del manual por el Comité de Dirección',
      responsable: 'Jorge Silva',
      fechaInicio: '2024-12-16',
      fechaVencimiento: '2025-01-15',
      estado: 'EN_EJECUCION',
      progreso: 60,
      evidencias: 1
    },
    {
      id: 'a3',
      hallazgoId: 'h1',
      descripcion: 'Socialización del manual a todos los funcionarios',
      responsable: 'María González',
      fechaInicio: '2025-01-16',
      fechaVencimiento: '2025-02-28',
      estado: 'PENDIENTE',
      progreso: 0,
      evidencias: 0
    },
    
    // Hallazgo H-002
    {
      id: 'a4',
      hallazgoId: 'h2',
      descripcion: 'Implementar sistema automatizado de backups diarios',
      responsable: 'María González',
      fechaInicio: '2024-11-01',
      fechaVencimiento: '2024-12-31',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 2
    },
    {
      id: 'a5',
      hallazgoId: 'h2',
      descripcion: 'Documentar procedimiento de restauración y realizar pruebas',
      responsable: 'Carlos Méndez',
      fechaInicio: '2025-01-05',
      fechaVencimiento: '2025-03-15',
      estado: 'EN_EJECUCION',
      progreso: 40,
      evidencias: 1
    },

    // Hallazgo H-003
    {
      id: 'a6',
      hallazgoId: 'h3',
      descripcion: 'Diseñar programa de capacitación en ciberseguridad',
      responsable: 'Carlos Méndez',
      fechaInicio: '2024-10-25',
      fechaVencimiento: '2024-11-30',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 2
    },
    {
      id: 'a7',
      hallazgoId: 'h3',
      descripcion: 'Ejecutar jornadas de capacitación para 100% del personal',
      responsable: 'Ana Torres',
      fechaInicio: '2024-12-01',
      fechaVencimiento: '2025-01-31',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 4
    },

    // Hallazgo H-004
    {
      id: 'a8',
      hallazgoId: 'h4',
      descripcion: 'Actualizar documentación técnica de procedimientos TI',
      responsable: 'Ana Torres',
      fechaInicio: '2025-02-01',
      fechaVencimiento: '2025-04-15',
      estado: 'PENDIENTE',
      progreso: 0,
      evidencias: 0
    }
  ],

  documentos: [
    {
      id: 'd1',
      nombre: 'Plan de Mejoramiento PM-2024-004.pdf',
      tipo: 'PDF',
      fechaCarga: '2024-10-15',
      autor: 'Jorge Silva',
      tamanio: '2.4 MB'
    },
    {
      id: 'd2',
      nombre: 'Manual Políticas Seguridad v1.0.pdf',
      tipo: 'PDF',
      fechaCarga: '2024-12-15',
      autor: 'Jorge Silva',
      tamanio: '3.8 MB'
    },
    {
      id: 'd3',
      nombre: 'Evidencia Implementación Backups.xlsx',
      tipo: 'XLSX',
      fechaCarga: '2024-12-31',
      autor: 'María González',
      tamanio: '1.2 MB'
    },
    {
      id: 'd4',
      nombre: 'Certificados Capacitación Ciberseguridad.pdf',
      tipo: 'PDF',
      fechaCarga: '2025-01-31',
      autor: 'Carlos Méndez',
      tamanio: '5.6 MB'
    }
  ],

  timeline: [
    {
      id: 't1',
      tipo: 'CREACION',
      descripcion: 'Plan de mejoramiento creado',
      usuario: 'Jorge Silva',
      fecha: '2024-10-15 09:30'
    },
    {
      id: 't2',
      tipo: 'COMPLETADA',
      descripcion: 'Acción A1 completada: Manual de Políticas elaborado',
      usuario: 'Jorge Silva',
      fecha: '2024-12-15 16:45'
    },
    {
      id: 't3',
      tipo: 'EVIDENCIA',
      descripcion: 'Cargada evidencia de implementación de backups',
      usuario: 'María González',
      fecha: '2024-12-31 11:20'
    },
    {
      id: 't4',
      tipo: 'COMPLETADA',
      descripcion: 'Hallazgo H-003 completado al 100%',
      usuario: 'Carlos Méndez',
      fecha: '2025-01-31 14:30'
    },
    {
      id: 't5',
      tipo: 'ACTUALIZACION',
      descripcion: 'Actualizado progreso de acción A2 al 60%',
      usuario: 'Jorge Silva',
      fecha: '2025-02-10 10:15'
    }
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE MAPEO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Mapea el estado del backend al estado del modal
 */
function mapearEstadoBD(estadoBD: string): PlanMejoramientoDetalle['estado'] {
  switch (estadoBD) {
    case 'borrador':
      return 'FORMULACION';
    case 'aprobado':
      return 'APROBACION';
    case 'en-ejecucion':
      return 'EN_EJECUCION';
    case 'cerrado':
      return 'CUMPLIDO';
    default:
      return 'FORMULACION';
  }
}

/**
 * Mapea el estado de acción del backend al estado del modal
 */
function mapearEstadoAccionBD(estadoBD: string): AccionCorrectiva['estado'] {
  switch (estadoBD) {
    case 'programada':
      return 'PENDIENTE';
    case 'en-progreso':
    case 'en-ejecucion':
      return 'EN_EJECUCION';
    case 'implementada':
    case 'completada':
      return 'COMPLETADA';
    case 'vencida':
    case 'atrasada':
      return 'VENCIDA';
    default:
      return 'PENDIENTE';
  }
}

/**
 * Mapea la gravedad del backend a criticidad del modal
 */
function mapearGravedadACriticidad(gravedad: string): Hallazgo['criticidad'] {
  const gravedadLower = gravedad?.toLowerCase() || '';
  if (gravedadLower === 'alta' || gravedadLower === 'crítica' || gravedadLower === 'critica') {
    return 'ALTA';
  }
  if (gravedadLower === 'media' || gravedadLower === 'moderado' || gravedadLower === 'moderada') {
    return 'MEDIA';
  }
  return 'BAJA';
}

/**
 * Mapea un PlanMejoramiento del backend a PlanMejoramientoDetalle del modal
 */
async function mapearPlanDetalleDesdeBD(
  planBD: any, // Usar any temporalmente para manejar diferentes estructuras del backend
  hallazgosCargados: HallazgoBD[] = []
): Promise<PlanMejoramientoDetalle> {
  
  // Mapear acciones - pueden venir como AccionCorrectiva del backend o AccionMejoramiento del tipo
  const accionesMapeadas: AccionCorrectiva[] = (planBD.acciones || []).map((accion: any) => {
    // Calcular estado real basado en el progreso
    let estado = mapearEstadoAccionBD(accion.estado);
    
    // Si el progreso es menor a 100%, NO puede estar completada
    if (estado === 'COMPLETADA' && accion.porcentajeAvance < 100) {
      estado = accion.porcentajeAvance > 0 ? 'EN_EJECUCION' : 'PENDIENTE';
    }
    
    // Verificar si está vencida
    if (estado === 'PENDIENTE' || estado === 'EN_EJECUCION') {
      const hoy = new Date();
      const fechaFin = new Date(accion.fechaFin);
      if (fechaFin < hoy && accion.porcentajeAvance < 100) {
        estado = 'VENCIDA';
      }
    }

    // Formatear fechas (pueden venir en formato ISO o YYYY-MM-DD)
    const fechaInicioStr = accion.fechaInicio ? String(accion.fechaInicio) : '';
    const fechaFinStr = accion.fechaFin ? String(accion.fechaFin) : '';
    
    const fechaInicio = fechaInicioStr.includes('T') 
      ? fechaInicioStr.split('T')[0] 
      : fechaInicioStr;
    const fechaFin = fechaFinStr.includes('T') 
      ? fechaFinStr.split('T')[0] 
      : fechaFinStr;

    // Usar el hallazgoId de la acción si existe, sino usar el del plan como fallback
    const hallazgoIdAccion = accion.hallazgoId || planBD.hallazgoId || planBD.hallazgo?.id || '';

    return {
      id: accion.id,
      hallazgoId: hallazgoIdAccion, // Usar el hallazgoId específico de la acción
      descripcion: accion.descripcion || '',
      responsable: accion.responsable || '',
      fechaInicio: fechaInicio || new Date().toISOString().split('T')[0],
      fechaVencimiento: fechaFin || new Date().toISOString().split('T')[0],
      estado,
      progreso: accion.porcentajeAvance || 0,
      evidencias: (accion.evidencias && Array.isArray(accion.evidencias)) ? accion.evidencias.length : 0,
      observaciones: accion.observaciones || ''
    };
  });

  // Mapear hallazgos
  const hallazgosMapeados: Hallazgo[] = hallazgosCargados.map((h: HallazgoBD) => {
    const accionesHallazgo = accionesMapeadas.filter(a => a.hallazgoId === h.id);
    const accionesCompletadas = accionesHallazgo.filter(a => a.estado === 'COMPLETADA').length;
    
    // Calcular progreso basado en el promedio del progreso de las acciones, no solo las completadas
    let progreso = 0;
    if (accionesHallazgo.length > 0) {
      const sumaProgreso = accionesHallazgo.reduce((sum, accion) => sum + accion.progreso, 0);
      progreso = Math.round(sumaProgreso / accionesHallazgo.length);
    }

    // Obtener responsable del hallazgo o usar el responsableAreaNombre de la auditoría como fallback
    const hallazgoAny = h as any;
    const responsableHallazgo = hallazgoAny.responsable || 
      hallazgoAny.auditoriaEntity?.responsableAreaNombre || 
      '';

    return {
      id: h.id,
      codigo: h.codigo,
      descripcion: h.descripcion || h.titulo || '',
      criticidad: mapearGravedadACriticidad(h.gravedad || ''),
      proceso: h.criterioIncumplido || '', // Usar criterioIncumplido como proceso
      area: hallazgoAny.area || '',
      responsable: responsableHallazgo,
      accionesCount: accionesHallazgo.length,
      accionesCompletadas,
      progreso
    };
  });

  // Calcular fecha de vencimiento (usar la fecha más lejana de las acciones o fechaLimite/fechaCreacion + 1 año)
  const fechaElaboracion = new Date(planBD.fechaLimite || planBD.fechaCreacion || planBD.createdAt || planBD.fechaElaboracion || new Date());
  let fechaVencimiento = new Date(fechaElaboracion);
  fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);

  if (accionesMapeadas.length > 0) {
    const fechasFin = accionesMapeadas.map(a => new Date(a.fechaVencimiento));
    const fechaMax = new Date(Math.max(...fechasFin.map(d => d.getTime())));
    if (fechaMax > fechaVencimiento) {
      fechaVencimiento = fechaMax;
    }
  }

  // ✅ CARGAR EVENTOS REALES DEL BACKEND
  let timeline: ActividadTimeline[] = [];
  
  try {
    const eventosResponse = await planesMejoramientoApi.getEventosTimeline(planBD.id);
    
    if (eventosResponse.success && eventosResponse.data?.eventos) {
      // Mapear eventos desde el backend al formato del frontend
      timeline = eventosResponse.data.eventos.map((evento: any) => ({
        id: evento.id,
        tipo: evento.tipo as ActividadTimeline['tipo'],
        descripcion: evento.descripcion,
        usuario: evento.usuarioNombre || 'Sistema',
        fecha: new Date(evento.fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));
    }
  } catch (error) {
    console.warn('[ModalDetallePlan] Error al cargar eventos del timeline:', error);
    // Si falla, el timeline quedará vacío
  }

  // El backend puede tener 'titulo' en lugar de 'nombre', 'fechaLimite' en lugar de 'fechaElaboracion'
  const nombrePlan = planBD.nombre || planBD.titulo || planBD.codigo || 'Plan sin nombre';
  const fechaCreacionPlan = planBD.fechaCreacion || planBD.createdAt || planBD.fechaElaboracion || new Date().toISOString().split('T')[0];
  const responsablePlan = planBD.responsable || planBD.responsableImplementacion || '';
  const areaPlan = planBD.area || planBD.areaResponsable || '';
  const auditoriaCodigo = planBD.auditoriaCodigo || planBD.auditoria?.codigo || '';
  // Obtener responsableAreaNombre de la auditoría
  const responsableAreaNombre = (planBD.auditoria as any)?.responsableAreaNombre || '';

  return {
    id: planBD.id,
    codigo: planBD.codigo,
    nombre: nombrePlan,
    area: areaPlan,
    responsableGeneral: responsablePlan,
    responsableAreaNombre: responsableAreaNombre, // Agregar responsableAreaNombre
    fechaCreacion: fechaCreacionPlan,
    fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
    estado: mapearEstadoBD(planBD.estado),
    progresoGlobal: planBD.porcentajeAvanceGeneral || 0,
    hallazgos: hallazgosMapeados,
    acciones: accionesMapeadas,
    documentos: [], // Los documentos se cargarían por separado si existe un endpoint
    timeline,
    auditoria: auditoriaCodigo,
    observaciones: planBD.observaciones || ''
  };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetallePlanProps {
  planId: string;
  onClose: () => void;
}

export function ModalDetallePlanMejoramiento({ planId, onClose }: ModalDetallePlanProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>('resumen');
  const [modalActualizacion, setModalActualizacion] = useState(false);
  const [plan, setPlan] = useState<PlanMejoramientoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conteoDocumentos, setConteoDocumentos] = useState<number>(0);

  // Cargar datos del plan desde el backend
  useEffect(() => {
    const cargarPlan = async () => {
      if (!planId) return;

      try {
        setLoading(true);
        setError(null);

        // Cargar plan desde el backend
        const response = await planesMejoramientoApi.getById(planId);
        
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Error al cargar el plan');
        }

        const planBD = response.data;

        // Cargar TODOS los hallazgos de la auditoría, no solo el asociado al plan
        let hallazgosCargados: HallazgoBD[] = [];
        
        // Si el plan tiene auditoriaId, cargar todos los hallazgos de esa auditoría
        if (planBD.auditoriaId) {
          try {
            const hallazgosResponse = await hallazgosApi.getByAuditoria(planBD.auditoriaId);
            if (hallazgosResponse.success && hallazgosResponse.data) {
              hallazgosCargados = hallazgosResponse.data;
            }
          } catch (errorHallazgos) {
            console.warn('[ModalDetallePlan] Error al cargar hallazgos de la auditoría:', errorHallazgos);
            // Si falla, intentar con el método alternativo
          }
        }
        
        // Si no se cargaron hallazgos desde la auditoría, intentar métodos alternativos
        if (hallazgosCargados.length === 0) {
          // Si viene el objeto hallazgo directamente (estructura del backend)
          if (planBD.hallazgo && typeof planBD.hallazgo === 'object') {
            hallazgosCargados = [planBD.hallazgo as HallazgoBD];
          }
          // Si viene un array de IDs
          else if (planBD.hallazgosIds && Array.isArray(planBD.hallazgosIds) && planBD.hallazgosIds.length > 0) {
            try {
              // Cargar cada hallazgo por ID
              const hallazgosPromises = planBD.hallazgosIds.map((id: string) => 
                hallazgosApi.getById(id).then(r => r.success && r.data ? r.data : null).catch(() => null)
              );
              const hallazgosResults = await Promise.all(hallazgosPromises);
              hallazgosCargados = hallazgosResults.filter((h): h is HallazgoBD => h !== null && h !== undefined);
            } catch (errorHallazgos) {
              console.warn('[ModalDetallePlan] Error al cargar hallazgos por IDs:', errorHallazgos);
            }
          }
          // Si viene un solo ID de hallazgo (hallazgoId)
          else if (planBD.hallazgoId) {
            try {
              const hallazgoResponse = await hallazgosApi.getById(planBD.hallazgoId);
              if (hallazgoResponse.success && hallazgoResponse.data) {
                hallazgosCargados = [hallazgoResponse.data];
              }
            } catch (errorHallazgos) {
              console.warn('[ModalDetallePlan] Error al cargar hallazgo por ID:', errorHallazgos);
            }
          }
        }

        // Mapear plan a formato del modal
        const planMapeado = await mapearPlanDetalleDesdeBD(planBD, hallazgosCargados);
        setPlan(planMapeado);
      } catch (err: any) {
        console.error('[ModalDetallePlan] Error al cargar plan:', err);
        setError(err.message || 'Error al cargar el plan de mejoramiento');
        toast.error('Error al cargar el plan', {
          description: err.message || 'No se pudo cargar la información del plan'
        });
      } finally {
        setLoading(false);
      }
    };

    cargarPlan();
  }, [planId]);

  // Función para recargar el plan después de crear/editar acciones
  const handleRecargarPlan = async () => {
    if (!planId) return;

    try {
      setLoading(true);
      const response = await planesMejoramientoApi.getById(planId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al recargar el plan');
      }

      const planBD = response.data;

      // Cargar TODOS los hallazgos de la auditoría
      let hallazgosCargados: HallazgoBD[] = [];
      
      if (planBD.auditoriaId) {
        try {
          const hallazgosResponse = await hallazgosApi.getByAuditoria(planBD.auditoriaId);
          if (hallazgosResponse.success && hallazgosResponse.data) {
            hallazgosCargados = hallazgosResponse.data;
          }
        } catch (errorHallazgos) {
          console.warn('[ModalDetallePlan] Error al recargar hallazgos de la auditoría:', errorHallazgos);
          // Fallback a métodos alternativos
          if (planBD.hallazgo && typeof planBD.hallazgo === 'object') {
            hallazgosCargados = [planBD.hallazgo as HallazgoBD];
          } else if (planBD.hallazgosIds && Array.isArray(planBD.hallazgosIds) && planBD.hallazgosIds.length > 0) {
            try {
              const hallazgosPromises = planBD.hallazgosIds.map((id: string) => 
                hallazgosApi.getById(id).then(r => r.success && r.data ? r.data : null).catch(() => null)
              );
              const hallazgosResults = await Promise.all(hallazgosPromises);
              hallazgosCargados = hallazgosResults.filter((h): h is HallazgoBD => h !== null && h !== undefined);
            } catch (errorHallazgos2) {
              console.warn('[ModalDetallePlan] Error al recargar hallazgos por IDs:', errorHallazgos2);
            }
          }
        }
      }

      const planMapeado = await mapearPlanDetalleDesdeBD(planBD, hallazgosCargados);
      setPlan(planMapeado);
    } catch (err: any) {
      console.error('[ModalDetallePlan] Error al recargar plan:', err);
      toast.error('Error al recargar el plan', {
        description: err.message || 'No se pudo recargar la información'
      });
    } finally {
      setLoading(false);
    }
  };

  // Estado para el formulario de actualización
  const [datosActualizacion, setDatosActualizacion] = useState({
    estado: 'FORMULACION' as PlanMejoramientoDetalle['estado'],
    fechaVencimiento: '',
    responsableGeneral: '',
    observaciones: ''
  });

  // Actualizar datos de actualización cuando se carga el plan
  useEffect(() => {
    if (plan) {
      setDatosActualizacion({
        estado: plan.estado,
        fechaVencimiento: plan.fechaVencimiento,
        responsableGeneral: plan.responsableGeneral,
        observaciones: plan.observaciones || ''
      });
    }
  }, [plan]);

  const estadisticas = useMemo(() => {
    if (!plan) {
      return {
        totalAcciones: 0,
        accionesCompletadas: 0,
        accionesEnEjecucion: 0,
        accionesPendientes: 0,
        accionesVencidas: 0,
        totalHallazgos: 0,
        hallazgosResueltos: 0,
        hallazgosCriticosAbiertos: 0,
        porcentajeCompletado: 0
      };
    }

    const totalAcciones = plan.acciones.length;
    const accionesCompletadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;
    const accionesEnEjecucion = plan.acciones.filter(a => a.estado === 'EN_EJECUCION').length;
    const accionesPendientes = plan.acciones.filter(a => a.estado === 'PENDIENTE').length;
    const accionesVencidas = plan.acciones.filter(a => a.estado === 'VENCIDA').length;

    const totalHallazgos = plan.hallazgos.length;
    const hallazgosResueltos = plan.hallazgos.filter(h => h.progreso === 100).length;
    const hallazgosCriticosAbiertos = plan.hallazgos.filter(h => h.criticidad === 'ALTA' && h.progreso < 100).length;

    return {
      totalAcciones,
      accionesCompletadas,
      accionesEnEjecucion,
      accionesPendientes,
      accionesVencidas,
      totalHallazgos,
      hallazgosResueltos,
      hallazgosCriticosAbiertos,
      porcentajeCompletado: totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0
    };
  }, [plan]);

  const handleActualizarPlan = () => {
    setModalActualizacion(true);
  };

  const handleGuardarActualizacion = async () => {
    if (!plan) return;

    // Validaciones básicas
    if (!datosActualizacion.estado) {
      toast.error('Debes seleccionar un estado');
      return;
    }

    if (!datosActualizacion.fechaVencimiento) {
      toast.error('Debes especificar una fecha de vencimiento');
      return;
    }

    try {
      // Actualizar en el backend
      await planesMejoramientoApi.update(plan.id, {
        estado: datosActualizacion.estado === 'FORMULACION' ? 'borrador' :
                datosActualizacion.estado === 'APROBACION' ? 'aprobado' :
                datosActualizacion.estado === 'EN_EJECUCION' ? 'en-ejecucion' :
                datosActualizacion.estado === 'CUMPLIDO' ? 'cerrado' : 'borrador',
        observaciones: datosActualizacion.observaciones
      });

      toast.success('Plan de Mejoramiento Actualizado', {
        description: `El plan ${plan.codigo} ha sido actualizado exitosamente`,
        duration: 4000,
      });

      setModalActualizacion(false);
      
      // Recargar datos del plan
      const response = await planesMejoramientoApi.getById(planId);
      if (response.success && response.data) {
        // Recargar también hallazgos si es necesario
        let hallazgosCargados: HallazgoBD[] = [];
        if (response.data.hallazgosIds && response.data.hallazgosIds.length > 0) {
          try {
            const hallazgosPromises = response.data.hallazgosIds.map((id: string) => 
              hallazgosApi.getById(id).then(r => r.data)
            );
            const hallazgosResults = await Promise.all(hallazgosPromises);
            hallazgosCargados = hallazgosResults.filter((h): h is HallazgoBD => h !== undefined);
          } catch (errorHallazgos) {
            console.warn('[ModalDetallePlan] Error al recargar hallazgos:', errorHallazgos);
          }
        }
        const planMapeado = await mapearPlanDetalleDesdeBD(response.data, hallazgosCargados);
        setPlan(planMapeado);
      }
    } catch (err: any) {
      console.error('[ModalDetallePlan] Error al actualizar plan:', err);
      toast.error('Error al actualizar el plan', {
        description: err.message || 'No se pudo actualizar el plan'
      });
    }
  };

  const handleDescargarReporte = () => {
    if (!plan) return;

    toast.success('Generando Reporte PDF', {
      description: 'El reporte del plan se está descargando...',
      duration: 3000,
    });
    
    console.log('📄 Descargando reporte del plan:', {
      planId: plan.id,
      codigo: plan.codigo,
      formato: 'PDF',
      timestamp: new Date().toISOString()
    });
  };

  const estadoConfig = {
    FORMULACION: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Formulación' },
    APROBACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aprobación' },
    EN_EJECUCION: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Ejecución' },
    EN_SEGUIMIENTO: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Seguimiento' },
    CUMPLIDO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cumplido' }
  };

  // Manejar estados de carga y error
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 z-[9999]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#1e5da8]" />
            <p className="text-gray-600">Cargando plan de mejoramiento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 z-[9999] max-w-md">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Error al cargar el plan</h3>
            <p className="text-gray-600 text-center">{error || 'No se pudo cargar la información del plan'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#2a6dbd] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const config = estadoConfig[plan.estado];

  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-start justify-center bg-black/60 backdrop-blur-sm">
      {/* Overlay con efecto blur */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal - Tamaño optimizado con mejor responsive */}
      <div className="relative w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-7xl my-8 mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] z-[9999]">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-medium">{plan.codigo}</h2>
                <span className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${config.bg} ${config.text} inline-block w-fit`}>
                  {config.label}
                </span>
              </div>
              <p className="text-blue-100 mb-4 text-sm sm:text-base">{plan.nombre}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-blue-200 text-xs mb-1">Área Responsable</div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{plan.area}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Responsable</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{plan.responsableGeneral}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Fecha Vencimiento</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    {plan.fechaVencimiento}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Progreso Global</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    {plan.progresoGlobal}%
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progreso Global */}
          <div className="mt-3">
            <div className="bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${plan.progresoGlobal}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPIs Dashboard */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="grid grid-cols-6 gap-2">
            <KPICard
              label="Total Acciones"
              valor={estadisticas.totalAcciones}
              color="blue"
              icon={<Target className="w-4 h-4" />}
            />
            <KPICard
              label="Completadas"
              valor={estadisticas.accionesCompletadas}
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KPICard
              label="En Ejecución"
              valor={estadisticas.accionesEnEjecucion}
              color="yellow"
              icon={<Activity className="w-4 h-4" />}
            />
            <KPICard
              label="Pendientes"
              valor={estadisticas.accionesPendientes}
              color="gray"
              icon={<Clock className="w-4 h-4" />}
            />
            <KPICard
              label="Hallazgos Resueltos"
              valor={`${estadisticas.hallazgosResueltos}/${estadisticas.totalHallazgos}`}
              color="purple"
              icon={<Flag className="w-4 h-4" />}
            />
            <KPICard
              label="Críticos Abiertos"
              valor={estadisticas.hallazgosCriticosAbiertos}
              color="red"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
          <div className="flex gap-1">
            <TabButton
              active={tabActiva === 'resumen'}
              onClick={() => setTabActiva('resumen')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Resumen"
            />
            <TabButton
              active={tabActiva === 'hallazgos'}
              onClick={() => setTabActiva('hallazgos')}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Hallazgos"
              badge={plan.hallazgos.length.toString()}
            />
            <TabButton
              active={tabActiva === 'acciones'}
              onClick={() => setTabActiva('acciones')}
              icon={<Target className="w-4 h-4" />}
              label="Acciones"
              badge={plan.acciones.length.toString()}
            />
            <TabButton
              active={tabActiva === 'documentos'}
              onClick={() => setTabActiva('documentos')}
              icon={<FileText className="w-4 h-4" />}
              label="Documentos"
              badge={(conteoDocumentos ?? 0).toString()}
            />
            <TabButton
              active={tabActiva === 'seguimiento'}
              onClick={() => setTabActiva('seguimiento')}
              icon={<History className="w-4 h-4" />}
              label="Seguimiento"
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tabActiva}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {tabActiva === 'resumen' && <TabResumen plan={plan} estadisticas={estadisticas} />}
              {tabActiva === 'hallazgos' && <TabHallazgos plan={plan} />}
              {tabActiva === 'acciones' && <TabAcciones plan={plan} planId={planId} onAccionCreada={handleRecargarPlan} />}
              {tabActiva === 'documentos' && <TabDocumentos plan={plan} onDocumentosCargados={setConteoDocumentos} />}
              {tabActiva === 'seguimiento' && <TabSeguimiento plan={plan} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer con Acciones */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Última actualización: {plan.timeline[0]?.fecha}
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                onClick={handleDescargarReporte}
              >
                <Download className="w-4 h-4" />
                Descargar Reporte
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                onClick={handleActualizarPlan}
              >
                <Edit2 className="w-4 h-4" />
                Actualizar Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Actualización */}
      {modalActualizacion && (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
          {/* Overlay con efecto blur oscuro */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalActualizacion(false)} />

          {/* Modal - Tamaño optimizado */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-medium">Actualizar Plan de Mejoramiento</h2>
                  </div>
                </div>

                <button
                  onClick={() => setModalActualizacion(false)}
                  className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Código" valor={plan.codigo} />
                    <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
                    <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
                    <InfoItem label="Área Responsable" valor={plan.area} />
                    <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
                    {plan.responsableAreaNombre && (
                      <InfoItem label="Responsable del Área Auditada" valor={plan.responsableAreaNombre} />
                    )}
                    <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
                    <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
                    <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
                  </div>

                  {plan.observaciones && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
                      <div className="text-sm text-blue-700">{plan.observaciones}</div>
                    </div>
                  )}
                </div>

                {/* Distribución de Acciones */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
                  <div className="space-y-3">
                    <ProgresoBar
                      label="Completadas"
                      valor={estadisticas.accionesCompletadas}
                      total={estadisticas.totalAcciones}
                      color="green"
                    />
                    <ProgresoBar
                      label="En Ejecución"
                      valor={estadisticas.accionesEnEjecucion}
                      total={estadisticas.totalAcciones}
                      color="yellow"
                    />
                    <ProgresoBar
                      label="Pendientes"
                      valor={estadisticas.accionesPendientes}
                      total={estadisticas.totalAcciones}
                      color="gray"
                    />
                    {estadisticas.accionesVencidas > 0 && (
                      <ProgresoBar
                        label="Vencidas"
                        valor={estadisticas.accionesVencidas}
                        total={estadisticas.totalAcciones}
                        color="red"
                      />
                    )}
                  </div>
                </div>

                {/* Hallazgos Críticos */}
                {estadisticas.hallazgosCriticosAbiertos > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-900 mb-1">
                          Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
                        </h4>
                        <p className="text-sm text-red-700">
                          Existen hallazgos de criticidad alta que requieren atención prioritaria
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Última actualización: {plan.timeline[0]?.fecha}
                </div>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                    onClick={handleGuardarActualizacion}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPI CARD
// ════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  label: string;
  valor: string | number;
  color: 'blue' | 'green' | 'yellow' | 'gray' | 'purple' | 'red';
  icon: React.ReactNode;
}

function KPICard({ label, valor, color, icon }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  };

  return (
    <div className={`rounded-lg border p-2.5 ${colorClasses[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <div className="text-xs opacity-80 leading-tight">{label}</div>
      </div>
      <div className="text-lg font-semibold">{valor}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: RESUMEN
// ════════════════════════════════════════════════════════════════════════════

function TabResumen({ plan, estadisticas }: { plan: PlanMejoramientoDetalle; estadisticas: any }) {
  return (
    <div className="space-y-6">
      {/* Información General */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Código" valor={plan.codigo} />
          <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
          <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
          <InfoItem label="Área Responsable" valor={plan.area} />
          <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
          {plan.responsableAreaNombre && (
            <InfoItem label="Responsable del Área Auditada" valor={plan.responsableAreaNombre} />
          )}
          <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
          <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
          <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
        </div>

        {plan.observaciones && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
            <div className="text-sm text-blue-700">{plan.observaciones}</div>
          </div>
        )}
      </div>

      {/* Distribución de Acciones */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
        <div className="space-y-3">
          <ProgresoBar
            label="Completadas"
            valor={estadisticas.accionesCompletadas}
            total={estadisticas.totalAcciones}
            color="green"
          />
          <ProgresoBar
            label="En Ejecución"
            valor={estadisticas.accionesEnEjecucion}
            total={estadisticas.totalAcciones}
            color="yellow"
          />
          <ProgresoBar
            label="Pendientes"
            valor={estadisticas.accionesPendientes}
            total={estadisticas.totalAcciones}
            color="gray"
          />
          {estadisticas.accionesVencidas > 0 && (
            <ProgresoBar
              label="Vencidas"
              valor={estadisticas.accionesVencidas}
              total={estadisticas.totalAcciones}
              color="red"
            />
          )}
        </div>
      </div>

      {/* Hallazgos Críticos */}
      {estadisticas.hallazgosCriticosAbiertos > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900 mb-1">
                Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
              </h4>
              <p className="text-sm text-red-700">
                Existen hallazgos de criticidad alta que requieren atención prioritaria
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: HALLAZGOS
// ════════════════════════════════════════════════════════════════════════════

function TabHallazgos({ plan }: { plan: PlanMejoramientoDetalle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Hallazgos del Plan</h3>
          <p className="text-sm text-gray-600">{plan.hallazgos.length} hallazgos identificados</p>
        </div>
      </div>

      {plan.hallazgos.map((hallazgo) => (
        <CardHallazgo key={hallazgo.id} hallazgo={hallazgo} plan={plan} />
      ))}
    </div>
  );
}

function CardHallazgo({ hallazgo, plan }: { hallazgo: Hallazgo; plan: PlanMejoramientoDetalle }) {
  const [expandido, setExpandido] = useState(false);

  const criticidadConfig = {
    ALTA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítica' },
    MEDIA: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Media' },
    BAJA: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Baja' }
  };

  const config = criticidadConfig[hallazgo.criticidad];
  const accionesHallazgo = plan.acciones.filter(a => a.hallazgoId === hallazgo.id);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-900">{hallazgo.codigo}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-600">{hallazgo.proceso}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{hallazgo.descripcion}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {hallazgo.area || 'No especificada'}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {hallazgo.responsable || 'No asignado'}
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {hallazgo.accionesCompletadas}/{hallazgo.accionesCount} acciones completadas
              </div>
            </div>
          </div>

          {/* Progreso Circular */}
          <div className="text-center">
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
              hallazgo.progreso === 100 ? 'bg-green-100' :
              hallazgo.progreso >= 50 ? 'bg-yellow-100' :
              'bg-gray-100'
            }`}>
              <span className={`text-lg font-semibold ${
                hallazgo.progreso === 100 ? 'text-green-700' :
                hallazgo.progreso >= 50 ? 'text-yellow-700' :
                'text-gray-700'
              }`}>
                {hallazgo.progreso}%
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mb-3">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                hallazgo.progreso === 100 ? 'bg-green-600' :
                hallazgo.progreso >= 50 ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${hallazgo.progreso}%` }}
            />
          </div>
        </div>

        {/* Botón Ver Acciones */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="text-sm text-[#1e5da8] hover:text-[#2a6dbd] font-medium flex items-center gap-2"
        >
          {expandido ? 'Ocultar' : 'Ver'} {accionesHallazgo.length} acciones
          <ChevronDown className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Lista de Acciones del Hallazgo */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-5 space-y-2">
              {accionesHallazgo.map((accion) => (
                <MiniCardAccion key={accion.id} accion={accion} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: ACCIONES
// ════════════════════════════════════════════════════════════════════════════

function TabAcciones({ plan, planId, onAccionCreada }: { plan: PlanMejoramientoDetalle; planId: string; onAccionCreada?: () => void }) {
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | AccionCorrectiva['estado']>('TODOS');
  const [modalCrearAccion, setModalCrearAccion] = useState(false);

  const accionesFiltradas = filtroEstado === 'TODOS'
    ? plan.acciones
    : plan.acciones.filter(a => a.estado === filtroEstado);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Acciones Correctivas</h3>
          <p className="text-sm text-gray-600">{accionesFiltradas.length} acciones</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModalCrearAccion(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar Acción
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <FiltroButton
          active={filtroEstado === 'TODOS'}
          onClick={() => setFiltroEstado('TODOS')}
          label="Todas"
        />
        <FiltroButton
          active={filtroEstado === 'COMPLETADA'}
          onClick={() => setFiltroEstado('COMPLETADA')}
          label="Completadas"
          color="green"
        />
        <FiltroButton
          active={filtroEstado === 'EN_EJECUCION'}
          onClick={() => setFiltroEstado('EN_EJECUCION')}
          label="En Ejecución"
          color="yellow"
        />
        <FiltroButton
          active={filtroEstado === 'PENDIENTE'}
          onClick={() => setFiltroEstado('PENDIENTE')}
          label="Pendientes"
          color="gray"
        />
      </div>

      {accionesFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay acciones</h3>
          <p className="text-sm text-gray-600 mb-4">Comienza agregando una acción correctiva al plan</p>
          <button
            onClick={() => setModalCrearAccion(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium mx-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar Primera Acción
          </button>
        </div>
      ) : (
        accionesFiltradas.map((accion) => (
          <CardAccion key={accion.id} accion={accion} plan={plan} planId={planId} onAccionEditada={onAccionCreada} />
        ))
      )}

      {modalCrearAccion && (
        <ModalCrearAccion
          planId={planId}
          plan={plan}
          onClose={() => setModalCrearAccion(false)}
          onAccionCreada={() => {
            setModalCrearAccion(false);
            onAccionCreada?.();
          }}
        />
      )}
    </div>
  );
}

function CardAccion({ accion, plan, planId, onAccionEditada }: { accion: AccionCorrectiva; plan: PlanMejoramientoDetalle; planId: string; onAccionEditada?: () => void }) {
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEvidencia, setModalEvidencia] = useState(false);
  const [marcandoCompletada, setMarcandoCompletada] = useState(false);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loadingEvidencias, setLoadingEvidencias] = useState(false);
  
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendiente', icon: Clock },
    EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Ejecución', icon: Activity },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada', icon: CheckCircle2 },
    VENCIDA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Vencida', icon: XCircle }
  };

  const config = estadoConfig[accion.estado];
  const Icon = config.icon;
  const hallazgo = plan.hallazgos.find(h => h.id === accion.hallazgoId);

  // Cargar evidencias de la acción
  useEffect(() => {
    const cargarEvidencias = async () => {
      try {
        setLoadingEvidencias(true);
        const response = await evidenciasApi.getByAccion(accion.id);
        if (response.success && response.data) {
          setEvidencias(response.data);
        }
      } catch (error) {
        console.error('[CardAccion] Error al cargar evidencias:', error);
      } finally {
        setLoadingEvidencias(false);
      }
    };

    cargarEvidencias();
  }, [accion.id]);

  const handleEditar = () => {
    setModalEditar(true);
  };

  const handleCargarEvidencia = () => {
    setModalEvidencia(true);
  };

  const handleEvidenciaCargada = async () => {
    // Recargar evidencias después de cargar
    try {
      const response = await evidenciasApi.getByAccion(accion.id);
      if (response.success && response.data) {
        setEvidencias(response.data);
      }
    } catch (error) {
      console.error('[CardAccion] Error al recargar evidencias:', error);
    }
  };

  const handleDescargarEvidencia = async (evidencia: any) => {
    try {
      const blob = await evidenciasApi.download(evidencia.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = evidencia.nombreArchivoOriginal || evidencia.nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Evidencia Descargada', {
        description: `${evidencia.nombre} se ha descargado exitosamente`,
        duration: 2000,
      });
    } catch (error: any) {
      console.error('[CardAccion] Error al descargar:', error);
      toast.error('Error al descargar evidencia', {
        description: error.message || 'No se pudo descargar el archivo'
      });
    }
  };

  const handleMarcarCompletada = async () => {
    // Validar que no esté ya completada
    if (accion.estado === 'COMPLETADA') {
      toast.warning('Acción ya completada', {
        description: 'Esta acción ya se encuentra en estado completado',
      });
      return;
    }

    // Prevenir múltiples clicks mientras se procesa
    if (marcandoCompletada) {
      return;
    }

    try {
      setMarcandoCompletada(true);

      // Mapear estado del frontend al backend
      const estadoBackend = 'completada';

      // Actualizar acción en el backend
      const response = await planesMejoramientoApi.updateAccion(planId, accion.id, {
        estado: estadoBackend,
        porcentajeAvance: 100,
      });

      if (response.success) {
        toast.success('Acción Marcada como Completada', {
          description: `La acción "${accion.descripcion.substring(0, 50)}..." ha sido completada`,
          duration: 4000,
        });

        // Log para debugging
        console.log('✅ Acción marcada como completada:', {
          accionId: accion.id,
          estadoAnterior: accion.estado,
          progresoAnterior: accion.progreso,
          estadoNuevo: 'COMPLETADA',
          progresoNuevo: 100,
          timestamp: new Date().toISOString()
        });

        // Refrescar los datos del plan
        onAccionEditada?.();
      } else {
        throw new Error(response.error || 'Error al actualizar la acción');
      }
    } catch (err: any) {
      console.error('[CardAccion] Error al marcar acción como completada:', err);
      toast.error('Error al completar la acción', {
        description: err.message || 'No se pudo actualizar el estado de la acción. Por favor, intenta nuevamente.'
      });
    } finally {
      setMarcandoCompletada(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
                {hallazgo && (
                  <span className="text-xs text-gray-600">{hallazgo.codigo}</span>
                )}
              </div>
              <p className="text-sm text-gray-900 mb-2">{accion.descripcion}</p>
            </div>

            <div className="text-right">
              <div className={`text-2xl font-semibold ${
                accion.progreso === 100 ? 'text-green-600' :
                accion.progreso >= 50 ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {accion.progreso}%
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="mb-3">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  accion.progreso === 100 ? 'bg-green-600' :
                  accion.progreso >= 50 ? 'bg-yellow-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${accion.progreso}%` }}
              />
            </div>
          </div>

          {/* Información */}
          <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 mb-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-3 h-3" />
                <span>Responsable</span>
              </div>
              <div className="text-gray-900">{accion.responsable}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                <span>Inicio</span>
              </div>
              <div className="text-gray-900">{accion.fechaInicio}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Flag className="w-3 h-3" />
                <span>Vencimiento</span>
              </div>
              <div className="text-gray-900">{accion.fechaVencimiento}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Paperclip className="w-3 h-3" />
                <span>Evidencias</span>
              </div>
              <div className="text-gray-900">
                {loadingEvidencias ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : (
                  `${evidencias.length} archivo(s)`
                )}
              </div>
            </div>
          </div>

          {/* Evidencias */}
          {evidencias.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                Evidencias ({evidencias.length})
              </div>
              <div className="space-y-1">
                {evidencias.slice(0, 3).map((evidencia) => (
                  <div key={evidencia.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{evidencia.nombre}</span>
                    </div>
                    <button
                      onClick={() => handleDescargarEvidencia(evidencia)}
                      className="p-1 text-gray-600 hover:text-[#1e5da8] transition-colors flex-shrink-0"
                      title="Descargar"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {evidencias.length > 3 && (
                  <div className="text-xs text-gray-500 text-center pt-1">
                    +{evidencias.length - 3} más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {accion.observaciones && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              {accion.observaciones}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button 
              onClick={handleEditar}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
            <button 
              onClick={handleCargarEvidencia}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Cargar Evidencia
            </button>
            {accion.estado !== 'COMPLETADA' && (
              <button 
                onClick={handleMarcarCompletada}
                disabled={marcandoCompletada}
                className="px-3 py-1.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded text-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {marcandoCompletada ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Marcar Completada
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Editar Acción */}
      {modalEditar && (
        <ModalEditarAccion 
          accion={accion}
          planId={planId}
          onClose={() => setModalEditar(false)}
          onAccionActualizada={onAccionEditada}
        />
      )}

      {/* Modal Cargar Evidencia */}
      {modalEvidencia && (
        <ModalCargarEvidencia 
          accion={accion} 
          planId={planId}
          onClose={() => setModalEvidencia(false)}
          onEvidenciaCargada={() => {
            handleEvidenciaCargada();
            onAccionEditada?.();
          }}
          conteoEvidenciasActual={evidencias.length}
        />
      )}
    </div>
  );
}

function MiniCardAccion({ accion }: { accion: AccionCorrectiva }) {
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700' },
    EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700' },
    VENCIDA: { bg: 'bg-red-100', text: 'text-red-700' }
  };

  const config = estadoConfig[accion.estado];

  return (
    <div className="bg-white rounded border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-900 flex-1">{accion.descripcion}</p>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${config.bg} ${config.text}`}>
          {accion.progreso}%
        </span>
      </div>
      <div className="text-xs text-gray-600">
        {accion.responsable} • Vence: {accion.fechaVencimiento}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

function TabDocumentos({ plan, onDocumentosCargados }: { plan: PlanMejoramientoDetalle; onDocumentosCargados?: (count: number) => void }) {
  const [modalCargarDocumento, setModalCargarDocumento] = useState(false);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState<any | null>(null);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar evidencias del plan desde el backend
  useEffect(() => {
    const cargarEvidencias = async () => {
      try {
        setLoading(true);
        const response = await evidenciasApi.getByPlan(plan.id);
        if (response.success && response.data) {
          setEvidencias(response.data);
          // Notificar al componente padre el conteo de documentos
          onDocumentosCargados?.(response.data.length);
        }
      } catch (error) {
        console.error('[TabDocumentos] Error al cargar evidencias:', error);
        toast.error('Error al cargar documentos', {
          description: 'No se pudieron cargar los documentos del plan'
        });
        onDocumentosCargados?.(0);
      } finally {
        setLoading(false);
      }
    };

    cargarEvidencias();
  }, [plan.id, onDocumentosCargados]);

  const handleCargarDocumento = () => {
    setModalCargarDocumento(true);
  };

  const handleVerDocumento = async (evidencia: any) => {
    try {
      // Verificar si el archivo se puede previsualizar (solo imágenes y PDFs)
      const tipoMime = evidencia.tipoMime?.toLowerCase() || '';
      const esImagen = tipoMime.startsWith('image/');
      const esPdf = tipoMime === 'application/pdf' || tipoMime.includes('pdf');
      
      if (esImagen || esPdf) {
        // Intentar abrir preview solo para imágenes y PDFs
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3007'}/evidencias/${evidencia.id}/preview`;
        const token = localStorage.getItem('esap_auth_token');
        
        if (token) {
          window.open(`${url}?token=${token}`, '_blank');
        } else {
          window.open(url, '_blank');
        }
      } else {
        // Para otros tipos de archivo, descargar directamente
        await handleDescargarDocumento(evidencia);
        toast.info('Archivo descargado', {
          description: 'Este tipo de archivo se descarga directamente. Solo se pueden previsualizar imágenes y PDFs.'
        });
      }
    } catch (error) {
      console.error('[TabDocumentos] Error al abrir documento:', error);
      toast.error('Error al abrir documento', {
        description: 'No se pudo abrir la vista previa'
      });
    }
  };

  const handleDescargarDocumento = async (evidencia: any) => {
    try {
      const blob = await evidenciasApi.download(evidencia.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = evidencia.nombreArchivoOriginal || evidencia.nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Documento Descargado', {
        description: `${evidencia.nombre} se ha descargado exitosamente`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error('[TabDocumentos] Error al descargar:', error);
      toast.error('Error al descargar documento', {
        description: error.message || 'No se pudo descargar el archivo'
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Documentos y Evidencias</h3>
          <p className="text-sm text-gray-600">{loading ? 'Cargando...' : `${evidencias.length} archivos`}</p>
        </div>

        <button 
          onClick={handleCargarDocumento}
          className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Cargar Documento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e5da8]" />
        </div>
      ) : evidencias.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
          <p className="text-sm text-gray-600 mb-4">Comienza agregando un documento al plan</p>
          <button
            onClick={handleCargarDocumento}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium mx-auto"
          >
            <Upload className="w-4 h-4" />
            Cargar Primer Documento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {evidencias.map((evidencia) => (
            <div key={evidencia.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>

                <div className="flex-1">
                  <h4 className="text-sm text-gray-900 font-medium mb-1">{evidencia.nombre}</h4>
                  <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                    <span>{evidencia.tipoDocumento?.replace(/_/g, ' ')}</span>
                    <span>{formatFileSize(evidencia.tamanioBytes || 0)}</span>
                    <span>{new Date(evidencia.fechaSubida).toLocaleDateString('es-CO')}</span>
                    <span>{evidencia.subidoPor}</span>
                    {/* Mostrar vinculación */}
                    {evidencia.hallazgoId && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        Hallazgo
                      </span>
                    )}
                    {evidencia.accionCorrectivaId && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Acción
                      </span>
                    )}
                    {evidencia.planMejoramientoId && (
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                        Plan
                      </span>
                    )}
                    {evidencia.auditoriaId && (
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                        Auditoría
                      </span>
                    )}
                    {evidencia.estadoValidacion && (
                      <span className={`px-2 py-0.5 rounded ${
                        evidencia.estadoValidacion === 'aceptado' ? 'bg-green-100 text-green-700' :
                        evidencia.estadoValidacion === 'rechazado' ? 'bg-red-100 text-red-700' :
                        evidencia.estadoValidacion === 'con_observaciones' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {evidencia.estadoValidacion}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {(() => {
                    const tipoMime = evidencia.tipoMime?.toLowerCase() || '';
                    const esPrevisualizable = tipoMime.startsWith('image/') || 
                                            tipoMime === 'application/pdf' || 
                                            tipoMime.includes('pdf');
                    
                    return esPrevisualizable ? (
                      <button 
                        onClick={() => handleVerDocumento(evidencia)}
                        className="p-2 text-gray-600 hover:text-[#1e5da8] transition-colors"
                        title="Ver documento"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : null;
                  })()}
                  <button 
                    onClick={() => handleDescargarDocumento(evidencia)}
                    className="p-2 text-gray-600 hover:text-[#1e5da8] transition-colors"
                    title="Descargar documento"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cargar Documento */}
      {modalCargarDocumento && (
        <ModalCargarDocumentoPlan
          planId={plan.id}
          onClose={() => {
            setModalCargarDocumento(false);
            // Recargar evidencias después de cargar
            evidenciasApi.getByPlan(plan.id).then(response => {
              if (response.success && response.data) {
                setEvidencias(response.data);
                onDocumentosCargados?.(response.data.length);
              }
            });
          }}
        />
      )}

      {/* Modal Vista Previa */}
      {documentoVistaPrevia && (
        <ModalVistaPreviaDocumento
          documento={documentoVistaPrevia}
          onClose={() => setDocumentoVistaPrevia(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: SEGUIMIENTO (TIMELINE)
// ════════════════════════════════════════════════════════════════════════════

function TabSeguimiento({ plan }: { plan: PlanMejoramientoDetalle }) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900">Historial de Actividades</h3>
        <p className="text-sm text-gray-600">{plan.timeline.length} eventos registrados</p>
      </div>

      <div className="space-y-3">
        {plan.timeline.map((actividad, index) => (
          <TimelineItem key={actividad.id} actividad={actividad} isLast={index === plan.timeline.length - 1} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ actividad, isLast }: { actividad: ActividadTimeline; isLast: boolean }) {
  const tipoConfig = {
    CREACION: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Plus },
    ACTUALIZACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Edit2 },
    APROBACION: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: CheckCircle2 },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    EVIDENCIA: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Paperclip },
    COMENTARIO: { bg: 'bg-gray-100', text: 'text-gray-700', icon: MessageSquare },
    PROGRESO: { bg: 'bg-blue-100', text: 'text-blue-700', icon: TrendingUp },
    ESTADO: { bg: 'bg-orange-100', text: 'text-orange-700', icon: RefreshCw },
    HALLAZGO_COMPLETADO: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 }
  };

  const config = tipoConfig[actividad.tipo] || tipoConfig.ACTUALIZACION; // fallback si el tipo no existe
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-2" style={{ minHeight: '40px' }} />}
      </div>

      <div className="flex-1 pb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-900 mb-2">{actividad.descripcion}</p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {actividad.usuario}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {actividad.fecha}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

function InfoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{valor}</div>
    </div>
  );
}

function ProgresoBar({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;

  const colorClasses = {
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    gray: 'bg-gray-600',
    red: 'bg-red-600'
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-medium">{valor}/{total} ({porcentaje}%)</span>
      </div>
      <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full transition-all ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

function FiltroButton({ active, onClick, label, color = 'gray' }: any) {
  const colorClasses = {
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    yellow: active ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${colorClasses[color]}`}
    >
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR ACCIÓN
// ════════════════════════════════════════════════════════════════════════════

interface ModalCrearAccionProps {
  planId: string;
  plan: PlanMejoramientoDetalle;
  onClose: () => void;
  onAccionCreada: () => void;
}

function ModalCrearAccion({ planId, plan, onClose, onAccionCreada }: ModalCrearAccionProps) {
  const [datosAccion, setDatosAccion] = useState({
    hallazgoId: plan.hallazgos.length > 0 ? plan.hallazgos[0].id : '', // Seleccionar primer hallazgo por defecto
    descripcion: '',
    responsable: plan.responsableGeneral || '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: plan.fechaVencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    observaciones: ''
  });

  const handleGuardar = async () => {
    // Validaciones
    if (!datosAccion.hallazgoId) {
      toast.error('Debe seleccionar un hallazgo');
      return;
    }

    if (!datosAccion.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    if (!datosAccion.responsable.trim()) {
      toast.error('El responsable es obligatorio');
      return;
    }

    try {
      // Crear acción en el backend con hallazgoId
      const response = await planesMejoramientoApi.addAccion(planId, {
        hallazgoId: datosAccion.hallazgoId, // ✅ VINCULAR AL HALLAZGO
        descripcion: datosAccion.descripcion,
        responsable: datosAccion.responsable,
        fechaInicio: datosAccion.fechaInicio,
        fechaFin: datosAccion.fechaFin,
        observaciones: datosAccion.observaciones || undefined,
        estado: 'programada',
        porcentajeAvance: 0
      });

      if (response.success) {
        toast.success('Acción Creada', {
          description: 'La acción correctiva ha sido vinculada al hallazgo exitosamente',
          duration: 3000,
        });
        onAccionCreada();
      } else {
        throw new Error(response.error || 'Error al crear la acción');
      }
    } catch (err: any) {
      console.error('[ModalCrearAccion] Error al crear acción:', err);
      toast.error('Error al crear la acción', {
        description: err.message || 'No se pudo crear la acción correctiva'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Nueva Acción Correctiva</h3>
              <p className="text-sm text-blue-100">Agregar una nueva acción al plan {plan.codigo}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Selección de Hallazgo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hallazgo a Corregir <span className="text-red-500">*</span>
              </label>
              {plan.hallazgos.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">⚠️ Este plan no tiene hallazgos asociados</p>
                </div>
              ) : (
                <select
                  value={datosAccion.hallazgoId}
                  onChange={(e) => setDatosAccion({ ...datosAccion, hallazgoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                >
                  <option value="">Seleccionar hallazgo...</option>
                  {plan.hallazgos.map((hallazgo) => (
                    <option key={hallazgo.id} value={hallazgo.id}>
                      {hallazgo.codigo} - {hallazgo.titulo}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                La acción correctiva se vinculará a este hallazgo específico
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={datosAccion.descripcion}
                onChange={(e) => setDatosAccion({ ...datosAccion, descripcion: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción detallada de la acción correctiva"
              />
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={datosAccion.responsable}
                onChange={(e) => setDatosAccion({ ...datosAccion, responsable: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Nombre del responsable"
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={datosAccion.fechaInicio}
                  onChange={(e) => setDatosAccion({ ...datosAccion, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={datosAccion.fechaFin}
                  onChange={(e) => setDatosAccion({ ...datosAccion, fechaFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={datosAccion.observaciones}
                onChange={(e) => setDatosAccion({ ...datosAccion, observaciones: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              Crear Acción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR ACCIÓN
// ════════════════════════════════════════════════════════════════════════════

interface ModalEditarAccionProps {
  accion: AccionCorrectiva;
  planId: string;
  onClose: () => void;
  onAccionActualizada?: () => void;
}

function ModalEditarAccion({ accion, planId, onClose, onAccionActualizada }: ModalEditarAccionProps) {
  const [datosEdicion, setDatosEdicion] = useState({
    descripcion: accion.descripcion,
    responsable: accion.responsable,
    fechaInicio: accion.fechaInicio,
    fechaVencimiento: accion.fechaVencimiento,
    estado: accion.estado,
    progreso: accion.progreso,
    observaciones: accion.observaciones || ''
  });

  // Actualizar estado automáticamente cuando cambia el progreso
  const handleProgresoChange = (nuevoProgreso: number) => {
    let nuevoEstado = datosEdicion.estado;
    
    if (nuevoProgreso === 100) {
      nuevoEstado = 'COMPLETADA';
    } else if (nuevoProgreso > 0 && nuevoProgreso < 100) {
      // Si estaba completada y ahora es menor a 100%, cambiar a EN_EJECUCION
      if (datosEdicion.estado === 'COMPLETADA') {
        nuevoEstado = 'EN_EJECUCION';
      }
    } else if (nuevoProgreso === 0) {
      nuevoEstado = 'PENDIENTE';
    }
    
    setDatosEdicion({
      ...datosEdicion,
      progreso: nuevoProgreso,
      estado: nuevoEstado
    });
  };

  const handleGuardar = async () => {
    // Validaciones
    if (!datosEdicion.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    if (!datosEdicion.responsable.trim()) {
      toast.error('El responsable es obligatorio');
      return;
    }

    if (datosEdicion.progreso < 0 || datosEdicion.progreso > 100) {
      toast.error('El progreso debe estar entre 0 y 100');
      return;
    }

    try {
      // Mapear estado del frontend al backend
      const estadoBackend = datosEdicion.estado === 'PENDIENTE' ? 'programada' :
                           datosEdicion.estado === 'EN_EJECUCION' ? 'en-progreso' :
                           datosEdicion.estado === 'COMPLETADA' ? 'completada' :
                           datosEdicion.estado === 'VENCIDA' ? 'vencida' : 'programada';

      // Actualizar acción en el backend
      const response = await planesMejoramientoApi.updateAccion(planId, accion.id, {
        descripcion: datosEdicion.descripcion,
        responsable: datosEdicion.responsable,
        fechaInicio: datosEdicion.fechaInicio,
        fechaFin: datosEdicion.fechaVencimiento,
        estado: estadoBackend,
        porcentajeAvance: datosEdicion.progreso,
        observaciones: datosEdicion.observaciones || undefined
      });

      if (response.success) {
        toast.success('Acción Actualizada', {
          description: 'Los cambios han sido guardados exitosamente',
          duration: 3000,
        });
        onAccionActualizada?.();
        onClose();
      } else {
        throw new Error(response.error || 'Error al actualizar la acción');
      }
    } catch (err: any) {
      console.error('[ModalEditarAccion] Error al actualizar acción:', err);
      toast.error('Error al actualizar la acción', {
        description: err.message || 'No se pudo actualizar la acción correctiva'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Editar Acción Correctiva</h3>
              <p className="text-sm text-blue-100">Actualizar información de la acción</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={datosEdicion.descripcion}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción detallada de la acción correctiva"
              />
            </div>

            {/* Responsable y Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsable <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={datosEdicion.responsable}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, responsable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                  placeholder="Nombre del responsable"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={datosEdicion.estado}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, estado: e.target.value as AccionCorrectiva['estado'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_EJECUCION">En Ejecución</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="VENCIDA">Vencida</option>
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={datosEdicion.fechaInicio}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Vencimiento
                </label>
                <input
                  type="date"
                  value={datosEdicion.fechaVencimiento}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, fechaVencimiento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Progreso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progreso: {datosEdicion.progreso}% 
                <span className="text-xs text-gray-500 ml-2">(Estado se ajusta automáticamente)</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={datosEdicion.progreso}
                onChange={(e) => handleProgresoChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={datosEdicion.observaciones}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, observaciones: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CARGAR EVIDENCIA
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarEvidenciaProps {
  accion: AccionCorrectiva;
  planId: string;
  onClose: () => void;
  onEvidenciaCargada?: () => void;
  conteoEvidenciasActual?: number;
}

function ModalCargarEvidencia({ accion, planId, onClose, onEvidenciaCargada, conteoEvidenciasActual = 0 }: ModalCargarEvidenciaProps) {
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      // Validar tamaño (10MB máximo por archivo)
      const archivosValidos = nuevosArchivos.filter(archivo => {
        if (archivo.size > 10 * 1024 * 1024) {
          toast.error(`El archivo ${archivo.name} es demasiado grande (máx. 10MB)`);
          return false;
        }
        return true;
      });
      setArchivosSeleccionados([...archivosSeleccionados, ...archivosValidos]);
    }
  };

  const handleEliminarArchivo = (index: number) => {
    const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
    setArchivosSeleccionados(nuevosArchivos);
  };

  const getFileType = (fileName: string, mimeType: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(extension)) return 'PDF';
    if (['doc', 'docx'].includes(extension)) return 'Word';
    if (['xls', 'xlsx'].includes(extension)) return 'Excel';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'Imagen';
    return mimeType.split('/')[1]?.toUpperCase() || 'Archivo';
  };

  const handleCargar = async () => {
    if (archivosSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un archivo');
      return;
    }

    setSubiendo(true);

    try {
      // Subir cada archivo usando el nuevo servicio de evidencias
      for (const archivo of archivosSeleccionados) {
        const response = await evidenciasApi.create(
          archivo,
          {
            nombre: archivo.name.replace(/\.[^/.]+$/, ''), // Nombre sin extensión
            descripcion: observaciones || undefined,
            tipoDocumento: 'evidencia_accion',
            accionCorrectivaId: accion.id,
            subidoPor: 'Usuario Actual', // TODO: Obtener del contexto de autenticación
          },
          (progress) => {
            // Progreso individual por archivo (opcional)
            // Progress tracking removed for cleaner console
          }
        );

        if (!response.success) {
          throw new Error(response.error || `Error al cargar ${archivo.name}`);
        }
      }

      toast.success('Evidencias Cargadas', {
        description: `${archivosSeleccionados.length} archivo(s) cargado(s) exitosamente`,
        duration: 3000,
      });

      onEvidenciaCargada?.();
      onClose();
    } catch (error: any) {
      console.error('[ModalCargarEvidencia] Error al cargar evidencias:', error);
      toast.error('Error al cargar evidencias', {
        description: error.message || 'No se pudieron cargar las evidencias'
      });
    } finally {
      setSubiendo(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Cargar Evidencias</h3>
              <p className="text-sm text-blue-100">Adjuntar documentos y archivos de soporte</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Información de la Acción */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-1">Acción Correctiva</div>
              <div className="text-sm text-blue-700">{accion.descripcion}</div>
              <div className="text-xs text-blue-600 mt-2">
                Evidencias actuales: {conteoEvidenciasActual} archivo(s)
              </div>
            </div>

            {/* Zona de carga */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Archivos <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 font-medium">
                    Haz clic para seleccionar archivos
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                  </span>
                </label>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Archivos Seleccionados ({archivosSeleccionados.length})
                </div>
                <div className="space-y-2">
                  {archivosSeleccionados.map((archivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">
                            {archivo.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatFileSize(archivo.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarArchivo(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción de las evidencias (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCargar}
              disabled={subiendo}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subiendo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cargar {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} Archivo(s)` : 'Evidencias'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CARGAR DOCUMENTO AL PLAN
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarDocumentoPlanProps {
  planId: string;
  onClose: () => void;
}

function ModalCargarDocumentoPlan({ planId, onClose }: ModalCargarDocumentoPlanProps) {
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState<'evidencia_plan' | 'documento_plan' | 'certificado' | 'acta' | 'informe' | 'otro'>('documento_plan');
  const [descripcion, setDescripcion] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      // Validar tamaño (50MB máximo por archivo)
      const archivosValidos = nuevosArchivos.filter(archivo => {
        if (archivo.size > 50 * 1024 * 1024) {
          toast.error(`El archivo ${archivo.name} es demasiado grande (máx. 50MB)`);
          return false;
        }
        return true;
      });
      setArchivosSeleccionados([...archivosSeleccionados, ...archivosValidos]);
    }
  };

  const handleEliminarArchivo = (index: number) => {
    const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
    setArchivosSeleccionados(nuevosArchivos);
  };

  const handleCargar = async () => {
    if (archivosSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un archivo');
      return;
    }

    setSubiendo(true);

    try {
      // Subir cada archivo usando el nuevo servicio de evidencias
      for (const archivo of archivosSeleccionados) {
        const response = await evidenciasApi.create(
          archivo,
          {
            nombre: archivo.name.replace(/\.[^/.]+$/, ''), // Nombre sin extensión
            descripcion: descripcion || undefined,
            tipoDocumento: tipoDocumento,
            planMejoramientoId: planId,
            subidoPor: 'Usuario Actual', // TODO: Obtener del contexto de autenticación
          }
        );

        if (!response.success) {
          throw new Error(response.error || `Error al cargar ${archivo.name}`);
        }
      }

      toast.success('Documentos Cargados', {
        description: `${archivosSeleccionados.length} documento(s) cargado(s) exitosamente al plan`,
        duration: 3000,
      });

      onClose();
    } catch (error: any) {
      console.error('[ModalCargarDocumentoPlan] Error al cargar documentos:', error);
      toast.error('Error al cargar documentos', {
        description: error.message || 'No se pudieron cargar los documentos'
      });
    } finally {
      setSubiendo(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Cargar Documento al Plan</h3>
              <p className="text-sm text-blue-100">Adjuntar documentos y evidencias del plan de mejoramiento</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Tipo de Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              >
                <option value="documento_plan">Documento del Plan</option>
                <option value="evidencia_plan">Evidencia del Plan</option>
                <option value="informe">Informe de Seguimiento</option>
                <option value="acta">Acta</option>
                <option value="certificado">Certificado</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Zona de carga */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Archivos <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-plan"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload-plan"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 font-medium">
                    Haz clic para seleccionar archivos
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                  </span>
                </label>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Archivos Seleccionados ({archivosSeleccionados.length})
                </div>
                <div className="space-y-2">
                  {archivosSeleccionados.map((archivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">
                            {archivo.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatFileSize(archivo.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarArchivo(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción del documento (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCargar}
              disabled={subiendo}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subiendo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cargar {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} Documento(s)` : 'Documentos'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VISTA PREVIA DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalVistaPreviaDocumentoProps {
  documento: DocumentoPlan;
  onClose: () => void;
}

function ModalVistaPreviaDocumento({ documento, onClose }: ModalVistaPreviaDocumentoProps) {
  const handleDescargar = () => {
    toast.success('Descargando Documento', {
      description: `${documento.nombre} se está descargando...`,
      duration: 3000,
    });

    console.log('📥 Descargar documento desde vista previa:', {
      documentoId: documento.id,
      nombre: documento.nombre,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[10002] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[95vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium mb-1 truncate">{documento.nombre}</h3>
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <span>{documento.tipo}</span>
                <span>•</span>
                <span>{documento.tamanio}</span>
                <span>•</span>
                <span>{documento.fechaCarga}</span>
                <span>•</span>
                <span>{documento.autor}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleDescargar}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Descargar"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido - Vista Previa */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-24 h-24 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Vista Previa del Documento</h4>
              <p className="text-sm text-gray-600 mb-6 max-w-md">
                La vista previa de documentos estará disponible próximamente. Por ahora puedes descargar el archivo para visualizarlo.
              </p>
              <button
                onClick={handleDescargar}
                className="px-6 py-3 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
              >
                <Download className="w-5 h-5" />
                Descargar Documento
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Documento cargado el {documento.fechaCarga} por {documento.autor}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}