/**
 * Dashboard de Arquitectura Empresarial - DISEÑO DE ALTO NIVEL
 * Vista ejecutiva con métricas, KPIs y estado de cumplimiento MRAE
 * Rediseñado con estándares UX/UI modernos y profesionales
 */

import React from 'react';
import {
  Target,
  Database,
  Server,
  Laptop,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  FileText,
  Calendar,
  ArrowUpRight,
  Shield,
  Layers,
  Zap,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardAEProps {
  userRole?: string;
}

export function DashboardAE({ userRole }: DashboardAEProps) {
  // KPIs principales
  const kpis = [
    {
      id: 'madurez',
      title: 'Índice Madurez Global',
      value: '3.2',
      suffix: '/5',
      change: '+8.5%',
      trend: 'up',
      icon: BarChart3,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50',
      description: 'Nivel de madurez promedio'
    },
    {
      id: 'artefactos',
      title: 'Artefactos Documentados',
      value: '69',
      suffix: '/92',
      change: '+5 este mes',
      trend: 'up',
      icon: Layers,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      description: '75% de cobertura'
    },
    {
      id: 'dominios',
      title: 'Dominios Activos',
      value: '8',
      suffix: '',
      change: '100% operativos',
      trend: 'neutral',
      icon: Activity,
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-50',
      description: 'Todos los dominios MRAE'
    },
    {
      id: 'cumplimiento',
      title: 'Lineamiento MinTIC',
      value: '72',
      suffix: '%',
      change: '+12% vs 2024',
      trend: 'up',
      icon: Award,
      gradient: 'from-orange-500 to-amber-600',
      bgGradient: 'from-orange-50 to-amber-50',
      description: 'Cumplimiento normativo'
    }
  ];

  // Datos de madurez por dominio
  const madurexDominios = [
    {
      dominio: 'Estrategia TI',
      nivel: 3.5,
      objetivo: 4.0,
      colorBorder: 'border-blue-500',
      colorText: 'text-blue-700',
      colorBg: 'bg-blue-50',
      colorProgress: 'from-blue-500 to-blue-600',
      icon: Target
    },
    {
      dominio: 'Información',
      nivel: 3.5,
      objetivo: 4.0,
      colorBorder: 'border-purple-500',
      colorText: 'text-purple-700',
      colorBg: 'bg-purple-50',
      colorProgress: 'from-purple-500 to-purple-600',
      icon: Database
    },
    {
      dominio: 'Sistemas de Información',
      nivel: 3.2,
      objetivo: 4.0,
      colorBorder: 'border-green-500',
      colorText: 'text-green-700',
      colorBg: 'bg-green-50',
      colorProgress: 'from-green-500 to-green-600',
      icon: Server
    },
    {
      dominio: 'Servicios Tecnológicos',
      nivel: 3.8,
      objetivo: 4.0,
      colorBorder: 'border-orange-500',
      colorText: 'text-orange-700',
      colorBg: 'bg-orange-50',
      colorProgress: 'from-orange-500 to-orange-600',
      icon: Laptop
    },
    {
      dominio: 'Uso y Apropiación',
      nivel: 3.4,
      objetivo: 3.5,
      colorBorder: 'border-pink-500',
      colorText: 'text-pink-700',
      colorBg: 'bg-pink-50',
      colorProgress: 'from-pink-500 to-pink-600',
      icon: Users
    }
  ];

  // Proyectos recientes
  const proyectosRecientes = [
    {
      nombre: 'Migración Cloud AWS',
      dominio: 'Servicios Tecnológicos',
      progreso: 68,
      estado: 'En progreso',
      prioridad: 'Alta',
      fechaLimite: '2025-03-15'
    },
    {
      nombre: 'Implementación Data Governance',
      dominio: 'Información',
      progreso: 40,
      estado: 'En progreso',
      prioridad: 'Alta',
      fechaLimite: '2025-04-30'
    }
  ];

  // Artefactos pendientes de actualización
  const artefactosPendientes = [
    { nombre: 'Catálogo de Servicios TI', dias: 14, prioridad: 'Alta' },
    { nombre: 'Mapa de Procesos vs Aplicaciones', dias: 8, prioridad: 'Media' },
    { nombre: 'Inventario de Componentes', dias: 11, prioridad: 'Baja' },
    { nombre: 'Plan de Continuidad TI', dias: 5, prioridad: 'Alta' }
  ];

  return (
    <div className="space-y-8">
      {/* KPIs Principales - DISEÑO PREMIUM */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
            >
              {/* Gradient Background Decoration */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.bgGradient} rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity`} />
              
              <div className="relative">
                {/* Header con ícono */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${kpi.gradient} rounded-xl shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {kpi.trend === 'up' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                      <ArrowUpRight className="w-3 h-3" />
                      {kpi.change}
                    </div>
                  )}
                  {kpi.trend === 'neutral' && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                      {kpi.change}
                    </div>
                  )}
                </div>

                {/* Título y descripción */}
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">
                    {kpi.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {kpi.description}
                  </p>
                </div>

                {/* Valor principal */}
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black bg-gradient-to-br ${kpi.gradient} bg-clip-text text-transparent`}>
                    {kpi.value}
                  </span>
                  {kpi.suffix && (
                    <span className="text-xl font-bold text-gray-400">
                      {kpi.suffix}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Nivel de Madurez por Dominio - DISEÑO MODERNO */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">
                Nivel de Madurez por Dominio MRAE
              </h2>
              <p className="text-sm text-gray-600">
                Evaluación según modelo de madurez MinTIC
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {madurexDominios.map((item, index) => {
              const Icon = item.icon;
              const porcentaje = (item.nivel / 5) * 100;
              const cumpleObjetivo = item.nivel >= item.objetivo;

              return (
                <motion.div
                  key={item.dominio}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`group relative bg-white border-2 ${item.colorBorder} rounded-xl p-5 hover:shadow-xl transition-all duration-300`}
                >
                  {/* Badge de cumplimiento */}
                  <div className="absolute -top-2 -right-2">
                    {cumpleObjetivo ? (
                      <div className="p-1.5 bg-green-500 rounded-full shadow-lg">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-orange-500 rounded-full shadow-lg">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Ícono del dominio */}
                  <div className={`inline-flex p-3 ${item.colorBg} rounded-xl mb-4`}>
                    <Icon className={`w-6 h-6 ${item.colorText}`} />
                  </div>

                  {/* Nombre del dominio */}
                  <h3 className="text-sm font-bold text-gray-900 mb-4 min-h-[40px]">
                    {item.dominio}
                  </h3>

                  {/* Nivel actual */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-3xl font-black ${item.colorText}`}>
                        {item.nivel.toFixed(1)}
                      </span>
                      <span className="text-sm font-semibold text-gray-400">/5</span>
                    </div>
                    <p className="text-xs text-gray-500">Nivel actual</p>
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full bg-gradient-to-r ${item.colorProgress} transition-all duration-500`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Objetivo: {item.objetivo}
                      </span>
                      <span className={`text-xs font-bold ${cumpleObjetivo ? 'text-green-600' : 'text-orange-600'}`}>
                        {porcentaje.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Proyectos Activos y Artefactos Pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos Activos */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Proyectos Activos
                </h2>
                <p className="text-sm text-gray-600">
                  {proyectosRecientes.length} proyectos en ejecución
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {proyectosRecientes.map((proyecto, index) => (
              <motion.div
                key={proyecto.nombre}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {proyecto.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">{proyecto.dominio}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${
                    proyecto.prioridad === 'Crítica'
                      ? 'bg-red-500 text-white'
                      : proyecto.prioridad === 'Alta'
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {proyecto.prioridad}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Progreso</span>
                    <span className="font-black text-gray-900">{proyecto.progreso}%</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-2.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-600 h-2.5 rounded-full shadow-sm transition-all duration-500"
                      style={{ width: `${proyecto.progreso}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {new Date(proyecto.fechaLimite).toLocaleDateString('es-CO', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {proyecto.estado}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            <button className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" />
              Promedio: 54%
            </button>
          </div>
        </div>

        {/* Artefactos Pendientes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Artefactos Pendientes
                </h2>
                <p className="text-sm text-gray-600">
                  Documentos que requieren actualización
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {artefactosPendientes.map((artefacto, index) => (
              <motion.div
                key={artefacto.nombre}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative rounded-xl p-4 border-2 hover:shadow-lg transition-all cursor-pointer ${
                  artefacto.prioridad === 'Alta'
                    ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300 hover:border-red-400'
                    : artefacto.prioridad === 'Media'
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300 hover:border-yellow-400'
                    : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2.5 rounded-lg shadow-sm ${
                      artefacto.prioridad === 'Alta'
                        ? 'bg-red-500'
                        : artefacto.prioridad === 'Media'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-0.5">
                        {artefacto.nombre}
                      </h3>
                      <p className="text-xs text-gray-600 font-medium">
                        Vence en {artefacto.dias} días
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                    artefacto.prioridad === 'Alta'
                      ? 'bg-red-500 text-white'
                      : artefacto.prioridad === 'Media'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {artefacto.prioridad}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
