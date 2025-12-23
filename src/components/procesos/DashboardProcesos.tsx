import { motion } from 'motion/react';
import { useState } from 'react';
import {
  Gavel,
  ClipboardCheck,
  Scale,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  Archive,
  Activity,
  Calendar,
  BarChart3,
  FileText,
  Eye
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import {
  calcularEstadisticasProcesos,
  obtenerProcesosUrgentes,
  obtenerProcesosPorVencer,
  obtenerTodosLosProcesos
} from '../../data/procesosAdministrativos';

interface DashboardProcesosProps {
  onNavigate?: (tab: 'dashboard' | 'disciplinario' | 'gestion' | 'legal') => void;
}

export function DashboardProcesos({ onNavigate }: DashboardProcesosProps) {
  const estadisticas = calcularEstadisticasProcesos();
  const procesosUrgentes = obtenerProcesosUrgentes();
  const procesosPorVencer = obtenerProcesosPorVencer();
  const todosLosProcesos = obtenerTodosLosProcesos();

  // Procesos recientes (últimos 5)
  const procesosRecientes = todosLosProcesos
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 mb-2">Dashboard de Procesos Administrativos</h1>
        <p className="text-slate-600">
          Panel de control para gestión de procesos disciplinarios, de gestión y legales
        </p>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSIGL variant="elevated">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-purple-600">{estadisticas.total}</span>
            </div>
            <p className="text-sm text-slate-600">Total Procesos</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-600">↑ Activo</span>
              <span className="text-slate-500">Sistema operacional</span>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-red-600">{procesosUrgentes.length}</span>
            </div>
            <p className="text-sm text-slate-600">Procesos Urgentes</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-red-600">Requiere atención</span>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-2xl font-bold text-yellow-600">{procesosPorVencer.length}</span>
            </div>
            <p className="text-sm text-slate-600">Por Vencer</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-yellow-600">Menos de 30 días</span>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-green-600">{estadisticas.porEstado.resueltos}</span>
            </div>
            <p className="text-sm text-slate-600">Resueltos</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-600">✓ Finalizados</span>
            </div>
          </div>
        </CardSIGL>
      </div>

      {/* Procesos por Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Control Disciplinario */}
        <CardSIGL 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate?.('disciplinario')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Gavel className="w-8 h-8 text-indigo-600" />
              </div>
              <span className="text-3xl font-bold text-indigo-600">
                {estadisticas.porTipo.disciplinarios}
              </span>
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">Control Interno Disciplinario</h3>
            <p className="text-sm text-slate-600 mb-4">
              Procesos de investigación disciplinaria
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Iniciados:</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">En investigación:</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Resueltos:</span>
                <span className="font-semibold">1</span>
              </div>
            </div>
            <ButtonSIGL variant="outline" size="sm" className="w-full mt-4">
              Ver Todos
            </ButtonSIGL>
          </div>
        </CardSIGL>

        {/* Control de Gestión */}
        <CardSIGL 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate?.('gestion')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ClipboardCheck className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-3xl font-bold text-blue-600">
                {estadisticas.porTipo.gestion}
              </span>
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">Control Interno de Gestión</h3>
            <p className="text-sm text-slate-600 mb-4">
              Auditorías y planes de mejoramiento
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">En trámite:</span>
                <span className="font-semibold">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Hallazgos activos:</span>
                <span className="font-semibold">5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Planes mejoramiento:</span>
                <span className="font-semibold">1</span>
              </div>
            </div>
            <ButtonSIGL variant="outline" size="sm" className="w-full mt-4">
              Ver Todos
            </ButtonSIGL>
          </div>
        </CardSIGL>

        {/* Gestión Legal */}
        <CardSIGL 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onNavigate?.('legal')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Scale className="w-8 h-8 text-purple-600" />
              </div>
              <span className="text-3xl font-bold text-purple-600">
                {estadisticas.porTipo.legales}
              </span>
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">Gestión Legal</h3>
            <p className="text-sm text-slate-600 mb-4">
              Procesos judiciales y administrativos
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">En trámite:</span>
                <span className="font-semibold">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Audiencias próximas:</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Resueltos:</span>
                <span className="font-semibold">1</span>
              </div>
            </div>
            <ButtonSIGL variant="outline" size="sm" className="w-full mt-4">
              Ver Todos
            </ButtonSIGL>
          </div>
        </CardSIGL>
      </div>

      {/* Procesos Urgentes */}
      {procesosUrgentes.length > 0 && (
        <CardSIGL variant="danger">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-slate-900 font-semibold">Procesos Urgentes</h2>
              <BadgeSIGL variant="danger">{procesosUrgentes.length}</BadgeSIGL>
            </div>
            <div className="space-y-3">
              {procesosUrgentes.map((proceso) => (
                <div
                  key={proceso.id}
                  className="p-4 bg-white rounded-lg border-2 border-red-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-900 font-semibold">{proceso.titulo}</h3>
                        <BadgeSIGL variant="danger">URGENTE</BadgeSIGL>
                        <BadgeSIGL variant={
                          proceso.tipo === 'disciplinario' ? 'primary' :
                          proceso.tipo === 'gestion' ? 'info' : 'default'
                        }>
                          {proceso.tipo.toUpperCase()}
                        </BadgeSIGL>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{proceso.codigo}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {proceso.diasRestantes} días restantes
                        </span>
                        <span className="text-slate-600">
                          Responsable: {proceso.responsable.nombre}
                        </span>
                      </div>
                    </div>
                    <ButtonSIGL variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </ButtonSIGL>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardSIGL>
      )}

      {/* Procesos Por Vencer */}
      {procesosPorVencer.length > 0 && (
        <CardSIGL variant="warning">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-yellow-600" />
              <h2 className="text-slate-900 font-semibold">Procesos Próximos a Vencer</h2>
              <BadgeSIGL variant="warning">{procesosPorVencer.length}</BadgeSIGL>
            </div>
            <div className="space-y-3">
              {procesosPorVencer.map((proceso) => (
                <div
                  key={proceso.id}
                  className="p-4 bg-white rounded-lg border border-yellow-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-900 font-semibold">{proceso.titulo}</h3>
                        <BadgeSIGL variant={
                          proceso.tipo === 'disciplinario' ? 'primary' :
                          proceso.tipo === 'gestion' ? 'info' : 'default'
                        }>
                          {proceso.tipo.toUpperCase()}
                        </BadgeSIGL>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{proceso.codigo}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-yellow-600 font-semibold">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Vence en {proceso.diasRestantes} días
                        </span>
                        <span className="text-slate-600">
                          Fecha límite: {proceso.fechaEstimadaCierre}
                        </span>
                      </div>
                    </div>
                    <ButtonSIGL variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </ButtonSIGL>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardSIGL>
      )}

      {/* Procesos Recientes */}
      <CardSIGL variant="elevated">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" />
              <h2 className="text-slate-900 font-semibold">Procesos Recientes</h2>
            </div>
            <ButtonSIGL variant="outline" size="sm">
              Ver Todos
            </ButtonSIGL>
          </div>
          <div className="space-y-3">
            {procesosRecientes.map((proceso) => (
              <div
                key={proceso.id}
                className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-slate-900 font-semibold">{proceso.titulo}</h3>
                      <BadgeSIGL variant={
                        proceso.estado === 'resuelto' ? 'success' :
                        proceso.estado === 'en_investigacion' || proceso.estado === 'en_tramite' ? 'primary' :
                        'default'
                      }>
                        {proceso.estado.replace('_', ' ').toUpperCase()}
                      </BadgeSIGL>
                      <BadgeSIGL variant={
                        proceso.tipo === 'disciplinario' ? 'primary' :
                        proceso.tipo === 'gestion' ? 'info' : 'default'
                      }>
                        {proceso.tipo.toUpperCase()}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      {proceso.codigo} • {proceso.responsable.nombre}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Iniciado: {proceso.fechaInicio}</span>
                      <span>•</span>
                      <span>{proceso.diasTranscurridos} días transcurridos</span>
                    </div>
                  </div>
                  <ButtonSIGL variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver
                  </ButtonSIGL>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardSIGL>

      {/* Estadísticas por Estado */}
      <CardSIGL variant="elevated">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-slate-900 font-semibold">Distribución por Estado</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{estadisticas.porEstado.iniciados}</p>
              <p className="text-sm text-slate-600 mt-1">Iniciados</p>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{estadisticas.porEstado.enInvestigacion}</p>
              <p className="text-sm text-slate-600 mt-1">En Investigación</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{estadisticas.porEstado.enTramite}</p>
              <p className="text-sm text-slate-600 mt-1">En Trámite</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{estadisticas.porEstado.resueltos}</p>
              <p className="text-sm text-slate-600 mt-1">Resueltos</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{estadisticas.porEstado.archivados}</p>
              <p className="text-sm text-slate-600 mt-1">Archivados</p>
            </div>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}
