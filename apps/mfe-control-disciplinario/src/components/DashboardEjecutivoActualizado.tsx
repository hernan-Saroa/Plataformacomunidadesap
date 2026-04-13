/**
 * DASHBOARD EJECUTIVO INTEGRADO - CONTROL DISCIPLINARIO
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { Badge } from '../../ui/badge';
import {
  LayoutDashboard, FileText, FolderOpen, CheckCircle, Archive,
  Clock, Users, BarChart3, Plus, Search, AlertTriangle, TrendingUp,
  Calendar, Scale, Zap, Target, Award, Bell, Activity, Briefcase,
  Eye, ChevronRight
} from 'lucide-react';

// ==================== INTERFACES ====================
interface MetricaCard {
  titulo: string;
  valor: number | string;
  icono: any;
  color: string;
  colorBg: string;
  tendencia?: string;
  subtitulo?: string;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardEjecutivoIntegrado() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<'dia' | 'semana' | 'mes' | 'año'>('mes');

  // Métricas principales
  const metricas: MetricaCard[] = [
    {
      titulo: 'Noticias Pendientes',
      valor: 12,
      icono: FileText,
      color: '#D97706',
      colorBg: '#FEF3C7',
      tendencia: '+3 esta semana',
      subtitulo: '5 prioritarias'
    },
    {
      titulo: 'Procesos Activos',
      valor: 34,
      icono: Scale,
      color: '#2563EB',
      colorBg: '#DBEAFE',
      tendencia: '8 en valoración',
      subtitulo: '12 en investigación'
    },
    {
      titulo: 'Revisiones Pendientes',
      valor: 7,
      icono: CheckCircle,
      color: '#DC2626',
      colorBg: '#FEE2E2',
      tendencia: '2 urgentes',
      subtitulo: '5 en cola'
    },
    {
      titulo: 'Finalizados (Mes)',
      valor: 18,
      icono: Award,
      color: '#059669',
      colorBg: '#D1FAE5',
      tendencia: '+25% vs mes anterior',
      subtitulo: '85% en tiempo'
    }
  ];

  // Estadísticas secundarias
  const estadisticas = [
    {
      titulo: 'Promedio Días Resolución',
      valor: '45 días',
      icono: Clock,
      color: '#6366F1'
    },
    {
      titulo: 'Profesionales Activos',
      valor: '8',
      icono: Users,
      color: '#8B5CF6'
    },
    {
      titulo: 'Tasa de Éxito',
      valor: '92%',
      icono: Target,
      color: '#10B981'
    },
    {
      titulo: 'Alertas Activas',
      valor: '3',
      icono: Bell,
      color: '#F59E0B'
    }
  ];

  // Procesos recientes - REDUCIDO
  const procesosRecientes = [
    {
      id: '1',
      numero: 'P-120-2025',
      denunciado: 'Juan Pérez Gómez',
      etapa: 'Indagación Preliminar',
      dias: 15,
      semaforo: 'verde' as const,
      profesional: 'Dr. Juan Carlos'
    }
  ];

  const getSemaforoColor = (semaforo: 'verde' | 'amarillo' | 'rojo') => {
    switch(semaforo) {
      case 'verde':
        return { bg: '#D1FAE5', color: '#059669' };
      case 'amarillo':
        return { bg: '#FEF3C7', color: '#D97706' };
      case 'rojo':
        return { bg: '#FEE2E2', color: '#DC2626' };
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1F2937' }}>
              Dashboard Ejecutivo
            </h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Control Interno Disciplinario - Visión General
            </p>
          </div>

          {/* Selector de Período */}
          <div className="flex items-center gap-2">
            {(['dia', 'semana', 'mes', 'año'] as const).map((periodo) => (
              <button
                key={periodo}
                onClick={() => setPeriodoSeleccionado(periodo)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  periodoSeleccionado === periodo
                    ? 'text-white'
                    : 'bg-white text-gray-700 border-2'
                }`}
                style={
                  periodoSeleccionado === periodo
                    ? { background: '#003DA5' }
                    : { borderColor: '#E5E7EB' }
                }
              >
                {periodo.charAt(0).toUpperCase() + periodo.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha Actual */}
        <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
          <Calendar className="w-4 h-4" />
          <span>Última actualización: {new Date().toLocaleDateString('es-CO', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {metricas.map((metrica, index) => {
          const IconoComponent = metrica.icono;
          return (
            <div
              key={index}
              className="rounded-xl p-6 border-2 hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: metrica.colorBg }}
                >
                  <IconoComponent className="w-6 h-6" style={{ color: metrica.color }} />
                </div>
                {metrica.tendencia && (
                  <TrendingUp className="w-5 h-5" style={{ color: metrica.color }} />
                )}
              </div>
              
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#6B7280' }}>
                {metrica.titulo}
              </h3>
              
              <p className="text-3xl font-extrabold mb-2" style={{ color: '#1F2937' }}>
                {metrica.valor}
              </p>
              
              {metrica.subtitulo && (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {metrica.subtitulo}
                </p>
              )}
              
              {metrica.tendencia && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-semibold" style={{ color: metrica.color }}>
                    {metrica.tendencia}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Estadísticas Secundarias */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {estadisticas.map((stat, index) => {
          const IconoComponent = stat.icono;
          return (
            <div
              key={index}
              className="rounded-xl p-4 border-2"
              style={{ borderColor: '#E5E7EB', background: '#F8FAFC' }}
            >
              <div className="flex items-center gap-3">
                <IconoComponent className="w-5 h-5" style={{ color: stat.color }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                    {stat.titulo}
                  </p>
                  <p className="text-lg font-bold" style={{ color: '#1F2937' }}>
                    {stat.valor}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procesos Recientes */}
        <div className="rounded-xl border-2 p-6" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h2 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                Procesos Recientes
              </h2>
            </div>
            <button
              className="text-sm font-semibold flex items-center gap-1 hover:underline"
              style={{ color: '#003DA5' }}
            >
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {procesosRecientes.map((proceso) => {
              const semaforoColor = getSemaforoColor(proceso.semaforo);
              
              return (
                <div
                  key={proceso.id}
                  className="p-4 rounded-xl border-2 hover:shadow-md transition-all cursor-pointer"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold" style={{ color: '#1F2937' }}>
                          {proceso.numero}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: semaforoColor.color }}
                          title={`Semáforo ${proceso.semaforo}`}
                        />
                      </div>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        {proceso.denunciado}
                      </p>
                    </div>
                    <Badge
                      className="px-2 py-1 rounded-md text-xs font-bold"
                      style={{ background: semaforoColor.bg, color: semaforoColor.color }}
                    >
                      {proceso.dias} días
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#9CA3AF' }}>{proceso.etapa}</span>
                    <span className="font-semibold" style={{ color: '#003DA5' }}>
                      {proceso.profesional}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas y Notificaciones */}
        <div className="rounded-xl border-2 p-6" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5" style={{ color: '#003DA5' }} />
            <h2 className="text-lg font-bold" style={{ color: '#1F2937' }}>
              Alertas y Notificaciones
            </h2>
          </div>

          <div className="space-y-3">
            <div
              className="p-4 rounded-xl border-l-4"
              style={{ background: '#FEF2F2', borderColor: '#DC2626' }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#DC2626' }} />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: '#991B1B' }}>
                    3 procesos próximos a vencer
                  </p>
                  <p className="text-xs" style={{ color: '#7F1D1D' }}>
                    Requieren atención inmediata
                  </p>
                </div>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border-l-4"
              style={{ background: '#FEF3C7', borderColor: '#D97706' }}
            >
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 flex-shrink-0" style={{ color: '#D97706' }} />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: '#92400E' }}>
                    7 revisiones pendientes
                  </p>
                  <p className="text-xs" style={{ color: '#78350F' }}>
                    Esperando aprobación del jefe
                  </p>
                </div>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border-l-4"
              style={{ background: '#EFF6FF', borderColor: '#2563EB' }}
            >
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 flex-shrink-0" style={{ color: '#2563EB' }} />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: '#1E3A8A' }}>
                    12 noticias nuevas
                  </p>
                  <p className="text-xs" style={{ color: '#1E40AF' }}>
                    Pendientes de valoración
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="mt-6 p-6 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F8FAFC' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
          Acciones Rápidas
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 rounded-xl text-white hover:opacity-90 transition-opacity flex flex-col items-center gap-2" style={{ background: '#003DA5' }}>
            <Plus className="w-5 h-5" />
            <span className="text-sm font-semibold">Nueva Noticia</span>
          </button>
          
          <button className="p-4 rounded-xl border-2 hover:bg-gray-100 transition-colors flex flex-col items-center gap-2" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            <Search className="w-5 h-5" />
            <span className="text-sm font-semibold">Buscar Proceso</span>
          </button>
          
          <button className="p-4 rounded-xl border-2 hover:bg-gray-100 transition-colors flex flex-col items-center gap-2" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-semibold">Reportes</span>
          </button>
          
          <button className="p-4 rounded-xl border-2 hover:bg-gray-100 transition-colors flex flex-col items-center gap-2" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            <Users className="w-5 h-5" />
            <span className="text-sm font-semibold">Profesionales</span>
          </button>
        </div>
      </div>
    </div>
  );
}
