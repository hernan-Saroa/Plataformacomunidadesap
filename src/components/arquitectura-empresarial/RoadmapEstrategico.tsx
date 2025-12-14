/**
 * Componente: Roadmap Estratégico
 * Hoja de ruta de implementación de Arquitectura Empresarial
 */

import React, { useState } from 'react';
import { 
  Map, 
  Calendar, 
  Target, 
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  Users,
  DollarSign,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';

interface RoadmapEstrategicoProps {
  canEdit?: boolean;
}

export function RoadmapEstrategico({ canEdit = true }: RoadmapEstrategicoProps) {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('todos');

  // Años disponibles
  const years = [2025, 2026, 2027];
  
  // Trimestres
  const trimestres = [
    { id: 'todos', name: 'Todos los Trimestres' },
    { id: 'q1', name: 'Q1 - Ene-Mar' },
    { id: 'q2', name: 'Q2 - Abr-Jun' },
    { id: 'q3', name: 'Q3 - Jul-Sep' },
    { id: 'q4', name: 'Q4 - Oct-Dic' }
  ];

  // Métricas del Roadmap
  const metricas = [
    {
      label: 'Iniciativas Totales',
      value: '42',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'En Progreso',
      value: '18',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Completadas',
      value: '15',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Inversión Total',
      value: '$4.2M',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  // Hoja de Ruta 2025
  const roadmap2025 = [
    {
      trimestre: 'Q1',
      periodo: 'Enero - Marzo 2025',
      iniciativas: [
        {
          id: 'init-2025-01',
          nombre: 'Actualización Marco de Arquitectura Empresarial',
          dominio: 'Estrategia TI',
          estado: 'Completado',
          progreso: 100,
          prioridad: 'Crítica',
          presupuesto: '$85,000',
          responsable: 'Arquitectura Empresarial',
          hitos: ['Revisión MRAE', 'Actualización políticas', 'Socialización']
        },
        {
          id: 'init-2025-02',
          nombre: 'Implementación Data Catalog',
          dominio: 'Información',
          estado: 'Completado',
          progreso: 100,
          prioridad: 'Alta',
          presupuesto: '$120,000',
          responsable: 'Gestión de Datos',
          hitos: ['Análisis de fuentes', 'Configuración herramienta', 'Carga inicial']
        }
      ]
    },
    {
      trimestre: 'Q2',
      periodo: 'Abril - Junio 2025',
      iniciativas: [
        {
          id: 'init-2025-03',
          nombre: 'Migración a Cloud Híbrida',
          dominio: 'Servicios Tecnológicos',
          estado: 'En Progreso',
          progreso: 65,
          prioridad: 'Crítica',
          presupuesto: '$450,000',
          responsable: 'Infraestructura',
          hitos: ['Evaluación infraestructura', 'Diseño arquitectura', 'Migración Fase 1']
        },
        {
          id: 'init-2025-04',
          nombre: 'Implementación SOC',
          dominio: 'Seguridad',
          estado: 'En Progreso',
          progreso: 42,
          prioridad: 'Alta',
          presupuesto: '$380,000',
          responsable: 'Seguridad TI',
          hitos: ['Evaluación necesidades', 'Selección herramientas', 'Implementación SIEM']
        }
      ]
    },
    {
      trimestre: 'Q3',
      periodo: 'Julio - Septiembre 2025',
      iniciativas: [
        {
          id: 'init-2025-05',
          nombre: 'Portal de Servicios Unificado',
          dominio: 'Sistemas de Información',
          estado: 'En Progreso',
          progreso: 38,
          prioridad: 'Alta',
          presupuesto: '$290,000',
          responsable: 'Desarrollo',
          hitos: ['Diseño UX/UI', 'Desarrollo backend', 'Integración sistemas']
        },
        {
          id: 'init-2025-06',
          nombre: 'Programa de Transformación Digital',
          dominio: 'Uso y Apropiación',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Media',
          presupuesto: '$180,000',
          responsable: 'Gestión del Cambio',
          hitos: ['Diagnóstico', 'Plan de capacitación', 'Ejecución fase 1']
        }
      ]
    },
    {
      trimestre: 'Q4',
      periodo: 'Octubre - Diciembre 2025',
      iniciativas: [
        {
          id: 'init-2025-07',
          nombre: 'Gobierno de Datos Institucional',
          dominio: 'Gobierno TI',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Alta',
          presupuesto: '$220,000',
          responsable: 'CDO',
          hitos: ['Definición políticas', 'Comité de datos', 'Implementación gobierno']
        },
        {
          id: 'init-2025-08',
          nombre: 'Certificación ISO 27001',
          dominio: 'Seguridad',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Crítica',
          presupuesto: '$350,000',
          responsable: 'CISO',
          hitos: ['Gap analysis', 'Implementación controles', 'Auditoría certificación']
        }
      ]
    }
  ];

  // Hoja de Ruta 2026
  const roadmap2026 = [
    {
      trimestre: 'Q1',
      periodo: 'Enero - Marzo 2026',
      iniciativas: [
        {
          id: 'init-2026-01',
          nombre: 'Plataforma de Analytics Avanzado',
          dominio: 'Información',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Alta',
          presupuesto: '$420,000',
          responsable: 'Data & Analytics',
          hitos: ['Arquitectura analytics', 'Implementación plataforma', 'Modelos predictivos']
        },
        {
          id: 'init-2026-02',
          nombre: 'Modernización Sistema Académico',
          dominio: 'Sistemas de Información',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Crítica',
          presupuesto: '$680,000',
          responsable: 'Desarrollo',
          hitos: ['Requerimientos', 'Desarrollo', 'Migración de datos']
        }
      ]
    },
    {
      trimestre: 'Q2',
      periodo: 'Abril - Junio 2026',
      iniciativas: [
        {
          id: 'init-2026-03',
          nombre: 'Automatización de Procesos (RPA)',
          dominio: 'Sistemas de Información',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Media',
          presupuesto: '$280,000',
          responsable: 'Innovación TI',
          hitos: ['Identificación procesos', 'Implementación RPA', 'Monitoreo']
        }
      ]
    },
    {
      trimestre: 'Q3',
      periodo: 'Julio - Septiembre 2026',
      iniciativas: [
        {
          id: 'init-2026-04',
          nombre: 'Centro de Excelencia en IA',
          dominio: 'Estrategia TI',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Alta',
          presupuesto: '$520,000',
          responsable: 'Innovación',
          hitos: ['Estructura CoE', 'Casos de uso', 'Implementación pilotos']
        }
      ]
    },
    {
      trimestre: 'Q4',
      periodo: 'Octubre - Diciembre 2026',
      iniciativas: [
        {
          id: 'init-2026-05',
          nombre: 'Ecosistema Digital Ciudadano',
          dominio: 'Uso y Apropiación',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Alta',
          presupuesto: '$390,000',
          responsable: 'Experiencia Digital',
          hitos: ['Diseño ecosistema', 'Desarrollo', 'Lanzamiento']
        }
      ]
    }
  ];

  // Hoja de Ruta 2027
  const roadmap2027 = [
    {
      trimestre: 'Q1',
      periodo: 'Enero - Marzo 2027',
      iniciativas: [
        {
          id: 'init-2027-01',
          nombre: 'Campus Virtual Inmersivo',
          dominio: 'Sistemas de Información',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Media',
          presupuesto: '$580,000',
          responsable: 'Innovación Académica',
          hitos: ['Diseño experiencia', 'Desarrollo plataforma', 'Piloto']
        }
      ]
    },
    {
      trimestre: 'Q2',
      periodo: 'Abril - Junio 2027',
      iniciativas: [
        {
          id: 'init-2027-02',
          nombre: 'Blockchain para Certificados',
          dominio: 'Sistemas de Información',
          estado: 'Planeado',
          progreso: 0,
          prioridad: 'Media',
          presupuesto: '$320,000',
          responsable: 'Innovación TI',
          hitos: ['Arquitectura blockchain', 'Desarrollo', 'Integración']
        }
      ]
    }
  ];

  const getRoadmapData = () => {
    switch (selectedYear) {
      case 2025: return roadmap2025;
      case 2026: return roadmap2026;
      case 2027: return roadmap2027;
      default: return roadmap2025;
    }
  };

  const filteredRoadmap = selectedTrimestre === 'todos' 
    ? getRoadmapData() 
    : getRoadmapData().filter(item => item.trimestre.toLowerCase() === selectedTrimestre);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Completado': return 'bg-green-100 text-green-700';
      case 'En Progreso': return 'bg-blue-100 text-blue-700';
      case 'Planeado': return 'bg-gray-100 text-gray-700';
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
              <Map className="w-8 h-8" />
              <h2 className="text-2xl font-black">Roadmap Estratégico</h2>
            </div>
            <p className="text-blue-100">
              Hoja de ruta de iniciativas de Arquitectura Empresarial 2025-2027
            </p>
          </div>
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
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Año:</span>
        </div>
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedYear === year
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {year}
          </button>
        ))}

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Trimestre:</span>
        </div>
        {trimestres.map((trimestre) => (
          <button
            key={trimestre.id}
            onClick={() => setSelectedTrimestre(trimestre.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedTrimestre === trimestre.id
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {trimestre.name}
          </button>
        ))}
      </div>

      {/* Timeline del Roadmap */}
      <div className="space-y-6">
        {filteredRoadmap.map((trimestre, index) => (
          <motion.div
            key={trimestre.trimestre}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Línea temporal */}
            {index < filteredRoadmap.length - 1 && (
              <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-transparent" />
            )}

            {/* Header del Trimestre */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#003DA5] to-[#0052cc] flex items-center justify-center shadow-lg z-10">
                <Flag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-xl">{trimestre.trimestre} {selectedYear}</h3>
                <p className="text-sm text-gray-600">{trimestre.periodo}</p>
              </div>
            </div>

            {/* Iniciativas del Trimestre */}
            <div className="ml-16 space-y-4">
              {trimestre.iniciativas.map((iniciativa) => (
                <div 
                  key={iniciativa.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-gray-900">{iniciativa.nombre}</h4>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(iniciativa.estado)}`}>
                          {iniciativa.estado}
                        </span>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getPrioridadColor(iniciativa.prioridad)}`}>
                          {iniciativa.prioridad}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                          {iniciativa.dominio}
                        </span>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{iniciativa.responsable}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>{iniciativa.presupuesto}</span>
                        </div>
                      </div>

                      {/* Hitos */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {iniciativa.hitos.map((hito, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {hito}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Progreso */}
                    {iniciativa.estado !== 'Planeado' && (
                      <div className="ml-4 text-right">
                        <p className="text-sm text-gray-600 mb-2">Progreso</p>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                              style={{ width: `${iniciativa.progreso}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900">{iniciativa.progreso}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Visión Estratégica
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            El roadmap estratégico de Arquitectura Empresarial ESAP contempla <strong>42 iniciativas</strong> distribuidas 
            en el periodo 2025-2027, con una inversión total estimada de <strong>$4.2M</strong>. El enfoque prioritario 
            para 2025 está en <strong>modernización de infraestructura, seguridad y gobierno de datos</strong>.
          </p>
          <p className="mt-3">
            Para 2026-2027 se proyectan iniciativas de <strong>innovación tecnológica</strong> (IA, Analytics Avanzado, RPA) 
            y <strong>transformación digital</strong> orientadas a mejorar la experiencia del ciudadano y la eficiencia operativa.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
