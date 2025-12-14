/**
 * Dominio: Estrategia TI
 * Alineación estratégica con los objetivos institucionales
 * Incluye: PETI, Gobierno TI, Gestión de Proyectos, Riesgos TI
 */

import React, { useState } from 'react';
import {
  Target,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Shield,
  GitBranch,
  BarChart3,
  Plus,
  Download,
  Upload,
  Edit,
  Eye
} from 'lucide-react';
import { motion } from 'motion/react';

interface DominioEstrategiaTIProps {
  canEdit?: boolean;
}

export function DominioEstrategiaTI({ canEdit = true }: DominioEstrategiaTIProps) {
  const [selectedTab, setSelectedTab] = useState<'peti' | 'gobierno' | 'proyectos' | 'riesgos'>('peti');

  // Componentes del PETI
  const componentesPETI = [
    {
      id: 1,
      nombre: 'Plan Estratégico de TI 2024-2027',
      descripcion: 'Documento maestro de planificación estratégica',
      version: '2.1',
      fechaActualizacion: '2024-11-15',
      estado: 'Vigente',
      responsable: 'Oficina TI',
      avanceImplementacion: 65
    },
    {
      id: 2,
      nombre: 'Modelo de Gestión TI',
      descripcion: 'Framework de gobierno y gestión tecnológica',
      version: '1.5',
      fechaActualizacion: '2024-10-20',
      estado: 'En revisión',
      responsable: 'Comité TI',
      avanceImplementacion: 78
    },
    {
      id: 3,
      nombre: 'Catálogo de Servicios TI',
      descripcion: 'Inventario completo de servicios tecnológicos',
      version: '3.0',
      fechaActualizacion: '2024-12-01',
      estado: 'Vigente',
      responsable: 'Gestión Servicios',
      avanceImplementacion: 90
    },
    {
      id: 4,
      nombre: 'Plan de Comunicaciones TI',
      descripcion: 'Estrategia de comunicación interna y externa',
      version: '1.2',
      fechaActualizacion: '2024-09-10',
      estado: 'Actualización pendiente',
      responsable: 'Comunicaciones',
      avanceImplementacion: 45
    }
  ];

  // Estructura de Gobierno TI
  const estructuraGobierno = [
    {
      organo: 'Comité Estratégico TI',
      nivel: 'Directivo',
      frecuencia: 'Mensual',
      miembros: 8,
      ultimaReunion: '2024-11-28',
      proximaReunion: '2024-12-15',
      temas: ['Aprobación presupuesto', 'Evaluación proyectos', 'Riesgos críticos']
    },
    {
      organo: 'Comité de Arquitectura',
      nivel: 'Táctico',
      frecuencia: 'Quincenal',
      miembros: 12,
      ultimaReunion: '2024-11-25',
      proximaReunion: '2024-12-09',
      temas: ['Estándares técnicos', 'Revisión diseños', 'Homologación soluciones']
    },
    {
      organo: 'Comité de Seguridad',
      nivel: 'Táctico',
      frecuencia: 'Semanal',
      miembros: 6,
      ultimaReunion: '2024-12-02',
      proximaReunion: '2024-12-09',
      temas: ['Vulnerabilidades', 'Incidentes', 'Políticas seguridad']
    },
    {
      organo: 'Grupo Gestión Cambios',
      nivel: 'Operativo',
      frecuencia: 'Diario',
      miembros: 10,
      ultimaReunion: '2024-12-04',
      proximaReunion: '2024-12-05',
      temas: ['CABs', 'Despliegues', 'Rollbacks']
    }
  ];

  // Portafolio de Proyectos
  const portafolioProyectos = [
    {
      id: 'PRY-001',
      nombre: 'Transformación Digital',
      tipo: 'Estratégico',
      presupuesto: 850000000,
      ejecutado: 550000000,
      avance: 65,
      estado: 'En ejecución',
      prioridad: 'Crítica',
      inicio: '2024-01-15',
      fin: '2025-06-30',
      sponsor: 'Dirección General'
    },
    {
      id: 'PRY-002',
      nombre: 'Migración Cloud AWS',
      tipo: 'Infraestructura',
      presupuesto: 450000000,
      ejecutado: 180000000,
      avance: 40,
      estado: 'En ejecución',
      prioridad: 'Alta',
      inicio: '2024-06-01',
      fin: '2025-03-31',
      sponsor: 'CIO'
    },
    {
      id: 'PRY-003',
      nombre: 'Implementación ERP Financiero',
      tipo: 'Aplicativo',
      presupuesto: 620000000,
      ejecutado: 310000000,
      avance: 50,
      estado: 'En ejecución',
      prioridad: 'Alta',
      inicio: '2024-03-01',
      fin: '2024-12-31',
      sponsor: 'Dir. Financiera'
    },
    {
      id: 'PRY-004',
      nombre: 'Data Governance Program',
      tipo: 'Gobierno',
      presupuesto: 280000000,
      ejecutado: 112000000,
      avance: 40,
      estado: 'Planeación',
      prioridad: 'Media',
      inicio: '2024-09-01',
      fin: '2025-08-31',
      sponsor: 'CDO'
    }
  ];

  // Riesgos TI
  const riesgosTI = [
    {
      id: 'RISK-001',
      descripcion: 'Pérdida de datos por falta de backup',
      categoria: 'Operacional',
      probabilidad: 'Media',
      impacto: 'Crítico',
      nivel: 'Alto',
      tratamiento: 'Mitigar',
      responsable: 'Infraestructura',
      estado: 'En tratamiento',
      controles: 3
    },
    {
      id: 'RISK-002',
      descripcion: 'Obsolescencia tecnológica infraestructura',
      categoria: 'Tecnológico',
      probabilidad: 'Alta',
      impacto: 'Alto',
      nivel: 'Muy Alto',
      tratamiento: 'Mitigar',
      responsable: 'CTO',
      estado: 'Identificado',
      controles: 2
    },
    {
      id: 'RISK-003',
      descripcion: 'Brechas de competencias equipo TI',
      categoria: 'Recursos Humanos',
      probabilidad: 'Media',
      impacto: 'Medio',
      nivel: 'Medio',
      tratamiento: 'Mitigar',
      responsable: 'Talento Humano',
      estado: 'En tratamiento',
      controles: 4
    },
    {
      id: 'RISK-004',
      descripcion: 'Ciberataques y ransomware',
      categoria: 'Seguridad',
      probabilidad: 'Alta',
      impacto: 'Crítico',
      nivel: 'Muy Alto',
      tratamiento: 'Prevenir',
      responsable: 'CISO',
      estado: 'Controlado',
      controles: 8
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const renderPETI = () => (
    <div className="space-y-6">
      {/* Header PETI */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Plan Estratégico de Tecnologías de la Información
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Vigencia 2024-2027 | Última actualización: Noviembre 2024
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  65% de avance general
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  12 objetivos estratégicos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">
                  28 iniciativas activas
                </span>
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold">
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors flex items-center gap-2 text-sm font-semibold">
                <Edit className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Componentes PETI */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900">
            Componentes del PETI
          </h3>
          {canEdit && (
            <button className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors flex items-center gap-2 text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Nuevo Componente
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {componentesPETI.map((componente, index) => (
            <motion.div
              key={componente.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">
                    {componente.nombre}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {componente.descripcion}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  componente.estado === 'Vigente'
                    ? 'bg-green-100 text-green-700'
                    : componente.estado === 'En revisión'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {componente.estado}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Versión:</span>
                  <span className="font-semibold text-gray-900">{componente.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Responsable:</span>
                  <span className="font-semibold text-gray-900">{componente.responsable}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Última actualización:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(componente.fechaActualizacion).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Implementación</span>
                  <span className="font-bold text-gray-900">{componente.avanceImplementacion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                    style={{ width: `${componente.avanceImplementacion}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold">
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                {canEdit && (
                  <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-semibold">
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGobierno = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Estructura de Gobierno TI
            </h3>
            <p className="text-sm text-gray-600">
              Órganos de dirección, seguimiento y control
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {estructuraGobierno.map((organo, index) => (
            <motion.div
              key={organo.organo}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-gray-900">
                      {organo.organo}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      organo.nivel === 'Directivo'
                        ? 'bg-purple-100 text-purple-700'
                        : organo.nivel === 'Táctico'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {organo.nivel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Miembros</p>
                    <p className="text-sm font-semibold text-gray-900">{organo.miembros}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Frecuencia</p>
                    <p className="text-sm font-semibold text-gray-900">{organo.frecuencia}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Próxima reunión</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(organo.proximaReunion).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-2">Temas principales:</p>
                <div className="flex flex-wrap gap-2">
                  {organo.temas.map((tema, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tema}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProyectos = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Portafolio de Proyectos TI
            </h3>
            <p className="text-sm text-gray-600">
              Gestión y seguimiento de iniciativas estratégicas
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors flex items-center gap-2 text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </button>
          )}
        </div>

        <div className="space-y-4">
          {portafolioProyectos.map((proyecto, index) => (
            <motion.div
              key={proyecto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-gray-900">
                      {proyecto.nombre}
                    </h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                      {proyecto.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      proyecto.prioridad === 'Crítica'
                        ? 'bg-red-100 text-red-700'
                        : proyecto.prioridad === 'Alta'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {proyecto.prioridad}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                      {proyecto.tipo}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      proyecto.estado === 'En ejecución'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {proyecto.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Presupuesto</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(proyecto.presupuesto)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Ejecutado</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(proyecto.ejecutado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Duración</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(proyecto.inicio).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })} -{' '}
                    {new Date(proyecto.fin).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Sponsor</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {proyecto.sponsor}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Avance del proyecto</span>
                  <span className="font-bold text-gray-900">{proyecto.avance}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                    style={{ width: `${proyecto.avance}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRiesgos = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Matriz de Riesgos TI
            </h3>
            <p className="text-sm text-gray-600">
              Identificación, evaluación y tratamiento de riesgos
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors flex items-center gap-2 text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Registrar Riesgo
            </button>
          )}
        </div>

        <div className="space-y-4">
          {riesgosTI.map((riesgo, index) => (
            <motion.div
              key={riesgo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className={`w-5 h-5 ${
                      riesgo.nivel === 'Muy Alto'
                        ? 'text-red-600'
                        : riesgo.nivel === 'Alto'
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                    }`} />
                    <h4 className="font-bold text-gray-900">
                      {riesgo.descripcion}
                    </h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                      {riesgo.id}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  riesgo.nivel === 'Muy Alto'
                    ? 'bg-red-100 text-red-700'
                    : riesgo.nivel === 'Alto'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {riesgo.nivel}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Categoría</p>
                  <p className="text-sm font-semibold text-gray-900">{riesgo.categoria}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Probabilidad</p>
                  <p className="text-sm font-semibold text-gray-900">{riesgo.probabilidad}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Impacto</p>
                  <p className="text-sm font-semibold text-gray-900">{riesgo.impacto}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tratamiento</p>
                  <p className="text-sm font-semibold text-gray-900">{riesgo.tratamiento}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Controles</p>
                  <p className="text-sm font-semibold text-gray-900">{riesgo.controles} activos</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Responsable:</span>
                  <span className="text-sm font-semibold text-gray-900">{riesgo.responsable}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  riesgo.estado === 'Controlado'
                    ? 'bg-green-100 text-green-700'
                    : riesgo.estado === 'En tratamiento'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {riesgo.estado}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('peti')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'peti'
                ? 'bg-[#003DA5] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="w-4 h-4" />
              PETI
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('gobierno')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'gobierno'
                ? 'bg-[#003DA5] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Gobierno TI
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('proyectos')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'proyectos'
                ? 'bg-[#003DA5] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <GitBranch className="w-4 h-4" />
              Proyectos
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('riesgos')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'riesgos'
                ? 'bg-[#003DA5] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Riesgos TI
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedTab === 'peti' && renderPETI()}
      {selectedTab === 'gobierno' && renderGobierno()}
      {selectedTab === 'proyectos' && renderProyectos()}
      {selectedTab === 'riesgos' && renderRiesgos()}
    </div>
  );
}
