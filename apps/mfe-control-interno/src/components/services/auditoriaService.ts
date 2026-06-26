/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO DE AUDITORÍAS - OCI ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Servicio centralizado para operaciones CRUD de auditorías.
 * Reutilizable desde cualquier módulo de control interno.
 * 
 * Endpoints backend: /auditorias (POST, GET, PATCH, DELETE)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { controlInternoService } from '../../services/api/controlInternoService';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS - Estructura del backend (CreateAuditoriaDto)
// ════════════════════════════════════════════════════════════════════════════

/** Datos requeridos por el backend para crear auditoría */
export interface AuditoriaBackendDTO {
  // Campos obligatorios
  nombre: string;
  tipo: string;
  territorial: string;
  sede: string;
  responsable: string;
  fechaInicio: string; // ISO 8601: "2026-02-17" - Inicio de Planeación
  fechaFinPlaneacion?: string; // ISO 8601: "2026-02-20" - Fin de Planeación
  fechaInicioEjecucion?: string; // ISO 8601: "2026-02-21" - Inicio de Ejecución
  fechaFinEjecucion?: string; // ISO 8601: "2026-02-25" - Fin de Ejecución
  fechaInicioComunicacion?: string; // ISO 8601: "2026-02-26" - Inicio de Comunicación
  fechaFin: string;    // ISO 8601: "2026-02-28" - Fin de Comunicación
  
  // Campos opcionales
  descripcion?: string;
  fase?: 'planeacion' | 'ejecucion' | 'informe' | 'seguimiento' | 'cierre';
  progreso?: number;
  prioridad?: 'Alta' | 'Media' | 'Baja';
  areaObjetivo?: string;
  procesoAuditado?: string;
  alcance?: string;
  metodologia?: string;
  nivelRiesgo?: string;
  calificacionRiesgo?: string;
  presupuestoEstimado?: string;
  auditorLiderId?: string | number;
  auditorAsignadoId?: string | number;
  supervisorAsignadoId?: string | number;
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  observacionesAdicionales?: string;
  objetivos?: string[];
  criteriosAuditoria?: string[];
  normatividadAplicable?: string[];
  riesgosIdentificados?: string[];
  controlesAplicar?: string[];
  equipoAuditores?: string[];
  programaAnualMetadata?: any;
  planAnualId?: string;
  planAnualVigencia?: number;
  vinculadaPlanAnual?: boolean;
  rolDecretoAsociado?: string;
  estadoKanban?: string; // Para crear auditoria en columna correcta del Kanban
}

/** Datos del formulario frontend (más amigable) */
export interface AuditoriaFormData {
  // Información básica
  tipoAuditoria: 'regular' | 'territorial' | 'especial' | 'seguimiento';
  titulo: string;
  descripcion?: string;
  
  // Ubicación
  territorial: string;
  sede?: string;
  areaObjetivo?: string;
  procesoAuditado?: string;
  alcance?: string;
  
  // Equipo
  auditorLider: string;
  auditorAsignado?: string;
  equipoAuditores?: string[];
  supervisorAsignado?: string;
  responsable?: string;
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  
  // Fechas - Cronograma de 3 etapas
  fechaInicio: string; // Inicio de Planeación
  fechaFinPlaneacion?: string; // Fin de Planeación
  fechaInicioEjecucion?: string; // Inicio de Ejecución
  fechaFinEjecucion?: string; // Fin de Ejecución
  fechaInicioComunicacion?: string; // Inicio de Comunicación
  fechaFin: string; // Fin de Comunicación
  periodicidad?: string;
  
  // Objetivos y criterios
  objetivos?: string[];
  criteriosAuditoria?: string[];
  normatividadAplicable?: string[];
  metodologia?: string;
  
  // Riesgos
  nivelRiesgo?: string;
  riesgosIdentificados?: string[];
  controlesAplicar?: string[];
  
  // Recursos
  presupuestoEstimado?: string;
  recursos?: any[];
  productosEsperados?: any[];
  hitos?: any[];
  
  // Vinculación
  vinculadaPlanAnual?: boolean;
  planAnualId?: string;
  planAnualAño?: number;
  rolDecretoAsociado?: string;
  
  // Estado Kanban
  estadoKanban?: string;
}

/** Auditoría como viene del backend */
export interface AuditoriaResponse {
  id: string;
  nombre: string;
  tipo: string;
  territorial: string;
  sede: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  fechaFinPlaneacion?: string;
  fechaInicioEjecucion?: string;
  fechaFinEjecucion?: string;
  fechaInicioComunicacion?: string;
  progreso: number;
  fase: string;
  estado: string;
  prioridad: string;
  areaObjetivo?: string;
  procesoAuditado?: string;
  alcance?: string;
  nivelRiesgo?: string;
  auditorLiderId?: string;
  equipoAuditores?: string[];
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convierte datos del formulario frontend al formato del backend
 */
export function mapFormToBackendDTO(form: AuditoriaFormData): AuditoriaBackendDTO {
  // Formatear fechas a ISO 8601
  const fechaInicio = formatearFechaISO(form.fechaInicio);
  const fechaFin = formatearFechaISO(form.fechaFin);
  const fechaFinPlaneacion = form.fechaFinPlaneacion ? formatearFechaISO(form.fechaFinPlaneacion) : undefined;
  const fechaInicioEjecucion = form.fechaInicioEjecucion ? formatearFechaISO(form.fechaInicioEjecucion) : undefined;
  const fechaFinEjecucion = form.fechaFinEjecucion ? formatearFechaISO(form.fechaFinEjecucion) : undefined;
  const fechaInicioComunicacion = form.fechaInicioComunicacion ? formatearFechaISO(form.fechaInicioComunicacion) : undefined;
  
  return {
    // Campos obligatorios
    nombre: form.titulo,
    tipo: mapearTipoBackend(form.tipoAuditoria),
    territorial: form.territorial || 'Sede Central',
    sede: form.sede || form.territorial || 'Sede Principal',
    // Regla actual acordada: "responsable" es el auditado (dueño del proceso/área).
    responsable: form.responsable || form.responsableAreaNombre || 'Por asignar',
    fechaInicio,
    fechaFinPlaneacion,
    fechaInicioEjecucion,
    fechaFinEjecucion,
    fechaInicioComunicacion,
    fechaFin,
    
    // Campos opcionales
    descripcion: form.descripcion,
    fase: 'planeacion',
    progreso: 0,
    prioridad: mapearPrioridad(form.nivelRiesgo),
    areaObjetivo: form.areaObjetivo,
    procesoAuditado: form.procesoAuditado,
    alcance: form.alcance || form.descripcion,
    metodologia: form.metodologia,
    nivelRiesgo: form.nivelRiesgo,
    presupuestoEstimado: form.presupuestoEstimado,
    auditorLiderId: form.auditorLider,
    auditorAsignadoId: form.auditorAsignado,
    supervisorAsignadoId: form.supervisorAsignado,
    responsableAreaNombre: form.responsableAreaNombre,
    responsableAreaCargo: form.responsableAreaCargo,
    responsableAreaEmail: form.responsableAreaEmail,
    objetivos: form.objetivos,
    criteriosAuditoria: form.criteriosAuditoria,
    normatividadAplicable: form.normatividadAplicable,
    riesgosIdentificados: form.riesgosIdentificados,
    controlesAplicar: form.controlesAplicar,
    equipoAuditores: form.equipoAuditores,
    vinculadaPlanAnual: !!form.vinculadaPlanAnual,
    planAnualId: form.vinculadaPlanAnual ? form.planAnualId : undefined,
    planAnualVigencia: form.vinculadaPlanAnual ? form.planAnualAño : undefined,
    rolDecretoAsociado: form.vinculadaPlanAnual ? form.rolDecretoAsociado : undefined,
    programaAnualMetadata: form.vinculadaPlanAnual ? {
      vinculado: true,
      planAnualId: form.planAnualId,
      año: form.planAnualAño,
      rol: form.rolDecretoAsociado,
    } : undefined,
    estadoKanban: form.estadoKanban || 'Programa Anual', // Por defecto Plan Anual
  };
}

/**
 * Convierte respuesta del backend al formato UI
 */
export function mapBackendToUI(auditoria: AuditoriaResponse): AuditoriaUI {
  // Detectar tipo operativo (Regular / Territorial / Especial) desde backend.
  // 🔁 IMPORTANTE: Damos prioridad al campo "tipo" (Regular / Territorial / Especial)
  // y dejamos "tipoKanban" solo como respaldo.
  const tipoOperativoRaw: string | undefined =
    (auditoria.tipo as string | undefined) || ((auditoria as any).tipoKanban as string | undefined);
  const tipoOperativoNormalizado = tipoOperativoRaw?.toLowerCase();
  const tipoOperativoValido =
    tipoOperativoNormalizado === 'regular' ||
    tipoOperativoNormalizado === 'territorial' ||
    tipoOperativoNormalizado === 'especial'
      ? (tipoOperativoNormalizado as 'regular' | 'territorial' | 'especial')
      : undefined;

  // ✅ Extraer estadoKanban del backend
  const estadoKanban = (auditoria as any).estadoKanban as string | undefined;

  return {
    id: auditoria.id,
    nombre: auditoria.nombre,
    tipo: mapearTipoUI(auditoria.tipo),
    proceso: {
      nombre: auditoria.procesoAuditado || auditoria.areaObjetivo || 'General',
      codigo: '',
    },
    fechaInicio: auditoria.fechaInicio,
    fechaFin: auditoria.fechaFin,
    // ✅ Mapear fechas de las etapas
    fechaFinPlaneacion: auditoria.fechaFinPlaneacion,
    fechaInicioEjecucion: auditoria.fechaInicioEjecucion,
    fechaFinEjecucion: auditoria.fechaFinEjecucion,
    fechaInicioComunicacion: auditoria.fechaInicioComunicacion,
    // ✅ Pasar estadoKanban para mapeo correcto
    estado: mapearEstadoUI(auditoria.fase, auditoria.progreso, estadoKanban),
    // ✅ Conservar estadoKanban original para filtros
    estadoKanban: estadoKanban,
    fase: auditoria.fase,
    auditorLider: auditoria.responsable,
    equipo: auditoria.equipoAuditores || [],
    avance: auditoria.progreso || 0,
    horasEstimadas: calcularHorasEstimadas(auditoria.fechaInicio, auditoria.fechaFin),
    trimestre: calcularTrimestre(auditoria.fechaInicio),
    territorial: auditoria.territorial,
    tipoOperativo: tipoOperativoValido,
    // Campos adicionales para lista
    objetivo: auditoria.alcance || '',
    alcance: auditoria.alcance || '',
    horasReales: 0,
    hallazgosCount: 0,
    riesgosAsociados: (auditoria as any).riesgosAsociados || [],
    supervisorAsignadoId: (auditoria as any).supervisorAsignadoId || (auditoria as any).supervisorId,
    supervisorAsignado: (auditoria as any).supervisorAsignado || (auditoria as any).supervisor,
    // ✅ Fecha de última modificación (sirve como "fecha de cambio de etapa")
    updatedAt: auditoria.updatedAt,
    // ✅ Propagar responsables para Excel/UI
    responsableAreaNombre: (auditoria as any).responsableAreaNombre,
    responsableAreaCargo: (auditoria as any).responsableAreaCargo,
    responsableAreaEmail: (auditoria as any).responsableAreaEmail,
    responsable: (auditoria as any).responsable,
    responsables: (auditoria as any).responsables,
    responsableArea: (auditoria as any).responsableArea,
  };
}

/** Formato UI para uso en componentes */
export interface AuditoriaUI {
  id: string;
  nombre: string;
  tipo: 'CUMPLIMIENTO' | 'GESTION' | 'FINANCIERA' | 'TI' | 'ESPECIAL';
  // Tipo operativo original: Regular / Territorial / Especial
  tipoOperativo?: 'regular' | 'territorial' | 'especial';
  proceso: { nombre: string; codigo: string };
  fechaInicio: string;
  fechaFin: string;
  fechaFinPlaneacion?: string;
  fechaInicioEjecucion?: string;
  fechaFinEjecucion?: string;
  fechaInicioComunicacion?: string;
  estado: 'PROGRAMADA' | 'EN_EJECUCION' | 'COMPLETADA' | 'CANCELADA';
  // ✅ Estado Kanban original del backend (Planeación, Ejecución, Comunicación, Finalizada)
  estadoKanban?: string;
  /** Fase backend (planeacion, en-curso, revision, completada) para estadísticas alineadas con Kanban */
  fase?: string;
  auditorLider: string;
  equipo: string[];
  avance: number;
  horasEstimadas: number;
  trimestre: 1 | 2 | 3 | 4;
  territorial: string;
  objetivo?: string;
  alcance?: string;
  horasReales?: number;
  hallazgosCount?: number;
  planMejoramientoId?: string;
  procesoId?: string;
  riesgosAsociados?: Array<{ id: string; proceso: string; riesgo: string }>;
  supervisorAsignadoId?: string | number;
  supervisorAsignado?: string;
  /** Fecha última modificación del backend (útil como fecha de corte de cambio de etapa Kanban) */
  updatedAt?: string;

  // ✅ Responsables del área auditada
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  responsable?: string;
  responsables?: any;
  responsableArea?: any;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function formatearFechaISO(fecha: string): string {
  if (!fecha) return new Date().toISOString().split('T')[0];
  
  // Si ya está en formato ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }
  
  // Intentar parsear y convertir
  const date = new Date(fecha);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

function mapearPrioridad(nivelRiesgo?: string): 'Alta' | 'Media' | 'Baja' {
  if (!nivelRiesgo) return 'Media';
  const nivel = nivelRiesgo.toLowerCase();
  if (nivel === 'crítico' || nivel === 'critico' || nivel === 'alto' || nivel === 'alta') return 'Alta';
  if (nivel === 'medio' || nivel === 'media') return 'Media';
  return 'Baja';
}

/**
 * Mapea tipo frontend a valor backend
 * Valores permitidos en DB: 'Gestión', 'Control Interno', 'Académica', 'RRHH', 
 * 'Financiera', 'TI', 'Cumplimiento', 'Operacional', 'Regular', 'Territorial', 'Especial'
 */
function mapearTipoBackend(tipo: string): string {
  if (!tipo) return 'Regular';
  return tipo;
}

function mapearTipoUI(tipo: string): AuditoriaUI['tipo'] {
  const map: Record<string, AuditoriaUI['tipo']> = {
    'regular': 'GESTION',
    'territorial': 'GESTION',
    'especial': 'ESPECIAL',
    'seguimiento': 'CUMPLIMIENTO',
    'gestion': 'GESTION',
    'cumplimiento': 'CUMPLIMIENTO',
    'financiera': 'FINANCIERA',
    'ti': 'TI',
  };
  return map[tipo?.toLowerCase()] || 'GESTION';
}

/**
 * Mapea estadoKanban del backend al estado UI
 * PRIORIDAD: estadoKanban > fase > progreso
 * 
 * Estados Kanban backend: 'Planeación', 'Ejecución', 'Comunicación', 'Finalizada'
 * Estados UI: PROGRAMADA, EN_EJECUCION, COMPLETADA, CANCELADA
 */
function mapearEstadoUI(fase?: string, progreso?: number, estadoKanban?: string): AuditoriaUI['estado'] {
  // ✅ PRIORIDAD 1: usar estadoKanban si está presente
  if (estadoKanban) {
    const kanbanNorm = estadoKanban.toLowerCase().trim();
    if (kanbanNorm === 'planeación' || kanbanNorm === 'planeacion' || kanbanNorm === 'plan anual') return 'PROGRAMADA';
    if (kanbanNorm === 'ejecución' || kanbanNorm === 'ejecucion') return 'EN_EJECUCION';
    if (kanbanNorm === 'comunicación' || kanbanNorm === 'comunicacion') return 'COMPLETADA';
    if (kanbanNorm === 'finalizada') return 'COMPLETADA'; // Finalizadas mapean a COMPLETADA
  }
  
  // PRIORIDAD 2: usar fase
  if (fase) {
    const faseNorm = fase.toLowerCase();
    if (faseNorm === 'cierre' || faseNorm === 'completada' || (progreso && progreso >= 100)) return 'COMPLETADA';
    if (faseNorm === 'ejecucion' || faseNorm === 'en-curso' || faseNorm === 'informe') return 'EN_EJECUCION';
    if (faseNorm === 'planeacion' || faseNorm === 'planeación') return 'PROGRAMADA';
  }
  
  // PRIORIDAD 3: usar progreso
  if (progreso && progreso > 0) return 'EN_EJECUCION';
  return 'PROGRAMADA';
}

function calcularHorasEstimadas(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const dias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return dias * 8; // 8 horas por día
}

function calcularTrimestre(fecha: string): 1 | 2 | 3 | 4 {
  const month = new Date(fecha).getMonth();
  if (month < 3) return 1;
  if (month < 6) return 2;
  if (month < 9) return 3;
  return 4;
}

// ════════════════════════════════════════════════════════════════════════════
// SERVICIO PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export const auditoriaService = {
  /**
   * Crea una nueva auditoría
   * @param formData - Datos del formulario frontend
   * @param showToast - Mostrar notificaciones (default: true)
   * @returns ID de la auditoría creada o null si falla
   */
  async crear(formData: AuditoriaFormData, showToast = true): Promise<string | null> {
    try {
      const backendData = mapFormToBackendDTO(formData);
      
      console.log('[auditoriaService] Enviando al backend:', backendData);
      
      const resultado = await controlInternoService.createAuditoria(backendData);
      
      if (resultado && resultado.id) {
        if (showToast) {
          toast.success('Auditoría programada exitosamente');
        }
        return resultado.id;
      }
      
      throw new Error('No se recibió ID de la auditoría creada');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear auditoría';
      console.error('[auditoriaService] Error:', mensaje);
      if (showToast) {
        toast.error(`Error: ${mensaje}`);
      }
      return null;
    }
  },

  /**
   * Obtiene todas las auditorías
   * @returns Lista de auditorías en formato UI
   */
  async listar(filters?: {
    planAnualId?: string;
    planAnualVigencia?: number;
    year?: number;
    vinculadaPlanAnual?: boolean;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<AuditoriaUI[]> {
    try {
      const vigencia = filters?.planAnualVigencia ?? filters?.year;
      const auditorias = await controlInternoService.getAuditorias({
        ...filters,
        // planAnualVigencia: vigencia,
        year: filters?.year ?? vigencia,
        light: true,
        activasOnly: true,
      });
      
      if (Array.isArray(auditorias)) {
        return auditorias.map(mapBackendToUI);
      }
      
      return [];
    } catch (error) {
      console.error('[auditoriaService] Error al listar:', error);
      return [];
    }
  },

  /**
   * Obtiene una auditoría por ID
   */
  async obtenerPorId(id: string): Promise<AuditoriaUI | null> {
    try {
      const auditoria = await controlInternoService.getAuditoriaById(id);
      if (auditoria) {
        return mapBackendToUI(auditoria);
      }
      return null;
    } catch (error) {
      console.error('[auditoriaService] Error al obtener:', error);
      return null;
    }
  },

  /**
   * Actualiza una auditoría
   */
  async actualizar(id: string, data: Partial<AuditoriaFormData>, showToast = true): Promise<boolean> {
    try {
      const updates: Partial<AuditoriaBackendDTO> = {};
      
      if (data.titulo) updates.nombre = data.titulo;
      if (data.tipoAuditoria) updates.tipo = data.tipoAuditoria;
      if (data.descripcion) updates.descripcion = data.descripcion;
      if (data.territorial) updates.territorial = data.territorial;
      if (data.sede) updates.sede = data.sede;
      if (data.fechaInicio) updates.fechaInicio = formatearFechaISO(data.fechaInicio);
      if (data.fechaFinPlaneacion) updates.fechaFinPlaneacion = formatearFechaISO(data.fechaFinPlaneacion);
      if (data.fechaInicioEjecucion) updates.fechaInicioEjecucion = formatearFechaISO(data.fechaInicioEjecucion);
      if (data.fechaFinEjecucion) updates.fechaFinEjecucion = formatearFechaISO(data.fechaFinEjecucion);
      if (data.fechaInicioComunicacion) updates.fechaInicioComunicacion = formatearFechaISO(data.fechaInicioComunicacion);
      if (data.fechaFin) updates.fechaFin = formatearFechaISO(data.fechaFin);
      if (data.auditorLider) updates.auditorLiderId = data.auditorLider;
      if (data.auditorAsignado) updates.auditorAsignadoId = data.auditorAsignado;
      if (data.supervisorAsignado) updates.supervisorAsignadoId = data.supervisorAsignado;
      if (data.equipoAuditores !== undefined) updates.equipoAuditores = data.equipoAuditores;
      if (data.nivelRiesgo) updates.nivelRiesgo = data.nivelRiesgo;
      
      await controlInternoService.updateAuditoria(id, updates);
      
      if (showToast) {
        toast.success('Auditoría actualizada');
      }
      return true;
    } catch (error) {
      console.error('[auditoriaService] Error al actualizar:', error);
      if (showToast) {
        toast.error('Error al actualizar auditoría');
      }
      return false;
    }
  },

  /**
   * Elimina una auditoría
   */
  async eliminar(id: string, showToast = true): Promise<boolean> {
    try {
      await controlInternoService.deleteAuditoria(id);
      
      if (showToast) {
        toast.success('Auditoría eliminada');
      }
      return true;
    } catch (error) {
      console.error('[auditoriaService] Error al eliminar:', error);
      if (showToast) {
        toast.error('Error al eliminar auditoría');
      }
      return false;
    }
  },
};

export default auditoriaService;
