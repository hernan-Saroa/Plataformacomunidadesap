/**
 * Estructura Organizacional Service
 * Servicio para gestión de territoriales, regionales y sedes
 */

import { apiClient } from './client';
import type { Territorial, Sede, Programa } from './types';

export const estructuraService = {
  /**
   * TERRITORIALES
   */
  territoriales: {
    /**
     * Listar territoriales
     */
    async listar(params?: { activas?: boolean }): Promise<Territorial[]> {
      return apiClient.get<Territorial[]>('/backoffice/territoriales', { params });
    },

    /**
     * Obtener territorial por ID
     */
    async obtenerPorId(id: string): Promise<Territorial> {
      return apiClient.get<Territorial>(`/backoffice/territoriales/${id}`);
    },

    /**
     * Crear territorial
     */
    async crear(data: Omit<Territorial, 'id' | 'createdAt' | 'updatedAt'>): Promise<Territorial> {
      return apiClient.post<Territorial>('/backoffice/territoriales', data);
    },

    /**
     * Actualizar territorial
     */
    async actualizar(id: string, data: Partial<Territorial>): Promise<Territorial> {
      return apiClient.put<Territorial>(`/backoffice/territoriales/${id}`, data);
    },

    /**
     * Eliminar territorial
     */
    async eliminar(id: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/backoffice/territoriales/${id}`);
    },
  },

  /**
   * SEDES
   */
  sedes: {
    /**
     * Listar sedes
     */
    async listar(params?: {
      territorialId?: string;
      activas?: boolean;
    }): Promise<Sede[]> {
      return apiClient.get<Sede[]>('/backoffice/sedes', { params });
    },

    /**
     * Obtener sede por ID
     */
    async obtenerPorId(id: string): Promise<Sede> {
      return apiClient.get<Sede>(`/backoffice/sedes/${id}`);
    },

    /**
     * Crear sede
     */
    async crear(data: Omit<Sede, 'id' | 'createdAt' | 'updatedAt'>): Promise<Sede> {
      return apiClient.post<Sede>('/backoffice/sedes', data);
    },

    /**
     * Actualizar sede
     */
    async actualizar(id: string, data: Partial<Sede>): Promise<Sede> {
      return apiClient.put<Sede>(`/backoffice/sedes/${id}`, data);
    },

    /**
     * Eliminar sede
     */
    async eliminar(id: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/backoffice/sedes/${id}`);
    },

    /**
     * Obtener programas de una sede
     */
    async obtenerProgramas(sedeId: string): Promise<Programa[]> {
      return apiClient.get<Programa[]>(`/backoffice/sedes/${sedeId}/programas`);
    },

    /**
     * Asignar programa a sede
     */
    async asignarPrograma(sedeId: string, programaId: string): Promise<{ mensaje: string }> {
      return apiClient.post<{ mensaje: string }>(`/backoffice/sedes/${sedeId}/programas/${programaId}`);
    },

    /**
     * Remover programa de sede
     */
    async removerPrograma(sedeId: string, programaId: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/backoffice/sedes/${sedeId}/programas/${programaId}`);
    },
  },

  /**
   * Obtener árbol organizacional completo
   */
  async obtenerArbol(): Promise<any> {
    return apiClient.get('/backoffice/estructura-organizacional/arbol');
  },

  /**
   * Obtener datos para mapa de cobertura
   */
  async mapaCobertura(): Promise<any> {
    return apiClient.get('/backoffice/estructura-organizacional/mapa-cobertura');
  },
};

export default estructuraService;
