/**
 * API del portal consumida por el MFE de PTA.
 *
 * Todas las solicitudes pasan por el cliente compartido para respetar la URL del
 * ambiente (`/services` en QA/DEV/produccion y el gateway local en desarrollo),
 * las cookies HttpOnly y el refresh de sesion.
 */

import { apiClient } from '../../../../shell/src/services/api';

const PORTAL_PREFIX = '/auth/api/v1/portal';

type PortalResult<T> = {
  success: boolean;
  data: T;
};

// apiClient desenvuelve la propiedad `data` de las respuestas del backend. El
// formulario PTA historicamente consume `{ success, data }`, por lo que mantenemos
// aqui ese contrato sin duplicar URLs ni autenticacion.
function asPortalResult<T>(raw: T): PortalResult<T> {
  if (
    raw &&
    typeof raw === 'object' &&
    'success' in raw &&
    'data' in raw
  ) {
    return raw as PortalResult<T>;
  }
  return { success: true, data: raw };
}

// ============================================================================
// ESTADISTICAS DEL PORTAL
// ============================================================================

export async function getEstadisticasPortal(personaId: string) {
  try {
    const data = await apiClient.get<any>(
      `${PORTAL_PREFIX}/estadisticas/${encodeURIComponent(personaId)}`,
      undefined,
      { skipErrorToast: true },
    );
    return asPortalResult(data);
  } catch {
    return {
      success: true,
      data: {
        procesosActivos: 0,
        pendientes: 0,
        completados: 0,
        cumplimiento: 100,
        enComunicacion: 0,
        enPlanMejora: 0,
        hallazgosTotales: 0,
        proximosAVencer: 0,
        incrementoSemana: 'Sin cambios',
        incrementoMes: 'Sin cambios',
        certificadosLaborales: 0,
        documentosCarpeta: 0,
      },
    };
  }
}

// ============================================================================
// INICIALIZAR DATOS DEL PORTAL
// ============================================================================

export async function inicializarDatosPortal(personaId: string) {
  try {
    return await apiClient.post<any>(
      `${PORTAL_PREFIX}/inicializar`,
      { personaId },
      { skipErrorToast: true },
    );
  } catch {
    return { ok: true };
  }
}

// ============================================================================
// PERFIL DEL USUARIO
// ============================================================================

export async function getPerfilPortal(personaId: string) {
  try {
    const data = await apiClient.get<any>(
      `${PORTAL_PREFIX}/perfil/${encodeURIComponent(personaId)}`,
      undefined,
      { skipErrorToast: true },
    );
    return asPortalResult(data);
  } catch {
    return null;
  }
}

export async function updatePerfilPortal(personaId: string, data: any) {
  const updated = await apiClient.put<any>(
    `${PORTAL_PREFIX}/perfil/${encodeURIComponent(personaId)}`,
    data,
  );
  return asPortalResult(updated);
}

// ============================================================================
// PRIVACIDAD
// ============================================================================

export async function updatePrivacidad(personaId: string, config: any) {
  const updated = await apiClient.put<any>(
    `${PORTAL_PREFIX}/privacidad/${encodeURIComponent(personaId)}`,
    config,
  );
  return asPortalResult(updated);
}

// ============================================================================
// FOTO DE PERFIL
// ============================================================================

export async function uploadFotoPerfil(file: File, personaId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('personaId', personaId);

  const uploaded = await apiClient.upload<any>(`${PORTAL_PREFIX}/foto-perfil`, formData);
  return asPortalResult(uploaded);
}

// ============================================================================
// CERTIFICADOS LABORALES DEL PORTAL
// ============================================================================

export async function getCertificadosLaboralesPortal(personaId: string) {
  try {
    const data = await apiClient.get<any>(
      `${PORTAL_PREFIX}/certificados-laborales/${encodeURIComponent(personaId)}`,
      undefined,
      { skipErrorToast: true },
    );
    return asPortalResult(data);
  } catch (err) {
    console.warn('Error obteniendo certificados laborales del portal:', err);
    return { success: true, data: [] };
  }
}

export async function solicitarCertificadoLaboral(params: {
  personaId: string;
  tipoCertificado: string;
  incluyeSalario: boolean;
  destinatario?: string;
  observaciones?: string;
}) {
  const data = await apiClient.post<any>(
    `${PORTAL_PREFIX}/certificados-laborales/solicitar`,
    params,
  );
  return asPortalResult(data);
}
