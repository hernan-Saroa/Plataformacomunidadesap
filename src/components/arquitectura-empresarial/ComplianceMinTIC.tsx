/**
 * Componente: Compliance MinTIC
 * Sistema de seguimiento de cumplimiento normativo del Ministerio de las TICs
 */

import React, { useState } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  FileText,
  Download,
  Upload,
  Eye,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ComplianceMinTICProps {
  canEdit?: boolean;
}

export function ComplianceMinTIC({ canEdit = true }: ComplianceMinTICProps) {
  const [expandedDominios, setExpandedDominios] = useState<Record<string, boolean>>({});

  const toggleDominio = (dominioId: string) => {
    setExpandedDominios(prev => ({
      ...prev,
      [dominioId]: !prev[dominioId]
    }));
  };

  // Métricas de Compliance
  const metricas = [
    {
      label: 'Cumplimiento Global',
      value: '76%',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+8%',
      trendUp: true
    },
    {
      label: 'Requisitos Cumplidos',
      value: '142',
      suffix: '/187',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+15',
      trendUp: true
    },
    {
      label: 'En Progreso',
      value: '28',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '-5',
      trendUp: false
    },
    {
      label: 'Evidencias Cargadas',
      value: '215',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+42',
      trendUp: true
    }
  ];

  // Dominios MRAE con requisitos MinTIC
  const dominiosCompliance = [
    {
      id: 'estrategia',
      nombre: 'Estrategia de TI',
      cumplimiento: 82,
      requisitos: [
        {
          id: 'est-01',
          codigo: 'MRAE-EST-01',
          descripcion: 'Plan Estratégico de TI alineado con objetivos institucionales',
          estado: 'Cumplido',
          evidencias: 3,
          responsable: 'Dirección de TI',
          ultimaRevision: '2025-10-15'
        },
        {
          id: 'est-02',
          codigo: 'MRAE-EST-02',
          descripcion: 'Modelo de gestión de inversiones en TI',
          estado: 'Cumplido',
          evidencias: 2,
          responsable: 'Oficina de Planeación',
          ultimaRevision: '2025-11-20'
        },
        {
          id: 'est-03',
          codigo: 'MRAE-EST-03',
          descripcion: 'Gobierno y gestión de proyectos de TI',
          estado: 'En Progreso',
          evidencias: 1,
          responsable: 'PMO',
          ultimaRevision: '2025-11-28'
        },
        {
          id: 'est-04',
          codigo: 'MRAE-EST-04',
          descripcion: 'Arquitectura de negocio y modelo operativo',
          estado: 'Cumplido',
          evidencias: 4,
          responsable: 'Arquitectura Empresarial',
          ultimaRevision: '2025-09-12'
        }
      ]
    },
    {
      id: 'informacion',
      nombre: 'Gestión de Información',
      cumplimiento: 74,
      requisitos: [
        {
          id: 'inf-01',
          codigo: 'MRAE-INF-01',
          descripcion: 'Modelo de arquitectura de información institucional',
          estado: 'Cumplido',
          evidencias: 5,
          responsable: 'Gestión de Datos',
          ultimaRevision: '2025-11-05'
        },
        {
          id: 'inf-02',
          codigo: 'MRAE-INF-02',
          descripcion: 'Catálogo de datos institucional',
          estado: 'En Progreso',
          evidencias: 2,
          responsable: 'CDO',
          ultimaRevision: '2025-11-22'
        },
        {
          id: 'inf-03',
          codigo: 'MRAE-INF-03',
          descripcion: 'Políticas de calidad y gobierno de datos',
          estado: 'Cumplido',
          evidencias: 3,
          responsable: 'Comité de Datos',
          ultimaRevision: '2025-10-30'
        },
        {
          id: 'inf-04',
          codigo: 'MRAE-INF-04',
          descripcion: 'Lineamientos de interoperabilidad',
          estado: 'Pendiente',
          evidencias: 0,
          responsable: 'Arquitectura TI',
          ultimaRevision: null
        }
      ]
    },
    {
      id: 'sistemas',
      nombre: 'Sistemas de Información',
      cumplimiento: 85,
      requisitos: [
        {
          id: 'sis-01',
          codigo: 'MRAE-SIS-01',
          descripcion: 'Inventario de aplicaciones institucionales',
          estado: 'Cumplido',
          evidencias: 1,
          responsable: 'Gestión de Aplicaciones',
          ultimaRevision: '2025-11-18'
        },
        {
          id: 'sis-02',
          codigo: 'MRAE-SIS-02',
          descripcion: 'Arquitectura de aplicaciones y componentes',
          estado: 'Cumplido',
          evidencias: 6,
          responsable: 'Arquitectura TI',
          ultimaRevision: '2025-10-25'
        },
        {
          id: 'sis-03',
          codigo: 'MRAE-SIS-03',
          descripcion: 'Estándares de desarrollo de software',
          estado: 'Cumplido',
          evidencias: 8,
          responsable: 'Desarrollo',
          ultimaRevision: '2025-09-20'
        },
        {
          id: 'sis-04',
          codigo: 'MRAE-SIS-04',
          descripcion: 'Gestión de portafolio de aplicaciones',
          estado: 'Cumplido',
          evidencias: 2,
          responsable: 'PMO',
          ultimaRevision: '2025-11-10'
        }
      ]
    },
    {
      id: 'servicios',
      nombre: 'Servicios Tecnológicos',
      cumplimiento: 68,
      requisitos: [
        {
          id: 'srv-01',
          codigo: 'MRAE-SRV-01',
          descripcion: 'Arquitectura tecnológica institucional',
          estado: 'Cumplido',
          evidencias: 4,
          responsable: 'Infraestructura',
          ultimaRevision: '2025-10-08'
        },
        {
          id: 'srv-02',
          codigo: 'MRAE-SRV-02',
          descripcion: 'Catálogo de servicios tecnológicos',
          estado: 'En Progreso',
          evidencias: 1,
          responsable: 'Operaciones TI',
          ultimaRevision: '2025-11-15'
        },
        {
          id: 'srv-03',
          codigo: 'MRAE-SRV-03',
          descripcion: 'Acuerdos de nivel de servicio (SLA)',
          estado: 'Cumplido',
          evidencias: 12,
          responsable: 'Mesa de Ayuda',
          ultimaRevision: '2025-11-02'
        },
        {
          id: 'srv-04',
          codigo: 'MRAE-SRV-04',
          descripcion: 'Plan de continuidad y recuperación',
          estado: 'Pendiente',
          evidencias: 0,
          responsable: 'Seguridad TI',
          ultimaRevision: null
        }
      ]
    },
    {
      id: 'uso',
      nombre: 'Uso y Apropiación',
      cumplimiento: 71,
      requisitos: [
        {
          id: 'uso-01',
          codigo: 'MRAE-USO-01',
          descripcion: 'Plan de capacitación en TI',
          estado: 'Cumplido',
          evidencias: 5,
          responsable: 'Gestión Humana',
          ultimaRevision: '2025-11-12'
        },
        {
          id: 'uso-02',
          codigo: 'MRAE-USO-02',
          descripcion: 'Estrategia de gestión del cambio',
          estado: 'En Progreso',
          evidencias: 2,
          responsable: 'PMO',
          ultimaRevision: '2025-11-25'
        },
        {
          id: 'uso-03',
          codigo: 'MRAE-USO-03',
          descripcion: 'Programa de transformación digital',
          estado: 'Cumplido',
          evidencias: 3,
          responsable: 'Oficina de Transformación',
          ultimaRevision: '2025-10-18'
        },
        {
          id: 'uso-04',
          codigo: 'MRAE-USO-04',
          descripcion: 'Medición de adopción tecnológica',
          estado: 'En Progreso',
          evidencias: 1,
          responsable: 'Analytics',
          ultimaRevision: '2025-11-20'
        }
      ]
    }
  ];

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'Cumplido':
        return {
          color: 'bg-green-100 text-green-700 border-green-300',
          icon: CheckCircle2,
          iconColor: 'text-green-600'
        };
      case 'En Progreso':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: Clock,
          iconColor: 'text-blue-600'
        };
      case 'Pendiente':
        return {
          color: 'bg-orange-100 text-orange-700 border-orange-300',
          icon: AlertCircle,
          iconColor: 'text-orange-600'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: AlertCircle,
          iconColor: 'text-gray-600'
        };
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
              <Shield className="w-8 h-8" />
              <h2 className="text-2xl font-black">Compliance MinTIC</h2>
            </div>
            <p className="text-blue-100">
              Sistema de seguimiento de cumplimiento normativo del Marco de Referencia de Arquitectura Empresarial
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-white text-[#003DA5] rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Cargar Evidencia
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
                {metrica.value}{metrica.suffix}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Progreso por Dominio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Progreso de Cumplimiento por Dominio
        </h3>
        <div className="space-y-4">
          {dominiosCompliance.map((dominio) => (
            <div key={dominio.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{dominio.nombre}</span>
                <span className={`text-lg font-black ${
                  dominio.cumplimiento >= 80 ? 'text-green-600' :
                  dominio.cumplimiento >= 60 ? 'text-blue-600' :
                  'text-orange-600'
                }`}>
                  {dominio.cumplimiento}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    dominio.cumplimiento >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    dominio.cumplimiento >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    'bg-gradient-to-r from-orange-500 to-orange-600'
                  }`}
                  style={{ width: `${dominio.cumplimiento}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Lista de Requisitos por Dominio */}
      <div className="space-y-4">
        {dominiosCompliance.map((dominio) => (
          <motion.div
            key={dominio.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div 
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
              onClick={() => toggleDominio(dominio.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {expandedDominios[dominio.id] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900">{dominio.nombre}</h3>
                    <p className="text-sm text-gray-600">{dominio.requisitos.length} requisitos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Cumplimiento</p>
                    <p className={`text-xl font-black ${
                      dominio.cumplimiento >= 80 ? 'text-green-600' :
                      dominio.cumplimiento >= 60 ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {dominio.cumplimiento}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedDominios[dominio.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gray-50"
                >
                  <div className="p-5">
                    <div className="space-y-3">
                      {dominio.requisitos.map((requisito) => {
                        const estadoConfig = getEstadoConfig(requisito.estado);
                        const EstadoIcon = estadoConfig.icon;
                        
                        return (
                          <div key={requisito.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-bold rounded">
                                    {requisito.codigo}
                                  </span>
                                  <span className={`px-3 py-1 text-xs font-bold rounded border ${estadoConfig.color} flex items-center gap-1`}>
                                    <EstadoIcon className={`w-3 h-3 ${estadoConfig.iconColor}`} />
                                    {requisito.estado}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 font-semibold mb-2">{requisito.descripcion}</p>
                                <div className="flex items-center gap-6 text-xs text-gray-600">
                                  <span>Responsable: {requisito.responsable}</span>
                                  {requisito.ultimaRevision && (
                                    <>
                                      <span>•</span>
                                      <span>Última revisión: {requisito.ultimaRevision}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {requisito.evidencias} evidencias
                                  </span>
                                </div>
                              </div>
                              {canEdit && (
                                <div className="flex items-center gap-2 ml-4">
                                  <button className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
          <Target className="w-5 h-5 text-blue-600" />
          Resumen de Compliance
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            ESAP mantiene un nivel de cumplimiento del <strong>76%</strong> respecto al Marco de Referencia de Arquitectura 
            Empresarial (MRAE) de MinTIC Colombia. Se han documentado y validado <strong>142 de 187 requisitos</strong>, 
            con 215 evidencias cargadas en el sistema.
          </p>
          <p className="mt-3">
            Los dominios con mayor avance son <strong>Sistemas de Información (85%)</strong> y <strong>Estrategia de TI (82%)</strong>. 
            Se requiere priorizar el dominio de <strong>Servicios Tecnológicos (68%)</strong>, especialmente los requisitos 
            relacionados con continuidad del negocio y catálogo de servicios.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
