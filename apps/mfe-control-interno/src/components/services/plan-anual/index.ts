/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLAN ANUAL DE AUDITORÍA - EXPORTS CENTRALIZADOS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Punto de entrada único para todo lo relacionado con Plan Anual.
 * 
 * Uso en componentes:
 * ```typescript
 * import { 
 *   usePlanAnualCompleto,
 *   usePlanAnualByYear,
 *   useAuditores,
 *   PlanAnual,
 *   Actividad,
 *   Rol 
 * } from './services/plan-anual';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type {
  // Entidades principales
  PlanAnual,
  Rol,
  Actividad,
  Auditor,
  EstadisticasPlan,
  
  // Enums y tipos base
  EstadoPlan,
  EstadoActividad,
  PrioridadActividad,
  NumeroRol,
  
  // DTOs
  CreatePlanAnualDto,
  UpdatePlanAnualDto,
  CreateActividadDto,
  UpdateActividadDto,
  
  // Filtros
  FiltrosPlanAnual,
  FiltrosActividad,
  
  // Response
  ApiResponse,
  
  // Adjuntos y Evidencias (Migración 129)
  AdjuntoActividad,
  CreateAdjuntoDto,
  ConfiguracionEvidencias,
  RequisitoEvidencia,
  UpdateActividadExtendidoDto,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS (Para usar en componentes)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Hook principal combinado
  usePlanAnualCompleto,
  
  // Hooks individuales
  usePlanAnualByYear,
  usePlanAnualById,
  usePlanesAnuales,
  useCreatePlanAnual,
  useAuditores,
  useActividadesMutations,
  
  // Hook para evidencias (Migración 129)
  useSaveEvidencias,
} from './hooks';

// ═══════════════════════════════════════════════════════════════════════════
// API (Para casos avanzados)
// ═══════════════════════════════════════════════════════════════════════════

export {
  planAnualApi,
  actividadesApi,
  auditoresApi,
  estadisticasApi,
  planAnualService,
  invalidatePlanAnualListCache,
  
  // APIs de evidencias (Migración 129)
  adjuntosApi,
  actividadesExtendidoApi,
  normalizarAdjuntosTareaDesdeBackend,
  resolverUrlAdjuntoTarea,
  descargarAdjuntoTareaPlanAnual,
  obtenerBlobPreviewAdjuntoTarea,
  cargarPreviewEvidenciaPlanAnual,
  obtenerArrayBufferAdjuntoTarea,
  tipoPreviewAdjuntoTarea,
} from './api';

export type { TipoPreviewAdjuntoTarea, ContenidoPreviewEvidencia } from './api';

export type { AdjuntoTareaPersistido, AdjuntoTareaUploadResponse } from './api';
