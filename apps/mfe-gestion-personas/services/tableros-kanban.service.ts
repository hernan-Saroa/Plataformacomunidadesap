/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO: TABLEROS KANBAN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Funciones para interactuar con la API de Tableros Kanban
 * - Cargar tableros
 * - CRUD de etapas
 * - Reordenamiento de etapas
 */

import { buildApiUrl, API_MODE } from '@/config/environment';
import { toast } from 'sonner';

/**
 * Helper para construir URLs que funcionen en ambos modos
 * En modo direct: quita /api/v1 del path
 * En modo gateway: mantiene /api/v1
 */
function buildTableroKanbanUrl(path: string): string {
  // Si el path incluye /api/v1 y estamos en modo directo, quitarlo
  if (API_MODE === 'direct' && path.includes('/api/v1')) {
    const pathWithoutApi = path.replace('/api/v1', '');
    return buildApiUrl('control-institucional', pathWithoutApi);
  }
  // En modo gateway, mantener el path completo con /api/v1
  return buildApiUrl('control-institucional', path);
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface EtapaKanban {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  color: string;
  tiempoSLA: number; // días
  limiteWIP: number | null; // null = sin límite
  visible: boolean;
  notificarVencimiento: boolean;
  diasAnticipacionAlerta: number;
  estado: 'inicial' | 'intermedia' | 'final';
  permitirRetroceso: boolean;
}

export interface ConfiguracionTablero {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'auditorias' | 'planes_mejoramiento';
  etapas: EtapaKanban[];
  activo: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDACIONES
// ════════════════════════════════════════════════════════════════════════════

const LIMITES = {
  TIEMPO_SLA_MIN: 0,
  TIEMPO_SLA_MAX: 365,
  DIAS_ALERTA_MIN: 0,
  DIAS_ALERTA_MAX: 90,
  LIMITE_WIP_MIN: 1,
  LIMITE_WIP_MAX: 100,
  ORDEN_MIN: 1,
  ORDEN_MAX: 50
};

function validarEtapa(etapa: Partial<EtapaKanban>): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (etapa.tiempoSLA !== undefined) {
    if (etapa.tiempoSLA < LIMITES.TIEMPO_SLA_MIN || etapa.tiempoSLA > LIMITES.TIEMPO_SLA_MAX) {
      errores.push(`El tiempo SLA debe estar entre ${LIMITES.TIEMPO_SLA_MIN} y ${LIMITES.TIEMPO_SLA_MAX} días`);
    }
  }

  if (etapa.diasAnticipacionAlerta !== undefined) {
    if (etapa.diasAnticipacionAlerta < LIMITES.DIAS_ALERTA_MIN || etapa.diasAnticipacionAlerta > LIMITES.DIAS_ALERTA_MAX) {
      errores.push(`Los días de alerta deben estar entre ${LIMITES.DIAS_ALERTA_MIN} y ${LIMITES.DIAS_ALERTA_MAX}`);
    }
  }

  if (etapa.limiteWIP !== null && etapa.limiteWIP !== undefined) {
    if (etapa.limiteWIP < LIMITES.LIMITE_WIP_MIN || etapa.limiteWIP > LIMITES.LIMITE_WIP_MAX) {
      errores.push(`El límite WIP debe estar entre ${LIMITES.LIMITE_WIP_MIN} y ${LIMITES.LIMITE_WIP_MAX}`);
    }
  }

  if (etapa.orden !== undefined) {
    if (etapa.orden < LIMITES.ORDEN_MIN || etapa.orden > LIMITES.ORDEN_MAX) {
      errores.push(`El orden debe estar entre ${LIMITES.ORDEN_MIN} y ${LIMITES.ORDEN_MAX}`);
    }
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES API
// ════════════════════════════════════════════════════════════════════════════

/**
 * Carga los tableros Kanban desde el backend
 */
export async function cargarTablerosKanban(): Promise<ConfiguracionTablero[]> {
  try {
    const url = buildTableroKanbanUrl('/api/v1/tableros-kanban');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('esap_auth_token') || sessionStorage.getItem('esap_access_token') || sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar los tableros Kanban');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al cargar tableros Kanban:', error);
    toast.error('Error al cargar los tableros Kanban');
    return [];
  }
}

/**
 * Crea una nueva etapa en el tablero
 */
export async function crearEtapa(tableroId: string, etapa: Partial<EtapaKanban>): Promise<EtapaKanban | null> {
  // Validar datos
  const validacion = validarEtapa(etapa);
  if (!validacion.valido) {
    validacion.errores.forEach(error => toast.error(error));
    return null;
  }

  try {
    // Filtrar campos que no deben enviarse al backend
    const { id, tableroKanbanId, createdAt, updatedAt, deletedAt, ...etapaData } = etapa as any;
    
    const url = buildTableroKanbanUrl(`/api/v1/tableros-kanban/${tableroId}/etapas`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('esap_auth_token') || sessionStorage.getItem('esap_access_token') || sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(etapaData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al crear la etapa');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al crear etapa:', error);
    toast.error(error instanceof Error ? error.message : 'Error al crear la etapa');
    return null;
  }
}

/**
 * Actualiza una etapa existente
 */
export async function actualizarEtapa(tableroId: string, etapaId: string, etapa: Partial<EtapaKanban>): Promise<EtapaKanban | null> {
  // Validar datos
  const validacion = validarEtapa(etapa);
  if (!validacion.valido) {
    validacion.errores.forEach(error => toast.error(error));
    return null;
  }

  try {
    // Filtrar campos que no deben enviarse al backend
    const { id, tableroKanbanId, createdAt, updatedAt, deletedAt, ...etapaData } = etapa as any;
    
    const url = buildTableroKanbanUrl(`/api/v1/tableros-kanban/${tableroId}/etapas/${etapaId}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('esap_auth_token') || sessionStorage.getItem('esap_access_token') || sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(etapaData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar la etapa');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al actualizar etapa:', error);
    toast.error(error instanceof Error ? error.message : 'Error al actualizar la etapa');
    return null;
  }
}

/**
 * Elimina una etapa
 */
export async function eliminarEtapa(tableroId: string, etapaId: string): Promise<boolean> {
  try {
    const url = buildTableroKanbanUrl(`/api/v1/tableros-kanban/${tableroId}/etapas/${etapaId}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('esap_auth_token') || sessionStorage.getItem('esap_access_token') || sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al eliminar la etapa');
    }

    return true;
  } catch (error) {
    console.error('Error al eliminar etapa:', error);
    toast.error(error instanceof Error ? error.message : 'Error al eliminar la etapa');
    return false;
  }
}

/**
 * Reordena las etapas del tablero
 */
export async function reordenarEtapas(tableroId: string, etapasIds: string[]): Promise<boolean> {
  try {
    const url = buildTableroKanbanUrl(`/api/v1/tableros-kanban/${tableroId}/etapas/reordenar`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('esap_auth_token') || sessionStorage.getItem('esap_access_token') || sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ etapasIds })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al reordenar las etapas');
    }

    return true;
  } catch (error) {
    console.error('Error al reordenar etapas:', error);
    toast.error(error instanceof Error ? error.message : 'Error al reordenar las etapas');
    return false;
  }
}

// Exportar límites para usar en validaciones de UI
export { LIMITES };
