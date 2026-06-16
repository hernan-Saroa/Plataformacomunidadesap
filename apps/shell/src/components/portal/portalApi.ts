/**
 * Portal API - funciones para el Portal Transaccional.
 *
 * Reescrito para usar el `apiClient` unificado del shell, que ya maneja:
 *   - Modo `direct`  (`localhost`)  -> microservicio `auth` en puerto 3001.
 *   - Modo `gateway` (producción/intranet) -> `/services/auth/api/v1/...`.
 *   - Token JWT real (sessionStorage `esap_auth_token`) en `Authorization: Bearer`.
 *   - Header redundante `X-Access-Token` para gateways con SSL/proxy.
 *   - Refresh de token cuando expira.
 *
 * IMPORTANTE: Algunos de estos endpoints (`/portal/perfil/:id`, `/portal/estadisticas/:id`,
 * `/portal/certificados-laborales/:id`, etc.) **aún no existen** en el backend
 * `auth-service`. Para no bloquear la UI cuando no responden, todas las funciones
 * envuelven el llamado en try/catch y devuelven un fallback razonable
 * (null, lista vacía, mensaje "No disponible"). El día que el backend los implemente
 * funcionarán automáticamente sin tocar la UI.
 */

import { apiClient } from '../../services/api/apiClient';

const PORTAL_PREFIX = '/auth/api/v1/portal';

// ────────────────────────────────────────────────────────────────────────────
// Perfil
// ────────────────────────────────────────────────────────────────────────────

export async function getPerfilPortal(personaId: string) {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/perfil/${personaId}`, undefined, { skipErrorToast: true });
  } catch {
    return null;
  }
}

export async function updatePerfilPortal(personaId: string, data: any) {
  try {
    return await apiClient.put(`${PORTAL_PREFIX}/perfil/${personaId}`, data, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] updatePerfilPortal no disponible:', err);
    return { success: false };
  }
}

export async function updatePrivacidad(personaId: string, configPriv: any) {
  try {
    return await apiClient.put(`${PORTAL_PREFIX}/privacidad/${personaId}`, configPriv, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] updatePrivacidad no disponible:', err);
    return { success: false };
  }
}

export async function uploadFotoPerfil(file: File, personaId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('personaId', personaId);
  try {
    return await apiClient.upload(`${PORTAL_PREFIX}/foto-perfil`, formData);
  } catch (err) {
    console.warn('[portalApi] uploadFotoPerfil falló:', err);
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Estadísticas / inicialización
// ────────────────────────────────────────────────────────────────────────────

export async function getEstadisticasPortal(personaId: string) {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/estadisticas/${personaId}`, undefined, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] getEstadisticasPortal no disponible:', err);
    return {
      success: false,
      data: {
        procesosActivos: 0,
        pendientes: 0,
        completados: 0,
        cumplimiento: 0,
        enComunicacion: 0,
        enPlanMejora: 0,
        hallazgosTotales: 0,
        proximosAVencer: 0,
        incrementoSemana: 'Sin cambios',
        incrementoMes: 'Sin cambios',
        certificadosLaborales: 0,
        documentosCarpeta: 0,
        tieneCarpetaDigital: false,
      },
    };
  }
}

export async function inicializarDatosPortal(personaId: string) {
  try {
    return await apiClient.post(`${PORTAL_PREFIX}/inicializar`, { personaId }, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] inicializarDatosPortal no disponible:', err);
    return { ok: true };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Certificados laborales
// ────────────────────────────────────────────────────────────────────────────

export async function getCertificadosLaboralesPortal(personaId: string) {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/certificados-laborales/${personaId}`, undefined, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] getCertificadosLaboralesPortal no disponible:', err);
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
  try {
    return await apiClient.post(`${PORTAL_PREFIX}/certificados-laborales/solicitar`, params, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] solicitarCertificadoLaboral no disponible:', err);
    return { success: false, error: 'No disponible' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Carpeta digital
// ────────────────────────────────────────────────────────────────────────────

export async function getCarpetaDigitalPortal(personaId: string) {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/carpeta-digital/${personaId}`, undefined, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] getCarpetaDigitalPortal no disponible:', err);
    return { success: true, data: { documentos: [], tipos_requeridos: [], persona: null } };
  }
}

export async function uploadDocumentoCarpetaDigital(params: {
  personaId: string;
  file: File;
  tipoDocumento: string;
  categoria?: string;
  descripcion?: string;
}) {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('personaId', params.personaId);
  formData.append('tipoDocumento', params.tipoDocumento);
  if (params.categoria) formData.append('categoria', params.categoria);
  if (params.descripcion) formData.append('descripcion', params.descripcion);
  return apiClient.upload(`${PORTAL_PREFIX}/carpeta-digital/upload`, formData);
}
export async function getChecklistForPersona(personaId: string) {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/carpeta-digital/${personaId}/checklist`, undefined, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] getChecklistForPersona no disponible:', err);
    return { success: true, data: { useGlobalTypes: true, tiposDocumentos: [] } };
  }
}

export async function getTiposDocumentos() {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/carpeta-digital/tipos-documentos`, undefined, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] getTiposDocumentos no disponible:', err);
    return { success: true, data: [] };
  }
}

export async function getDocumentosByCarpeta(personaId: string) {
  try {
    return await apiClient.get(`${PORTAL_PREFIX}/carpeta-digital/${personaId}/documentos`, undefined, { skipErrorToast: true });
  } catch (err) {
    console.warn('[portalApi] getDocumentosByCarpeta no disponible:', err);
    return { success: true, data: [] };
  }
}

export async function reclassifyDocumento(docId: string, data: any) {
  try {
    return await apiClient.put(`${PORTAL_PREFIX}/carpeta-digital/documentos/${docId}/reclassify`, data);
  } catch (err) {
    console.warn('[portalApi] reclassifyDocumento no disponible:', err);
    return { success: false };
  }
}
