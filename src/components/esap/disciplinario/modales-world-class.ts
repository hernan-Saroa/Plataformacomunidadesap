/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BARREL EXPORT - MODALES WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Archivo de exportación centralizada para todos los modales World Class
 * del módulo de Control Interno Disciplinario.
 * 
 * USO:
 * import { 
 *   ModalGestionAutosWorldClass,
 *   ModalGestionEvidenciasWorldClass,
 *   // ... otros modales
 * } from './modales-world-class';
 * 
 * @version 1.0.0
 * @date 10 de Febrero de 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// MODALES DE GESTIÓN DOCUMENTAL
// ═══════════════════════════════════════════════════════════════════════════

export { ModalGestionAutosWorldClass } from './ModalGestionAutosWorldClass';
export { ModalGestionEvidenciasWorldClass } from './ModalGestionEvidenciasWorldClass';
export { ModalGestionOficiosWorldClass } from './ModalGestionOficiosWorldClass';
export { ModalGestionActasWorldClass } from './ModalGestionActasWorldClass';
export { ModalHistorialAuditoriaWorldClass } from './ModalHistorialAuditoriaWorldClass';

// ═══════════════════════════════════════════════════════════════════════════
// MODALES DE DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════

export { ModalSubirDocumento } from './ModalSubirDocumento';

// ═══════════════════════════════════════════════════════════════════════════
// MODALES DE PROCESOS Y NOTICIAS
// ═══════════════════════════════════════════════════════════════════════════

export { ModalAsociarProcesoAProceso } from './ModalAsociarProcesoAProceso';
export { ModalAsociarNoticiaProceso } from './ModalAsociarNoticiaProceso';
export { ModalAsignarProfesional } from './ModalAsignarProfesional';
export { ModalSolicitarReasignacion } from './ModalSolicitarReasignacion';
export { ModalAprobarReasignacion } from './ModalAprobarReasignacion';
export { ModalRevisionAuto } from './ModalRevisionAuto';
export { ModalAprobarDocumentos } from './ModalAprobarDocumentos';

// ═══════════════════════════════════════════════════════════════════════════
// NOTA: MODALES LEGACY (POR MIGRAR)
// ═══════════════════════════════════════════════════════════════════════════
// 
// Los siguientes modales aún usan el diseño antiguo y están pendientes
// de migración al diseño World Class:
// 
// - ModalArchivarNoticia
// - ModalArchivarProceso
// - ModalDetallesNoticia
// - ModalEliminarNoticia
// - ModalRemitirCompetencia
// - ModalEdicionPlantilla
// - ModalEdicionPlantillaAuto
// 
// Se encuentran en el archivo ModalesGestionDocumental.tsx (legacy)
// 
// ═══════════════════════════════════════════════════════════════════════════
