import { useState, useCallback } from 'react';
import { apiClient } from '../services/api/apiClient';

export interface ImportCount {
  creados: number;
  actualizados: number;
  omitidos: number;
}

export interface ImportCarga {
  programas: ImportCount;
  nucleos_tematicos: ImportCount;
  cetaps: ImportCount;
  ofertas_cetap_programa: ImportCount;
  asignaturas: ImportCount;
}

export interface IndicadoresPta {
  asignaturas_modalidad_sin_definir: number;
  asignaturas_con_excepcion: number;
  horas_pta_calculadas_promedio: number;
  asignaturas_disponibles_por_dt: Record<string, number>;
}

export interface ImportResult {
  success: boolean;
  dry_run: boolean;
  periodo: string;
  tiempo_ms: number;
  carga: ImportCarga;
  indicadores_pta: IndicadoresPta;
  advertencias: string[];
  errores: string[];
  relaciones_cruzadas?: any[];
}

export interface EstructuraImportStatus {
  success: boolean;
  direcciones_territoriales: number;
  cetaps: number;
  isReady: boolean;
  message?: string;
}

export function useImportAsignaturas() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetImportState = useCallback(() => {
    setLoading(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const uploadCatalog = useCallback(async (file: File, dryRun: boolean, periodoCodigo = '2025-2', omitErrors = false) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = `/pta/api/v1/asignaturas-import/upload?dry_run=${dryRun}&periodo_codigo=${periodoCodigo}&omit_errors=${omitErrors}`;
      
      const res = await apiClient.upload<ImportResult>(endpoint, formData, {
        onProgress: (p) => setProgress(p),
      });

      setResult(res);
      return res;
    } catch (err: any) {
      const msg = err.message || 'Error al procesar la carga del catálogo';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLastImport = useCallback(async (periodoCodigo = '2025-2') => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>(`/pta/api/v1/asignaturas-import/last-import?periodo_codigo=${periodoCodigo}`);
      return res;
    } catch (err: any) {
      setError(err.message || 'Error al obtener la última carga');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPeriodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any[]>('/pta/api/v1/periodos-academicos');
      return res;
    } catch (err: any) {
      setError(err.message || 'Error al obtener los periodos académicos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPeriodo = useCallback(async (data: { anio: number; semestre: number; fechaInicio: string; fechaFin: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<any>('/pta/api/v1/periodos-academicos', data);
      return res;
    } catch (err: any) {
      setError(err.message || 'Error al crear el periodo académico');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePeriodo = useCallback(async (id: string, data: {
    anio?: number;
    semestre?: number;
    fechaInicio?: string;
    fechaFin?: string;
    estado?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.patch<any>(`/pta/api/v1/periodos-academicos/${id}`, data);
      return res;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el periodo académico');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePeriodo = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.delete<any>(`/pta/api/v1/periodos-academicos/${id}`, {
        retries: 0,
      });
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el periodo académico');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPeriodoDetalle = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>(`/pta/api/v1/periodos-academicos/${id}/detalle`);
      return res;
    } catch (err: any) {
      setError(err.message || 'Error al obtener los detalles del periodo académico');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkEstructuraStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<EstructuraImportStatus>(`/auth/api/v1/estructura-import/status`, {
        retries: 0,
      });
      return res;
    } catch (err: any) {
      console.warn('No se pudo verificar la estructura geográfica:', err.message);
      return {
        success: false,
        direcciones_territoriales: 0,
        cetaps: 0,
        isReady: false,
        message: err.message || 'No se pudo verificar la estructura geográfica.',
      };
    }
  }, []);

  return {
    loading,
    progress,
    result,
    error,
    resetImportState,
    uploadCatalog,
    getLastImport,
    getPeriodos,
    createPeriodo,
    updatePeriodo,
    deletePeriodo,
    getPeriodoDetalle,
    checkEstructuraStatus,
  };
}
