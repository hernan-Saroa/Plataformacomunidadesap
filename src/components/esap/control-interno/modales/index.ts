/**
 * ═════════════════════════════════════════════════════════════════════════
 * MODALES OCIG - EXPORTS CENTRALIZADOS
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Exportación consolidada de todos los modales
 * Reemplaza 15+ archivos individuales
 * 
 * @version 2.0 - OPTIMIZADO
 */

// Modales de Auditorías (Crear, Editar, Ver)
export {
  ModalFormularioAuditoria,
  ModalDetalleAuditoria,
  ModalHistorial,
  ModalRegistrarHallazgo,
  type Auditoria,
} from './ModalesAuditorias';

// Modales de Gestión (Asignar, Aprobar, Cambiar)
export {
  ModalAsignarAuditor,
  ModalAprobarAuditoria,
  ModalCambiarEstado,
  ModalNotas,
} from './ModalesGestion';

// Re-export default para compatibilidad
import ModalesAuditorias from './ModalesAuditorias';
import ModalesGestion from './ModalesGestion';

export const Modales = {
  ...ModalesAuditorias,
  ...ModalesGestion,
};

export default Modales;
