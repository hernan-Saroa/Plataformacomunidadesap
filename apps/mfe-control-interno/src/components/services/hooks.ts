/**
 * CUSTOM HOOKS - MÓDULO CONTROL INTERNO
 * Hooks de React para facilitar el uso de los servicios API
 */

import { useState, useEffect, useCallback } from 'react';
import { controlInternoApi } from './api';
import {
  Auditoria,
  Hallazgo,
  PlanMejoramiento,
  UniversoAuditorias,
  ProgramaAnual,
  PlanAnual5Roles,
  ListaChequeo,
  InformeLey,
  AuditoriaFilters,
  HallazgoFilters,
  PlanMejoramientoFilters,
} from './types';
import { toast } from 'sonner';

// ==================== HOOK GENÉRICO ====================

interface UseDataOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  showToast?: boolean;
}

function useData<T>(
  fetchFn: () => Promise<{ success: boolean; data?: T; error?: string }>,
  options?: UseDataOptions<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchFn();

    if (response.success && response.data) {
      setData(response.data);
      options?.onSuccess?.(response.data);
    } else {
      const errorMsg = response.error || 'Error al cargar datos';
      setError(errorMsg);
      options?.onError?.(errorMsg);
      if (options?.showToast) {
        toast.error(errorMsg);
      }
    }

    setLoading(false);
  }, [fetchFn, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ==================== AUDITORÍAS ====================

export function useAuditorias(filters?: AuditoriaFilters, options?: UseDataOptions<Auditoria[]>) {
  return useData(() => controlInternoApi.auditorias.getAll(filters), options);
}

export function useAuditoria(id: string, options?: UseDataOptions<Auditoria>) {
  return useData(() => controlInternoApi.auditorias.getById(id), options);
}

export function useCreateAuditoria() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAuditoria = async (data: Partial<Auditoria>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.auditorias.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Auditoría creada exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear auditoría';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createAuditoria, loading, error };
}

export function useUpdateAuditoria() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAuditoria = async (id: string, data: Partial<Auditoria>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.auditorias.update(id, data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Auditoría actualizada exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al actualizar auditoría';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { updateAuditoria, loading, error };
}

export function useDeleteAuditoria() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAuditoria = async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.auditorias.delete(id);

    setLoading(false);

    if (response.success) {
      toast.success('Auditoría eliminada exitosamente');
      return true;
    } else {
      const errorMsg = response.error || 'Error al eliminar auditoría';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
  };

  return { deleteAuditoria, loading, error };
}

// ==================== UNIVERSO DE AUDITORÍAS ====================

export function useUniversoAuditorias(year: number, options?: UseDataOptions<UniversoAuditorias>) {
  return useData(() => controlInternoApi.universoAuditorias.getByYear(year), options);
}

export function useCreateUniverso() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUniverso = async (data: Partial<UniversoAuditorias>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.universoAuditorias.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Universo de auditorías creado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear universo';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createUniverso, loading, error };
}

// ==================== PROGRAMA ANUAL ====================

export function useProgramaAnual(year: number, options?: UseDataOptions<ProgramaAnual>) {
  return useData(() => controlInternoApi.programaAnual.getByYear(year), options);
}

export function useCreateProgramaAnual() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPrograma = async (data: Partial<ProgramaAnual>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.programaAnual.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Programa anual creado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear programa';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createPrograma, loading, error };
}

// ==================== HALLAZGOS ====================

export function useHallazgos(filters?: HallazgoFilters, options?: UseDataOptions<Hallazgo[]>) {
  return useData(() => controlInternoApi.hallazgos.getAll(filters), options);
}

export function useHallazgosByAuditoria(auditoriaId: string, options?: UseDataOptions<Hallazgo[]>) {
  return useData(() => controlInternoApi.hallazgos.getByAuditoria(auditoriaId), options);
}

export function useHallazgo(id: string, options?: UseDataOptions<Hallazgo>) {
  return useData(() => controlInternoApi.hallazgos.getById(id), options);
}

export function useCreateHallazgo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createHallazgo = async (data: Partial<Hallazgo>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.hallazgos.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Hallazgo registrado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al registrar hallazgo';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createHallazgo, loading, error };
}

export function useUpdateHallazgo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateHallazgo = async (id: string, data: Partial<Hallazgo>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.hallazgos.update(id, data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Hallazgo actualizado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al actualizar hallazgo';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { updateHallazgo, loading, error };
}

// ==================== PLANES DE MEJORAMIENTO ====================

export function usePlanesMejoramiento(
  filters?: PlanMejoramientoFilters,
  options?: UseDataOptions<PlanMejoramiento[]>
) {
  return useData(() => controlInternoApi.planesMejoramiento.getAll(filters), options);
}

export function usePlanMejoramiento(id: string, options?: UseDataOptions<PlanMejoramiento>) {
  return useData(() => controlInternoApi.planesMejoramiento.getById(id), options);
}

export function useCreatePlanMejoramiento() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = async (data: Partial<PlanMejoramiento>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.planesMejoramiento.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Plan de mejoramiento creado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear plan';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createPlan, loading, error };
}

// ==================== PLAN ANUAL (5 ROLES) ====================

export function usePlanAnual5Roles(year: number, options?: UseDataOptions<PlanAnual5Roles>) {
  return useData(() => controlInternoApi.planAnual5Roles.getByYear(year), options);
}

export function useCreatePlanAnual5Roles() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = async (data: Partial<PlanAnual5Roles>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.planAnual5Roles.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Plan anual creado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear plan';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createPlan, loading, error };
}

// ==================== LISTAS DE CHEQUEO ====================

export function useListasChequeo(options?: UseDataOptions<ListaChequeo[]>) {
  return useData(() => controlInternoApi.listasChequeo.getAll(), options);
}

export function useListaChequeo(id: string, options?: UseDataOptions<ListaChequeo>) {
  return useData(() => controlInternoApi.listasChequeo.getById(id), options);
}

export function useCreateListaChequeo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLista = async (data: Partial<ListaChequeo>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.listasChequeo.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Lista de chequeo creada exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear lista';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createLista, loading, error };
}

// ==================== INFORMES DE LEY ====================

export function useInformesLey(options?: UseDataOptions<InformeLey[]>) {
  return useData(() => controlInternoApi.informesLey.getAll(), options);
}

export function useInformeLey(id: string, options?: UseDataOptions<InformeLey>) {
  return useData(() => controlInternoApi.informesLey.getById(id), options);
}

export function useCreateInformeLey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInforme = async (data: Partial<InformeLey>) => {
    setLoading(true);
    setError(null);

    const response = await controlInternoApi.informesLey.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success('Informe creado exitosamente');
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear informe';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { createInforme, loading, error };
}
