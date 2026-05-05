/**
 * Módulo de Gestión Profesoral - ESAP Backoffice
 * Panel de control y administración del Plan de Trabajo Académico
 * 
 * Features:
 * - KPIs de PTAs y docentes con tendencias
 * - Acciones rápidas (Revisar PTAs, Gestión Docentes, Evaluaciones, Analytics)
 * - Lista de PTAs pendientes de revisión con filtros
 * - Selector de período académico
 * - Barra de progreso de horas asignadas
 * - Estados: Aprobado, En Aprobación, Requiere Atención
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Users,
  ClipboardCheck,
  BarChart3,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  Calendar,
  BookOpen,
  Eye,
  CheckCircle
} from 'lucide-react';

interface PTAPendiente {
  id: string;
  docente: string;
  codigo: string;
  periodo: string;
  horasAsignadas: number;
  horasMaximas: number;
  estado: 'urgente' | 'revision' | 'normal';
  diasRestantes: number;
  estadoLabel: string;
}

interface Usuario {
  nombre: string;
  email: string;
}

interface VisualizadorPTAAjustesProps {
  usuario: Usuario;
  onLogout: () => void;
}

const ptasMock: PTAPendiente[] = [
  {
    id: 'PTA-2025-506',
    docente: 'Dr. Carlos Méndez Rivera',
    codigo: 'PTA-2025-506',
    periodo: '2025-1',
    horasAsignadas: 1450,
    horasMaximas: 1600,
    estado: 'urgente',
    diasRestantes: 2,
    estadoLabel: 'Pendiente Revisión'
  },
  {
    id: 'PTA-2025-506-2',
    docente: 'Dra. Ana Gutiérrez López',
    codigo: 'PTA-2025-506',
    periodo: '2025-1',
    horasAsignadas: 1350,
    horasMaximas: 1600,
    estado: 'revision',
    diasRestantes: 5,
    estadoLabel: 'En Revisión'
  },
  {
    id: 'PTA-2025-507',
    docente: 'Mg. Fernando Rojas Castro',
    codigo: 'PTA-2025-507',
    periodo: '2025-1',
    horasAsignadas: 1280,
    horasMaximas: 1600,
    estado: 'normal',
    diasRestantes: 7,
    estadoLabel: 'Pendiente Revisión'
  },
  {
    id: 'PTA-2025-508',
    docente: 'Dra. María Elena Vargas',
    codigo: 'PTA-2025-508',
    periodo: '2025-1',
    horasAsignadas: 1520,
    horasMaximas: 1600,
    estado: 'urgente',
    diasRestantes: 1,
    estadoLabel: 'Pendiente Revisión'
  }
];

export function VisualizadorPTAAjustes({ usuario, onLogout }: VisualizadorPTAAjustesProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-1');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // KPIs
  const kpis = [
    {
      id: 'aprobados',
      label: 'PTAs Aprobados',
      valor: 187,
      tendencia: '+12%',
      tipo: 'positivo' as const,
      color: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      id: 'aprobacion',
      label: 'En Aprobación',
      valor: 45,
      tendencia: '-5%',
      tipo: 'negativo' as const,
      color: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      icon: Clock,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'atencion',
      label: 'Requieren Atención',
      valor: 18,
      tendencia: '+3%',
      tipo: 'positivo' as const,
      color: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      icon: FileText,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      id: 'docentes',
      label: 'Docentes Activos',
      valor: 270,
      tendencia: '+2%',
      tipo: 'positivo' as const,
      color: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    }
  ];

  // Acciones rápidas
  const accionesRapidas = [
    {
      id: 'revisar',
      label: 'Revisar PTAs',
      descripcion: '41 pendientes',
      icon: FileText,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    },
    {
      id: 'docentes',
      label: 'Gestión Docentes',
      descripcion: '1,450 profesores',
      icon: Users,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'evaluaciones',
      label: 'Evaluaciones',
      descripcion: '10 resultados',
      icon: ClipboardCheck,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      descripcion: 'Ver estadísticas',
      icon: BarChart3,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600'
    }
  ];

  const handleAccionRapida = (accionId: string) => {
    console.log('Acción:', accionId);
    // TODO: Implementar navegación
  };

  const handleVerPTA = (ptaId: string) => {
    console.log('Ver PTA:', ptaId);
    // TODO: Abrir modal de detalle
  };

  const handleAprobarPTA = (ptaId: string) => {
    console.log('Aprobar PTA:', ptaId);
    // TODO: Aprobar PTA
  };

  const ptasFiltrados = ptasMock.filter(pta =>
    pta.docente.toLowerCase().includes(busqueda.toLowerCase()) ||
    pta.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Azul Corporativo ESAP */}
      <div 
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #2962FF 0%, #1e5da8 100%)'
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Título y descripción */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">
                    Gestión Profesoral
                  </h1>
                </div>
                <p className="text-blue-100 text-sm">
                  Panel de control y administración del Plan de Trabajo Académico
                </p>
              </div>

              <button
                onClick={() => {/* TODO: Exportar reporte */}}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Exportar Reporte</span>
              </button>
            </div>

            {/* Selector de Período Académico */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Período Académico:</span>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className="bg-transparent text-white font-semibold text-sm border-none outline-none cursor-pointer"
              >
                <option value="2025-1" className="text-gray-900">2025-1</option>
                <option value="2024-2" className="text-gray-900">2024-2</option>
                <option value="2024-1" className="text-gray-900">2024-1</option>
              </select>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${kpi.color} ${kpi.borderColor} border rounded-xl p-4 hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 ${kpi.iconBg} rounded-lg`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
                <div className="flex items-center gap-1">
                  {kpi.tipo === 'positivo' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-xs font-semibold ${
                    kpi.tipo === 'positivo' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {kpi.tendencia}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.valor}</p>
            </motion.div>
          ))}
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Acciones Rápidas</h2>
            <span className="text-xs text-gray-500">Tareas y gestión frecuentes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {accionesRapidas.map((accion) => (
              <motion.button
                key={accion.id}
                onClick={() => handleAccionRapida(accion.id)}
                className={`${accion.color} ${accion.hoverColor} text-white rounded-lg p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-lg hover:scale-105`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-2 bg-white/20 rounded-lg">
                  <accion.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{accion.label}</p>
                  <p className="text-xs opacity-90">{accion.descripcion}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* PTAs Pendientes de Revisión */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Header con búsqueda y filtros */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-orange-50 rounded-lg">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="font-semibold text-gray-900">PTAs Pendientes de Revisión</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Planes de trabajo que requieren tu atención
            </p>

            {/* Buscador y Filtros */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por docente, código PTA..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filtrar</span>
              </button>
            </div>
          </div>

          {/* Lista de PTAs */}
          <div className="p-6 space-y-4">
            {ptasFiltrados.map((pta, index) => {
              const porcentajeHoras = (pta.horasAsignadas / pta.horasMaximas) * 100;
              const esUrgente = pta.estado === 'urgente';

              return (
                <motion.div
                  key={pta.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                    esUrgente ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{pta.docente}</h3>
                        {esUrgente && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                            Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {pta.codigo} • Periodo {pta.periodo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{pta.estadoLabel}</p>
                    </div>
                  </div>

                  {/* Barra de progreso de horas */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Horas asignadas</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {pta.horasAsignadas} / {pta.horasMaximas}h ({porcentajeHoras.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          porcentajeHoras >= 90 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${porcentajeHoras}%` }}
                      />
                    </div>
                  </div>

                  {/* Tiempo restante y acciones */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className={`w-4 h-4 ${esUrgente ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className={esUrgente ? 'text-red-700 font-medium' : 'text-gray-600'}>
                        {pta.diasRestantes} {pta.diasRestantes === 1 ? 'día' : 'días'} para fecha límite
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerPTA(pta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button
                        onClick={() => handleAprobarPTA(pta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Aprobar
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
