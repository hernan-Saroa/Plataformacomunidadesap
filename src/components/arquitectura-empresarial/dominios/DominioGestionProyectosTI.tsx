/**
 * Dominio: Gestión de Proyectos TI
 * Marco de Referencia MRAE - MinTIC Colombia
 * Gestión integral de proyectos tecnológicos institucionales
 */

import React, { useState } from 'react';
import { 
  FolderKanban, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  FileText,
  Target,
  Zap,
  ChevronDown,
  ChevronRight,
  Plus,
  Filter,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DominioGestionProyectosTIProps {
  canEdit?: boolean;
}

export function DominioGestionProyectosTI({ canEdit = true }: DominioGestionProyectosTIProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Categorías de proyectos TI
  const categorias = [
    { id: 'todos', name: 'Todos los Proyectos', count: 23 },
    { id: 'infraestructura', name: 'Infraestructura', count: 8 },
    { id: 'desarrollo', name: 'Desarrollo', count: 7 },
    { id: 'seguridad', name: 'Seguridad', count: 4 },
    { id: 'datos', name: 'Datos y Analytics', count: 4 }
  ];

  // Métricas de proyectos
  const metricas = [
    {
      label: 'Proyectos Activos',
      value: '15',
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+3',
      trendUp: true
    },
    {
      label: 'Presupuesto Total',
      value: '$2.4M',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+12%',
      trendUp: true
    },
    {
      label: 'En Riesgo',
      value: '4',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '-1',
      trendUp: false
    },
    {
      label: 'Completados 2025',
      value: '8',
      icon: CheckCircle2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+5',
      trendUp: true
    }
  ];

  // Proyectos TI
  const proyectos = [
    {
      id: 'p1',
      nombre: 'Migración a Cloud Híbrida',
      categoria: 'infraestructura',
      responsable: 'Ing. Carlos Mendoza',
      inicio: '2025-01-15',
      fin: '2025-06-30',
      progreso: 45,
      presupuesto: '$450,000',
      estado: 'En Progreso',
      prioridad: 'Alta',
      riesgo: 'Medio',
      equipo: 8,
      hitos: [
        { nombre: 'Análisis de Infraestructura', completado: true },
        { nombre: 'Diseño Arquitectura Cloud', completado: true },
        { nombre: 'Migración Fase 1', completado: false },
        { nombre: 'Testing y Validación', completado: false }
      ]
    },
    {
      id: 'p2',
      nombre: 'Sistema de Gestión Académica v3.0',
      categoria: 'desarrollo',
      responsable: 'Ing. María González',
      inicio: '2024-11-01',
      fin: '2025-08-31',
      progreso: 62,
      presupuesto: '$380,000',
      estado: 'En Progreso',
      prioridad: 'Crítica',
      riesgo: 'Bajo',
      equipo: 12,
      hitos: [
        { nombre: 'Levantamiento de Requerimientos', completado: true },
        { nombre: 'Diseño UX/UI', completado: true },
        { nombre: 'Desarrollo Backend', completado: true },
        { nombre: 'Desarrollo Frontend', completado: false }
      ]
    },
    {
      id: 'p3',
      nombre: 'Implementación SOC (Security Operations Center)',
      categoria: 'seguridad',
      responsable: 'Ing. Roberto Silva',
      inicio: '2025-02-01',
      fin: '2025-12-31',
      progreso: 28,
      presupuesto: '$620,000',
      estado: 'En Progreso',
      prioridad: 'Alta',
      riesgo: 'Alto',
      equipo: 6,
      hitos: [
        { nombre: 'Evaluación de Infraestructura', completado: true },
        { nombre: 'Selección de Herramientas', completado: false },
        { nombre: 'Implementación SIEM', completado: false },
        { nombre: 'Capacitación Equipo', completado: false }
      ]
    },
    {
      id: 'p4',
      nombre: 'Data Lake Institucional',
      categoria: 'datos',
      responsable: 'Ing. Ana Martínez',
      inicio: '2025-03-01',
      fin: '2025-11-30',
      progreso: 15,
      presupuesto: '$290,000',
      estado: 'Iniciando',
      prioridad: 'Media',
      riesgo: 'Bajo',
      equipo: 5,
      hitos: [
        { nombre: 'Definición de Arquitectura', completado: true },
        { nombre: 'Configuración Infraestructura', completado: false },
        { nombre: 'Integración de Fuentes', completado: false },
        { nombre: 'Implementación Governance', completado: false }
      ]
    },
    {
      id: 'p5',
      nombre: 'Renovación Infraestructura de Red',
      categoria: 'infraestructura',
      responsable: 'Ing. Luis Fernández',
      inicio: '2024-10-01',
      fin: '2025-04-30',
      progreso: 78,
      presupuesto: '$520,000',
      estado: 'En Progreso',
      prioridad: 'Alta',
      riesgo: 'Bajo',
      equipo: 7,
      hitos: [
        { nombre: 'Auditoría de Red Actual', completado: true },
        { nombre: 'Diseño Nueva Arquitectura', completado: true },
        { nombre: 'Adquisición Equipos', completado: true },
        { nombre: 'Instalación y Configuración', completado: false }
      ]
    }
  ];

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En Progreso': return 'bg-blue-100 text-blue-700';
      case 'Completado': return 'bg-green-100 text-green-700';
      case 'En Riesgo': return 'bg-red-100 text-red-700';
      case 'Iniciando': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Crítica': return 'bg-red-100 text-red-700';
      case 'Alta': return 'bg-orange-100 text-orange-700';
      case 'Media': return 'bg-yellow-100 text-yellow-700';
      case 'Baja': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRiesgoColor = (riesgo: string) => {
    switch (riesgo) {
      case 'Alto': return 'text-red-600';
      case 'Medio': return 'text-orange-600';
      case 'Bajo': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const proyectosFiltrados = selectedCategory === 'todos' 
    ? proyectos 
    : proyectos.filter(p => p.categoria === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FolderKanban className="w-8 h-8" />
              <h2 className="text-2xl font-black">Gestión de Proyectos TI</h2>
            </div>
            <p className="text-blue-100">
              Portafolio completo de proyectos tecnológicos institucionales
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-white text-[#003DA5] rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </button>
          )}
        </div>
      </motion.div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((metrica, index) => {
          const Icon = metrica.icon;
          return (
            <motion.div
              key={metrica.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${metrica.bgColor} rounded-xl p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 ${metrica.color}`} />
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  metrica.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {metrica.trend}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{metrica.label}</p>
              <p className={`text-2xl font-black ${metrica.color}`}>
                {metrica.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Filtrar por:</span>
        </div>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            onClick={() => setSelectedCategory(categoria.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedCategory === categoria.id
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {categoria.name}
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {categoria.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de Proyectos */}
      <div className="space-y-4">
        {proyectosFiltrados.map((proyecto, index) => (
          <motion.div
            key={proyecto.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header del Proyecto */}
            <div 
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleProject(proyecto.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {expandedProjects[proyecto.id] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">{proyecto.nombre}</h3>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(proyecto.estado)}`}>
                        {proyecto.estado}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${getPrioridadColor(proyecto.prioridad)}`}>
                        {proyecto.prioridad}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{proyecto.responsable}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{proyecto.inicio} → {proyecto.fin}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{proyecto.presupuesto}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Progreso</p>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${proyecto.progreso}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{proyecto.progreso}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Riesgo</p>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className={`w-4 h-4 ${getRiesgoColor(proyecto.riesgo)}`} />
                      <span className={`text-sm font-bold ${getRiesgoColor(proyecto.riesgo)}`}>
                        {proyecto.riesgo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles expandidos */}
            <AnimatePresence>
              {expandedProjects[proyecto.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-200 bg-gray-50"
                >
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Hitos */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Hitos del Proyecto
                        </h4>
                        <div className="space-y-2">
                          {proyecto.hitos.map((hito, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                              {hito.completado ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400" />
                              )}
                              <span className={`text-sm ${hito.completado ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                {hito.nombre}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Información adicional */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Información del Proyecto
                        </h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Equipo Asignado</p>
                            <p className="font-bold text-gray-900">{proyecto.equipo} personas</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Categoría</p>
                            <p className="font-bold text-gray-900 capitalize">{proyecto.categoria}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Responsable</p>
                            <p className="font-bold text-gray-900">{proyecto.responsable}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    {canEdit && (
                      <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-200">
                        <button className="px-4 py-2 bg-[#003DA5] text-white rounded-lg text-sm font-semibold hover:bg-[#002d7a] transition-colors">
                          Ver Detalles Completos
                        </button>
                        <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors border border-gray-200">
                          Actualizar Progreso
                        </button>
                        <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors border border-gray-200 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Exportar
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Resumen */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Resumen Ejecutivo
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            La cartera de proyectos TI de ESAP cuenta con <strong>15 proyectos activos</strong> distribuidos en 4 categorías principales. 
            El presupuesto total asignado es de <strong>$2.4M</strong>, con un nivel de ejecución promedio del <strong>46%</strong>.
          </p>
          <p className="mt-3">
            Actualmente hay <strong>4 proyectos en riesgo</strong> que requieren atención inmediata: priorización de recursos, 
            resolución de dependencias técnicas y alineación con stakeholders. El proyecto de mayor criticidad es el 
            <strong> Sistema de Gestión Académica v3.0</strong> con avance del 62% y fecha de entrega en agosto 2025.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
