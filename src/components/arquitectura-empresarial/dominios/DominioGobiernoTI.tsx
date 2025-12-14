/**
 * Dominio: Gobierno TI
 * Marco de Referencia MRAE - MinTIC Colombia
 * Políticas, normativas, comités y gobierno corporativo de TI
 */

import React, { useState } from 'react';
import { 
  Shield, 
  FileText, 
  Users, 
  Scale, 
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Briefcase,
  TrendingUp,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DominioGobiernoTIProps {
  canEdit?: boolean;
}

export function DominioGobiernoTI({ canEdit = true }: DominioGobiernoTIProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Métricas de Gobierno TI
  const metricas = [
    {
      label: 'Políticas Activas',
      value: '24',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+3',
      trendUp: true
    },
    {
      label: 'Comités Activos',
      value: '6',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+1',
      trendUp: true
    },
    {
      label: 'Cumplimiento',
      value: '87%',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+5%',
      trendUp: true
    },
    {
      label: 'Auditorías 2025',
      value: '12',
      icon: Scale,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '+4',
      trendUp: true
    }
  ];

  // Comités de Gobierno TI
  const comites = [
    {
      id: 'comite-ti',
      nombre: 'Comité Estratégico de TI',
      descripcion: 'Órgano de decisión estratégica para iniciativas tecnológicas',
      presidente: 'Director General ESAP',
      frecuencia: 'Mensual',
      miembros: 8,
      ultimaReunion: '2025-11-28',
      proximaReunion: '2025-12-15',
      temas: [
        'Aprobación de presupuesto TI 2026',
        'Revisión de proyectos estratégicos',
        'Plan de transformación digital',
        'Políticas de ciberseguridad'
      ],
      acuerdos: 15,
      pendientes: 3
    },
    {
      id: 'comite-seguridad',
      nombre: 'Comité de Seguridad de la Información',
      descripcion: 'Gestión de riesgos y políticas de seguridad institucional',
      presidente: 'Coordinador de Seguridad TI',
      frecuencia: 'Quincenal',
      miembros: 6,
      ultimaReunion: '2025-12-01',
      proximaReunion: '2025-12-14',
      temas: [
        'Análisis de vulnerabilidades Q4',
        'Actualización de políticas SGSI',
        'Plan de respuesta a incidentes',
        'Capacitación en ciberseguridad'
      ],
      acuerdos: 28,
      pendientes: 5
    },
    {
      id: 'comite-arquitectura',
      nombre: 'Comité de Arquitectura Empresarial',
      descripcion: 'Definición y seguimiento del marco arquitectónico institucional',
      presidente: 'Arquitecto Empresarial',
      frecuencia: 'Mensual',
      miembros: 10,
      ultimaReunion: '2025-11-22',
      proximaReunion: '2025-12-20',
      temas: [
        'Revisión de artefactos MRAE',
        'Evaluación de madurez organizacional',
        'Estándares de integración',
        'Roadmap de arquitectura 2026'
      ],
      acuerdos: 22,
      pendientes: 4
    },
    {
      id: 'comite-datos',
      nombre: 'Comité de Gobierno de Datos',
      descripcion: 'Gestión estratégica de datos e información institucional',
      presidente: 'Chief Data Officer',
      frecuencia: 'Mensual',
      miembros: 7,
      ultimaReunion: '2025-11-25',
      proximaReunion: '2025-12-18',
      temas: [
        'Calidad de datos académicos',
        'Políticas de privacidad',
        'Catálogo de datos institucional',
        'Estrategia de analytics'
      ],
      acuerdos: 18,
      pendientes: 2
    }
  ];

  // Políticas y Normativas
  const politicas = [
    {
      id: 'pol-1',
      categoria: 'Seguridad',
      titulo: 'Política de Seguridad de la Información',
      version: '3.2',
      vigencia: '2025-01-01',
      estado: 'Vigente',
      responsable: 'Oficina de Seguridad TI',
      alcance: 'Institucional',
      documentos: 5
    },
    {
      id: 'pol-2',
      categoria: 'Datos',
      titulo: 'Política de Protección de Datos Personales',
      version: '2.1',
      vigencia: '2024-06-15',
      estado: 'Vigente',
      responsable: 'Oficial de Protección de Datos',
      alcance: 'Institucional',
      documentos: 8
    },
    {
      id: 'pol-3',
      categoria: 'Operaciones',
      titulo: 'Política de Uso de Recursos Tecnológicos',
      version: '4.0',
      vigencia: '2025-02-01',
      estado: 'Vigente',
      responsable: 'Dirección de TI',
      alcance: 'Institucional',
      documentos: 3
    },
    {
      id: 'pol-4',
      categoria: 'Desarrollo',
      titulo: 'Estándares de Desarrollo de Software',
      version: '1.8',
      vigencia: '2024-09-01',
      estado: 'Vigente',
      responsable: 'Gerencia de Desarrollo',
      alcance: 'Área TI',
      documentos: 12
    },
    {
      id: 'pol-5',
      categoria: 'Arquitectura',
      titulo: 'Marco de Arquitectura Empresarial',
      version: '2.0',
      vigencia: '2025-03-01',
      estado: 'En Revisión',
      responsable: 'Comité de Arquitectura',
      alcance: 'Institucional',
      documentos: 15
    }
  ];

  // Marco Normativo
  const marcoNormativo = [
    {
      tipo: 'Ley',
      numero: 'Ley 1581 de 2012',
      descripcion: 'Protección de Datos Personales',
      cumplimiento: 92,
      estado: 'Cumpliendo'
    },
    {
      tipo: 'Decreto',
      numero: 'Decreto 1078 de 2015',
      descripcion: 'Sector TIC - Gobierno Digital',
      cumplimiento: 85,
      estado: 'Cumpliendo'
    },
    {
      tipo: 'Resolución',
      numero: 'Resolución MinTIC 2710',
      descripcion: 'Marco de Referencia de AE',
      cumplimiento: 78,
      estado: 'En Progreso'
    },
    {
      tipo: 'Norma',
      numero: 'ISO 27001:2013',
      descripcion: 'Gestión de Seguridad de la Información',
      cumplimiento: 88,
      estado: 'Cumpliendo'
    },
    {
      tipo: 'Norma',
      numero: 'ISO 38500',
      descripcion: 'Gobierno Corporativo de TI',
      cumplimiento: 82,
      estado: 'Cumpliendo'
    }
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Vigente': return 'bg-green-100 text-green-700';
      case 'En Revisión': return 'bg-yellow-100 text-yellow-700';
      case 'Cumpliendo': return 'bg-green-100 text-green-700';
      case 'En Progreso': return 'bg-blue-100 text-blue-700';
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
              <Shield className="w-8 h-8" />
              <h2 className="text-2xl font-black">Gobierno TI</h2>
            </div>
            <p className="text-blue-100">
              Políticas, normativas y estructuras de gobierno corporativo tecnológico
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-white text-[#003DA5] rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva Política
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

      {/* Comités de Gobierno */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Comités de Gobierno TI
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Estructuras de decisión y seguimiento estratégico
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {comites.map((comite) => (
            <div key={comite.id}>
              <div 
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(comite.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {expandedSections[comite.id] ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{comite.nombre}</h4>
                      <p className="text-sm text-gray-600">{comite.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Miembros</p>
                      <p className="font-bold text-gray-900">{comite.miembros}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Frecuencia</p>
                      <p className="font-bold text-gray-900">{comite.frecuencia}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Pendientes</p>
                      <p className="font-bold text-orange-600">{comite.pendientes}</p>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedSections[comite.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-gray-50 border-t border-gray-200"
                  >
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-bold text-gray-900 mb-3">Información del Comité</h5>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-600">Presidente</span>
                              <span className="text-sm font-semibold text-gray-900">{comite.presidente}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-600">Última Reunión</span>
                              <span className="text-sm font-semibold text-gray-900">{comite.ultimaReunion}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-600">Próxima Reunión</span>
                              <span className="text-sm font-semibold text-blue-600">{comite.proximaReunion}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-600">Acuerdos Totales</span>
                              <span className="text-sm font-semibold text-green-600">{comite.acuerdos}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 mb-3">Temas Agenda Actual</h5>
                          <div className="space-y-2">
                            {comite.temas.map((tema, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                                <span className="text-sm text-gray-700">{tema}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Políticas y Normativas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Políticas y Normativas TI
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Marco normativo institucional de tecnología
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {politicas.map((politica) => (
              <div 
                key={politica.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                        {politica.categoria}
                      </span>
                      <h4 className="font-bold text-gray-900">{politica.titulo}</h4>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(politica.estado)}`}>
                        {politica.estado}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>Versión {politica.version}</span>
                      <span>•</span>
                      <span>Vigencia: {politica.vigencia}</span>
                      <span>•</span>
                      <span>Alcance: {politica.alcance}</span>
                      <span>•</span>
                      <span>{politica.documentos} documentos</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Marco Normativo Externo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-green-600" />
            Marco Normativo y Cumplimiento
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Leyes, decretos y normas aplicables al sector TI
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {marcoNormativo.map((norma, index) => (
              <div 
                key={index}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                        {norma.tipo}
                      </span>
                      <span className="font-bold text-gray-900">{norma.numero}</span>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(norma.estado)}`}>
                        {norma.estado}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{norma.descripcion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Cumplimiento</p>
                    <p className="text-2xl font-black text-green-600">{norma.cumplimiento}%</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: `${norma.cumplimiento}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Resumen */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Resumen de Gobierno TI
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            ESAP cuenta con un <strong>marco robusto de gobierno TI</strong> compuesto por 24 políticas activas, 
            6 comités estratégicos y un nivel de cumplimiento normativo del <strong>87%</strong>. La estructura 
            de gobierno está alineada con las mejores prácticas internacionales (ISO 38500, COBIT) y el marco 
            regulatorio colombiano.
          </p>
          <p className="mt-3">
            El <strong>Comité Estratégico de TI</strong> lidera la toma de decisiones tecnológicas con reuniones 
            mensuales y 15 acuerdos vigentes. Se mantiene un seguimiento activo de 5 normativas clave, con especial 
            énfasis en la Ley 1581 de Protección de Datos (92% cumplimiento) y el Marco de Arquitectura Empresarial 
            MinTIC (78% implementado).
          </p>
        </div>
      </motion.div>
    </div>
  );
}
