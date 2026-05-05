/**
 * React Query Hooks para Dashboard Ejecutivo
 * Cache optimizado para métricas y gráficas
 */

import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useQueryClient';

// Types
interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  systemUptime: number;
  [key: string]: any;
}

interface ChartData {
  [key: string]: any[];
}

// Servicio mock
const dashboardService = {
  getMetrics: async (): Promise<DashboardMetrics> => ({
    totalUsers: 1847,
    activeUsers: 1342,
    systemUptime: 99.8,
  }),
  getCharts: async (period: string): Promise<ChartData> => ({
    userGrowth: [],
    activity: [],
  }),
};

// Hook para métricas principales del dashboard
export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: () => dashboardService.getMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    // Refetch automático cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
  });
}

// Hook para datos de gráficas con período
export function useDashboardCharts(period: string = '30d') {
  return useQuery({
    queryKey: queryKeys.dashboard.charts(period),
    queryFn: () => dashboardService.getCharts(period),
    staleTime: 5 * 60 * 1000, // Gráficas pueden estar cacheadas más tiempo
    // Mantener datos previos mientras carga nuevo período
    placeholderData: (previousData) => previousData,
  });
}

// Hook para cargar múltiples datasets en paralelo (optimización)
export function useDashboardData(period: string = '30d') {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.metrics(),
        queryFn: () => dashboardService.getMetrics(),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: queryKeys.dashboard.charts(period),
        queryFn: () => dashboardService.getCharts(period),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  return {
    metrics: results[0],
    charts: results[1],
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  };
}

// Hook para prefetch de datos del dashboard
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  return (period: string = '30d') => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.metrics(),
      queryFn: () => dashboardService.getMetrics(),
      staleTime: 2 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.charts(period),
      queryFn: () => dashboardService.getCharts(period),
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Hook para auto-refresh del dashboard
export function useDashboardAutoRefresh(enabled = true, interval = 5 * 60 * 1000) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      // Refrescar solo métricas críticas
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboard.metrics(),
        refetchType: 'active',
      });
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, interval, queryClient]);
}

import React from 'react';
