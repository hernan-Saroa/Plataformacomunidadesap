/**
 * Módulo de Seguimiento MinTIC - Arquitectura Empresarial
 * Componente para seguimiento de cumplimiento de requisitos MinTIC
 * según el Marco de Referencia de Arquitectura Empresarial (MRAE)
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Download,
  Upload,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Target,
  Database,
  Server,
  Laptop,
  Users,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCheck,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// Tipos de entregables MinTIC
interface EntregableMinTIC {
  id: string;
  nombre: string;
  dominio: string;
  descripcion: string;
  estado: 'completado' | 'en-progreso' | 'pendiente' | 'vencido';
  progreso: number;
  fechaLimite: string;
  responsable: string;
  territorial: string;
  artefactos: string[];
  observaciones?: string;
  ultimaActualizacion: string;
}

interface RequisitoMinTIC {
  id: string;
  categoria: string;
  requisito: string;
  descripcion: string;
  obligatorio: boolean;
  estado: 'cumple' | 'parcial' | 'no-cumple';
  evidencias: number;
  entregables: string[];
}

export function SeguimientoMinTIC() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-1');
  const [dominioFiltro, setDominioFiltro] = useState('todos');
  const [expandedRequisito, setExpandedRequisito] = useState<string | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'resumen' | 'requisitos' | 'entregables' | 'cronograma'>('resumen');

  // Datos mock de entregables MinTIC
  const entregables: EntregableMinTIC[] = [
    {
      id: 'ENT-001',
      nombre: 'Plan Estratégico de TI (PETI)',
      dominio: 'Estrategia TI',
      descripcion: 'Documento que define la estrategia de TI alineada con los objetivos institucionales',
      estado: 'completado',
      progreso: 100,
      fechaLimite: '2025-03-31',
      responsable: 'Jefe de TI Nacional',
      territorial: 'Nacional',
      artefactos: ['DOC-PETI-2025', 'ANEXO-DIAGNOSTICO', 'MATRIZ-ALINEACION'],
      ultimaActualizacion: '2025-03-28'
    },
    {
      id: 'ENT-002',
      nombre: 'Modelo de Gobierno de TI',
      dominio: 'Estrategia TI',
      descripcion: 'Marco de gobierno y toma de decisiones en TI',
      estado: 'en-progreso',
      progreso: 75,
      fechaLimite: '2025-06-30',
      responsable: 'Coordinador AE',
      territorial: 'Nacional',
      artefactos: ['DOC-GOBIERNO-TI', 'ORGANIGRAMA-TI'],
      ultimaActualizacion: '2025-12-01'
    },
    {
      id: 'ENT-003',
      nombre: 'Catálogo de Datos',
      dominio: 'Información',
      descripcion: 'Inventario completo de activos de información',
      estado: 'en-progreso',
      progreso: 68,
      fechaLimite: '2025-09-30',
      responsable: 'Arquitecto de Datos',
      territorial: 'Nacional',
      artefactos: ['CATALOGO-DATOS-V2', 'DICCIONARIO-DATOS'],
      ultimaActualizacion: '2025-11-25'
    },
    {
      id: 'ENT-004',
      nombre: 'Modelo de Datos Institucional',
      dominio: 'Información',
      descripcion: 'Modelo conceptual de datos de la entidad',
      estado: 'en-progreso',
      progreso: 45,
      fechaLimite: '2025-10-31',
      responsable: 'Arquitecto de Datos',
      territorial: 'Nacional',
      artefactos: ['MODELO-DATOS-ER'],
      ultimaActualizacion: '2025-11-30'
    },
    {
      id: 'ENT-005',
      nombre: 'Inventario de Aplicaciones',
      dominio: 'Sistemas de Información',
      descripcion: 'Catálogo de sistemas y aplicaciones institucionales',
      estado: 'completado',
      progreso: 100,
      fechaLimite: '2025-04-30',
      responsable: 'Jefe de Desarrollo',
      territorial: 'Nacional',
      artefactos: ['INV-APLICACIONES-2025', 'MATRIZ-DEPENDENCIAS'],
      ultimaActualizacion: '2025-04-28'
    },
    {
      id: 'ENT-006',
      nombre: 'Mapa de Servicios TI',
      dominio: 'Servicios Tecnológicos',
      descripcion: 'Catálogo de servicios tecnológicos ofrecidos',
      estado: 'en-progreso',
      progreso: 82,
      fechaLimite: '2025-07-31',
      responsable: 'Coordinador Infraestructura',
      territorial: 'Nacional',
      artefactos: ['CATALOGO-SERVICIOS', 'SLA-SERVICIOS'],
      ultimaActualizacion: '2025-12-03'
    },
    {
      id: 'ENT-007',
      nombre: 'Plan de Capacitación TI',
      dominio: 'Uso y Apropiación',
      descripcion: 'Programa de formación en competencias digitales',
      estado: 'en-progreso',
      progreso: 55,
      fechaLimite: '2025-08-31',
      responsable: 'Coordinador Talento Humano',
      territorial: 'Nacional',
      artefactos: ['PLAN-CAPACITACION-2025'],
      ultimaActualizacion: '2025-11-20'
    },
    {
      id: 'ENT-008',
      nombre: 'Matriz de Madurez AE - Territorial Bogotá',
      dominio: 'Estrategia TI',
      descripcion: 'Evaluación de madurez AE para la territorial',
      estado: 'pendiente',
      progreso: 15,
      fechaLimite: '2025-12-31',
      responsable: 'Coordinador TI Bogotá',
      territorial: 'Bogotá',
      artefactos: [],
      ultimaActualizacion: '2025-11-15'
    }
  ];

  // Requisitos MinTIC
  const requisitos: RequisitoMinTIC[] = [
    {
      id: 'REQ-001',
      categoria: 'Estrategia TI',
      requisito: 'PETI actualizado anualmente',
      descripcion: 'El Plan Estratégico de TI debe actualizarse al menos una vez al año',
      obligatorio: true,
      estado: 'cumple',
      evidencias: 3,
      entregables: ['ENT-001']
    },
    {
      id: 'REQ-002',
      categoria: 'Estrategia TI',
      requisito: 'Modelo de Gobierno de TI definido',
      descripcion: 'Debe existir un modelo formal de gobierno de TI con roles y responsabilidades',
      obligatorio: true,
      estado: 'parcial',
      evidencias: 2,
      entregables: ['ENT-002']
    },
    {
      id: 'REQ-003',
      categoria: 'Información',
      requisito: 'Catálogo de Datos completo',
      descripcion: 'Inventario actualizado de todos los activos de información',
      obligatorio: true,
      estado: 'parcial',
      evidencias: 1,
      entregables: ['ENT-003']
    },
    {
      id: 'REQ-004',
      categoria: 'Información',
      requisito: 'Política de Calidad de Datos',
      descripcion: 'Política formal de gestión de calidad de datos',
      obligatorio: true,
      estado: 'no-cumple',
      evidencias: 0,
      entregables: []
    },
    {
      id: 'REQ-005',
      categoria: 'Sistemas de Información',
      requisito: 'Inventario de Aplicaciones',
      descripcion: 'Registro completo de sistemas y aplicaciones',
      obligatorio: true,
      estado: 'cumple',
      evidencias: 2,
      entregables: ['ENT-005']
    },
    {
      id: 'REQ-006',
      categoria: 'Servicios Tecnológicos',
      requisito: 'Catálogo de Servicios TI',
      descripcion: 'Documentación de servicios tecnológicos con niveles de servicio',
      obligatorio: true,
      estado: 'parcial',
      evidencias: 2,
      entregables: ['ENT-006']
    },
    {
      id: 'REQ-007',
      categoria: 'Uso y Apropiación',
      requisito: 'Plan de Capacitación Digital',
      descripcion: 'Programa estructurado de formación en competencias digitales',
      obligatorio: true,
      estado: 'parcial',
      evidencias: 1,
      entregables: ['ENT-007']
    },
    {
      id: 'REQ-008',
      categoria: 'Estrategia TI',
      requisito: 'Evaluación de Madurez AE',
      descripcion: 'Medición periódica del nivel de madurez de Arquitectura Empresarial',
      obligatorio: true,
      estado: 'no-cumple',
      evidencias: 0,
      entregables: ['ENT-008']
    }
  ];

  // Cálculos de estadísticas
  const statsGenerales = {
    cumplimiento: Math.round((requisitos.filter(r => r.estado === 'cumple').length / requisitos.length) * 100),
    entregablesCompletos: entregables.filter(e => e.estado === 'completado').length,
    entregablesTotal: entregables.length,
    progresoPromedio: Math.round(entregables.reduce((sum, e) => sum + e.progreso, 0) / entregables.length),
    requisitosCumplen: requisitos.filter(r => r.estado === 'cumple').length,
    requisitosParciales: requisitos.filter(r => r.estado === 'parcial').length,
    requisitosNoCumplen: requisitos.filter(r => r.estado === 'no-cumple').length
  };

  // Filtrar entregables
  const entregablesFiltrados = dominioFiltro === 'todos' 
    ? entregables 
    : entregables.filter(e => e.dominio === dominioFiltro);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado':
      case 'cumple':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'en-progreso':
      case 'parcial':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pendiente':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'vencido':
      case 'no-cumple':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completado':
      case 'cumple':
        return <CheckCircle className="size-4" />;
      case 'en-progreso':
      case 'parcial':
        return <Clock className="size-4" />;
      case 'pendiente':
        return <AlertCircle className="size-4" />;
      case 'vencido':
      case 'no-cumple':
        return <XCircle className="size-4" />;
      default:
        return <AlertCircle className="size-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900">Seguimiento MinTIC</h2>
          <p className="text-gray-600 mt-1">
            Cumplimiento del Marco de Referencia de Arquitectura Empresarial
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-1">2025 - Semestre 1</SelectItem>
              <SelectItem value="2025-2">2025 - Semestre 2</SelectItem>
              <SelectItem value="2024-2">2024 - Semestre 2</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="size-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {[
          { id: 'resumen', label: 'Resumen Ejecutivo' },
          { id: 'requisitos', label: 'Requisitos MinTIC' },
          { id: 'entregables', label: 'Entregables' },
          { id: 'cronograma', label: 'Cronograma' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setVistaActiva(tab.id as any)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              vistaActiva === tab.id
                ? 'border-[#003DA5] text-[#003DA5]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vista: Resumen Ejecutivo */}
      {vistaActiva === 'resumen' && (
        <div className="space-y-6">
          {/* KPIs principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cumplimiento Global</p>
                  <p className="text-3xl mt-2 text-gray-900">{statsGenerales.cumplimiento}%</p>
                </div>
                <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCheck className="size-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={statsGenerales.cumplimiento} className="h-2" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Entregables</p>
                  <p className="text-3xl mt-2 text-gray-900">
                    {statsGenerales.entregablesCompletos}/{statsGenerales.entregablesTotal}
                  </p>
                </div>
                <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="size-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {Math.round((statsGenerales.entregablesCompletos / statsGenerales.entregablesTotal) * 100)}% completados
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Progreso Promedio</p>
                  <p className="text-3xl mt-2 text-gray-900">{statsGenerales.progresoPromedio}%</p>
                </div>
                <div className="size-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="size-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={statsGenerales.progresoPromedio} className="h-2" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Requisitos</p>
                  <p className="text-3xl mt-2 text-gray-900">{statsGenerales.requisitosCumplen}/{requisitos.length}</p>
                </div>
                <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Target className="size-6 text-amber-600" />
                </div>
              </div>
              <div className="flex gap-2 mt-4 text-xs">
                <span className="text-green-600">{statsGenerales.requisitosCumplen} ✓</span>
                <span className="text-blue-600">{statsGenerales.requisitosParciales} ~</span>
                <span className="text-red-600">{statsGenerales.requisitosNoCumplen} ✗</span>
              </div>
            </Card>
          </div>

          {/* Gráfico de cumplimiento por dominio */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Cumplimiento por Dominio MRAE</h3>
            <div className="space-y-4">
              {[
                { dominio: 'Estrategia TI', progreso: 75, color: 'bg-blue-500', icon: Target },
                { dominio: 'Información', progreso: 58, color: 'bg-purple-500', icon: Database },
                { dominio: 'Sistemas de Información', progreso: 85, color: 'bg-green-500', icon: Server },
                { dominio: 'Servicios Tecnológicos', progreso: 72, color: 'bg-amber-500', icon: Laptop },
                { dominio: 'Uso y Apropiación', progreso: 48, color: 'bg-pink-500', icon: Users }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.dominio} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="size-5 text-gray-600" />
                        <span className="text-sm text-gray-700">{item.dominio}</span>
                      </div>
                      <span className="text-sm text-gray-900">{item.progreso}%</span>
                    </div>
                    <Progress value={item.progreso} className="h-2" />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Alertas y acciones requeridas */}
          <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-amber-900 mb-2">Acciones Requeridas</h3>
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 shrink-0" />
                    <span>2 entregables próximos a vencer (dentro de 30 días)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 shrink-0" />
                    <span>3 requisitos obligatorios sin cumplir completamente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 shrink-0" />
                    <span>Matriz de madurez territorial pendiente de evaluación</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Vista: Requisitos MinTIC */}
      {vistaActiva === 'requisitos' && (
        <div className="space-y-4">
          {requisitos.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => setExpandedRequisito(expandedRequisito === req.id ? null : req.id)}
                      className="mt-1"
                    >
                      {expandedRequisito === req.id ? (
                        <ChevronDown className="size-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="size-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-gray-900">{req.requisito}</h4>
                        {req.obligatorio && (
                          <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                            Obligatorio
                          </Badge>
                        )}
                        <Badge className={`${getEstadoColor(req.estado)} border`}>
                          <span className="flex items-center gap-1.5">
                            {getEstadoIcon(req.estado)}
                            {req.estado === 'cumple' ? 'Cumple' : req.estado === 'parcial' ? 'Parcial' : 'No Cumple'}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{req.descripcion}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <FileText className="size-4" />
                          {req.evidencias} evidencias
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="size-4" />
                          {req.entregables.length} entregables
                        </span>
                      </div>

                      <AnimatePresence>
                        {expandedRequisito === req.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200"
                          >
                            <h5 className="text-sm text-gray-700 mb-2">Entregables asociados:</h5>
                            <div className="space-y-2">
                              {req.entregables.map((entId) => {
                                const ent = entregables.find(e => e.id === entId);
                                return ent ? (
                                  <div key={entId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <div className={`size-2 rounded-full ${
                                        ent.estado === 'completado' ? 'bg-green-500' : 
                                        ent.estado === 'en-progreso' ? 'bg-blue-500' : 'bg-gray-400'
                                      }`} />
                                      <span className="text-sm text-gray-700">{ent.nombre}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600">{ent.progreso}%</span>
                                      <Button variant="ghost" size="sm">
                                        <ExternalLink className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                              {req.entregables.length === 0 && (
                                <p className="text-sm text-gray-500 italic">Sin entregables asociados</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Vista: Entregables */}
      {vistaActiva === 'entregables' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-3">
            <Select value={dominioFiltro} onValueChange={setDominioFiltro}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por dominio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los dominios</SelectItem>
                <SelectItem value="Estrategia TI">Estrategia TI</SelectItem>
                <SelectItem value="Información">Información</SelectItem>
                <SelectItem value="Sistemas de Información">Sistemas de Información</SelectItem>
                <SelectItem value="Servicios Tecnológicos">Servicios Tecnológicos</SelectItem>
                <SelectItem value="Uso y Apropiación">Uso y Apropiación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de entregables */}
          {entregablesFiltrados.map((ent) => (
            <motion.div
              key={ent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-gray-900">{ent.nombre}</h4>
                      <Badge className={`${getEstadoColor(ent.estado)} border`}>
                        <span className="flex items-center gap-1.5">
                          {getEstadoIcon(ent.estado)}
                          {ent.estado === 'completado' ? 'Completado' : 
                           ent.estado === 'en-progreso' ? 'En Progreso' : 
                           ent.estado === 'vencido' ? 'Vencido' : 'Pendiente'}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{ent.descripcion}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Target className="size-4" />
                        {ent.dominio}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-4" />
                        Límite: {new Date(ent.fechaLimite).toLocaleDateString('es-CO')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-4" />
                        {ent.responsable}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="size-4 mr-2" />
                      Cargar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="size-4 mr-2" />
                      Ver
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progreso</span>
                    <span className="text-gray-900">{ent.progreso}%</span>
                  </div>
                  <Progress value={ent.progreso} className="h-2" />
                </div>

                {ent.artefactos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Artefactos:</p>
                    <div className="flex flex-wrap gap-2">
                      {ent.artefactos.map((art) => (
                        <Badge key={art} variant="outline" className="text-xs">
                          {art}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Vista: Cronograma */}
      {vistaActiva === 'cronograma' && (
        <Card className="p-6">
          <h3 className="text-gray-900 mb-6">Cronograma de Entregables 2025</h3>
          <div className="space-y-4">
            {[
              { mes: 'Enero - Marzo', entregables: ['PETI 2025', 'Inventario de Aplicaciones'] },
              { mes: 'Abril - Junio', entregables: ['Modelo de Gobierno TI'] },
              { mes: 'Julio - Septiembre', entregables: ['Catálogo de Datos', 'Mapa de Servicios TI', 'Plan de Capacitación'] },
              { mes: 'Octubre - Diciembre', entregables: ['Modelo de Datos', 'Matriz de Madurez Territorial'] }
            ].map((periodo) => (
              <div key={periodo.mes} className="pb-4 border-b border-gray-200 last:border-0">
                <div className="flex items-start gap-4">
                  <div className="size-10 shrink-0 rounded-full bg-[#003DA5] bg-opacity-10 flex items-center justify-center">
                    <Calendar className="size-5 text-[#003DA5]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-900 mb-2">{periodo.mes}</h4>
                    <ul className="space-y-1">
                      {periodo.entregables.map((ent) => (
                        <li key={ent} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="size-1.5 rounded-full bg-gray-400" />
                          {ent}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
