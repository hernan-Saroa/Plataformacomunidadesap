import { toast } from 'sonner';
import { apiClient } from './apiClient';

export interface RundProfilesSyncSummary {
  total: number;
  created: number;
  skipped: number;
  failed: number;
}

// Las mutaciones no se repiten ante 5xx: el servidor pudo haberlas confirmado.
// El cliente conserva el refresh de sesión y sus cookies HttpOnly.
export const RUND_SYNC_REQUEST = {
  retries: 0,
  skipErrorToast: true,
  preserveResponse: true,
} as const;

export function unwrapRundSyncResponse(raw: unknown): any {
  let value: any = raw;
  for (let depth = 0; depth < 3; depth++) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.success === false) {
      throw new Error('RUND no confirmó la sincronización.');
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'data')) return value;
    value = value.data;
  }
  throw new Error('Respuesta de sincronización RUND no válida.');
}

export async function syncRundProfilesFromAuth(): Promise<RundProfilesSyncSummary> {
  const raw = await apiClient.post<unknown>(
    '/rund/api/v1/banco-docentes/sync-from-auth',
    {},
    RUND_SYNC_REQUEST,
  );
  const summary = unwrapRundSyncResponse(raw);
  const counts = [summary.total, summary.created, summary.skipped, summary.failed];
  if (!counts.every(n => Number.isSafeInteger(n) && n >= 0)
    || summary.total !== summary.created + summary.skipped + summary.failed) {
    throw new Error('Resumen de sincronización RUND no válido.');
  }
  return { total: summary.total, created: summary.created, skipped: summary.skipped, failed: summary.failed };
}

/** La asignación en auth ya terminó; fallar aquí no revierte ni repite los roles. */
export async function syncRundProfilesWithFeedback(operation: 'roles' | 'user' = 'roles'): Promise<void> {
  const saved = operation === 'user' ? 'Usuario creado' : 'Roles guardados';
  const action = { label: 'Reintentar', onClick: () => { void syncRundProfilesWithFeedback(operation); } };
  try {
    const summary = await syncRundProfilesFromAuth();
    if (summary.failed > 0) {
      toast.warning('Sincronización con RUND incompleta', {
        description: `${saved}. ${summary.created} perfiles creados, ${summary.skipped} omitidos y ${summary.failed} pendientes.`,
        action,
      });
    } else {
      toast.success('Sincronización con RUND completada', {
        description: `${summary.created} perfiles creados y ${summary.skipped} existentes o no elegibles omitidos.`,
      });
    }
  } catch (error: any) {
    const reason = error?.status === 403
      ? 'Tu sesión no tiene permiso para sincronizar RUND.'
      : error?.status === 401
        ? 'Inicia sesión para sincronizar RUND.'
        : 'No se pudo confirmar la sincronización con RUND.';
    toast.warning(`${saved}; sincronización con RUND pendiente`, {
      description: reason,
      action,
    });
  }
}
