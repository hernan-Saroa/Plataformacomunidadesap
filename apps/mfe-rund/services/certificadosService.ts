/**
 * Servicio para interactuar con el backend de certificados laborales
 *
 * Nueva estructura de URLs: /{service}/api/v{version}/{path}
 * Ejemplo: /certificados/api/v1/certificates/solicitudes
 *
 * El API Gateway rutea: /certificados/api/v1/* -> certification-service:3004/*
 */

import { config } from '../config/environment';

// URL base del API Gateway + prefijo del servicio de certificados
const API_BASE_URL = config.API_BASE_URL;
const SERVICE_PREFIX = '/certificados/api/v1';
const CERTIFICATES_ENDPOINT = `${API_BASE_URL}${SERVICE_PREFIX}/certificates`;

// Tipos que coinciden con el backend
export interface SolicitudCertificado {
  id: string;
  numero_solicitud: string;
  person_id: string | null;
  nombre_completo: string;
  cedula: string;
  carrera_categoria: string;
  fecha_vinculacion: string;
  categoria_cargo: string;
  ubicacion_cargo: string | null;
  salario_mensual: number;
  salario_texto: string | null;
  dependencia: string | null;
  sede: string | null;
  email: string | null;
  telefono: string | null;
  estado: string;
  fecha_solicitud: string;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certificado {
  id: string;
  codigo_verificacion: string;
  numero_certificado: string;
  solicitud_id: string;
  nombre_completo: string;
  cedula: string;
  carrera_categoria: string;
  fecha_vinculacion: string;
  categoria_cargo: string;
  ubicacion_cargo: string | null;
  salario_mensual: number;
  salario_texto: string | null;
  dependencia: string | null;
  sede: string | null;
  fecha_emision: string;
  fecha_expedicion: string;
  firmante_nombre: string;
  firmante_cargo: string;
  firmante_dependencia: string;
  pdf_url: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  solicitud?: SolicitudCertificado; // Relación opcional cuando se incluye con relations
}

export interface Firmante {
  id: string;
  nombre_completo: string;
  cargo: string;
  dependencia: string;
  activo: boolean;
  es_principal: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// SOLICITUDES
// ============================================

export const getAllSolicitudes = async (): Promise<SolicitudCertificado[]> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/solicitudes`);
  if (!response.ok) {
    throw new Error('Error al obtener solicitudes');
  }
  return response.json();
};

export const getSolicitudById = async (id: string): Promise<SolicitudCertificado> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/solicitudes/${id}`);
  if (!response.ok) {
    throw new Error('Error al obtener solicitud');
  }
  return response.json();
};

export const getSolicitudesByPersonId = async (personId: string): Promise<SolicitudCertificado[]> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/solicitudes/person/${personId}`);
  if (!response.ok) {
    throw new Error('Error al obtener solicitudes de la persona');
  }
  return response.json();
};

export const createSolicitud = async (data: Partial<SolicitudCertificado>): Promise<SolicitudCertificado> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/solicitudes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Error al crear solicitud');
  }
  return response.json();
};

export const updateSolicitud = async (id: string, data: Partial<SolicitudCertificado>): Promise<SolicitudCertificado> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/solicitudes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Error al actualizar solicitud');
  }
  return response.json();
};

// ============================================
// CERTIFICADOS
// ============================================

export const getAllCertificados = async (): Promise<Certificado[]> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/certificados`);
  if (!response.ok) {
    throw new Error('Error al obtener certificados');
  }
  return response.json();
};

export const getCertificadoById = async (id: string): Promise<Certificado> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/certificados/${id}`);
  if (!response.ok) {
    throw new Error('Error al obtener certificado');
  }
  return response.json();
};

export const generateCertificado = async (solicitudId: string): Promise<Certificado> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/certificados/generate/${solicitudId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Error al generar certificado');
  }
  return response.json();
};

export const verifyCertificado = async (codigo: string): Promise<Certificado> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/certificados/verify/${codigo}`);
  if (!response.ok) {
    throw new Error('Error al verificar certificado');
  }
  return response.json();
};

// ============================================
// FIRMANTES
// ============================================

export const getAllFirmantes = async (): Promise<Firmante[]> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/firmantes`);
  if (!response.ok) {
    throw new Error('Error al obtener firmantes');
  }
  return response.json();
};

export const getFirmantePrincipal = async (): Promise<Firmante> => {
  const response = await fetch(`${CERTIFICATES_ENDPOINT}/firmantes/principal`);
  if (!response.ok) {
    throw new Error('Error al obtener firmante principal');
  }
  return response.json();
};
