/**
 * DashboardEjecutivoSIGL - Dashboard Ejecutivo SIGL
 * DISEÑO 100% COHERENTE CON CONTROL DISCIPLINARIO
 * ✅ FASE 3: Dashboard interactivo con drill-down
 */

import { TrendingUp, AlertTriangle, Clock, CheckCircle, FileText, Calendar, Scale, Gavel, FileQuestion, Inbox, CalendarClock, Eye, ChevronRight } from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { useState, useEffect } from 'react';
import { GuidedTour, TourButton, useTourCompleted } from '../design-system/GuidedTour';
import { useTour } from '../design-system/TourContext'; // ✅ Importar contexto de tour
import { siglDashboardTourSteps } from '../design-system/tourSteps';
import { legalService } from '../../../../services/api/legal.service';

// Interfaces for response
interface DashboardStats {
  global: {
    total: number;
    urgentes: number;
    vencidos: number;
    terminoPromedio: number;
  };
  modules: {
    defensa: { total: number; urgentes: number; vencidos: number };
    juzgamiento: { total: number; criticos: number; vencidos: number };
    asesoria: { total: number; urgentes: number; vencidos: number };
    buzon: { total: number; sinRevisar: number; vencidos: number };
    terminos: { total: number; urgentes: number; vencidos: number };
  };
  topUrgentes: {
    id: string;
    modulo: string;
    moduleId: string;
    dias: number;
    color: string;
    isExpired: boolean;
  }[];
}

interface DashboardEjecutivoSIGLProps {
  onNavigateToModule: (moduleId: string) => void;
}

export function DashboardEjecutivoSIGL({ onNavigateToModule }: DashboardEjecutivoSIGLProps) {
  // Estados del tour guiado
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { startTour } = useTour();
  const { completed: hasSeenTour } = useTourCompleted('sigl-dashboard');

  // Backend Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await legalService.getDashboardEjecutivo();
        setStats(res);
      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Use fetched data or defaults (0) using optional chaining
  const totalExpedientes = stats?.global?.total || 0;
  const totalUrgentes = stats?.global?.urgentes || 0;
  const totalVencidos = stats?.global?.vencidos || 0;
  const terminoPromedio = stats?.global?.terminoPromedio || 0;
  const expedientesUrgentes = stats?.topUrgentes || [];

  const handleExpedienteClick = (moduleId: string) => {
    if (onNavigateToModule) {
      onNavigateToModule(moduleId);
    }
  };

  const handleModuleClick = (moduleId: string) => {
    if (onNavigateToModule) {
      onNavigateToModule(moduleId);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center">Cargando tablero...</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4" data-tour="dashboard-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
              Dashboard Ejecutivo SIGL
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Vista general de todos los expedientes y procesos legales
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Última actualización</p>
            <p className="text-sm font-semibold" style={{ color: '#003DA5' }}>
              {new Date().toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto p-6">
        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" data-tour="dashboard-metrics">
          {/* Total Expedientes */}
          <Card className="p-4 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Total Expedientes</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#003DA5' }}>
                  {totalExpedientes}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={14} className="text-green-600" />
                  <span className="text-xs text-green-600">+8% vs mes anterior</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                <FileText size={24} style={{ color: '#003DA5' }} />
              </div>
            </div>
          </Card>

          {/* Expedientes Urgentes */}
          <Card className="p-4 border-l-4 border-l-red-600">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Expedientes Urgentes</p>
                <p className="text-3xl font-bold mt-2 text-red-600">
                  {totalUrgentes}
                </p>
                <Badge className="mt-2 bg-red-100 text-red-700 text-xs">
                  Requieren atención
                </Badge>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-50">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </Card>

          {/* Expedientes Vencidos */}
          <Card className="p-4 border-l-4 border-l-orange-600">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Expedientes Vencidos</p>
                <p className="text-3xl font-bold mt-2 text-orange-600">
                  {totalVencidos}
                </p>
                <Badge className="mt-2 bg-orange-100 text-orange-700 text-xs">
                  Acción inmediata
                </Badge>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-50 animate-pulse">
                <Clock size={24} className="text-orange-600" />
              </div>
            </div>
          </Card>

          {/* Término Promedio */}
          <Card className="p-4 border-l-4 border-l-yellow-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Término Promedio</p>
                <p className="text-3xl font-bold mt-2 text-yellow-600">
                  {terminoPromedio > 0 ? `${terminoPromedio} días` : 'N/A'}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle size={14} className="text-green-600" />
                  <span className="text-xs text-green-600">Dentro del plazo</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-50">
                <Calendar size={24} className="text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Expedientes Urgentes */}
          <Card className="p-5" data-tour="dashboard-alerts">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold" style={{ color: '#003DA5' }}>
                  Top Expedientes Más Urgentes
                </h3>
                <Badge className="bg-red-100 text-red-700 text-xs font-semibold">
                  4 Urgentes
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Requieren atención prioritaria
              </p>
            </div>

            <div className="space-y-3">
              {expedientesUrgentes.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleExpedienteClick(exp.moduleId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge style={{ background: exp.color, color: '#FFFFFF' }} className="text-xs">
                      {exp.modulo}
                    </Badge>
                    <span className={`text-xs font-bold ${exp.dias < 0 ? 'text-red-700' : 'text-red-600'}`}>
                      ⏰ {Math.abs(exp.dias)} días {exp.dias < 0 ? 'vencido' : ''}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {exp.id}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Distribución por Módulo */}
          <Card className="p-5" data-tour="modules-grid">
            <div className="mb-4">
              <h3 className="font-bold" style={{ color: '#003DA5' }}>
                Distribución por Módulo
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Carga de trabajo por área
              </p>
            </div>

            <div className="space-y-4">
              {/* Defensa Judicial */}
              <div data-tour="module-defensa">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                    <span className="text-sm font-medium text-gray-900">Defensa Judicial</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{stats?.modules.defensa.total || 0}</span>
                    {(stats?.modules.defensa.urgentes || 0) > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        {stats?.modules.defensa.urgentes} Urgentes
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: totalExpedientes > 0 ? `${((stats?.modules.defensa.total || 0) / totalExpedientes) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Juzgamiento */}
              <div data-tour="module-juzgamiento">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-600" />
                    <span className="text-sm font-medium text-gray-900">Juzgamiento</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{stats?.modules.juzgamiento.total || 0}</span>
                    {(stats?.modules.juzgamiento.criticos || 0) > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        {stats?.modules.juzgamiento.criticos} Críticos
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600"
                    style={{
                      width: totalExpedientes > 0 ? `${((stats?.modules.juzgamiento.total || 0) / totalExpedientes) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Asesoría */}
              <div data-tour="module-asesoria">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Asesoría</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{stats?.modules.asesoria.total || 0}</span>
                    {(stats?.modules.asesoria.urgentes || 0) > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        {stats?.modules.asesoria.urgentes} Urgentes
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600"
                    style={{
                      width: totalExpedientes > 0 ? `${((stats?.modules.asesoria.total || 0) / totalExpedientes) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bienvenida */}
        <div className="mt-6 text-center py-12">
          <div className="inline-block p-4 rounded-full mb-4" style={{ backgroundColor: '#E0EDFF' }}>
            <FileText size={48} style={{ color: '#003DA5' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#003DA5' }}>
            Bienvenido al Sistema Integrado de Gestión Legal
          </h2>
          <p className="text-sm max-w-2xl mx-auto text-gray-600">
            Utiliza el menú lateral para navegar entre los diferentes módulos del sistema.
            Cada módulo cuenta con herramientas especializadas para gestionar expedientes, procesos y términos legales.
          </p>
        </div>
      </div>

      {/* Tour Guiado Interactivo */}
      <GuidedTour
        steps={siglDashboardTourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={() => {
          console.log('✅ Tour completado exitosamente!');
        }}
        tourId="sigl-dashboard-main"
      />

      {/* Botón Flotante del Tour */}
      <TourButton
        onClick={() => setIsTourOpen(true)}
        variant="floating"
        label="Tour Guiado"
      />
    </div>
  );
}