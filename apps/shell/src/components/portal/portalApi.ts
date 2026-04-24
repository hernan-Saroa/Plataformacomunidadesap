/**
 * Portal API - funciones para el Portal Transaccional (Legacy PTA)
 *
 * Nota: En esta plataforma el backend puede variar (Gateway/Direct).
 * Por defecto intentamos contra el API Gateway bajo `/auth/api/v1/portal`.
 * Si no existe el endpoint, se devuelve fallback para no bloquear la UI.
 */

import { config } from '../../config/environment';
import { publicAnonKey } from '../../utils/supabase/info';

const BASE_URL = (import.meta.env.VITE_PORTAL_API_URL as string | undefined) || config.API_BASE_URL;
const PORTAL_PREFIX = (import.meta.env.VITE_PORTAL_API_PREFIX as string | undefined) || '/auth/api/v1/portal';

function joinUrl(base: string, path: string) {
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = joinUrl(joinUrl(BASE_URL, PORTAL_PREFIX), endpoint);
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${publicAnonKey}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  return res.json();
}

export async function getEstadisticasPortal(personaId: string) {
  try {
    return await fetchApi(`/estadisticas/${personaId}`);
  } catch (err) {
    console.warn('Error obteniendo estadísticas del portal:', err);
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
    return await fetchApi(`/inicializar`, {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    });
  } catch (err) {
    console.warn('Error inicializando datos del portal:', err);
    return { ok: true };
  }
}

export async function getPerfilPortal(personaId: string) {
  try {
    const url = joinUrl(joinUrl(BASE_URL, PORTAL_PREFIX), `/perfil/${personaId}`);
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function updatePerfilPortal(personaId: string, data: any) {
  return fetchApi(`/perfil/${personaId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updatePrivacidad(personaId: string, configPriv: any) {
  return fetchApi(`/privacidad/${personaId}`, {
    method: 'PUT',
    body: JSON.stringify(configPriv),
  });
}

export async function uploadFotoPerfil(file: File, personaId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('personaId', personaId);

  const url = joinUrl(joinUrl(BASE_URL, PORTAL_PREFIX), '/foto-perfil');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Error uploading photo: ${res.status}`);
  }

  return res.json();
}

export async function getCertificadosLaboralesPortal(personaId: string) {
  try {
    return await fetchApi(`/certificados-laborales/${personaId}`);
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
  try {
    return await fetchApi('/certificados-laborales/solicitar', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.warn('Error solicitando certificado laboral:', err);
    return { success: false, error: 'No disponible' };
  }
}

export async function getCarpetaDigitalPortal(personaId: string) {
  try {
    return await fetchApi(`/carpeta-digital/${personaId}`);
  } catch (err) {
    console.warn('Error obteniendo carpeta digital del portal:', err);
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

  const url = joinUrl(joinUrl(BASE_URL, PORTAL_PREFIX), '/carpeta-digital/upload');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Error uploading document: ${res.status} - ${errorText}`);
  }

  return res.json();
}
