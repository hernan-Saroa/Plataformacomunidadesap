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

import { estadisticasDefensaJudicial } from '../data/datosExpedientesJudicialesExpandido';
import { estadisticasJuzgamiento } from '../data/datosProcesoDisciplinarios';
import { estadisticasAsesoriaJuridica } from '../data/datosConsultasJuridicas';
import { estadisticasBuzonNotificaciones } from '../data/datosNotificaciones';
import { estadisticasTerminosCompleto } from '../data/datosTerminosInformesCompleto';

interface DashboardEjecutivoSIGLProps {
  onNavigateToModule?: (moduleId: string) => void;
}

export function DashboardEjecutivoSIGL({ onNavigateToModule }: DashboardEjecutivoSIGLProps) {
  // Estados del tour guiado
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { completed: tourCompleted, resetTour } = useTourCompleted('sigl-dashboard-main');

  // Auto-iniciar tour DESACTIVADO - Solo se activa con clic del usuario
  // useEffect(() => {
  //   if (!tourCompleted) {
  //     // Esperar 1.5 segundos para que cargue la UI
  //     const timer = setTimeout(() => {
  //       setIsTourOpen(true);
  //     }, 1500);
  //     return () => clearTimeout(timer);
  //   }
  // }, [tourCompleted]);

  const totalExpedientes = (estadisticasDefensaJudicial?.total || 0) + 
                           (estadisticasJuzgamiento?.total || 0) + 
                           (estadisticasAsesoriaJuridica?.total || 0) + 
                           (estadisticasBuzonNotificaciones?.total || 0) + 
                           (estadisticasTerminosCompleto?.total || 0);
  
  const totalUrgentes = 
    (estadisticasDefensaJudicial?.urgentes || 0) + 
    (estadisticasJuzgamiento?.enDescargos || 0) + 
    (estadisticasAsesoriaJuridica?.urgentes || 0) + 
    (estadisticasBuzonNotificaciones?.urgentes || 0) +
    (estadisticasTerminosCompleto?.urgentes?.length || 0);
  
  const totalVencidos = 
    (estadisticasDefensaJudicial?.vencidos || 0) + 
    (estadisticasAsesoriaJuridica?.vencidas || 0) + 
    (estadisticasBuzonNotificaciones?.vencidas || 0) +
    (estadisticasTerminosCompleto?.vencidos || 0);

  const expedientesUrgentes = [
    {
      id: 'NRD - María González vs ESAP',
      modulo: 'Defensa Judicial',
      moduleId: 'defensa-judicial',
      dias: '3 días',
      color: '#10B981',
    },
    {
      id: 'Proceso Disciplinario - Carlos Ruiz',
      modulo: 'Juzgamiento',
      moduleId: 'juzgamiento',
      dias: '2 días',
      color: '#DC2626',
    },
    {
      id: 'Concepto Contratación - Territorial',
      modulo: 'Asesoría',
      moduleId: 'asesoria',
      dias: '4 días',
      color: '#8B5CF6',
    },
    {
      id: 'Informe Permanente Q1 2025',
      modulo: 'Informes',
      moduleId: 'terminos',
      dias: '5 días',
      color: '#6366F1',
    },
  ];

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
      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
        {/* Métricas Principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6" data-tour="dashboard-metrics">
          {/* Total Expedientes */}
          <Card className="p-3 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Expedientes</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#003DA5' }}>
                  {totalExpedientes}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-green-600" />
                  <span className="text-[10px] sm:text-xs text-green-600">+8% vs mes ant.</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0EDFF' }}>
                <FileText size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
            </div>
          </Card>

          {/* Expedientes Urgentes */}
          <Card className="p-3 border-l-4 border-l-red-600">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Expedientes Urgentes</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">
                  {totalUrgentes}
                </p>
                <Badge className="mt-1 bg-red-100 text-red-700 text-[10px] sm:text-xs px-1.5 py-0.5">
                  Requieren atención
                </Badge>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-red-50 flex-shrink-0">
                <AlertTriangle size={20} className="sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </Card>

          {/* Expedientes Vencidos */}
          <Card className="p-3 border-l-4 border-l-orange-600">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Expedientes Vencidos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">
                  {totalVencidos}
                </p>
                <Badge className="mt-1 bg-orange-100 text-orange-700 text-[10px] sm:text-xs px-1.5 py-0.5">
                  Acción inmediata
                </Badge>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-orange-50 animate-pulse flex-shrink-0">
                <Clock size={20} className="sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          {/* Término Promedio */}
          <Card className="p-3 border-l-4 border-l-yellow-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Término Promedio</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">
                  22 días
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle size={12} className="text-green-600" />
                  <span className="text-[10px] sm:text-xs text-green-600">Dentro del plazo</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-yellow-50">
                <Calendar size={20} className="sm:w-6 sm:h-6 text-yellow-600" />
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
                    <span className="text-xs font-bold text-red-600">
                      ⏰ {exp.dias}
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
                    <span className="text-sm font-bold text-gray-900">{estadisticasDefensaJudicial?.total || 0}</span>
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      {estadisticasDefensaJudicial?.urgentes || 0} Urgentes
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ 
                      width: totalExpedientes > 0 ? `${((estadisticasDefensaJudicial?.total || 0) / totalExpedientes) * 100}%` : '0%',
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
                    <span className="text-sm font-bold text-gray-900">{estadisticasJuzgamiento?.total || 0}</span>
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      {estadisticasJuzgamiento?.criticos || 0} Críticos
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600"
                    style={{ 
                      width: totalExpedientes > 0 ? `${((estadisticasJuzgamiento?.total || 0) / totalExpedientes) * 100}%` : '0%',
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
                    <span className="text-sm font-bold text-gray-900">{estadisticasAsesoriaJuridica?.total || 0}</span>
                    <Badge className="bg-orange-100 text-orange-700 text-xs">
                      {estadisticasAsesoriaJuridica?.urgentes || 0} Urgentes
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600"
                    style={{ 
                      width: totalExpedientes > 0 ? `${((estadisticasAsesoriaJuridica?.total || 0) / totalExpedientes) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Buzón */}
              <div data-tour="module-comunicaciones">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Buzón Notif.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{estadisticasBuzonNotificaciones?.total || 0}</span>
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                      {estadisticasBuzonNotificaciones?.sinRevisar || 0} Sin Revisar
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600"
                    style={{ 
                      width: totalExpedientes > 0 ? `${((estadisticasBuzonNotificaciones?.total || 0) / totalExpedientes) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Términos */}
              <div data-tour="module-terminos">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-600" />
                    <span className="text-sm font-medium text-gray-900">Términos Informes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{estadisticasTerminosCompleto?.total || 0}</span>
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      {estadisticasTerminosCompleto?.urgentes?.length || 0} Urgentes
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600"
                    style={{ 
                      width: totalExpedientes > 0 ? `${((estadisticasTerminosCompleto?.total || 0) / totalExpedientes) * 100}%` : '0%',
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