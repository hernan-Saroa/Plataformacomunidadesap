/**
 * React Query Hooks para Módulo de Reportes
 * Optimizado con cache inteligente y auto-refresh
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Query Keys
export const reportsKeys = {
  all: ['reports'] as const,
  lists: () => [...reportsKeys.all, 'list'] as const,
  list: (filters: any) => [...reportsKeys.lists(), filters] as const,
  details: () => [...reportsKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportsKeys.details(), id] as const,
  scheduled: () => [...reportsKeys.all, 'scheduled'] as const,
  analytics: (period: string) => [...reportsKeys.all, 'analytics', period] as const,
  templates: () => [...reportsKeys.all, 'templates'] as const,
};

// Types
export interface Report {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'usuarios' | 'roles' | 'auditoria' | 'actividad' | 'custom';
  registros: number;
  ultimaExportacion: string;
  frecuencia: string;
  favorito: boolean;
  tags: string[];
  fechaCreacion: string;
  creadoPor: string;
  parametros?: any;
}

export interface ReportFilters {
  search?: string;
  tipo?: string;
  favoritos?: boolean;
  dateRange?: string;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  nombre: string;
  frecuencia: 'hourly' | 'daily' | 'weekly' | 'monthly';
  hora: string;
  diasSemana?: number[];
  activo: boolean;
  ultimaEjecucion?: string;
  proximaEjecucion: string;
  destinatarios: string[];
  formato: 'pdf' | 'excel' | 'csv' | 'json';
}

export interface ExportOptions {
  formato: 'pdf' | 'excel' | 'csv' | 'json';
  incluirGraficas?: boolean;
  incluirResumen?: boolean;
  periodo?: {
    inicio: string;
    fin: string;
  };
}

// Mock API Functions (reemplazar con API real)
const mockAPI = {
  getReports: async (filters?: ReportFilters): Promise<Report[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: '1',
        nombre: 'Reporte de Usuarios',
        descripcion: 'Usuarios activos del sistema',
        tipo: 'usuarios',
        registros: 1847,
        ultimaExportacion: 'Hace 2h',
        frecuencia: 'Diario',
        favorito: true,
        tags: ['Excel', 'PDF', 'Email'],
        fechaCreacion: '2024-01-15',
        creadoPor: 'Admin',
      },
      {
        id: '2',
        nombre: 'Análisis de Roles',
        descripcion: 'Distribución de roles y permisos',
        tipo: 'roles',
        registros: 342,
        ultimaExportacion: 'Hace 1d',
        frecuencia: 'Semanal',
        favorito: false,
        tags: ['PDF', 'Gráficas'],
        fechaCreacion: '2024-02-01',
        creadoPor: 'Admin',
      },
      {
        id: '3',
        nombre: 'Eventos de Auditoría',
        descripcion: 'Log completo de eventos',
        tipo: 'auditoria',
        registros: 12847,
        ultimaExportacion: 'Hace 3h',
        frecuencia: 'Cada hora',
        favorito: true,
        tags: ['CSV', 'Excel', 'API'],
        fechaCreacion: '2024-01-20',
        creadoPor: 'Admin',
      },
    ];
  },

  getReport: async (id: string): Promise<Report> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const reports = await mockAPI.getReports();
    const report = reports.find(r => r.id === id);
    if (!report) throw new Error('Reporte no encontrado');
    return report;
  },

  createReport: async (data: Partial<Report>): Promise<Report> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      id: Date.now().toString(),
      nombre: data.nombre || '',
      descripcion: data.descripcion || '',
      tipo: data.tipo || 'custom',
      registros: 0,
      ultimaExportacion: 'Nunca',
      frecuencia: 'Manual',
      favorito: false,
      tags: data.tags || [],
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'Usuario Actual',
    };
  },

  updateReport: async (id: string, data: Partial<Report>): Promise<Report> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const report = await mockAPI.getReport(id);
    return { ...report, ...data };
  },

  deleteReport: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
  },

  exportReport: async (id: string, options: ExportOptions): Promise<Blob> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simular generación de archivo
    const content = `Reporte ID: ${id}\nFormato: ${options.formato}`;
    return new Blob([content], { type: 'text/plain' });
  },

  getScheduledReports: async (): Promise<ScheduledReport[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return [
      {
        id: '1',
        reportId: '1',
        nombre: 'Reporte Diario Usuarios',
        frecuencia: 'daily',
        hora: '08:00',
        activo: true,
        proximaEjecucion: '2024-11-13 08:00',
        destinatarios: ['admin@esap.edu.co'],
        formato: 'excel',
      },
      {
        id: '2',
        reportId: '3',
        nombre: 'Auditoría Semanal',
        frecuencia: 'weekly',
        hora: '09:00',
        diasSemana: [1], // Lunes
        activo: true,
        ultimaEjecucion: '2024-11-11 09:00',
        proximaEjecucion: '2024-11-18 09:00',
        destinatarios: ['seguridad@esap.edu.co'],
        formato: 'pdf',
      },
    ];
  },

  getReportAnalytics: async (period: string): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      totalGenerados: 156,
      totalExportados: 89,
      formatosPopulares: {
        excel: 45,
        pdf: 32,
        csv: 12,
      },
      reportesMasUsados: [
        { id: '1', nombre: 'Usuarios', usos: 45 },
        { id: '3', nombre: 'Auditoría', usos: 38 },
        { id: '2', nombre: 'Roles', usos: 23 },
      ],
    };
  },
};

// ==========================================
// QUERIES
// ==========================================

/**
 * Hook para obtener lista de reportes
 */
export function useReports(filters?: ReportFilters) {
  return useQuery({
    queryKey: reportsKeys.list(filters || {}),
    queryFn: () => mockAPI.getReports(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para obtener un reporte específico
 */
export function useReport(id: string, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.detail(id),
    queryFn: () => mockAPI.getReport(id),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener reportes programados
 */
export function useScheduledReports() {
  return useQuery({
    queryKey: reportsKeys.scheduled(),
    queryFn: () => mockAPI.getScheduledReports(),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh cada minuto
  });
}

/**
 * Hook para analytics de reportes
 */
export function useReportAnalytics(period: string = '30d') {
  return useQuery({
    queryKey: reportsKeys.analytics(period),
    queryFn: () => mockAPI.getReportAnalytics(period),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Hook para crear reporte
 */
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Report>) => mockAPI.createReport(data),
    onMutate: async (newReport) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: reportsKeys.lists() });

      const previousReports = queryClient.getQueryData(reportsKeys.lists());

      queryClient.setQueryData(
        reportsKeys.lists(),
        (old: Report[] = []) => [...old, { ...newReport, id: 'temp' } as Report]
      );

      toast.loading('Creando reporte...', { id: 'create-report' });

      return { previousReports };
    },
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
      toast.success('Reporte creado exitosamente', { id: 'create-report' });
    },
    onError: (error, variables, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(reportsKeys.lists(), context.previousReports);
      }
      toast.error('Error al crear reporte', { id: 'create-report' });
    },
  });
}

/**
 * Hook para actualizar reporte
 */
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Report> }) =>
      mockAPI.updateReport(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: reportsKeys.detail(id) });

      const previousReport = queryClient.getQueryData(reportsKeys.detail(id));

      queryClient.setQueryData(
        reportsKeys.detail(id),
        (old: Report | undefined) => (old ? { ...old, ...data } : old)
      );

      toast.loading('Actualizando reporte...', { id: 'update-report' });

      return { previousReport };
    },
    onSuccess: (updatedReport) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
      queryClient.setQueryData(reportsKeys.detail(updatedReport.id), updatedReport);
      toast.success('Reporte actualizado', { id: 'update-report' });
    },
    onError: (error, variables, context) => {
      if (context?.previousReport) {
        queryClient.setQueryData(reportsKeys.detail(variables.id), context.previousReport);
      }
      toast.error('Error al actualizar', { id: 'update-report' });
    },
  });
}

/**
 * Hook para eliminar reporte
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mockAPI.deleteReport(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: reportsKeys.lists() });

      const previousReports = queryClient.getQueryData(reportsKeys.lists());

      queryClient.setQueryData(
        reportsKeys.lists(),
        (old: Report[] = []) => old.filter((r) => r.id !== id)
      );

      toast.loading('Eliminando reporte...', { id: 'delete-report' });

      return { previousReports };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
      toast.success('Reporte eliminado', { id: 'delete-report' });
    },
    onError: (error, variables, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(reportsKeys.lists(), context.previousReports);
      }
      toast.error('Error al eliminar', { id: 'delete-report' });
    },
  });
}

/**
 * Hook para exportar reporte
 */
export function useExportReport() {
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options: ExportOptions }) =>
      mockAPI.exportReport(id, options),
    onMutate: () => {
      toast.loading('Generando exportación...', { id: 'export-report' });
    },
    onSuccess: (blob, variables) => {
      // Descargar archivo
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte.${variables.options.formato}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Reporte exportado exitosamente', { id: 'export-report' });
    },
    onError: () => {
      toast.error('Error al exportar reporte', { id: 'export-report' });
    },
  });
}

/**
 * Hook para toggle favorito
 */
export function useToggleFavoriteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, favorito }: { id: string; favorito: boolean }) =>
      mockAPI.updateReport(id, { favorito }),
    onMutate: async ({ id, favorito }) => {
      await queryClient.cancelQueries({ queryKey: reportsKeys.detail(id) });

      queryClient.setQueryData(
        reportsKeys.detail(id),
        (old: Report | undefined) => (old ? { ...old, favorito } : old)
      );

      toast.success(favorito ? 'Agregado a favoritos' : 'Removido de favoritos', {
        duration: 2000,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
    },
  });
}

/**
 * Hook para prefetch de reporte (hover)
 */
export function usePrefetchReport() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: reportsKeys.detail(id),
      queryFn: () => mockAPI.getReport(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}
